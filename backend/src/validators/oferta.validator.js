'use strict';

// La validación de tipoPuesto y carrerasDestinatarias vive en services/oferta.service.js
// (función validarCamposPuesto). Este wrapper expone esa lógica en el formato del sistema
// de validators para que pueda usarse como middleware en el futuro.

const { validarCamposPuesto } = require('../services/oferta.service');

/**
 * Valida los campos de tipo puesto de una oferta.
 * Delega en oferta.service.validarCamposPuesto para no duplicar la lógica.
 * @returns {string|null}
 */
function validateCamposPuesto(body) {
  const { error } = validarCamposPuesto(body);
  return error || null;
}

module.exports = { validateCamposPuesto };
