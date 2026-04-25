/**
 * oferta.controller.js — Controlador de ofertas de pasantía.
 *
 * Maneja las operaciones CRUD sobre las ofertas publicadas por las empresas:
 * - Listar ofertas públicas con filtros
 * - Ver el detalle de una oferta específica
 * - Crear nuevas ofertas (solo empresas aprobadas)
 * - Actualizar una oferta existente (solo la empresa dueña)
 * - Cerrar/eliminar una oferta (solo la empresa dueña)
 * - Obtener ofertas recomendadas para el alumno autenticado [NUEVO]
 *
 * Changelog:
 * - v1.1: agregado getOfertasRecomendadas (buscador inteligente por perfil del alumno)
 */

'use strict';

const { Oferta, Empresa, Usuario, Perfil, Postulacion } = require('../models');
const { Op } = require('sequelize');

// ── Listar ofertas con filtros ────────────────────────────────────────────────
/**
 * GET /api/ofertas
 * Devuelve las ofertas activas y moderadas (aprobadas por el admin).
 * Acepta filtros opcionales por query params: area, modalidad, ciudad, experiencia, q (búsqueda por título).
 */
exports.getOfertas = async (req, res) => {
  try {
    const { area, modalidad, ciudad, experiencia, q } = req.query;

    // Solo se muestran ofertas activas y ya aprobadas por el admin
    const where = { estado: 'activa', moderada: true };

    // Aplica los filtros de búsqueda si fueron enviados (búsqueda parcial e insensible a mayúsculas)
    if (area) where.area = { [Op.iLike]: `%${area}%` };
    if (modalidad) where.modalidad = modalidad;
    if (ciudad) where.ciudad = { [Op.iLike]: `%${ciudad}%` };
    if (experiencia) where.nivelExperiencia = experiencia;
    if (q) where.titulo = { [Op.iLike]: `%${q}%` }; // Búsqueda por texto en el título

    const ofertas = await Oferta.findAll({
      where,
      // Incluye solo los datos públicos de la empresa (no datos sensibles)
      include: [{ model: Empresa, as: 'empresa', attributes: ['razonSocial', 'logo', 'rubro', 'ciudad'] }],
      order: [['createdAt', 'DESC']], // Las más recientes primero
    });

    return res.json({ success: true, total: ofertas.length, data: ofertas });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Error al obtener las ofertas.' });
  }
};

// ── Ofertas recomendadas (buscador inteligente) ───────────────────────────────
/**
 * GET /api/ofertas/recomendadas
 * Devuelve ofertas personalizadas basadas en el perfil del alumno autenticado.
 *
 * Criterios de recomendación (OR — basta con que coincida uno):
 *   - areaInteres del perfil ↔ area de la oferta
 *   - habilidades del perfil ↔ habilidadesRequeridas de la oferta (array overlap)
 *   - ubicacion del usuario  ↔ ciudad de la oferta
 *   - carrera del perfil     ↔ area de la oferta (fallback)
 *
 * Exclusiones automáticas:
 *   - Ofertas a las que el alumno ya se postuló
 *   - Ofertas cerradas o no moderadas
 *
 * Query params opcionales:
 *   - limit  (default 10, máx 20) — cantidad de resultados
 *   - page   (default 1)          — paginación
 *
 * Acceso: alumno | egresado | profesor
 */
exports.getOfertasRecomendadas = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const limite = Math.min(parseInt(req.query.limit) || 10, 20);
    const pagina = Math.max(parseInt(req.query.page) || 1, 1);
    const offset = (pagina - 1) * limite;

    // Obtiene el perfil del alumno para extraer sus preferencias
    const perfil = await Perfil.findOne({ where: { usuarioId } });

    // Base: solo ofertas activas y aprobadas
    const where = { estado: 'activa', moderada: true };

    // Excluye ofertas a las que el alumno ya se postuló
    const postuladas = await Postulacion.findAll({
      where: { usuarioId },
      attributes: ['ofertaId'],
    });
    const idsPostuladas = postuladas.map((p) => p.ofertaId);
    if (idsPostuladas.length > 0) {
      where.id = { [Op.notIn]: idsPostuladas };
    }

    // Construye condiciones OR para la búsqueda inteligente
    const orConditions = [];

    if (perfil?.areaInteres) {
      orConditions.push({ area: { [Op.iLike]: `%${perfil.areaInteres}%` } });
    }
    if (perfil?.carrera) {
      // Fallback: la carrera también puede relacionarse con el área de la oferta
      orConditions.push({ area: { [Op.iLike]: `%${perfil.carrera}%` } });
    }
    if (perfil?.habilidades?.length > 0) {
      // Encuentra ofertas cuyas habilidadesRequeridas tienen al menos un elemento en común
      orConditions.push({ habilidadesRequeridas: { [Op.overlap]: perfil.habilidades } });
    }
    if (req.usuario?.ubicacion) {
      orConditions.push({ ciudad: { [Op.iLike]: `%${req.usuario.ubicacion}%` } });
    }

    // Si el alumno no tiene perfil configurado, devuelve las ofertas más recientes (sin filtro)
    if (orConditions.length > 0) {
      where[Op.or] = orConditions;
    }

    const { count, rows: ofertas } = await Oferta.findAndCountAll({
      where,
      include: [{
        model: Empresa,
        as: 'empresa',
        attributes: ['razonSocial', 'logo', 'rubro', 'ciudad'],
      }],
      order: [['createdAt', 'DESC']],
      limit: limite,
      offset,
    });

    return res.json({
      success: true,
      total: count,
      pagina,
      totalPaginas: Math.ceil(count / limite),
      data: ofertas,
      criterios: {
        areaInteres: perfil?.areaInteres || null,
        habilidades: perfil?.habilidades || [],
        ubicacion: req.usuario?.ubicacion || null,
        perfilConfigurado: orConditions.length > 0,
      },
    });
  } catch (error) {
    console.error('Error en getOfertasRecomendadas:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener ofertas recomendadas.' });
  }
};

// ── Detalle de oferta ─────────────────────────────────────────────────────────
/**
 * GET /api/ofertas/:id
 * Devuelve el detalle completo de una oferta, incluida la información de la empresa.
 * Cada vez que se consulta, incrementa el contador de vistas de la oferta.
 */
exports.getOfertaById = async (req, res) => {
  try {
    const oferta = await Oferta.findByPk(req.params.id, {
      include: [{ model: Empresa, as: 'empresa' }],
    });
    if (!oferta) return res.status(404).json({ success: false, message: 'Oferta no encontrada.' });

    // Incrementa el contador de vistas para estadísticas
    await oferta.increment('vistas');

    return res.json({ success: true, data: oferta });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al obtener la oferta.' });
  }
};

// ── Crear oferta (empresa) ────────────────────────────────────────────────────
/**
 * POST /api/ofertas
 * Crea una nueva oferta. Solo disponible para empresas con cuenta aprobada.
 *
 * La oferta queda con moderada: false hasta que el admin la revise y apruebe.
 */
exports.createOferta = async (req, res) => {
  try {
    // Obtiene la empresa vinculada al usuario autenticado
    const empresa = await Empresa.findOne({ where: { usuarioId: req.usuario.id } });
    if (!empresa) return res.status(400).json({ success: false, message: 'No tenés empresa registrada.' });

    // Verifica que la empresa esté aprobada por el admin
    if (empresa.estadoAprobacion !== 'aprobada') {
      return res.status(403).json({ success: false, message: 'Tu empresa aún no fue aprobada.' });
    }

    // Crea la oferta asociada a la empresa. moderada: false indica que está pendiente de revisión
    const oferta = await Oferta.create({ ...req.body, empresaId: empresa.id, moderada: false });
    return res.status(201).json({ success: true, message: 'Oferta creada. Pendiente de moderación.', data: oferta });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al crear la oferta.' });
  }
};

// ── Actualizar oferta ─────────────────────────────────────────────────────────
/**
 * PUT /api/ofertas/:id
 * Actualiza los datos de una oferta. Solo puede hacerlo la empresa que la creó.
 */
exports.updateOferta = async (req, res) => {
  try {
    const empresa = await Empresa.findOne({ where: { usuarioId: req.usuario.id } });
    // Verifica que la oferta pertenezca a esta empresa antes de permitir la edición
    const oferta = await Oferta.findOne({ where: { id: req.params.id, empresaId: empresa.id } });
    if (!oferta) return res.status(404).json({ success: false, message: 'Oferta no encontrada.' });

    await oferta.update(req.body);
    return res.json({ success: true, data: oferta });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al actualizar la oferta.' });
  }
};

// ── Cerrar oferta ─────────────────────────────────────────────────────────────
/**
 * DELETE /api/ofertas/:id
 * Cierra una oferta (la marca como 'cerrada' en vez de eliminarla físicamente).
 * Solo puede hacerlo la empresa que la creó.
 * Se usa soft delete para mantener el historial de postulaciones intacto.
 */
exports.deleteOferta = async (req, res) => {
  try {
    const empresa = await Empresa.findOne({ where: { usuarioId: req.usuario.id } });
    const oferta = await Oferta.findOne({ where: { id: req.params.id, empresaId: empresa.id } });
    if (!oferta) return res.status(404).json({ success: false, message: 'Oferta no encontrada.' });

    // Se cierra la oferta en lugar de eliminarla para preservar el historial
    await oferta.update({ estado: 'cerrada' });
    return res.json({ success: true, message: 'Oferta cerrada correctamente.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al cerrar la oferta.' });
  }
};
