'use strict';

const { esEmailValido, esUrlValida } = require('./common.validator');

const CAMPOS_EDITABLES = ['descripcion', 'rubro', 'sitioWeb', 'telefono', 'direccion', 'ciudad', 'logo'];

/**
 * Valida el body de PUT /api/empresas/mi-empresa.
 * @returns {string|null}
 */
function validateUpdateEmpresa(body) {
  const camposValidos = CAMPOS_EDITABLES.filter((c) => body[c] !== undefined);
  if (camposValidos.length === 0) return 'No se enviaron campos válidos para actualizar.';
  if (body.sitioWeb && !esUrlValida(body.sitioWeb)) return 'El sitio web no tiene un formato de URL válido.';
  return null;
}

/**
 * Valida el body de POST /api/empresas/equipo.
 * @returns {string|null}
 */
function validateAddMiembro(body) {
  const { email, rolInterno = 'reclutador' } = body;
  if (!email?.trim()) return 'El email es requerido.';
  if (!esEmailValido(email.trim())) return 'El email no tiene un formato válido.';
  if (rolInterno !== 'reclutador') return `Rol inválido. Solo se puede agregar como 'reclutador'.`;
  return null;
}

module.exports = { validateUpdateEmpresa, validateAddMiembro };
