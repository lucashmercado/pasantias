/**
 * empresa.middleware.js — Middlewares de membresía y autorización en el equipo de empresa.
 *
 * Exporta dos middlewares complementarios al sistema de autenticación JWT:
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  verifyEmpresaMember                                                        │
 * │  Resuelve la empresa a la que pertenece el usuario autenticado y la adjunta │
 * │  en req.empresa y req.miembroEmpresa para que los controllers la usen.      │
 * │                                                                             │
 * │  Flujo de resolución (en orden):                                            │
 * │    1. Si el usuario es propietario directo (empresa.usuarioId === req.usuario.id) │
 * │       → adjunta empresa y crea un objeto miembro virtual con rol 'propietario' │
 * │    2. Si tiene una membresía activa en empresa_usuarios                      │
 * │       → adjunta empresa y el registro de membresía real                     │
 * │    3. Si no tiene acceso → 403                                              │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  authorizeEmpresaRoles(...roles)                                            │
 * │  Factory que verifica que req.miembroEmpresa.rolInterno esté en la lista.   │
 * │  Debe usarse siempre DESPUÉS de verifyEmpresaMember.                       │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * Ejemplo de uso en rutas:
 *   const { verifyEmpresaMember, authorizeEmpresaRoles } = require('../middleware/empresa.middleware');
 *
 *   // Cualquier miembro activo puede ver el dashboard
 *   router.get('/dashboard', verifyToken, verifyEmpresaMember, ctrl.getDashboard);
 *
 *   // Solo el propietario puede gestionar el equipo
 *   router.post('/equipo', verifyToken, verifyEmpresaMember, authorizeEmpresaRoles('propietario'), ctrl.addMiembro);
 *
 *   // Propietario y gerente pueden editar el perfil
 *   router.put('/mi-empresa', verifyToken, verifyEmpresaMember, authorizeEmpresaRoles('propietario', 'gerente'), ctrl.updateMiEmpresa);
 *
 * Changelog:
 * - v1.5: creación inicial
 */

'use strict';

const { Empresa, EmpresaUsuario } = require('../models');

// ── Jerarquía de roles (de mayor a menor privilegio) ──────────────────────────
// Se usa para verificar si un rol tiene acceso a una acción que acepta múltiples niveles
const JERARQUIA_ROLES = ['propietario', 'gerente', 'reclutador', 'viewer'];

/**
 * Middleware: resuelve la empresa del usuario autenticado y la adjunta al request.
 *
 * Adjunta en el request:
 *   req.empresa        → instancia de Empresa
 *   req.miembroEmpresa → instancia de EmpresaUsuario (o virtual si es propietario directo)
 *
 * Respuestas de error:
 *   404 → el usuario no tiene empresa registrada ni membresía
 *   403 → tiene membresía pero está inactiva
 */
const verifyEmpresaMember = async (req, res, next) => {
  try {
    const usuarioId = req.usuario.id;

    // ── 1. Verificar si es propietario directo de la empresa ──────────────────
    // El propietario tiene empresa.usuarioId === su id
    const empresaPropia = await Empresa.findOne({ where: { usuarioId } });

    if (empresaPropia) {
      req.empresa = empresaPropia;
      // Construye un objeto virtual de membresía para propietarios directos
      // (pueden no tener registro en empresa_usuarios si la cuenta es anterior a la feature)
      req.miembroEmpresa = {
        rolInterno: 'propietario',
        activo: true,
        empresaId: empresaPropia.id,
        usuarioId,
        esPropietarioVirtual: true, // Indica que no es un registro real de empresa_usuarios
      };
      return next();
    }

    // ── 2. Verificar si es miembro del equipo (reclutador, gerente, viewer) ───
    const membresia = await EmpresaUsuario.findOne({
      where: { usuarioId, activo: true },
      include: [{ model: Empresa, as: 'empresa' }],
    });

    if (!membresia) {
      return res.status(404).json({
        success: false,
        message: 'No tenés acceso a ninguna empresa. Necesitás ser invitado por un propietario.',
        code: 'SIN_EMPRESA',
      });
    }

    req.empresa = membresia.empresa;
    req.miembroEmpresa = membresia;
    return next();
  } catch (error) {
    console.error('Error en verifyEmpresaMember:', error);
    return res.status(500).json({ success: false, message: 'Error al verificar membresía.' });
  }
};

/**
 * Middleware factory: verifica que el rol interno del usuario esté en la lista permitida.
 *
 * El propietario siempre tiene acceso total (se incluye automáticamente).
 *
 * Jerarquía de roles disponibles:
 *   'propietario' > 'gerente' > 'reclutador' > 'viewer'
 *
 * @param  {...string} roles - Roles permitidos (además del propietario que siempre puede)
 * @returns {Function} Middleware de Express
 *
 * @example
 *   // Solo propietario puede gestionar equipo
 *   authorizeEmpresaRoles('propietario')
 *
 *   // Propietario, gerente y reclutador pueden crear ofertas
 *   authorizeEmpresaRoles('propietario', 'gerente', 'reclutador')
 */
const authorizeEmpresaRoles = (...roles) => {
  return (req, res, next) => {
    const rolActual = req.miembroEmpresa?.rolInterno;

    if (!rolActual) {
      return res.status(403).json({
        success: false,
        message: 'No se pudo verificar tu rol en la empresa.',
        code: 'SIN_ROL',
      });
    }

    // El propietario siempre tiene acceso (no necesita estar en la lista explícita)
    if (rolActual === 'propietario') return next();

    // Verifica si el rol del usuario está en la lista de roles permitidos
    if (!roles.includes(rolActual)) {
      return res.status(403).json({
        success: false,
        message: `No tenés permisos para esta acción. Tu rol es '${rolActual}'.`,
        code: 'ROL_INSUFICIENTE',
        rolesPermitidos: roles,
      });
    }

    return next();
  };
};

/**
 * Helper exportado: verifica si un rol tiene al menos el nivel mínimo requerido.
 * Útil en controllers para checks programáticos sin middleware adicional.
 *
 * @param {string} rolActual   - Rol del usuario (ej: 'reclutador')
 * @param {string} rolMinimo   - Rol mínimo requerido (ej: 'gerente')
 * @returns {boolean}
 *
 * @example
 *   if (!tieneRolMinimo(req.miembroEmpresa.rolInterno, 'gerente')) {
 *     return res.status(403).json({ ... });
 *   }
 */
const tieneRolMinimo = (rolActual, rolMinimo) => {
  const idxActual = JERARQUIA_ROLES.indexOf(rolActual);
  const idxMinimo = JERARQUIA_ROLES.indexOf(rolMinimo);
  if (idxActual === -1 || idxMinimo === -1) return false;
  return idxActual <= idxMinimo; // Menor índice = mayor privilegio
};

module.exports = { verifyEmpresaMember, authorizeEmpresaRoles, tieneRolMinimo };
