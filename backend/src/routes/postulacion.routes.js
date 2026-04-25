/**
 * postulacion.routes.js — Rutas de postulaciones a ofertas de pasantía.
 *
 * Prefijo de la API: /api/postulaciones
 *
 * Rutas para alumnos/egresados:
 * - POST /          → Se postula a una oferta
 * - GET  /mis       → Historial de postulaciones propias
 *
 * Rutas para empresas:
 * - GET  /oferta/:ofertaId  → Ver candidatos de una oferta
 * - PATCH /:id/estado       → Actualizar el estado de una postulación
 */

const router = require('express').Router();
const ctrl = require('../controllers/postulacion.controller');
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');

// ── Rutas alumno/egresado ─────────────────────────────────────────────────────
// Solo alumnos y egresados pueden postularse y ver su historial
router.post('/', verifyToken, authorizeRoles('alumno', 'egresado'), ctrl.postular);
router.get('/mis', verifyToken, authorizeRoles('alumno', 'egresado'), ctrl.getMisPostulaciones);

// ── Rutas empresa ─────────────────────────────────────────────────────────────
// Solo las empresas pueden ver candidatos y cambiar el estado del proceso de selección
router.get('/oferta/:ofertaId', verifyToken, authorizeRoles('empresa'), ctrl.getPostulacionesByOferta);
router.patch('/:id/estado', verifyToken, authorizeRoles('empresa'), ctrl.updateEstado);

module.exports = router;
