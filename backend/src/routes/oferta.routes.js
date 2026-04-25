/**
 * oferta.routes.js — Rutas de gestión de ofertas de pasantía.
 *
 * Prefijo de la API: /api/ofertas
 *
 * Rutas públicas (sin autenticación):
 * - GET /               → Lista todas las ofertas activas y aprobadas
 * - GET /:id            → Detalle de una oferta específica
 *
 * Rutas protegidas (alumno/egresado/profesor):
 * - GET /recomendadas   → Buscador inteligente basado en el perfil del alumno [NUEVO]
 *
 * Rutas protegidas (solo empresas):
 * - POST /              → Publica una nueva oferta
 * - PUT /:id            → Edita una oferta existente
 * - DELETE /:id         → Cierra una oferta (soft delete)
 *
 * ⚠️ ORDEN IMPORTANTE: /recomendadas debe ir ANTES de /:id para que Express
 *    no interprete la palabra "recomendadas" como un parámetro de ID.
 */

const router = require('express').Router();
const ctrl = require('../controllers/oferta.controller');
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');

// ── Rutas con path fijo (deben ir ANTES de /:id) ─────────────────────────────

// GET /api/ofertas/recomendadas — Ofertas sugeridas según el perfil del alumno
// Requiere autenticación; accesible para alumnos, egresados y profesores
router.get(
  '/recomendadas',
  verifyToken,
  authorizeRoles('alumno', 'egresado', 'profesor'),
  ctrl.getOfertasRecomendadas
);

// ── Rutas públicas ────────────────────────────────────────────────────────────
// Cualquier visitante puede ver las ofertas disponibles sin necesidad de estar logueado
router.get('/', ctrl.getOfertas);           // Lista de ofertas con filtros opcionales
router.get('/:id', ctrl.getOfertaById);     // Detalle de una oferta y su empresa

// ── Rutas empresa (requieren autenticación y rol 'empresa') ───────────────────
router.post('/', verifyToken, authorizeRoles('empresa'), ctrl.createOferta);      // Crear oferta
router.put('/:id', verifyToken, authorizeRoles('empresa'), ctrl.updateOferta);    // Editar oferta
router.delete('/:id', verifyToken, authorizeRoles('empresa'), ctrl.deleteOferta); // Cerrar oferta

module.exports = router;
