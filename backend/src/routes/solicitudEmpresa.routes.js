/**
 * solicitudEmpresa.routes.js — Rutas del flujo de solicitudes de empresa.
 *
 * Prefijo de la API: /api/solicitudes-empresa
 *
 * Rutas disponibles:
 *  - POST /   → Crea una nueva solicitud (pública, sin autenticación requerida)
 */

'use strict';
const router = require('express').Router();
const { crearSolicitud } = require('../controllers/solicitudEmpresa.controller');

// Ruta pública: cualquier interesado puede enviar su solicitud de registro
router.post('/', crearSolicitud);

module.exports = router;
