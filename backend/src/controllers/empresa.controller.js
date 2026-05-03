/**
 * empresa.controller.js — Controlador del panel corporativo de empresa.
 *
 * Endpoints implementados:
 * - getDashboard      → GET /api/empresas/dashboard
 * - getMiEmpresa      → GET /api/empresas/mi-empresa
 * - updateMiEmpresa   → PUT /api/empresas/mi-empresa
 * - getEquipo         → GET /api/empresas/equipo
 * - addMiembro        → POST /api/empresas/equipo
 * - updateMiembro     → PATCH /api/empresas/equipo/:id
 * - removeMiembro     → DELETE /api/empresas/equipo/:id
 *
 * Changelog:
 * - v1.0: implementación inicial
 * - v1.5: refactor multi-usuario
 *         · getDashboard / getMisOfertas / getMiEmpresa usan req.empresa del middleware
 *         · addMiembro crea usuario automáticamente si no existe (contraseña temporal)
 *         · addMiembro / updateMiembro / removeMiembro solo accesibles por propietario
 *         · updateMiembro no permite cambiar el rol del propietario ni autopromoverse
 */

'use strict';

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Empresa, EmpresaUsuario, Usuario, Oferta, Postulacion, SolicitudReclutador } = require('../models');
const { Op } = require('sequelize');


// ── Helpers internos ──────────────────────────────────────────────────────────

/**
 * Obtiene la empresa del usuario autenticado por su usuarioId directo.
 * Se usa solo en las rutas que todavía no pasan por verifyEmpresaMember.
 *
 * @param {number} usuarioId
 * @returns {Promise<Empresa|null>}
 */
async function _getEmpresaUsuario(usuarioId) {
  return Empresa.findOne({ where: { usuarioId } });
}

/**
 * Resuelve la empresa desde el request.
 * Prioriza req.empresa (inyectado por verifyEmpresaMember) y como fallback
 * busca por usuarioId para mantener compatibilidad con rutas que no usen el middleware.
 *
 * @param {Object} req - Request de Express
 * @returns {Promise<Empresa|null>}
 */
async function _resolverEmpresa(req) {
  if (req.empresa) return req.empresa;
  return _getEmpresaUsuario(req.usuario.id);
}

// ── Dashboard de empresa ──────────────────────────────────────────────────────
/**
 * GET /api/empresas/dashboard
 * Devuelve en una sola llamada las métricas del panel corporativo.
 * Accesible para todos los roles del equipo (propietario, gerente, reclutador, viewer).
 */
exports.getDashboard = async (req, res) => {
  try {
    const empresa = await _resolverEmpresa(req);
    if (!empresa) {
      return res.status(404).json({ success: false, message: 'No tenés empresa registrada.' });
    }

    // Obtiene los IDs de todas las ofertas de esta empresa (base para los JOINs)
    const ofertas = await Oferta.findAll({
      where: { empresaId: empresa.id },
      attributes: ['id', 'estado', 'moderada'],
    });
    const ofertaIds = ofertas.map((o) => o.id);

    // ── Métricas de ofertas ────────────────────────────────────────────────
    const ofertasActivas             = ofertas.filter((o) => o.estado === 'activa').length;
    const ofertasPausadas            = ofertas.filter((o) => o.estado === 'pausada').length;
    const ofertasCerradas            = ofertas.filter((o) => o.estado === 'cerrada').length;
    const ofertasPendienteModeracion = ofertas.filter((o) => !o.moderada && o.estado === 'activa').length;

    // ── Métricas de postulaciones ─────────────────────────────────────────
    const wherePost = ofertaIds.length > 0 ? { ofertaId: ofertaIds } : { ofertaId: -1 };

    const [
      totalPostulaciones,
      candidatosEnRevision,
      candidatosPreseleccionados,
      entrevistasPendientes,
      contrataciones,
      miembrosEquipo,
    ] = await Promise.all([
      Postulacion.count({ where: wherePost }),
      Postulacion.count({ where: { ...wherePost, estado: 'en_revision' } }),
      Postulacion.count({ where: { ...wherePost, estado: 'preseleccionado' } }),
      Postulacion.count({ where: { ...wherePost, estado: ['entrevista_programada', 'entrevista'] } }),
      Postulacion.count({ where: { ...wherePost, estado: 'contratado' } }),
      EmpresaUsuario.count({ where: { empresaId: empresa.id, activo: true } }),
    ]);

    // ── Últimas 5 ofertas ─────────────────────────────────────────────────
    const ofertasRecientes = await Oferta.findAll({
      where: { empresaId: empresa.id },
      attributes: ['id', 'titulo', 'estado', 'moderada', 'vistas', 'createdAt', 'cantidadVacantes'],
      order: [['createdAt', 'DESC']],
      limit: 5,
    });

    return res.json({
      success: true,
      data: {
        empresa: {
          id: empresa.id,
          razonSocial: empresa.razonSocial,
          estadoAprobacion: empresa.estadoAprobacion,
        },
        rolEnEquipo: req.miembroEmpresa?.rolInterno || null,
        ofertas: {
          activas: ofertasActivas,
          pausadas: ofertasPausadas,
          cerradas: ofertasCerradas,
          pendienteModeracion: ofertasPendienteModeracion,
          total: ofertas.length,
        },
        postulaciones: {
          total: totalPostulaciones,
          enRevision: candidatosEnRevision,
          preseleccionados: candidatosPreseleccionados,
          entrevistas: entrevistasPendientes,
          contrataciones,
        },
        equipo: {
          totalMiembros: miembrosEquipo,
        },
        ofertasRecientes,
      },
    });
  } catch (error) {
    console.error('Error en getDashboard empresa:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener el dashboard.' });
  }
};

// ── Lista completa de ofertas propias ─────────────────────────────────────────
/**
 * GET /api/empresas/mis-ofertas
 * Devuelve todas las ofertas de la empresa con conteo de postulaciones por oferta.
 * Accesible para todos los roles del equipo.
 */
exports.getMisOfertas = async (req, res) => {
  try {
    const empresa = await _resolverEmpresa(req);
    if (!empresa) return res.status(404).json({ success: false, message: 'No tenés empresa registrada.' });

    const ofertas = await Oferta.findAll({
      where: { empresaId: empresa.id },
      attributes: ['id', 'titulo', 'modalidad', 'ciudad', 'estado', 'moderada',
                   'cantidadVacantes', 'fechaLimite', 'area', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });

    const data = await Promise.all(ofertas.map(async (o) => {
      const plain = o.toJSON();
      const totalPostulaciones = await Postulacion.count({ where: { ofertaId: o.id } });
      return { ...plain, totalPostulaciones };
    }));

    return res.json({ success: true, total: data.length, data });
  } catch (error) {
    console.error('Error en getMisOfertas:', error.message);
    return res.status(500).json({ success: false, message: 'Error al obtener las ofertas.' });
  }
};


/**
 * GET /api/empresas/mi-empresa
 * Devuelve el perfil completo de la empresa del usuario autenticado.
 */
exports.getMiEmpresa = async (req, res) => {
  try {
    const empresa = await _resolverEmpresa(req);
    if (!empresa) return res.status(404).json({ success: false, message: 'No tenés empresa registrada.' });
    return res.json({ success: true, data: empresa });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al obtener la empresa.' });
  }
};

/**
 * PUT /api/empresas/mi-empresa
 * Actualiza el perfil de la empresa. Solo propietario y gerente.
 */
exports.updateMiEmpresa = async (req, res) => {
  try {
    const empresa = await _resolverEmpresa(req);
    if (!empresa) return res.status(404).json({ success: false, message: 'No tenés empresa registrada.' });

    await empresa.update(req.body);
    return res.json({ success: true, data: empresa });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al actualizar la empresa.' });
  }
};

// ── Gestión del equipo de reclutadores ────────────────────────────────────────
/**
 * GET /api/empresas/equipo
 * Lista todos los miembros del equipo (activos e inactivos).
 * Accesible para todos los roles del equipo.
 *
 * Garantiza que el propietario aparezca en la respuesta incluso si no tiene
 * registro en empresa_usuarios (cuentas anteriores a la feature multi-usuario).
 *
 * Respuesta incluye:
 *   data[]         → array de miembros (con usuario anidado)
 *   rolEnEquipo    → rol del usuario que hace el request (para el frontend)
 */
exports.getEquipo = async (req, res) => {
  try {
    const empresa = await _resolverEmpresa(req);
    if (!empresa) return res.status(404).json({ success: false, message: 'No tenés empresa registrada.' });

    const equipo = await EmpresaUsuario.findAll({
      where: { empresaId: empresa.id },
      include: [{
        model: Usuario,
        as: 'usuario',
        attributes: ['id', 'nombre', 'apellido', 'email', 'fotoPerfil', 'ultimoAcceso'],
      }],
      order: [
        ['rolInterno', 'ASC'],  // propietario < gerente < reclutador < viewer (orden alfabético)
        ['createdAt', 'ASC'],
      ],
    });

    // ── Garantizar que el propietario aparezca ────────────────────────────────
    // Si el propietario directo (empresa.usuarioId) no tiene registro en empresa_usuarios
    // (cuentas creadas antes de la feature multi-usuario), lo agregamos virtualmente
    // para que el frontend lo muestre y pueda detectar correctamente su rol.
    const propietarioPresenteEnTabla = equipo.some(
      (m) => m.usuarioId === empresa.usuarioId
    );

    let data = equipo.map((m) => m.toJSON());

    if (!propietarioPresenteEnTabla) {
      // Busca los datos del usuario propietario para construir el objeto virtual
      const usuarioPropietario = await Usuario.findByPk(empresa.usuarioId, {
        attributes: ['id', 'nombre', 'apellido', 'email', 'fotoPerfil', 'ultimoAcceso'],
      });

      if (usuarioPropietario) {
        // Inserta al propietario al inicio de la lista (tiene precedencia)
        data.unshift({
          id: null,                           // No tiene ID en empresa_usuarios
          empresaId: empresa.id,
          usuarioId: empresa.usuarioId,
          rolInterno: 'propietario',
          activo: true,
          esPropietarioVirtual: true,         // Flag para que el frontend lo sepa
          usuario: usuarioPropietario.toJSON(),
          createdAt: empresa.createdAt,
          updatedAt: empresa.updatedAt,
        });
      }
    }

    // ── Incluir el rol del solicitante en la respuesta ────────────────────────
    // Esto permite que el frontend detecte el rol sin tener que buscarse en la lista
    const rolEnEquipo = req.miembroEmpresa?.rolInterno ?? 'propietario';

    return res.json({ success: true, total: data.length, rolEnEquipo, data });
  } catch (error) {
    console.error('Error en getEquipo:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener el equipo.' });
  }
};


/**
 * POST /api/empresas/equipo
 * Agrega un usuario al equipo. Solo el propietario puede invitar.
 *
 * Body:
 *   email      {string} — email del usuario a agregar o crear
 *   rolInterno {string} — 'gerente' | 'reclutador' | 'viewer' (default: 'reclutador')
 *   password   {string} — contraseña inicial (obligatoria si el usuario no existe)
 *   nombre     {string} — nombre (solo si el usuario no existe)
 *   apellido   {string} — apellido (solo si el usuario no existe)
 *
 * Flujo:
 *   - Si el usuario NO existe → se crea con la contraseña indicada por el propietario
 *   - Si el usuario YA existe → se lo vincula (ignora la contraseña del body)
 *   - Si ya era miembro inactivo → se reactiva
 *
 * El propietario puede cambiar la contraseña de cualquier miembro en cualquier momento
 * usando PATCH /api/empresas/equipo/:id/password
 */
exports.addMiembro = async (req, res) => {
  try {
    const {
      email,
      rolInterno = 'reclutador',
      password,
      nombre = 'Invitado',
      apellido = '',
    } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'El email es requerido.' });
    }

    // Validar que el rol sea válido (no se puede invitar como propietario)
    const rolesPermitidos = ['gerente', 'reclutador', 'viewer'];
    if (!rolesPermitidos.includes(rolInterno)) {
      return res.status(400).json({
        success: false,
        message: `Rol inválido. Roles disponibles: ${rolesPermitidos.join(', ')}.`,
      });
    }

    const empresa = await _resolverEmpresa(req);
    if (!empresa) return res.status(404).json({ success: false, message: 'No tenés empresa registrada.' });

    // ── Buscar o crear el usuario ─────────────────────────────────────────
    let usuarioAgregar = await Usuario.findOne({ where: { email } });
    let usuarioCreado = false;

    if (!usuarioAgregar) {
      // Usuario nuevo: el propietario define la contraseña inicial
      if (!password || password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Este email no está registrado. Ingresá una contraseña inicial de al menos 6 caracteres para crear la cuenta.',
          code: 'PASSWORD_REQUERIDA',
        });
      }

      const hash = await bcrypt.hash(password, 12);
      usuarioAgregar = await Usuario.create({
        nombre,
        apellido,
        email,
        password: hash,
        rol: 'empresa',   // Rol sistema para acceder al panel corporativo
        habilitado: true,
        activo: true,
      });
      usuarioCreado = true;
    }

    // No se puede agregar al propietario como miembro adicional
    if (usuarioAgregar.id === req.usuario.id) {
      return res.status(400).json({
        success: false,
        message: 'No podés agregarte a vos mismo como reclutador.',
      });
    }

    // ── Verificar membresía existente ─────────────────────────────────────
    const yaExiste = await EmpresaUsuario.findOne({
      where: { empresaId: empresa.id, usuarioId: usuarioAgregar.id },
    });

    if (yaExiste) {
      if (yaExiste.activo) {
        return res.status(400).json({
          success: false,
          message: 'Este usuario ya es miembro activo del equipo.',
        });
      }
      // Si estaba inactivo, lo reactiva
      await yaExiste.update({ activo: true, rolInterno });
      return res.json({
        success: true,
        message: 'Miembro reactivado en el equipo.',
        data: yaExiste,
        usuarioCreado: false,
      });
    }

    const miembro = await EmpresaUsuario.create({
      empresaId: empresa.id,
      usuarioId: usuarioAgregar.id,
      rolInterno,
      activo: true,
    });

    return res.status(201).json({
      success: true,
      message: usuarioCreado
        ? `Cuenta creada para ${email}. El reclutador ya puede ingresar con esas credenciales.`
        : `${usuarioAgregar.nombre} fue agregado al equipo. Ya puede ingresar con su cuenta.`,
      data: {
        miembro: miembro.toJSON(),
        usuario: {
          id: usuarioAgregar.id,
          nombre: usuarioAgregar.nombre,
          apellido: usuarioAgregar.apellido,
          email: usuarioAgregar.email,
        },
      },
      usuarioCreado,
    });
  } catch (error) {
    console.error('Error en addMiembro:', error);
    return res.status(500).json({ success: false, message: 'Error al agregar el miembro.' });
  }
};

/**
 * PATCH /api/empresas/equipo/:id/password
 * Permite al propietario cambiar la contraseña de cualquier miembro del equipo.
 * Útil cuando el reclutador olvidó su clave o el propietario quiere resetearla.
 *
 * Solo el propietario puede usar este endpoint.
 *
 * Params:
 *   id         {number} — ID del registro en empresa_usuarios (no el usuarioId)
 *
 * Body:
 *   password   {string} — nueva contraseña (mínimo 6 caracteres)
 *
 * Restricciones:
 *   - No se puede cambiar la contraseña del propietario por este endpoint
 *     (el propietario cambia la suya desde su perfil personal)
 */
exports.resetPasswordMiembro = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres.',
      });
    }

    const empresa = await _resolverEmpresa(req);
    if (!empresa) return res.status(404).json({ success: false, message: 'No tenés empresa registrada.' });

    // Busca el miembro dentro de esta empresa
    const miembro = await EmpresaUsuario.findOne({
      where: { id: req.params.id, empresaId: empresa.id },
      include: [{ model: Usuario, as: 'usuario' }],
    });

    if (!miembro) {
      return res.status(404).json({ success: false, message: 'Miembro no encontrado.' });
    }

    // No se puede resetear la contraseña del propietario desde este endpoint
    // (el propietario gestiona la suya desde su perfil personal)
    if (miembro.rolInterno === 'propietario') {
      return res.status(403).json({
        success: false,
        message: 'No podés cambiar la contraseña del propietario desde el panel de equipo. Usá la opción de perfil personal.',
      });
    }

    // Hashea y guarda la nueva contraseña
    const hash = await bcrypt.hash(password, 12);
    await miembro.usuario.update({
      password: hash,
      tokenReset: null,         // Invalida cualquier token de reset pendiente
      tokenResetExpira: null,
    });

    return res.json({
      success: true,
      message: `Contraseña actualizada para ${miembro.usuario.email}.`,
    });
  } catch (error) {
    console.error('Error en resetPasswordMiembro:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar la contraseña.' });
  }
};



/**
 * PATCH /api/empresas/equipo/:id
 * Actualiza el rol interno o el estado activo de un miembro del equipo.
 * Solo el propietario puede modificar miembros.
 *
 * Body (al menos uno requerido):
 *   rolInterno {string}  — nuevo rol ('gerente' | 'reclutador' | 'viewer')
 *   activo     {boolean} — true para reactivar, false para suspender
 *
 * Restricciones:
 * - No se puede modificar al propietario
 * - No se puede asignar el rol 'propietario' a otro miembro
 */
exports.updateMiembro = async (req, res) => {
  try {
    const empresa = await _resolverEmpresa(req);
    if (!empresa) return res.status(404).json({ success: false, message: 'No tenés empresa registrada.' });

    const miembro = await EmpresaUsuario.findOne({
      where: { id: req.params.id, empresaId: empresa.id },
    });
    if (!miembro) return res.status(404).json({ success: false, message: 'Miembro no encontrado.' });

    // No se puede modificar al propietario
    if (miembro.rolInterno === 'propietario') {
      return res.status(403).json({
        success: false,
        message: 'No se puede modificar al propietario del equipo.',
      });
    }

    const { rolInterno, activo } = req.body;
    const updateData = {};

    if (rolInterno !== undefined) {
      // No se puede asignar el rol propietario a través de este endpoint
      if (rolInterno === 'propietario') {
        return res.status(400).json({
          success: false,
          message: 'No se puede asignar el rol propietario a otro miembro.',
        });
      }
      const rolesValidos = ['gerente', 'reclutador', 'viewer'];
      if (!rolesValidos.includes(rolInterno)) {
        return res.status(400).json({
          success: false,
          message: `Rol inválido. Roles disponibles: ${rolesValidos.join(', ')}.`,
        });
      }
      updateData.rolInterno = rolInterno;
    }

    if (activo !== undefined) updateData.activo = activo;

    await miembro.update(updateData);
    return res.json({ success: true, message: 'Miembro actualizado.', data: miembro });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al actualizar el miembro.' });
  }
};

/**
 * DELETE /api/empresas/equipo/:id
 * Elimina un miembro del equipo (soft delete — se marca como inactivo).
 * No elimina el registro para preservar el historial de acciones del reclutador.
 * Solo el propietario puede eliminar miembros.
 */
exports.removeMiembro = async (req, res) => {
  try {
    const empresa = await _resolverEmpresa(req);
    if (!empresa) return res.status(404).json({ success: false, message: 'No tenés empresa registrada.' });

    const miembro = await EmpresaUsuario.findOne({
      where: { id: req.params.id, empresaId: empresa.id },
    });
    if (!miembro) return res.status(404).json({ success: false, message: 'Miembro no encontrado.' });

    if (miembro.rolInterno === 'propietario') {
      return res.status(403).json({
        success: false,
        message: 'No se puede eliminar al propietario del equipo.',
      });
    }

    await miembro.update({ activo: false });
    return res.json({ success: true, message: 'Miembro eliminado del equipo.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al eliminar el miembro.' });
  }
};

/**
 * POST /api/empresas/equipo/solicitar
 * La empresa solicita el alta de un nuevo reclutador.
 * NO crea el usuario — envía una SolicitudReclutador al admin para su aprobación.
 *
 * Body: { nombre, email }
 */
exports.solicitarReclutador = async (req, res) => {
  try {
    const { nombre, email } = req.body;

    if (!nombre || !email) {
      return res.status(400).json({ success: false, message: 'Nombre y email son requeridos.' });
    }

    const empresa = await _resolverEmpresa(req);
    if (!empresa) return res.status(404).json({ success: false, message: 'No tenés empresa registrada.' });

    // Verificar que no exista ya una solicitud pendiente con ese email para esta empresa
    const yaExiste = await SolicitudReclutador.findOne({
      where: { empresaId: empresa.id, email, estado: 'pendiente' },
    });
    if (yaExiste) {
      return res.status(400).json({
        success: false,
        message: 'Ya hay una solicitud pendiente para ese email en tu empresa.',
      });
    }

    // Verificar que ese email no sea ya miembro activo del equipo
    const usuarioExistente = await Usuario.findOne({ where: { email } });
    if (usuarioExistente) {
      const esMiembro = await EmpresaUsuario.findOne({
        where: { empresaId: empresa.id, usuarioId: usuarioExistente.id, activo: true },
      });
      if (esMiembro) {
        return res.status(400).json({
          success: false,
          message: 'Ese email ya corresponde a un miembro activo del equipo.',
        });
      }
    }

    const solicitud = await SolicitudReclutador.create({
      empresaId: empresa.id,
      nombre,
      email,
      estado: 'pendiente',
    });

    return res.status(201).json({
      success: true,
      message: 'Solicitud enviada correctamente. El administrador la revisará pronto.',
      data: solicitud,
    });
  } catch (error) {
    console.error('Error en solicitarReclutador:', error);
    return res.status(500).json({ success: false, message: 'Error al enviar la solicitud.' });
  }
};

/**
 * GET /api/empresas/equipo/solicitudes
 * Lista las solicitudes de reclutadores de la empresa autenticada.
 * Permite al propietario ver el estado de cada solicitud enviada.
 */
exports.getMisSolicitudesReclutador = async (req, res) => {
  try {
    const empresa = await _resolverEmpresa(req);
    if (!empresa) return res.status(404).json({ success: false, message: 'No tenés empresa registrada.' });

    const solicitudes = await SolicitudReclutador.findAll({
      where: { empresaId: empresa.id },
      order: [['createdAt', 'DESC']],
    });

    return res.json({ success: true, total: solicitudes.length, data: solicitudes });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al obtener las solicitudes.' });
  }
};

