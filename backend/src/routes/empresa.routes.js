/**
 * empresa.routes.js — Rutas del panel corporativo de empresa.
 *
 * Prefijo de la API: /api/empresas
 *
 * Todas las rutas requieren autenticación JWT (verifyToken).
 * El middleware verifyEmpresaMember resuelve la empresa y el rol del usuario
 * y los adjunta en req.empresa y req.miembroEmpresa para que los controllers los usen.
 *
 * ⚠️ ORDEN IMPORTANTE: las rutas con paths fijos (dashboard, mi-empresa, equipo)
 *    deben ir ANTES de cualquier ruta con parámetro dinámico (ej: /:id).
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  Permisos por rol en el equipo                                             │
 * │                                                                             │
 * │  Acción                 │ propietario │ gerente │ reclutador │ viewer      │
 * │  ─────────────────────────────────────────────────────────────────────    │
 * │  Ver dashboard          │     ✅       │   ✅    │    ✅      │   ✅       │
 * │  Ver mis ofertas        │     ✅       │   ✅    │    ✅      │   ✅       │
 * │  Ver equipo             │     ✅       │   ✅    │    ✅      │   ✅       │
 * │  Editar perfil empresa  │     ✅       │   ✅    │    ❌      │   ❌       │
 * │  Invitar miembro        │     ✅       │   ❌    │    ❌      │   ❌       │
 * │  Editar miembro         │     ✅       │   ❌    │    ❌      │   ❌       │
 * │  Eliminar miembro       │     ✅       │   ❌    │    ❌      │   ❌       │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * Rutas disponibles:
 *
 * Panel corporativo:
 * - GET  /dashboard              → Métricas del panel (todos los roles)
 * - GET  /mis-ofertas            → Lista de ofertas propias (todos los roles)
 *
 * Perfil de empresa:
 * - GET  /mi-empresa             → Ver perfil (todos los roles)
 * - PUT  /mi-empresa             → Actualizar perfil (propietario, gerente)
 *
 * Equipo de reclutadores:
 * - GET  /equipo                 → Listar miembros (todos los roles)
 * - POST /equipo                 → Invitar miembro (solo propietario)
 * - PATCH /equipo/:id            → Editar miembro (solo propietario)
 * - DELETE /equipo/:id           → Dar de baja miembro (solo propietario)
 *
 * Changelog:
 * - v1.0: implementación inicial
 * - v1.5: integración de verifyEmpresaMember y authorizeEmpresaRoles
 *         · Rutas de solo-lectura: cualquier miembro del equipo
 *         · Editar perfil: propietario o gerente
 *         · Gestión de equipo: solo propietario
 */

'use strict';

const router = require('express').Router();
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');
const { verifyEmpresaMember, authorizeEmpresaRoles } = require('../middleware/empresa.middleware');
const ctrl = require('../controllers/empresa.controller');

// Shorthand: token JWT + resolver empresa + rol en equipo
const miembro    = [verifyToken, verifyEmpresaMember];
const soloOwner  = [...miembro, authorizeEmpresaRoles('propietario')];
const ownerOGte  = [...miembro, authorizeEmpresaRoles('propietario', 'gerente')];

// Compatibilidad: rutas donde solo el rol sistema 'empresa' puede acceder
// (se mantiene para no romper integraciones externas existentes)
const soloEmpresa = [verifyToken, authorizeRoles('empresa')];

// ── Panel corporativo ─────────────────────────────────────────────────────────

// GET /api/empresas/dashboard — Métricas globales (todos los miembros del equipo)
router.get('/dashboard', ...miembro, ctrl.getDashboard);

// GET /api/empresas/mis-ofertas — Lista de ofertas con postulaciones (todos los miembros)
router.get('/mis-ofertas', ...miembro, ctrl.getMisOfertas);

// ── Perfil de empresa ─────────────────────────────────────────────────────────

// GET /api/empresas/mi-empresa — Datos de la empresa (todos los miembros)
router.get('/mi-empresa', ...miembro, ctrl.getMiEmpresa);

// PUT /api/empresas/mi-empresa — Actualiza perfil (propietario o gerente)
router.put('/mi-empresa', ...ownerOGte, ctrl.updateMiEmpresa);

// ── Equipo de reclutadores ────────────────────────────────────────────────────

// GET /api/empresas/equipo — Lista todos los miembros del equipo (todos los roles)
router.get('/equipo', ...miembro, ctrl.getEquipo);

// GET /api/empresas/equipo/solicitudes — Lista solicitudes de reclutadores de esta empresa (propietario/gerente)
// ⚠️ DEBE ir ANTES de /equipo/:id
router.get('/equipo/solicitudes', ...ownerOGte, ctrl.getMisSolicitudesReclutador);

// POST /api/empresas/equipo/solicitar — Envia solicitud de alta de reclutador al admin (solo propietario)
// El admin es quien crea el usuario al aprobar. La empresa NO crea usuarios directamente.
router.post('/equipo/solicitar', ...soloOwner, ctrl.solicitarReclutador);

// PATCH /api/empresas/equipo/:id/password — Resetea la contraseña de un miembro (solo propietario)
// ⚠️ DEBE ir ANTES de /equipo/:id para que Express no interprete 'password' como un id
// Body: { password }
router.patch('/equipo/:id/password', ...soloOwner, ctrl.resetPasswordMiembro);

// PATCH /api/empresas/equipo/:id — Actualiza rol o estado de un miembro (solo propietario)
// Body: { rolInterno?, activo? }
router.patch('/equipo/:id', ...soloOwner, ctrl.updateMiembro);

// DELETE /api/empresas/equipo/:id — Da de baja un miembro (solo propietario)
router.delete('/equipo/:id', ...soloOwner, ctrl.removeMiembro);

module.exports = router;
