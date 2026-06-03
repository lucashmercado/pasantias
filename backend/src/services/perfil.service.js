'use strict';

/**
 * Calcula el porcentaje de completitud del perfil del alumno (0–100).
 * Cada campo vale un punto; se evalúan 15 campos en total.
 */
function calcularCompletitud(perfil, usuario) {
  if (!perfil) return 0;

  const campos = [
    !!perfil.carrera,
    !!perfil.descripcion,
    perfil.habilidades?.length > 0,
    perfil.idiomas?.length > 0,
    !!perfil.linkedin,
    !!perfil.github,
    !!perfil.cvPath,
    !!perfil.areaInteres,
    !!perfil.disponibilidad,
    !!perfil.fotoPerfil,
    !!perfil.portfolio,
    !!perfil.experienciaLaboral,
    perfil.certificaciones?.length > 0,
    !!usuario?.telefono,
    !!usuario?.ubicacion,
  ];

  const completados = campos.filter(Boolean).length;
  return Math.round((completados / campos.length) * 100);
}

module.exports = { calcularCompletitud };
