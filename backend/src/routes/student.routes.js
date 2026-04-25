/**
 * student.routes.js — Rutas del panel del estudiante.
 *
 * Prefijo de la API: /api/students
 *
 * Todas las rutas requieren autenticación.
 * Accesibles para roles: alumno, egresado, profesor.
 *
 * Rutas disponibles:
 * - GET /dashboard → Métricas personales del alumno (stats + recomendadas + completitud)
 */

'use strict';

const router = require('express').Router();
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');
const { getDashboard } = require('../controllers/student.controller');

// GET /api/students/dashboard
// Panel principal del alumno: stats, recomendadas, completitud de perfil
router.get(
  '/dashboard',
  verifyToken,
  authorizeRoles('alumno', 'egresado', 'profesor'),
  getDashboard
);

module.exports = router;
