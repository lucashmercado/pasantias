/**
 * profesor.routes.js — Rutas del panel institucional del profesor.
 *
 * Prefijo de la API: /api/profesor
 *
 * Rutas del panel del profesor (soloProfesor):
 * - GET   /alumnos         → Ver alumnos del sistema con su perfil académico
 * - GET   /postulaciones   → Ver postulaciones disponibles para revisión / aval
 * - GET   /avales          → Ver los avales emitidos por este profesor
 * - POST  /avales          → Crear un aval para una postulación
 * - PATCH /avales/:id      → Aprobar / rechazar / comentar un aval propio
 *
 * Rutas públicas de profesores (cualquier rol autenticado):
 * - GET   /lista           → Listar profesores disponibles (para que el alumno elija)
 * - POST  /solicitar-aval  → El alumno solicita un aval a un profesor específico
 */

'use strict';

const router = require('express').Router();
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/profesor.controller');

// Profesores y admins pueden acceder al panel del profesor
const soloProfesor = [verifyToken, authorizeRoles('profesor', 'admin')];
// Cualquier usuario autenticado puede listar profesores y solicitar avales
const autenticado  = [verifyToken];

// ── Panel del alumno (vista profesor) ─────────────────────────────────────────
router.get('/alumnos', ...soloProfesor, ctrl.getAlumnos);

// ── Postulaciones para revisión ──────────────────────────────────────────────
router.get('/postulaciones', ...soloProfesor, ctrl.getPostulaciones);

// ── Gestión de avales ─────────────────────────────────────────────────────────
router.get('/avales', ...soloProfesor, ctrl.getMisAvales);
router.post('/avales', ...soloProfesor, ctrl.crearAval);
router.patch('/avales/:id', ...soloProfesor, ctrl.updateAval);

// ── Rutas accesibles por el alumno ────────────────────────────────────────────

// GET  /api/profesor/lista — Lista todos los profesores activos del sistema
// Utilizado por el alumno para elegir a quién pedirle el aval
router.get('/lista', ...autenticado, ctrl.listarProfesores);

// POST /api/profesor/solicitar-aval — El alumno pide un aval a un profesor
// Body: { postulacionId, profesorId, mensajeAlumno? }
router.post('/solicitar-aval', ...autenticado, ctrl.solicitarAval);

module.exports = router;

