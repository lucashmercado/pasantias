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
const validate = require('../middleware/validate.middleware');
const { validateCrearSolicitud } = require('../validators/solicitudEmpresa.validator');
const { crearSolicitud } = require('../controllers/solicitudEmpresa.controller');

router.post('/', validate(validateCrearSolicitud), crearSolicitud);

module.exports = router;
