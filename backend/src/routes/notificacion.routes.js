/**
 * notificacion.routes.js — Rutas de notificaciones del sistema.
 *
 * Prefijo de la API: /api/notificaciones
 *
 * IMPORTANTE: las rutas con paths fijos DEBEN ir ANTES de las rutas con parámetros
 * dinámicos (/:id) para que Express no confunda "leer-todas" con un id.
 *
 * Rutas:
 * - GET    /                → Lista las últimas 50 notificaciones del usuario
 * - GET    /sin-leer-count  → Devuelve solo el conteo de no leídas (para el badge)
 * - PATCH  /leer-todas      → Marca todas como leídas
 * - PATCH  /:id/leer        → Marca una notificación específica como leída
 * - DELETE /:id             → Elimina una notificación propia
 */

const router = require('express').Router();
const { verifyToken } = require('../middleware/auth.middleware');
const { Notificacion } = require('../models');
const { Op } = require('sequelize');

// ── GET / — Lista las últimas 50 notificaciones del usuario autenticado ────────
router.get('/', verifyToken, async (req, res) => {
  try {
    const notificaciones = await Notificacion.findAll({
      where: { usuarioId: req.usuario.id },
      order: [
        ['leida', 'ASC'],         // No leídas primero
        ['createdAt', 'DESC'],    // Más recientes primero dentro de cada grupo
      ],
      limit: 50,
    });
    const sinLeer = notificaciones.filter((n) => !n.leida).length;
    return res.json({ success: true, sinLeer, total: notificaciones.length, data: notificaciones });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al obtener notificaciones.' });
  }
});

// ── GET /sin-leer-count — Solo el conteo (para polling liviano del badge) ─────
router.get('/sin-leer-count', verifyToken, async (req, res) => {
  try {
    const count = await Notificacion.count({
      where: { usuarioId: req.usuario.id, leida: false },
    });
    return res.json({ success: true, count });
  } catch {
    return res.json({ success: true, count: 0 });
  }
});

// ── PATCH /leer-todas — Marca TODAS las notificaciones del usuario como leídas ─
// ⚠️ DEBE ir ANTES de /:id/leer para que Express no confunda "leer-todas" con un id
router.patch('/leer-todas', verifyToken, async (req, res) => {
  try {
    await Notificacion.update(
      { leida: true },
      { where: { usuarioId: req.usuario.id, leida: false } }
    );
    return res.json({ success: true, message: 'Todas las notificaciones marcadas como leídas.' });
  } catch {
    return res.status(500).json({ success: false, message: 'Error al marcar notificaciones.' });
  }
});

// ── PATCH /:id/leer — Marca una notificación específica como leída ────────────
router.patch('/:id/leer', verifyToken, async (req, res) => {
  try {
    await Notificacion.update(
      { leida: true },
      { where: { id: req.params.id, usuarioId: req.usuario.id } }
    );
    return res.json({ success: true, message: 'Notificación marcada como leída.' });
  } catch {
    return res.status(500).json({ success: false, message: 'Error al marcar la notificación.' });
  }
});

// ── DELETE /:id — Elimina una notificación propia ─────────────────────────────
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await Notificacion.destroy({
      where: { id: req.params.id, usuarioId: req.usuario.id },
    });
    return res.json({ success: true, message: 'Notificación eliminada.' });
  } catch {
    return res.status(500).json({ success: false, message: 'Error al eliminar la notificación.' });
  }
});

module.exports = router;
