/**
 * auth.routes.js — Rutas de autenticación del sistema.
 *
 * Prefijo de la API: /api/auth
 *
 * Rutas disponibles:
 * - POST /register              → Registra un nuevo usuario
 * - POST /login                 → Inicia sesión y devuelve un JWT
 * - GET  /me                    → Devuelve el usuario autenticado (requiere token)
 * - POST /forgot-password       → Solicita el recupero de contraseña
 * - POST /reset-password/:token → Restablece la contraseña con el token recibido por email
 * - PUT  /cambiar-password      → Cambia la contraseña del usuario autenticado (requiere token)
 */

const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { register, login, me, forgotPassword, resetPassword } = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { Usuario } = require('../models');

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

/**
 * PUT /api/auth/cambiar-password
 * Cambia la contraseña del usuario autenticado.
 *
 * Requiere: token JWT válido (verifyToken)
 * Body:
 *   passwordActual  {string} — contraseña actual del usuario
 *   nuevaPassword   {string} — nueva contraseña (mínimo 6 caracteres)
 */
router.put('/cambiar-password', verifyToken, async (req, res) => {
  try {
    const { passwordActual, nuevaPassword } = req.body;

    // ── Validaciones de input ──────────────────────────────────────────────────
    if (!passwordActual || !nuevaPassword) {
      return res.status(400).json({
        success: false,
        message: 'Debés proporcionar la contraseña actual y la nueva contraseña.',
      });
    }

    if (nuevaPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe tener al menos 6 caracteres.',
      });
    }

    if (passwordActual === nuevaPassword) {
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe ser diferente a la actual.',
      });
    }

    // ── Obtener el usuario con su contraseña hasheada ──────────────────────────
    const usuario = await Usuario.findByPk(req.usuario.id);
    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    // ── Verificar contraseña actual ────────────────────────────────────────────
    const esCorrecta = await bcrypt.compare(passwordActual, usuario.password);
    if (!esCorrecta) {
      return res.status(401).json({
        success: false,
        message: 'La contraseña actual es incorrecta.',
      });
    }

    // ── Hashear y guardar la nueva contraseña ──────────────────────────────────
    const hash = await bcrypt.hash(nuevaPassword, 12);
    await usuario.update({ password: hash });

    return res.json({
      success: true,
      message: 'Contraseña actualizada correctamente.',
    });
  } catch (err) {
    console.error('[Auth] Error en cambiar-password:', err);
    return res.status(500).json({
      success: false,
      message: 'Error interno al cambiar la contraseña.',
    });
  }
});

module.exports = router;

