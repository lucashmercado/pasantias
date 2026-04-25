/**
 * empresa.routes.js — Rutas del panel corporativo de empresa.
 *
 * Prefijo de la API: /api/empresas
 *
 * Todas las rutas requieren autenticación y rol 'empresa'.
 *
 * ⚠️ ORDEN IMPORTANTE: las rutas con paths fijos (dashboard, mi-empresa, equipo)
 *    deben ir ANTES de cualquier ruta con parámetro dinámica (ej: /:id).
 *
 * Rutas disponibles:
 *
 * Panel corporativo:
 * - GET  /dashboard              → Métricas del panel corporativo [NUEVO]
 *
 * Perfil de empresa:
 * - GET  /mi-empresa             → Ver perfil de la empresa propia
 * - PUT  /mi-empresa             → Actualizar perfil de la empresa
 *
 * Equipo de reclutadores:
 * - GET  /equipo                 → Listar miembros del equipo [NUEVO]
 * - POST /equipo                 → Agregar reclutador al equipo [NUEVO]
 * - PATCH /equipo/:id            → Actualizar rol/estado de un miembro [NUEVO]
 * - DELETE /equipo/:id           → Dar de baja un miembro del equipo [NUEVO]
 */

'use strict';

const router = require('express').Router();
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/empresa.controller');

// Shorthand: todos los endpoints requieren token + rol empresa
const soloEmpresa = [verifyToken, authorizeRoles('empresa')];

// ── Panel corporativo ─────────────────────────────────────────────────────────

// GET /api/empresas/dashboard — Métricas globales de la empresa (ofertas, candidatos, equipo)
router.get('/dashboard', ...soloEmpresa, ctrl.getDashboard);

// GET /api/empresas/mis-ofertas — Lista completa de ofertas propias con postulaciones
router.get('/mis-ofertas', ...soloEmpresa, ctrl.getMisOfertas);

// ── Perfil de empresa ─────────────────────────────────────────────────────────

// GET /api/empresas/mi-empresa — Datos completos de la empresa propia
router.get('/mi-empresa', ...soloEmpresa, ctrl.getMiEmpresa);

// PUT /api/empresas/mi-empresa — Actualiza descripción, rubro, teléfono, sitio web, etc.
router.put('/mi-empresa', ...soloEmpresa, ctrl.updateMiEmpresa);

// ── Equipo de reclutadores ────────────────────────────────────────────────────

// GET /api/empresas/equipo — Lista todos los miembros activos del equipo
router.get('/equipo', ...soloEmpresa, ctrl.getEquipo);

// POST /api/empresas/equipo — Agrega un usuario al equipo de la empresa
// Body: { email, rolInterno? }
router.post('/equipo', ...soloEmpresa, ctrl.addMiembro);

// PATCH /api/empresas/equipo/:id — Actualiza el rol o estado de un miembro
// Body: { rolInterno?, activo? }
router.patch('/equipo/:id', ...soloEmpresa, ctrl.updateMiembro);

// DELETE /api/empresas/equipo/:id — Da de baja un miembro (soft delete)
router.delete('/equipo/:id', ...soloEmpresa, ctrl.removeMiembro);

module.exports = router;
