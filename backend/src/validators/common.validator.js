'use strict';

/**
 * Valida formato de email con regex simple.
 * Suficiente para input básico; no verifica existencia del dominio.
 */
function esEmailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Valida que una cadena sea una URL absoluta válida (http o https).
 */
function esUrlValida(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

module.exports = { esEmailValido, esUrlValida };
