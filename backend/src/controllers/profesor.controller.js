/**
 * profesor.controller.js — Controlador del panel institucional del profesor.
 *
 * Permite a los profesores:
 * - Ver el listado de alumnos registrados en el sistema
 * - Ver todas las postulaciones para revisión / aval
 * - Gestionar sus propios avales (crear, aprobar, rechazar, comentar)
 *
 * Endpoints:
 * - GET  /api/profesor/alumnos              → Ver alumnos del sistema
 * - GET  /api/profesor/postulaciones        → Ver postulaciones con avales pendientes
 * - GET  /api/profesor/avales               → Ver avales propios
 * - POST /api/profesor/avales               → Crear un aval para una postulación
 * - PATCH /api/profesor/avales/:id          → Aprobar / rechazar / comentar un aval
 */

'use strict';

const { Usuario, Perfil, Postulacion, Oferta, Empresa, Aval, Notificacion } = require('../models');
const { Op } = require('sequelize');

// ── Listar alumnos ────────────────────────────────────────────────────────────
/**
 * GET /api/profesor/alumnos
 * Devuelve todos los alumnos y egresados activos con su perfil académico.
 * Útil para que el profesor conozca a sus estudiantes en el sistema.
 *
 * Query params:
 *   q          — búsqueda por nombre o apellido
 *   carrera    — filtrar por carrera
 *   disponible — 'true' para mostrar solo disponibles (disponibilidad != 'no_disponible')
 */
exports.getAlumnos = async (req, res) => {
  try {
    const { q, carrera, disponible } = req.query;

    const whereUsuario = {
      rol: ['alumno', 'egresado'],
      activo: true,
    };
    if (q) {
      whereUsuario[Op.or] = [
        { nombre: { [Op.iLike]: `%${q}%` } },
        { apellido: { [Op.iLike]: `%${q}%` } },
      ];
    }

    const wherePerfil = {};
    if (carrera) wherePerfil.carrera = { [Op.iLike]: `%${carrera}%` };
    if (disponible === 'true') wherePerfil.disponibilidad = { [Op.ne]: 'no_disponible' };

    const alumnos = await Usuario.findAll({
      where: whereUsuario,
      attributes: { exclude: ['password', 'tokenReset', 'tokenResetExpira'] },
      include: [{
        model: Perfil,
        as: 'perfil',
        where: Object.keys(wherePerfil).length > 0 ? wherePerfil : undefined,
        required: Object.keys(wherePerfil).length > 0,
      }],
      order: [['apellido', 'ASC'], ['nombre', 'ASC']],
    });

    return res.json({ success: true, total: alumnos.length, data: alumnos });
  } catch (error) {
    console.error('Error en getAlumnos:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener alumnos.' });
  }
};

// ── Listar postulaciones para revisión ───────────────────────────────────────
/**
 * GET /api/profesor/postulaciones
 * Devuelve todas las postulaciones del sistema que el profesor puede revisar.
 * Incluye el estado del aval si ya existe uno del profesor autenticado.
 *
 * Query params:
 *   pendientes — 'true' para mostrar solo las que no tienen aval de este profesor
 *   estado     — filtrar por estado de la postulación
 */
exports.getPostulaciones = async (req, res) => {
  try {
    const { pendientes, estado } = req.query;
    const profesorId = req.usuario.id;

    const wherePost = {};
    if (estado) wherePost.estado = estado;

    const postulaciones = await Postulacion.findAll({
      where: wherePost,
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'nombre', 'apellido', 'email'],
          include: [{ model: Perfil, as: 'perfil', attributes: ['carrera', 'anioEgreso', 'habilidades', 'areaInteres', 'cvPath'] }],
        },
        {
          model: Oferta,
          as: 'oferta',
          attributes: ['id', 'titulo', 'area', 'modalidad', 'ciudad'],
          include: [{ model: Empresa, as: 'empresa', attributes: ['razonSocial'] }],
        },
        {
          model: Aval,
          as: 'avales',
          where: { profesorId },       // Muestra solo el aval de ESTE profesor
          required: pendientes === 'true' ? false : false,  // LEFT JOIN siempre
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Si ?pendientes=true, filtra las que no tienen aval de este profesor
    let data = postulaciones;
    if (pendientes === 'true') {
      data = postulaciones.filter((p) => p.avales.length === 0);
    }

    return res.json({
      success: true,
      total: data.length,
      data: data.map((p) => ({
        ...p.toJSON(),
        miAval: p.avales[0] || null,       // El aval de este profesor (si existe)
      })),
    });
  } catch (error) {
    console.error('Error en getPostulaciones:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener postulaciones.' });
  }
};

// ── Ver avales del profesor ────────────────────────────────────────────────────
/**
 * GET /api/profesor/avales
 * Devuelve todos los avales emitidos por el profesor autenticado.
 *
 * Query params:
 *   estado — 'pendiente' | 'aprobado' | 'rechazado'
 */
exports.getMisAvales = async (req, res) => {
  try {
    const { estado } = req.query;
    const where = { profesorId: req.usuario.id };
    if (estado) where.estado = estado;

    const avales = await Aval.findAll({
      where,
      include: [{
        model: Postulacion,
        as: 'postulacion',
        include: [
          { model: Usuario, as: 'usuario', attributes: ['nombre', 'apellido', 'email'] },
          {
            model: Oferta,
            as: 'oferta',
            attributes: ['titulo', 'area', 'ciudad'],
            include: [{ model: Empresa, as: 'empresa', attributes: ['razonSocial'] }],
          },
        ],
      }],
      order: [['createdAt', 'DESC']],
    });

    return res.json({ success: true, total: avales.length, data: avales });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al obtener avales.' });
  }
};

// ── Crear aval ────────────────────────────────────────────────────────────────
/**
 * POST /api/profesor/avales
 * El profesor crea un aval para una postulación.
 * Puede crearlo ya con estado 'aprobado' o 'rechazado', o en 'pendiente' para decidir después.
 *
 * Body:
 *   postulacionId {number}  — ID de la postulación
 *   estado        {string}  — 'pendiente' | 'aprobado' | 'rechazado' (default: 'pendiente')
 *   comentario    {string}  — observaciones (requerido si estado != 'pendiente')
 */
exports.crearAval = async (req, res) => {
  try {
    const { postulacionId, estado = 'pendiente', comentario } = req.body;
    const profesorId = req.usuario.id;

    // Verifica que la postulación exista
    const postulacion = await Postulacion.findByPk(postulacionId, {
      include: [
        { model: Usuario, as: 'usuario', attributes: ['nombre', 'apellido'] },
        { model: Oferta, as: 'oferta', attributes: ['titulo'] },
      ],
    });
    if (!postulacion) {
      return res.status(404).json({ success: false, message: 'Postulación no encontrada.' });
    }

    // Verifica que no exista ya un aval de este profesor para esta postulación
    const existente = await Aval.findOne({ where: { postulacionId, profesorId } });
    if (existente) {
      return res.status(400).json({
        success: false,
        message: 'Ya emitiste un aval para esta postulación. Usá PATCH para modificarlo.',
      });
    }

    const fechaRevision = estado !== 'pendiente' ? new Date() : null;

    const aval = await Aval.create({
      postulacionId,
      profesorId,
      estado,
      comentario: comentario || null,
      fechaRevision,
    });

    // Notifica al alumno si el aval ya tiene una decisión
    if (estado !== 'pendiente') {
      await _notificarAlumnoAval(postulacion, aval, estado);
    }

    return res.status(201).json({ success: true, message: 'Aval creado.', data: aval });
  } catch (error) {
    console.error('Error en crearAval:', error);
    return res.status(500).json({ success: false, message: 'Error al crear el aval.' });
  }
};

// ── Actualizar aval (aprobar / rechazar / comentar) ────────────────────────────
/**
 * PATCH /api/profesor/avales/:id
 * El profesor actualiza su aval (decide su estado o agrega/edita el comentario).
 *
 * Body (al menos uno requerido):
 *   estado     {string} — 'pendiente' | 'aprobado' | 'rechazado'
 *   comentario {string} — observaciones del profesor
 *
 * Efecto secundario: si el estado cambia a 'aprobado' o 'rechazado',
 * se notifica al alumno automáticamente.
 */
exports.updateAval = async (req, res) => {
  try {
    const { estado, comentario } = req.body;

    // Solo el profesor que creó el aval puede modificarlo
    const aval = await Aval.findOne({
      where: { id: req.params.id, profesorId: req.usuario.id },
    });
    if (!aval) {
      return res.status(404).json({ success: false, message: 'Aval no encontrado.' });
    }

    const updateData = {};
    if (estado !== undefined)     updateData.estado = estado;
    if (comentario !== undefined) updateData.comentario = comentario;

    // Registra la fecha de revisión cuando se toma una decisión
    if (estado && estado !== 'pendiente') {
      updateData.fechaRevision = new Date();
    }

    await aval.update(updateData);

    // Notifica al alumno si se tomó una decisión
    if (estado && estado !== 'pendiente') {
      const postulacion = await Postulacion.findByPk(aval.postulacionId, {
        include: [
          { model: Usuario, as: 'usuario', attributes: ['nombre', 'apellido'] },
          { model: Oferta, as: 'oferta', attributes: ['titulo'] },
        ],
      });
      if (postulacion) await _notificarAlumnoAval(postulacion, aval, estado);
    }

    return res.json({ success: true, message: 'Aval actualizado.', data: aval });
  } catch (error) {
    console.error('Error en updateAval:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar el aval.' });
  }
};

// ── Helper interno ────────────────────────────────────────────────────────────
/**
 * Crea una notificación para el alumno cuando el profesor decide sobre su aval.
 */
async function _notificarAlumnoAval(postulacion, aval, estado) {
  try {
    const esAprobado = estado === 'aprobado';
    await Notificacion.create({
      usuarioId: postulacion.usuarioId,
      titulo: esAprobado
        ? `Tu aval fue aprobado — ${postulacion.oferta.titulo}`
        : `Tu aval fue rechazado — ${postulacion.oferta.titulo}`,
      mensaje: aval.comentario
        ? `El profesor dejó la siguiente observación: "${aval.comentario}"`
        : `Tu postulación a "${postulacion.oferta.titulo}" fue ${estado} por el profesor.`,
      tipo: 'aval',
      prioridad: esAprobado ? 'alta' : 'normal',
      tipoVisual: esAprobado ? 'success' : 'warning',
      accionURL: `/mis-postulaciones/${postulacion.id}`,
      enlace: `/mis-postulaciones/${postulacion.id}`,
    });
  } catch (err) {
    console.error('⚠️ No se pudo notificar al alumno sobre el aval:', err.message);
  }
}

// ── Listar profesores disponibles ─────────────────────────────────────────────
/**
 * GET /api/profesor/lista
 * Devuelve todos los usuarios con rol 'profesor' activos.
 * Accesible por cualquier usuario autenticado (alumno, egresado, etc.)
 * para que puedan elegir a qué profesor solicitar el aval.
 */
exports.listarProfesores = async (req, res) => {
  try {
    const profesores = await Usuario.findAll({
      where: { rol: 'profesor', activo: true },
      attributes: ['id', 'nombre', 'apellido', 'email', 'fotoPerfil', 'ubicacion'],
      order: [['apellido', 'ASC'], ['nombre', 'ASC']],
    });
    return res.json({ success: true, total: profesores.length, data: profesores });
  } catch (error) {
    console.error('Error en listarProfesores:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener la lista de profesores.' });
  }
};

// ── Solicitar aval (acción del alumno) ────────────────────────────────────────
/**
 * POST /api/profesor/solicitar-aval
 * El alumno pide a un profesor que avale su postulación.
 * Crea un Aval en estado 'pendiente' y notifica al profesor.
 *
 * Body:
 *   postulacionId  {number}  — ID de la postulación propia
 *   profesorId     {number}  — ID del profesor elegido
 *   mensajeAlumno  {string}  — Mensaje/contexto para el profesor (opcional)
 *
 * Restricciones:
 * - Solo el alumno dueño de la postulación puede solicitarlo
 * - No se puede solicitar dos veces al mismo profesor para la misma postulación
 */
exports.solicitarAval = async (req, res) => {
  try {
    const { postulacionId, profesorId, mensajeAlumno } = req.body;
    const alumnoId = req.usuario.id;

    if (!postulacionId || !profesorId) {
      return res.status(400).json({ success: false, message: 'Faltan campos: postulacionId y profesorId son obligatorios.' });
    }

    // Verifica que la postulación exista y pertenezca al alumno autenticado
    const postulacion = await Postulacion.findOne({
      where: { id: postulacionId, usuarioId: alumnoId },
      include: [
        { model: Usuario, as: 'usuario', attributes: ['nombre', 'apellido'] },
        { model: Oferta,  as: 'oferta',  attributes: ['titulo'] },
      ],
    });
    if (!postulacion) {
      return res.status(404).json({ success: false, message: 'Postulación no encontrada o no te pertenece.' });
    }

    // Verifica que el profesor exista y tenga rol 'profesor'
    const profesor = await Usuario.findOne({ where: { id: profesorId, rol: 'profesor', activo: true } });
    if (!profesor) {
      return res.status(404).json({ success: false, message: 'Profesor no encontrado.' });
    }

    // Verifica que no exista ya un aval de este profesor para esta postulación
    const existente = await Aval.findOne({ where: { postulacionId, profesorId } });
    if (existente) {
      return res.status(400).json({
        success: false,
        message: `Ya enviaste una solicitud al Prof. ${profesor.apellido}. Estado actual: ${existente.estado}.`,
      });
    }

    // Crea el aval en estado pendiente
    const aval = await Aval.create({
      postulacionId,
      profesorId,
      estado: 'pendiente',
      mensajeAlumno: mensajeAlumno?.trim() || null,
    });

    // Notifica al profesor que recibió una solicitud
    try {
      await Notificacion.create({
        usuarioId: profesorId,
        titulo: `Solicitud de aval — ${postulacion.oferta?.titulo ?? 'Pasantía'}`,
        mensaje: mensajeAlumno?.trim()
          ? `${postulacion.usuario.nombre} ${postulacion.usuario.apellido} te solicita un aval y escribió: "${mensajeAlumno.trim()}"`
          : `${postulacion.usuario.nombre} ${postulacion.usuario.apellido} te solicita que avales su postulación a "${postulacion.oferta?.titulo}".`,
        tipo: 'aval',
        prioridad: 'alta',
        tipoVisual: 'info',
        accionURL: '/profesor/avales',
        enlace: '/profesor/avales',
      });
    } catch (notifErr) {
      console.warn('⚠️ No se pudo notificar al profesor:', notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: `Solicitud enviada al Prof. ${profesor.nombre} ${profesor.apellido}. Te avisaremos cuando tome una decisión.`,
      data: aval,
    });
  } catch (error) {
    console.error('Error en solicitarAval:', error);
    return res.status(500).json({ success: false, message: 'Error al solicitar el aval.' });
  }
};

