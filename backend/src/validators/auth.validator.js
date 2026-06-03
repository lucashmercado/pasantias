'use strict';

const { esEmailValido } = require('./common.validator');

/**
 * Valida el body de POST /api/auth/register.
 * Solo valida formato de inputs; la unicidad del email se verifica en el controller.
 * @returns {string|null}
 */
function validateRegister(body) {
  const { nombre, apellido, email, password } = body;
  if (!nombre?.trim())  return 'El nombre es requerido.';
  if (!apellido?.trim()) return 'El apellido es requerido.';
  if (!email || !esEmailValido(email)) return 'El email no tiene un formato válido.';
  if (!password || password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
  return null;
}

/**
 * Valida el body de PUT /api/auth/cambiar-password.
 * @returns {string|null}
 */
function validateCambiarPassword(body) {
  const { passwordActual, nuevaPassword } = body;
  if (!passwordActual || !nuevaPassword) {
    return 'Debés proporcionar la contraseña actual y la nueva contraseña.';
  }
  if (nuevaPassword.length < 6) {
    return 'La nueva contraseña debe tener al menos 6 caracteres.';
  }
  if (passwordActual === nuevaPassword) {
    return 'La nueva contraseña debe ser diferente a la actual.';
  }
  return null;
}

module.exports = { validateRegister, validateCambiarPassword };
