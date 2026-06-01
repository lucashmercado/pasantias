/**
 * chat.controller.js — Controlador del sistema de mensajería directa.
 *
 * Chat comunitario institucional con reglas por rol:
 *   alumno/egresado ↔ alumno/egresado  → permitido
 *   alumno/egresado ↔ empresa          → permitido
 *   empresa         ↔ empresa (misma)  → permitido
 *   empresa         ↔ empresa (distinta)→ bloqueado
 *   admin           ↔ cualquiera       → bloqueado
 *
 * La postulación ya NO es requisito para chatear.
 * Solo sirve como contexto para el botón "Contactar" en el panel de candidatos.
 *
 * Endpoints:
 * - GET  /api/chat                → Lista de conversaciones del usuario autenticado
 * - POST /api/chat                → Enviar un mensaje
 * - GET  /api/chat/:usuarioId     → Historial de mensajes con un usuario específico
 * - PATCH /api/chat/:usuarioId/leer → Marcar mensajes de una conversación como leídos
 */

'use strict';

const { Mensaje, Usuario, Postulacion, Oferta, Empresa, EmpresaUsuario } = require('../models');
const { Op } = require('sequelize');
const { crearNotificacion } = require('../utils/notificador');

// Estados de postulación relevantes (usados como contexto para "Contactar", no como requisito de chat)
const ESTADOS_CHAT_HABILITADO = ['preseleccionado', 'entrevista_programada', 'entrevista', 'contratado'];

/**
 * Resuelve la razón social de un usuario con rol 'empresa'.
 * 1. Busca membresía activa en empresa_usuarios (reclutadores / admin_empresa)
 * 2. Fallback: propietario directo (empresa.usuarioId)
 * Devuelve null si no aplica.
 */
async function resolverRazonSocial(usuarioId) {
  const membresia = await EmpresaUsuario.findOne({
    where: { usuarioId, activo: true },
    attributes: [],
    include: [{ model: Empresa, as: 'empresa', attributes: ['razonSocial'] }],
  });
  if (membresia?.empresa?.razonSocial) return membresia.empresa.razonSocial;
  const empresa = await Empresa.findOne({ where: { usuarioId }, attributes: ['razonSocial'] });
  return empresa?.razonSocial ?? null;
}

// ── Helper: IDs de empresa a los que pertenece un usuario ────────────────────
/**
 * Devuelve un Set con los IDs de empresa a los que pertenece el usuario.
 * Considera empresa.usuarioId (propietario directo) y empresa_usuarios (equipo).
 */
async function resolverEmpresasDeUsuario(usuarioId) {
  const [directa, membresias] = await Promise.all([
    Empresa.findOne({ where: { usuarioId }, attributes: ['id'] }),
    EmpresaUsuario.findAll({ where: { usuarioId, activo: true }, attributes: ['empresaId'] }),
  ]);
  const ids = new Set(membresias.map(m => m.empresaId));
  if (directa) ids.add(directa.id);
  return ids;
}

/**
 * Devuelve true si ambos usuarios pertenecen a al menos una empresa en común.
 */
async function comparteMismaEmpresa(usuarioAId, usuarioBId) {
  const [empresasA, empresasB] = await Promise.all([
    resolverEmpresasDeUsuario(usuarioAId),
    resolverEmpresasDeUsuario(usuarioBId),
  ]);
  for (const id of empresasA) {
    if (empresasB.has(id)) return true;
  }
  return false;
}

// ── Helper: verificar si dos usuarios pueden chatear ─────────────────────────
/**
 * puedeChatear(emisorId, receptorId) → { ok: boolean, motivo?: string }
 *
 * Reglas:
 *   alumno/egresado ↔ alumno/egresado  → ok
 *   alumno/egresado ↔ empresa          → ok
 *   empresa ↔ empresa (misma empresa)  → ok
 *   empresa ↔ empresa (distinta)        → 403
 *   admin ↔ cualquiera                 → 403
 *   usuario inactivo/deshabilitado      → 403
 */
async function puedeChatear(emisorId, receptorId) {
  try {
    const [emisor, receptor] = await Promise.all([
      Usuario.findByPk(emisorId,  { attributes: ['id', 'rol', 'activo', 'habilitado'] }),
      Usuario.findByPk(receptorId, { attributes: ['id', 'rol', 'activo', 'habilitado'] }),
    ]);

    if (!emisor || !receptor) return { ok: false, motivo: 'Usuario no encontrado.' };

    if (!emisor.activo || !emisor.habilitado) {
      return { ok: false, motivo: 'Tu cuenta no está activa.' };
    }
    if (!receptor.activo || !receptor.habilitado) {
      return { ok: false, motivo: 'El destinatario no tiene una cuenta activa.' };
    }

    if (emisor.rol === 'admin' || receptor.rol === 'admin') {
      return { ok: false, motivo: 'Los administradores del sistema no participan en el chat.' };
    }

    const emisorEsAlumno   = ['alumno', 'egresado'].includes(emisor.rol);
    const receptorEsAlumno = ['alumno', 'egresado'].includes(receptor.rol);
    const emisorEsEmpresa  = emisor.rol  === 'empresa';
    const receptorEsEmpresa = receptor.rol === 'empresa';

    // alumno/egresado ↔ alumno/egresado
    if (emisorEsAlumno && receptorEsAlumno) return { ok: true };

    // alumno/egresado ↔ empresa (ambas direcciones)
    if ((emisorEsAlumno && receptorEsEmpresa) || (emisorEsEmpresa && receptorEsAlumno)) {
      return { ok: true };
    }

    // empresa ↔ empresa: solo si comparten empresa
    if (emisorEsEmpresa && receptorEsEmpresa) {
      const misma = await comparteMismaEmpresa(emisorId, receptorId);
      if (misma) return { ok: true };
      return { ok: false, motivo: 'El chat entre empresas distintas no está habilitado en esta plataforma.' };
    }

    return { ok: false, motivo: 'Combinación de roles no válida para el chat.' };
  } catch (err) {
    console.error('[Chat] Error en puedeChatear:', err.message);
    return { ok: false, motivo: 'Error al verificar permisos de chat.' };
  }
}

// ── Buscar usuarios para iniciar un nuevo chat ────────────────────────────────
/**
 * GET /api/chat/usuarios?q=texto
 *
 * Reglas de visibilidad por rol:
 *   alumno/egresado → ve: alumno, egresado, empresa
 *   empresa         → ve: alumno, egresado + compañeros de su misma empresa
 *   admin           → sin resultados
 */
exports.buscarUsuarios = async (req, res) => {
  try {
    const { id: userId, rol } = req.usuario;
    const q = (req.query.q || '').trim();

    if (q.length < 2) {
      return res.json({ success: true, data: [] });
    }

    // Admin no usa el chat
    if (rol === 'admin') {
      return res.json({ success: true, total: 0, data: [] });
    }

    const filtroTexto = {
      [Op.or]: [
        { nombre:   { [Op.iLike]: `%${q}%` } },
        { apellido: { [Op.iLike]: `%${q}%` } },
        { email:    { [Op.iLike]: `%${q}%` } },
      ],
    };

    let resultados = [];

    if (['alumno', 'egresado'].includes(rol)) {
      // Ve a todos los roles habilitados para chat (alumno/egresado/empresa)
      resultados = await Usuario.findAll({
        where: {
          id:     { [Op.ne]: userId },
          activo: true,
          rol:    { [Op.in]: ['alumno', 'egresado', 'empresa'] },
          ...filtroTexto,
        },
        attributes: ['id', 'nombre', 'apellido', 'email', 'rol'],
        limit: 20,
        order: [['nombre', 'ASC'], ['apellido', 'ASC']],
      });
    } else if (rol === 'empresa') {
      // Resolver empresa(s) del usuario actual
      const misEmpresaIds = await resolverEmpresasDeUsuario(userId);

      // Alumnos/egresados que coinciden con la búsqueda
      const alumnos = await Usuario.findAll({
        where: {
          id:     { [Op.ne]: userId },
          activo: true,
          rol:    { [Op.in]: ['alumno', 'egresado'] },
          ...filtroTexto,
        },
        attributes: ['id', 'nombre', 'apellido', 'email', 'rol'],
        limit: 15,
        order: [['nombre', 'ASC'], ['apellido', 'ASC']],
      });

      // Compañeros de empresa (misma empresa, rol empresa)
      let companeros = [];
      if (misEmpresaIds.size > 0) {
        // IDs de usuarios que comparten empresa con el emisor
        const [directos, miembros] = await Promise.all([
          Empresa.findAll({
            where: { id: { [Op.in]: [...misEmpresaIds] } },
            attributes: ['usuarioId'],
          }),
          EmpresaUsuario.findAll({
            where: { empresaId: { [Op.in]: [...misEmpresaIds] }, activo: true },
            attributes: ['usuarioId'],
          }),
        ]);
        const companeroIds = new Set([
          ...directos.map(e => e.usuarioId),
          ...miembros.map(m => m.usuarioId),
        ]);
        companeroIds.delete(userId); // Excluir a sí mismo

        if (companeroIds.size > 0) {
          companeros = await Usuario.findAll({
            where: {
              id:     { [Op.in]: [...companeroIds] },
              activo: true,
              ...filtroTexto,
            },
            attributes: ['id', 'nombre', 'apellido', 'email', 'rol'],
            limit: 5,
            order: [['nombre', 'ASC'], ['apellido', 'ASC']],
          });
        }
      }

      // Fusionar sin duplicados (companeros primero, luego alumnos)
      const vistos = new Set(companeros.map(u => u.id));
      resultados = [...companeros, ...alumnos.filter(u => !vistos.has(u.id))].slice(0, 20);
    }

    const data = resultados.map(u => ({ ...u.toJSON(), razonSocial: null }));

    // Batch lookup de razonSocial para usuarios empresa
    const empresaUserIds = data.filter(u => u.rol === 'empresa').map(u => u.id);
    if (empresaUserIds.length > 0) {
      const [membresias, directas] = await Promise.all([
        EmpresaUsuario.findAll({
          where: { usuarioId: { [Op.in]: empresaUserIds }, activo: true },
          attributes: ['usuarioId'],
          include: [{ model: Empresa, as: 'empresa', attributes: ['razonSocial'] }],
        }),
        Empresa.findAll({
          where: { usuarioId: { [Op.in]: empresaUserIds } },
          attributes: ['usuarioId', 'razonSocial'],
        }),
      ]);
      const rsMap = {};
      directas.forEach(e => { rsMap[e.usuarioId] = e.razonSocial; });
      membresias.forEach(m => {
        if (m.empresa?.razonSocial) rsMap[m.usuarioId] = m.empresa.razonSocial;
      });
      data.forEach(u => { u.razonSocial = rsMap[u.id] ?? null; });
    }

    return res.json({ success: true, total: data.length, data });
  } catch (error) {
    console.error('Error en buscarUsuarios:', error);
    return res.status(500).json({ success: false, message: 'Error al buscar usuarios.' });
  }
};

// ── Lista de conversaciones ───────────────────────────────────────────────────
/**
 * GET /api/chat
 * Devuelve la lista de conversaciones del usuario autenticado.
 * Cada conversación muestra:
 *   - el otro usuario (datos básicos)
 *   - el último mensaje
 *   - cantidad de mensajes no leídos
 *
 * Ordenadas de más reciente a más antigua.
 */
exports.getConversaciones = async (req, res) => {
  try {
    const userId = req.usuario.id;

    // Obtiene todos los mensajes donde el usuario es emisor o receptor
    const mensajes = await Mensaje.findAll({
      where: {
        [Op.or]: [{ emisorId: userId }, { receptorId: userId }],
      },
      include: [
        { model: Usuario, as: 'emisor',   attributes: ['id', 'nombre', 'apellido', 'fotoPerfil', 'rol'] },
        { model: Usuario, as: 'receptor', attributes: ['id', 'nombre', 'apellido', 'fotoPerfil', 'rol'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 200, // Límite razonable para derivar conversaciones
    });

    // Agrupa por interlocutor (el otro usuario de la conversación)
    const mapa = new Map();
    for (const m of mensajes) {
      const partnerId = m.emisorId === userId ? m.receptorId : m.emisorId;
      if (!mapa.has(partnerId)) {
        const partner = m.emisorId === userId ? m.receptor : m.emisor;
        mapa.set(partnerId, {
          usuario: partner,
          ultimoMensaje: m,
          noLeidos: 0,
        });
      }
      // Cuenta mensajes no leídos recibidos (no enviados por el usuario)
      if (m.receptorId === userId && !m.leido) {
        mapa.get(partnerId).noLeidos++;
      }
    }

    // Convertir a objetos planos para poder agregar razonSocial
    const conversaciones = Array.from(mapa.values()).map(c => ({
      usuario: c.usuario?.toJSON ? c.usuario.toJSON() : { ...c.usuario },
      ultimoMensaje: c.ultimoMensaje,
      noLeidos: c.noLeidos,
    }));

    // Batch lookup de empresa para usuarios con rol 'empresa'
    const empresaUserIds = conversaciones
      .filter(c => c.usuario.rol === 'empresa')
      .map(c => c.usuario.id);

    if (empresaUserIds.length > 0) {
      const [membresias, directas] = await Promise.all([
        EmpresaUsuario.findAll({
          where: { usuarioId: { [Op.in]: empresaUserIds }, activo: true },
          attributes: ['usuarioId'],
          include: [{ model: Empresa, as: 'empresa', attributes: ['razonSocial'] }],
        }),
        Empresa.findAll({
          where: { usuarioId: { [Op.in]: empresaUserIds } },
          attributes: ['usuarioId', 'razonSocial'],
        }),
      ]);

      const razonSocialMap = {};
      directas.forEach(e => { razonSocialMap[e.usuarioId] = e.razonSocial; });
      // Membresías tienen precedencia sobre propietario directo
      membresias.forEach(m => {
        if (m.empresa?.razonSocial) razonSocialMap[m.usuarioId] = m.empresa.razonSocial;
      });

      conversaciones.forEach(c => {
        c.usuario.razonSocial = razonSocialMap[c.usuario.id] ?? null;
      });
    }

    return res.json({
      success: true,
      total: conversaciones.length,
      data: conversaciones,
    });
  } catch (error) {
    console.error('Error en getConversaciones:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener conversaciones.' });
  }
};

// ── Enviar mensaje ────────────────────────────────────────────────────────────
/**
 * POST /api/chat
 * Envía un mensaje a otro usuario.
 *
 * Reglas:
 * - Solo entre alumno/egresado ↔ empresa
 * - Solo cuando existe una postulación en estado habilitado (preseleccionado,
 *   entrevista_programada o contratado)
 * - No puede enviarse un mensaje a sí mismo
 *
 * Body:
 *   receptorId {number} — ID del destinatario
 *   mensaje    {string} — Contenido del mensaje (máx. 2000 caracteres)
 */
exports.enviarMensaje = async (req, res) => {
  try {
    const { receptorId, mensaje } = req.body;
    const emisorId = req.usuario.id;

    // No puede enviarse mensajes a sí mismo
    if (Number(receptorId) === emisorId) {
      return res.status(400).json({ success: false, message: 'No podés enviarte mensajes a vos mismo.' });
    }

    // Verifica que el receptor exista y esté activo
    const receptor = await Usuario.findOne({
      where: { id: receptorId, activo: true },
      attributes: ['id', 'nombre', 'apellido', 'rol'],
    });
    if (!receptor) {
      return res.status(404).json({ success: false, message: 'El destinatario no existe o está inactivo.' });
    }

    // ── Verificar permiso de chat según reglas de roles ───────────────────────
    const { ok, motivo } = await puedeChatear(emisorId, Number(receptorId));
    if (!ok) {
      return res.status(403).json({ success: false, message: motivo });
    }

    if (!mensaje || mensaje.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'El mensaje no puede estar vacío.' });
    }
    if (mensaje.length > 2000) {
      return res.status(400).json({ success: false, message: 'El mensaje no puede superar los 2000 caracteres.' });
    }

    const nuevoMensaje = await Mensaje.create({
      emisorId,
      receptorId: Number(receptorId),
      mensaje: mensaje.trim(),
    });

    // ── Notificar al receptor (BD + email) ─────────────────────────────────
    // Anti-spam: solo enviar notificación si NO hay ya mensajes no leídos
    // del mismo emisor para este receptor (evita un email por cada burbuja).
    // El primer mensaje sin leer dispara la notificación; los siguientes no.
    const mensajesPreviosSinLeer = await Mensaje.count({
      where: {
        emisorId,
        receptorId: Number(receptorId),
        leido: false,
        id: { [Op.lt]: nuevoMensaje.id }, // mensajes anteriores al actual
      },
    });

    if (mensajesPreviosSinLeer === 0) {
      const emisor = await Usuario.findByPk(emisorId, { attributes: ['nombre', 'apellido'] });
      const nombreEmisor = emisor ? `${emisor.nombre} ${emisor.apellido}`.trim() : 'Alguien';
      const preview = mensaje.trim().length > 80
        ? mensaje.trim().slice(0, 80) + '…'
        : mensaje.trim();

      crearNotificacion({
        usuarioId: Number(receptorId),
        titulo: `Nuevo mensaje de ${nombreEmisor}`,
        mensaje: preview,
        tipo: 'chat',
        prioridad: 'normal',
        enlace: `/chat/${emisorId}`,
      }).catch((err) => console.error('[Chat] Error al notificar mensaje:', err.message));
    }

    return res.status(201).json({
      success: true,
      message: 'Mensaje enviado.',
      data: nuevoMensaje,
    });
  } catch (error) {
    console.error('Error en enviarMensaje:', error);
    return res.status(500).json({ success: false, message: 'Error al enviar el mensaje.' });
  }
};

// ── Historial de mensajes con un usuario ─────────────────────────────────────
/**
 * GET /api/chat/:usuarioId
 * Devuelve todos los mensajes intercambiados con un usuario específico.
 * Marca automáticamente como leídos los mensajes recibidos no leídos.
 *
 * Query params:
 *   limit  (default 50, máx 100) — cantidad de mensajes
 *   page   (default 1)           — paginación
 */
exports.getHistorial = async (req, res) => {
  try {
    const userId     = req.usuario.id;
    const partnerId  = Number(req.params.usuarioId);
    const limite     = Math.min(parseInt(req.query.limit) || 50, 100);
    const pagina     = Math.max(parseInt(req.query.page) || 1, 1);
    const offset     = (pagina - 1) * limite;

    if (partnerId === userId) {
      return res.status(400).json({ success: false, message: 'No podés chatear con vos mismo.' });
    }

    // Verifica que el otro usuario exista (sin includes para evitar 500 de Sequelize)
    const partner = await Usuario.findOne({
      where: { id: partnerId },
      attributes: ['id', 'nombre', 'apellido', 'fotoPerfil', 'rol', 'ultimoAcceso'],
    });
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    // Resolver razonSocial usando el helper existente (evita includes problemáticos)
    const partnerData = partner.toJSON();
    partnerData.razonSocial = partner.rol === 'empresa'
      ? await resolverRazonSocial(partnerId)
      : null;

    const { count, rows: mensajes } = await Mensaje.findAndCountAll({
      where: {
        [Op.or]: [
          { emisorId: userId, receptorId: partnerId },
          { emisorId: partnerId, receptorId: userId },
        ],
      },
      order: [['createdAt', 'DESC']],
      limit: limite,
      offset,
    });

    // Marca como leídos los mensajes recibidos (enviados por el partner) no leídos
    await Mensaje.update(
      { leido: true },
      { where: { emisorId: partnerId, receptorId: userId, leido: false } }
    );

    return res.json({
      success: true,
      total: count,
      pagina,
      totalPaginas: Math.ceil(count / limite),
      usuario: partnerData,
      // Invierte el orden para mostrar del más antiguo al más reciente
      data: mensajes.reverse(),
    });
  } catch (error) {
    console.error('Error en getHistorial:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener el historial.' });
  }
};

// ── Marcar conversación como leída ────────────────────────────────────────────
/**
 * PATCH /api/chat/:usuarioId/leer
 * Marca todos los mensajes recibidos de un usuario como leídos.
 * Útil cuando el usuario abre la conversación desde el frontend.
 */
exports.marcarLeida = async (req, res) => {
  try {
    const userId    = req.usuario.id;
    const partnerId = Number(req.params.usuarioId);

    const [updated] = await Mensaje.update(
      { leido: true },
      { where: { emisorId: partnerId, receptorId: userId, leido: false } }
    );

    return res.json({
      success: true,
      message: `${updated} mensaje(s) marcado(s) como leído(s).`,
      actualizados: updated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al marcar mensajes como leídos.' });
  }
};
