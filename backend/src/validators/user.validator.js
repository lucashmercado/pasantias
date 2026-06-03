'use strict';

const CAMPOS_PERFIL_VALIDOS = [
  'carrera', 'anioEgreso', 'descripcion', 'habilidades', 'idiomas',
  'certificaciones', 'linkedin', 'github', 'portfolio', 'redesSociales',
  'fotoPerfil', 'areaInteres', 'disponibilidad', 'preferenciasLaborales',
  'salarioPretendido', 'visibilidadPerfil', 'experienciaLaboral', 'proyectos',
  'telefono', 'ubicacion',
];

/**
 * Valida el body de PUT /api/users/perfil.
 * Solo verifica que llegue al menos un campo reconocido.
 * La sanitización de arrays y tipos se hace en el controller.
 * @returns {string|null}
 */
function validateUpdatePerfil(body) {
  const camposRecibidos = Object.keys(body).filter((k) => CAMPOS_PERFIL_VALIDOS.includes(k));
  if (camposRecibidos.length === 0) return 'No se enviaron campos válidos para actualizar.';
  return null;
}

module.exports = { validateUpdatePerfil };
