/**
 * auth.routes.js — Rutas de autenticación del sistema.
 *
 * Prefijo de la API: /api/auth
 *
 * Rutas disponibles:
 * - POST /register         → Registra un nuevo usuario
 * - POST /login            → Inicia sesión y devuelve un JWT
 * - GET  /me               → Devuelve el usuario autenticado (requiere token)
 * - POST /forgot-password  → Solicita el recupero de contraseña
 * - POST /reset-password/:token → Restablece la contraseña con el token recibido por email
 */

const router = require('express').Router();
const { register, login, me, forgotPassword, resetPassword } = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Ruta pública: registro de nuevo usuario (alumno, egresado o empresa)
router.post('/register', register);

// Ruta pública: inicio de sesión con email y contraseña
router.post('/login', login);

// Ruta protegida: devuelve el usuario autenticado (verifyToken valida el JWT)
router.get('/me', verifyToken, me);

// Ruta pública: solicita el email de recuperación de contraseña
router.post('/forgot-password', forgotPassword);

// Ruta pública: restablece la contraseña usando el token recibido por email
router.post('/reset-password/:token', resetPassword);

module.exports = router;
