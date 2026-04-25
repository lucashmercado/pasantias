/**
 * chat.routes.js — Rutas del sistema de mensajería directa.
 *
 * Prefijo de la API: /api/chat
 *
 * Todas las rutas requieren autenticación (cualquier rol).
 *
 * ⚠️ ORDEN IMPORTANTE: '/leer' y rutas fijas deben ir ANTES de '/:usuarioId'
 *    para que Express no interprete la palabra como parámetro.
 *
 * Rutas disponibles:
 * - GET   /                       → Lista de conversaciones del usuario autenticado
 * - POST  /                       → Enviar un mensaje a otro usuario
 * - GET   /:usuarioId             → Historial con un usuario (marca como leído)
 * - PATCH /:usuarioId/leer        → Marcar conversación como leída manualmente
 */

'use strict';

const router = require('express').Router();
const { verifyToken } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/chat.controller');

// Todos los endpoints de chat requieren estar autenticado (cualquier rol)
router.use(verifyToken);

// GET  /api/chat — Lista de conversaciones con último mensaje y no leídos
router.get('/', ctrl.getConversaciones);

// POST /api/chat — Enviar mensaje: { receptorId, mensaje }
router.post('/', ctrl.enviarMensaje);

// PATCH /api/chat/:usuarioId/leer — Marcar conversación como leída
// ⚠️ Debe ir ANTES de GET /:usuarioId para evitar conflicto de rutas
router.patch('/:usuarioId/leer', ctrl.marcarLeida);

// GET  /api/chat/:usuarioId — Historial paginado con un usuario
router.get('/:usuarioId', ctrl.getHistorial);

module.exports = router;
