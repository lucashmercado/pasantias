'use strict';

const { esEmailValido } = require('./common.validator');

/**
 * Valida el body de POST /api/solicitudes-empresa.
 * @returns {string|null} mensaje de error o null si es válido
 */
function validateCrearSolicitud(body) {
  const {
    razonSocial, cuit, rubro, email,
    responsableNombre, responsableApellido, responsableEmail,
    reclutadores,
  } = body;

  // Campos obligatorios
  const faltantes = [];
  if (!razonSocial?.trim())         faltantes.push('Razón Social');
  if (!cuit?.trim())                faltantes.push('CUIT');
  if (!rubro?.trim())               faltantes.push('Rubro');
  if (!email?.trim())               faltantes.push('Email de contacto institucional');
  if (!responsableNombre?.trim())   faltantes.push('Nombre del responsable');
  if (!responsableApellido?.trim()) faltantes.push('Apellido del responsable');
  if (!responsableEmail?.trim())    faltantes.push('Email del responsable');

  if (faltantes.length > 0) {
    return `Faltan campos obligatorios: ${faltantes.join(', ')}.`;
  }

  // Formatos de email
  if (!esEmailValido(email.trim())) {
    return 'El email de contacto institucional no tiene un formato válido.';
  }
  if (!esEmailValido(responsableEmail.trim())) {
    return 'El email del responsable no tiene un formato válido.';
  }

  // Reclutadores iniciales: si tiene algún campo debe tener los tres completos
  const reclsRaw = Array.isArray(reclutadores) ? reclutadores : [];
  for (let i = 0; i < reclsRaw.length; i++) {
    const r = reclsRaw[i];
    const nombre   = r?.nombre?.trim()   || '';
    const apellido = r?.apellido?.trim() || '';
    const rEmail   = r?.email?.trim()    || '';

    if (!nombre && !apellido && !rEmail) continue;

    if (!nombre || !apellido || !rEmail) {
      return `El reclutador #${i + 1} requiere nombre, apellido y email completos.`;
    }
    if (!esEmailValido(rEmail)) {
      return `El email del reclutador #${i + 1} (${rEmail}) no tiene un formato válido.`;
    }
  }

  return null;
}

module.exports = { validateCrearSolicitud };
