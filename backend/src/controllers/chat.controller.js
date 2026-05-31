/**
 * chat.controller.js — Controlador del sistema de mensajería directa.
 *
 * Implementa chat 1-a-1 entre alumnos/egresados y reclutadores (empresa).
 * El chat solo está disponible cuando existe una postulación en estado activo
 * (preseleccionado, entrevista_programada, entrevista o contratado) entre las dos partes.
 *
 * Endpoints:
 * - GET  /api/chat                → Lista de conversaciones del usuario autenticado
 * - POST /api/chat                → Enviar un mensaje (requiere postulación activa)
 * - GET  /api/chat/:usuarioId     → Historial de mensajes con un usuario específico
 * - PATCH /api/chat/:usuarioId/leer → Marcar mensajes de una conversación como leídos
 */

'use strict';

const { Mensaje, Usuario, Postulacion, Oferta, Empresa, EmpresaUsuario } = require('../models');
const { Op } = require('sequelize');
const { crearNotificacion } = require('../utils/notificador');

// Estados de postulación que habilitan el chat
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

// ── Helper: verificar que el par tenga postulación activa ─────────────────────
/**
 * Devuelve true si existe al menos una postulación entre el alumno y la empresa
 * con estado que habilita el chat.
 *
 * Soporta ambas direcciones: alumno como emisor o como receptor.
 */
async function tienePostulacionActiva(usuarioAId, usuarioBId) {
  try {
    const [uA, uB] = await Promise.all([
      Usuario.findByPk(usuarioAId, { attributes: ['id', 'rol'] }),
      Usuario.findByPk(usuarioBId, { attributes: ['id', 'rol'] }),
    ]);

    if (!uA || !uB) return false;

    let alumnoId, empresaUserId;
    if (['alumno', 'egresado'].includes(uA.rol) && uB.rol === 'empresa') {
      alumnoId = uA.id; empresaUserId = uB.id;
    } else if (['alumno', 'egresado'].includes(uB.rol) && uA.rol === 'empresa') {
      alumnoId = uB.id; empresaUserId = uA.id;
    } else {
      return false; // Combinación de roles no válida para el chat
    }

    // Buscar la empresa asociada al usuario empresa
    const empresa = await Empresa.findOne({ where: { usuarioId: empresaUserId } });
    if (!empresa) return false;

    // Buscar postulaciones del alumno a ofertas de esa empresa con estado habilitado
    // ⚠️ El campo correcto es 'usuarioId', no 'alumnoId'
    const postulacion = await Postulacion.findOne({
      where: { usuarioId: alumnoId, estado: { [Op.in]: ESTADOS_CHAT_HABILITADO } },
      include: [{
        model: Oferta,
        as: 'oferta',
        where: { empresaId: empresa.id },
        required: true,
      }],
    });

    return postulacion !== null;
  } catch (err) {
    console.error('[Chat] Error en tienePostulacionActiva:', err.message);
    return false;
  }
}

// ── Buscar usuarios para iniciar un nuevo chat ────────────────────────────────
/**
 * GET /api/chat/usuarios?q=texto
 * Busca usuarios activos por nombre, apellido o email.
 * Solo muestra usuarios con los que se puede chatear (alumno/egresado ↔ empresa).
 * Excluye al propio usuario autenticado y al rol 'admin'.
 */
exports.buscarUsuarios = async (req, res) => {
  try {
    const { id: userId, rol } = req.usuario;
    const q = (req.query.q || '').trim();

    if (q.length < 2) {
      return res.json({ success: true, data: [] });
    }

    // Roles que pueden aparecer en la búsqueda según el rol del emisor
    let rolesVisibles;
    if (['alumno', 'egresado'].includes(rol)) {
      rolesVisibles = ['empresa'];          // Alumno solo busca reclutadores
    } else if (rol === 'empresa') {
      rolesVisibles = ['alumno', 'egresado']; // Empresa solo busca alumnos
    } else {
      return res.json({ success: true, data: [] }); // Admin u otros no usan chat
    }

    const usuarios = await Usuario.findAll({
      where: {
        id:     { [Op.ne]: userId },
        activo: true,
        rol:    { [Op.in]: rolesVisibles },
        [Op.or]: [
          { nombre:   { [Op.iLike]: `%${q}%` } },
          { apellido: { [Op.iLike]: `%${q}%` } },
          { email:    { [Op.iLike]: `%${q}%` } },
        ],
      },
      attributes: ['id', 'nombre', 'apellido', 'email', 'rol'],
      include: [
        {
          model: EmpresaUsuario,
          as: 'membresiasEmpresa',
          required: false,
          where: { activo: true },
          attributes: [],
          include: [{ model: Empresa, as: 'empresa', attributes: ['razonSocial'] }],
        },
        { model: Empresa, as: 'empresa', required: false, attributes: ['razonSocial'] },
      ],
      limit: 20,
      order: [['nombre', 'ASC'], ['apellido', 'ASC']],
    });

    // Aplanar razonSocial en el objeto usuario
    const data = usuarios.map(u => {
      const plain = u.toJSON();
      return {
        id:          plain.id,
        nombre:      plain.nombre,
        apellido:    plain.apellido,
        email:       plain.email,
        rol:         plain.rol,
        razonSocial: plain.membresiasEmpresa?.[0]?.empresa?.razonSocial
                  ?? plain.empresa?.razonSocial ?? null,
      };
    });

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

    // ── Validación de postulación activa ──────────────────────────────────────
    // Solo se puede chatear si hay una postulación en estado que lo habilita
    const habilitado = await tienePostulacionActiva(emisorId, Number(receptorId));
    if (!habilitado) {
      return res.status(403).json({
        success: false,
        message: 'El chat solo está disponible cuando existe una postulación activa (preseleccionado, entrevista programada o contratado).',
      });
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

    // Verifica que el otro usuario exista e incluye datos de empresa si aplica
    const partner = await Usuario.findOne({
      where: { id: partnerId },
      attributes: ['id', 'nombre', 'apellido', 'fotoPerfil', 'rol', 'ultimoAcceso'],
      include: [
        {
          model: EmpresaUsuario,
          as: 'membresiasEmpresa',
          required: false,
          where: { activo: true },
          attributes: [],
          include: [{ model: Empresa, as: 'empresa', attributes: ['razonSocial'] }],
        },
        { model: Empresa, as: 'empresa', required: false, attributes: ['razonSocial'] },
      ],
    });
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    // Serializar razonSocial a nivel plano
    const partnerData = partner.toJSON();
    partnerData.razonSocial =
      partnerData.membresiasEmpresa?.[0]?.empresa?.razonSocial ??
      partnerData.empresa?.razonSocial ?? null;
    delete partnerData.membresiasEmpresa;
    delete partnerData.empresa;

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
