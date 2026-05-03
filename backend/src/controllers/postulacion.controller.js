/**
 * postulacion.controller.js — Controlador de postulaciones.
 *
 * Gestiona el proceso de postulación de alumnos/egresados a ofertas de pasantía:
 * - Enviar una postulación a una oferta (con validaciones ampliadas)
 * - Ver el historial detallado de postulaciones del alumno autenticado
 * - Ver los candidatos de una oferta específica (para la empresa)
 * - Actualizar el estado de una postulación (para la empresa)
 *
 * Cada cambio de estado genera automáticamente una notificación al alumno.
 *
 * Changelog:
 * - v1.1: validación de CV requerido antes de postularse
 *         validación explícita de oferta cerrada/pausada/no moderada
 *         getMisPostulaciones devuelve historial detallado con campos semánticos
 */

'use strict';

const { Postulacion, Oferta, Usuario, Perfil, Empresa, Notificacion, Aval, ActivityLog } = require('../models');

// Helper: resuelve la empresa desde req.empresa (middleware) o por usuarioId (fallback)
async function _resolverEmpresa(req) {
  if (req.empresa) return req.empresa;
  return Empresa.findOne({ where: { usuarioId: req.usuario.id } });
}


// Helper para registrar acciones en el log sin interrumpir el flujo principal
async function logAction(datos) {
  try { await ActivityLog.create(datos); } catch (e) { /* Fallo silencioso */ }
}

// ── Postularse ────────────────────────────────────────────────────────────────
/**
 * POST /api/postulaciones
 * Permite a un alumno/egresado postularse a una oferta activa.
 *
 * Validaciones (en orden de ejecución):
 * 1. El alumno debe tener un CV cargado en su perfil
 * 2. No puede postularse dos veces a la misma oferta
 * 3. La oferta debe existir, estar activa Y haber sido moderada por el admin
 *    (no se puede postular a ofertas cerradas, pausadas o pendientes)
 *
 * Efecto secundario: genera una notificación para la empresa.
 */
exports.postular = async (req, res) => {
  try {
    const { ofertaId, cartaPresentacion } = req.body;
    const usuarioId = req.usuario.id;

    // ── Validación 1: CV obligatorio ──────────────────────────────────────
    // El alumno debe haber subido su CV antes de poder postularse
    const perfil = await Perfil.findOne({ where: { usuarioId } });
    if (!perfil || !perfil.cvPath) {
      return res.status(400).json({
        success: false,
        message: 'Debés subir tu CV antes de postularte. Completá tu perfil primero.',
        code: 'CV_REQUERIDO',
      });
    }

    // ── Validación 2: no duplicar postulación ─────────────────────────────
    const existe = await Postulacion.findOne({ where: { usuarioId, ofertaId } });
    if (existe) {
      return res.status(400).json({
        success: false,
        message: 'Ya te postulaste a esta oferta.',
        code: 'POSTULACION_DUPLICADA',
      });
    }

    // ── Validación 3: verificar estado y moderación de la oferta ──────────
    const oferta = await Oferta.findByPk(ofertaId, {
      include: [{ model: Empresa, as: 'empresa' }],
    });

    if (!oferta) {
      return res.status(404).json({ success: false, message: 'Oferta no encontrada.', code: 'OFERTA_NOT_FOUND' });
    }
    if (oferta.estado === 'cerrada') {
      return res.status(400).json({ success: false, message: 'Esta oferta ya está cerrada.', code: 'OFERTA_CERRADA' });
    }
    if (oferta.estado === 'pausada') {
      return res.status(400).json({ success: false, message: 'Esta oferta está pausada temporalmente.', code: 'OFERTA_PAUSADA' });
    }
    if (!oferta.moderada) {
      return res.status(400).json({ success: false, message: 'Esta oferta no está disponible.', code: 'OFERTA_NO_DISPONIBLE' });
    }

    // Verifica fecha límite si está configurada
    if (oferta.fechaLimite && new Date() > new Date(oferta.fechaLimite)) {
      return res.status(400).json({
        success: false,
        message: 'El plazo para postularse a esta oferta venció.',
        code: 'OFERTA_VENCIDA',
      });
    }

    // ── Crear la postulación ──────────────────────────────────────────────
    const postulacion = await Postulacion.create({ usuarioId, ofertaId, cartaPresentacion });

    // Notifica a la empresa que recibió una nueva postulación
    await Notificacion.create({
      usuarioId: oferta.empresa.usuarioId,
      titulo: 'Nueva postulación recibida',
      mensaje: `${req.usuario.nombre} ${req.usuario.apellido} se postuló a "${oferta.titulo}".`,
      tipo: 'postulacion',
      enlace: `/empresa/postulaciones/${postulacion.id}`,
    });

    // Registra la postulación en el log de auditoría (antes del return)
    logAction({
      usuarioId: req.usuario.id,
      accion: 'postular',
      entidad: 'postulacion',
      entidadId: postulacion.id,
      detalle: { ofertaId, ofertaTitulo: oferta.titulo, empresa: oferta.empresa?.razonSocial },
      ip: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: 'Postulación enviada correctamente.',
      data: _formatPostulacion(postulacion),
    });
  } catch (error) {
    console.error('Error en postular:', error);
    return res.status(500).json({ success: false, message: 'Error al postularse.' });
  }
};

// ── Historial de postulaciones del usuario (detallado) ───────────────────────
/**
 * GET /api/postulaciones/mis
 * Devuelve todas las postulaciones del alumno autenticado con historial detallado.
 *
 * Campos incluidos en cada postulación:
 *   id, fechaPostulacion, estadoActual, ultimaActualizacion,
 *   observacionesEmpresa (alias de notasEmpresa), cartaPresentacion,
 *   oferta (con datos de la empresa)
 *
 * Ordenadas de más reciente a más antigua.
 *
 * COMPATIBILIDAD: la respuesta mantiene los campos del modelo original
 * y agrega los campos semánticos nuevos.
 */
exports.getMisPostulaciones = async (req, res) => {
  try {
    // Verifica que la alumno sea dueño de la postulación
    const postulaciones = await Postulacion.findAll({
      where: { usuarioId: req.usuario.id },
      include: [
        {
          model: Oferta,
          as: 'oferta',
          include: [{ model: Empresa, as: 'empresa', attributes: ['razonSocial', 'logo', 'ciudad', 'rubro'] }],
        },
        {
          model: Aval,
          as: 'avales',
          required: false,
          include: [{
            model: Usuario,
            as: 'profesor',
            attributes: ['id', 'nombre', 'apellido', 'email'],
          }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const data = postulaciones.map(_formatPostulacion);
    return res.json({ success: true, total: data.length, data });
  } catch (error) {
    console.error('Error en getMisPostulaciones:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener postulaciones.' });
  }
};


// ── Postulaciones de una oferta con revisión avanzada (empresa) ───────────────
/**
 * GET /api/postulaciones/oferta/:ofertaId
 * Devuelve todos los candidatos que se postularon a una oferta específica.
 * Solo puede consultarlo la empresa dueña de esa oferta.
 *
 * Cada postulación incluye:
 *   - perfil completo del candidato (habilidades, idiomas, carrera, etc.)
 *   - cvDisponible y cvUrl para descarga directa
 *   - compatibilidadOferta: % de habilidades requeridas que tiene el candidato
 *   - historialAcademico: resumen de carrera, año de egreso y certificaciones
 *   - estadoActual, ultimaActualizacion, observacionesEmpresa (aliases semánticos)
 */
exports.getPostulacionesByOferta = async (req, res) => {
  try {
    const empresa = await _resolverEmpresa(req);
    if (!empresa) return res.status(403).json({ success: false, message: 'No tenés un perfil de empresa activo.' });

    const oferta = await Oferta.findOne({ where: { id: req.params.ofertaId, empresaId: empresa.id } });
    if (!oferta) return res.status(404).json({ success: false, message: 'Oferta no encontrada.' });

    // Construye los includes — el de Aval es opcional para evitar fallo si la tabla no existe aún
    const includes = [
      {
        model: Usuario,
        as: 'usuario',
        attributes: { exclude: ['password', 'tokenReset', 'tokenResetExpira'] },
        include: [{ model: Perfil, as: 'perfil' }],
      },
    ];

    // Intenta incluir avales académicos (puede no existir la columna en BD antigua)
    try {
      includes.push({
        model: Aval,
        as: 'avales',
        required: false,
        include: [{
          model: Usuario,
          as: 'profesor',
          attributes: ['id', 'nombre', 'apellido'],
        }],
      });
    } catch (avalIncludeError) {
      console.warn('⚠️ No se pudo incluir avales en la query:', avalIncludeError.message);
    }

    // Trae postulaciones con perfil completo del candidato y sus avales académicos
    const postulaciones = await Postulacion.findAll({
      where: { ofertaId: oferta.id },
      include: includes,
      order: [['createdAt', 'DESC']],
    });

    // Enriquece cada postulación con datos de compatibilidad y CV
    const data = postulaciones.map((p) => {
      const plain = p.toJSON();
      const perfil = plain.usuario?.perfil;

      return {
        ...plain,
        estadoActual: plain.estado,
        ultimaActualizacion: plain.updatedAt,
        observacionesEmpresa: plain.notasEmpresa,
        cvDisponible: !!perfil?.cvPath,
        cvUrl: perfil?.cvPath || null,
        compatibilidadOferta: _calcularCompatibilidad(perfil, oferta),
        historialAcademico: perfil ? {
          carrera: perfil.carrera,
          anioEgreso: perfil.anioEgreso,
          certificaciones: perfil.certificaciones || [],
          disponibilidad: perfil.disponibilidad,
          areaInteres: perfil.areaInteres,
        } : null,
      };
    });

    return res.json({
      success: true,
      total: data.length,
      oferta: {
        id: oferta.id,
        titulo: oferta.titulo,
        habilidadesRequeridas: oferta.habilidadesRequeridas,
      },
      data,
    });
  } catch (error) {
    console.error('Error en getPostulacionesByOferta:', error.message);
    return res.status(500).json({ success: false, message: 'Error al obtener postulaciones.', detail: error.message });
  }
};


/**
 * Calcula el porcentaje de compatibilidad entre el perfil del candidato
 * y las habilidades requeridas por la oferta.
 *
 * @param {Object|null} perfil  - Perfil del candidato
 * @param {Object}      oferta  - Oferta con habilidadesRequeridas
 * @returns {number|null}       - Porcentaje 0-100, o null si no hay datos
 */
function _calcularCompatibilidad(perfil, oferta) {
  const requeridas = oferta?.habilidadesRequeridas || [];
  const candidato  = perfil?.habilidades || [];
  if (requeridas.length === 0 || candidato.length === 0) return null;

  const req = requeridas.map((h) => h.toLowerCase().trim());
  const can = candidato.map((h) => h.toLowerCase().trim());
  const coincidencias = req.filter((h) => can.includes(h)).length;

  return Math.round((coincidencias / req.length) * 100);
}

// ── Cambiar estado de postulación (empresa) ───────────────────────────────────
/**
 * PATCH /api/postulaciones/:id/estado
 * Permite a la empresa actualizar el estado del proceso de selección de un candidato.
 *
 * Estados posibles:
 *   en_revision → preseleccionado → entrevista_programada → contratado / no_seleccionado
 *
 * Body opcional:
 *   - estado          {string} — nuevo estado
 *   - notasEmpresa    {string} — observaciones internas (no visibles al alumno)
 *
 * Efecto secundario: envía una notificación automática al alumno con el cambio de estado.
 */
exports.updateEstado = async (req, res) => {
  try {
    const { estado, notasEmpresa } = req.body;
    const postulacion = await Postulacion.findByPk(req.params.id, {
      include: [{ model: Oferta, as: 'oferta', include: [{ model: Empresa, as: 'empresa' }] }],
    });

    if (!postulacion) return res.status(404).json({ success: false, message: 'Postulación no encontrada.' });

    const empresa = await _resolverEmpresa(req);
    if (!empresa) return res.status(403).json({ success: false, message: 'No tenés un perfil de empresa activo.' });
    if (postulacion.oferta.empresaId !== empresa.id) {
      return res.status(403).json({ success: false, message: 'No tenés permiso para modificar esta postulación.' });
    }

    // Campos a actualizar: estado y/o notas internas
    const updateData = {};
    if (estado) updateData.estado = estado;
    if (notasEmpresa !== undefined) updateData.notasEmpresa = notasEmpresa;

    await postulacion.update(updateData);

    // Mapeo de estados a mensajes legibles para la notificación del alumno
    // Incluye tanto los estados legacy como los nuevos aliases
    const estadoTexto = {
      preseleccionado:       'Fuiste preseleccionado/a',
      entrevista_programada: 'Tu entrevista fue programada',  // legacy
      entrevista:            'Tu entrevista fue programada',  // nuevo
      no_seleccionado:       'Tu postulación no fue seleccionada', // legacy
      rechazado:             'Tu postulación no fue seleccionada', // nuevo
      contratado:            '¡Felicitaciones! Fuiste seleccionado/a',
    };

    // Solo notifica si se cambió el estado (no cuando solo se actualizan notas)
    if (estado) {
      await Notificacion.create({
        usuarioId: postulacion.usuarioId,
        titulo: estadoTexto[estado] || 'Estado actualizado',
        mensaje: `Tu postulación para "${postulacion.oferta.titulo}" cambió a: ${estado.replace(/_/g, ' ')}.`,
        tipo: 'estado',
        enlace: `/mis-postulaciones/${postulacion.id}`,
      });
    }

    // Registra el cambio de estado en el log de auditoría
    if (estado) {
      logAction({
        usuarioId: req.usuario.id,
        accion: 'cambiar_estado_postulacion',
        entidad: 'postulacion',
        entidadId: postulacion.id,
        detalle: { nuevoEstado: estado, oferta: postulacion.oferta?.titulo },
        ip: req.ip,
      });
    }

    return res.json({ success: true, message: 'Postulación actualizada.', data: _formatPostulacion(postulacion) });
  } catch (error) {
    console.error('Error en updateEstado:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar el estado.' });
  }
};

// ── Helper interno ────────────────────────────────────────────────────────────

/**
 * Formatea una instancia de Postulacion para la respuesta JSON.
 * Agrega campos semánticos manteniendo retrocompatibilidad con el modelo.
 *
 * Mapeos:
 *   estadoActual        ← estado  (alias semántico)
 *   ultimaActualizacion ← updatedAt
 *   observacionesEmpresa← notasEmpresa (alias semántico)
 *
 * @param {Object} p - Instancia de Postulacion (puede ser Sequelize model o plain object)
 * @returns {Object}
 */
function _formatPostulacion(p) {
  const plain = p?.toJSON ? p.toJSON() : p;
  return {
    ...plain,
    // ── Campos semánticos nuevos ──────────────────────────────────────────
    estadoActual: plain.estado,                    // alias de 'estado'
    ultimaActualizacion: plain.updatedAt,          // cuándo se modificó por última vez
    observacionesEmpresa: plain.notasEmpresa,      // alias de 'notasEmpresa'
  };
}
