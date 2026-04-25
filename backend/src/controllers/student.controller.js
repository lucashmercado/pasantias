/**
 * student.controller.js — Controlador del panel del estudiante (alumno/egresado).
 *
 * Endpoints:
 * - GET /api/students/dashboard  → Métricas personales del alumno autenticado
 *
 * La lógica de ofertas recomendadas está en oferta.controller.js
 * (GET /api/ofertas/recomendadas) para mantener coherencia de prefijos.
 */

'use strict';

const { Postulacion, Notificacion, Oferta, Empresa, Perfil } = require('../models');
const { Op } = require('sequelize');

// ── Dashboard del alumno ──────────────────────────────────────────────────────
/**
 * GET /api/students/dashboard
 * Devuelve en una sola llamada todas las métricas del panel del alumno:
 *
 *   totalPostulaciones      — cantidad total de postulaciones enviadas
 *   enRevision              — postulaciones aún en espera de respuesta
 *   entrevistas             — postulaciones que llegaron a entrevista programada
 *   contrataciones          — postulaciones con resultado 'contratado'
 *   notificacionesNoLeidas  — campana de notificaciones (badge)
 *   ofertasRecomendadas     — hasta 5 ofertas sugeridas según el perfil del alumno
 *   perfilCompleto          — porcentaje de completitud del perfil (0-100)
 *
 * Acceso: alumno | egresado | profesor
 */
exports.getDashboard = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    // ── 1. Métricas de postulaciones ─────────────────────────────────────
    // Se ejecutan en paralelo para minimizar el tiempo de respuesta
    const [
      totalPostulaciones,
      enRevision,
      preseleccionados,
      entrevistas,
      contrataciones,
      noSeleccionados,
      notificacionesNoLeidas,
    ] = await Promise.all([
      Postulacion.count({ where: { usuarioId } }),
      Postulacion.count({ where: { usuarioId, estado: 'en_revision' } }),
      Postulacion.count({ where: { usuarioId, estado: 'preseleccionado' } }),
      Postulacion.count({ where: { usuarioId, estado: 'entrevista_programada' } }),
      Postulacion.count({ where: { usuarioId, estado: 'contratado' } }),
      Postulacion.count({ where: { usuarioId, estado: 'no_seleccionado' } }),
      Notificacion.count({ where: { usuarioId, leida: false } }),
    ]);

    // ── 2. Ofertas recomendadas para el dashboard ─────────────────────────
    // Lógica simplificada: top 5 ofertas activas del área de interés del alumno
    // (versión completa en GET /api/ofertas/recomendadas)
    const perfil = await Perfil.findOne({ where: { usuarioId } });
    const ofertasRecomendadas = await _getRecomendadas(perfil, req.usuario, usuarioId, 5);

    // ── 3. Completitud del perfil ─────────────────────────────────────────
    const perfilCompleto = _calcularCompletitudPerfil(perfil, req.usuario);

    return res.json({
      success: true,
      data: {
        // Métricas numéricas
        totalPostulaciones,
        enRevision,
        preseleccionados,
        entrevistas,
        contrataciones,
        noSeleccionados,
        notificacionesNoLeidas,
        // Ofertas sugeridas
        ofertasRecomendadas,
        // Progreso del perfil
        perfilCompleto,
      },
    });
  } catch (error) {
    console.error('Error en getDashboard:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener el dashboard.' });
  }
};

// ── Helpers internos ──────────────────────────────────────────────────────────

/**
 * Obtiene ofertas recomendadas para un alumno basándose en su perfil.
 * Excluye ofertas a las que ya se postuló.
 *
 * Criterios (en orden de prioridad):
 * 1. Área de interés del perfil
 * 2. Habilidades con overlap en habilidadesRequeridas
 * 3. Ciudad del usuario
 *
 * @param {Object|null} perfil  - Instancia del modelo Perfil del alumno
 * @param {Object}      usuario - Instancia del modelo Usuario (req.usuario)
 * @param {number}      usuarioId
 * @param {number}      limite  - Cantidad máxima de resultados
 * @returns {Promise<Array>}
 */
async function _getRecomendadas(perfil, usuario, usuarioId, limite = 10) {
  try {
    // Base: solo ofertas activas y aprobadas por el admin
    const where = { estado: 'activa', moderada: true };

    // Excluir ofertas a las que el alumno ya se postuló
    const postuladas = await Postulacion.findAll({
      where: { usuarioId },
      attributes: ['ofertaId'],
    });
    const idsPostuladas = postuladas.map((p) => p.ofertaId);
    if (idsPostuladas.length > 0) {
      where.id = { [Op.notIn]: idsPostuladas };
    }

    // Construir condiciones OR para la búsqueda inteligente
    const orConditions = [];

    if (perfil?.areaInteres) {
      orConditions.push({ area: { [Op.iLike]: `%${perfil.areaInteres}%` } });
    }
    if (perfil?.habilidades?.length > 0) {
      // Op.overlap encuentra ofertas cuyas habilidadesRequeridas intersectan con las del alumno
      orConditions.push({ habilidadesRequeridas: { [Op.overlap]: perfil.habilidades } });
    }
    if (usuario?.ubicacion) {
      orConditions.push({ ciudad: { [Op.iLike]: `%${usuario.ubicacion}%` } });
    }

    // Solo aplicar filtro inteligente si hay criterios; si el perfil está vacío, devolver recientes
    if (orConditions.length > 0) {
      where[Op.or] = orConditions;
    }

    return await Oferta.findAll({
      where,
      include: [{
        model: Empresa,
        as: 'empresa',
        attributes: ['razonSocial', 'logo', 'rubro', 'ciudad'],
      }],
      order: [['createdAt', 'DESC']],
      limit: limite,
    });
  } catch {
    return []; // Si falla la recomendación, el dashboard igual responde
  }
}

/**
 * Calcula el porcentaje de completitud del perfil del alumno (0-100).
 * Se usa para mostrar una barra de progreso en el dashboard.
 *
 * Campos evaluados (cada uno vale un punto):
 *   carrera, descripcion, habilidades, idiomas, linkedin, github,
 *   cvPath, areaInteres, disponibilidad, fotoPerfil,
 *   portfolio, experienciaLaboral, certificaciones
 *   + telefono y ubicacion del usuario
 *
 * @param {Object|null} perfil
 * @param {Object}      usuario
 * @returns {number} Porcentaje (0-100)
 */
function _calcularCompletitudPerfil(perfil, usuario) {
  if (!perfil) return 0;

  const campos = [
    !!perfil.carrera,
    !!perfil.descripcion,
    perfil.habilidades?.length > 0,
    perfil.idiomas?.length > 0,
    !!perfil.linkedin,
    !!perfil.github,
    !!perfil.cvPath,
    !!perfil.areaInteres,
    !!perfil.disponibilidad,
    !!perfil.fotoPerfil,
    !!perfil.portfolio,
    !!perfil.experienciaLaboral,
    perfil.certificaciones?.length > 0,
    !!usuario?.telefono,
    !!usuario?.ubicacion,
  ];

  const completados = campos.filter(Boolean).length;
  return Math.round((completados / campos.length) * 100);
}

// Exportar el helper para que lo use oferta.controller.js
module.exports.getRecomendadasHelper = _getRecomendadas;
