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
const { verifyEmpresaMember, authorizeEmpresaRoles } = require('../middleware/empresa.middleware');

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

// ── Rutas empresa (propietario, gerente y reclutador pueden crear/editar ofertas) ──────────
// verifyEmpresaMember inyecta req.empresa para los controllers
// authorizeEmpresaRoles restringe a los roles con permisos de escritura
const puedeEscribirOferta = [
  verifyToken,
  authorizeRoles('empresa'),
  verifyEmpresaMember,
  authorizeEmpresaRoles('propietario', 'gerente', 'reclutador'),
];

router.post('/', ...puedeEscribirOferta, ctrl.createOferta);      // Crear oferta
router.put('/:id', ...puedeEscribirOferta, ctrl.updateOferta);    // Editar oferta
router.delete('/:id', ...puedeEscribirOferta, ctrl.deleteOferta); // Cerrar oferta

module.exports = router;
