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
 */

'use strict';

const { Empresa, EmpresaUsuario, Usuario, Oferta, Postulacion } = require('../models');
const { Op } = require('sequelize');

// ── Helpers internos ──────────────────────────────────────────────────────────

/**
 * Obtiene la empresa del usuario autenticado.
 * Devuelve null si no tiene empresa asociada.
 *
 * @param {number} usuarioId
 * @returns {Promise<Empresa|null>}
 */
async function _getEmpresaUsuario(usuarioId) {
  return Empresa.findOne({ where: { usuarioId } });
}

/**
 * Verifica si un usuario tiene acceso a una empresa.
 * Tiene acceso el propietario (usuarioId en empresas) o cualquier miembro
 * activo en empresa_usuarios.
 *
 * @param {number} usuarioId
 * @param {number} empresaId
 * @returns {Promise<boolean>}
 */
async function _tieneAcceso(usuarioId, empresaId) {
  const empresa = await Empresa.findOne({ where: { id: empresaId, usuarioId } });
  if (empresa) return true;
  const miembro = await EmpresaUsuario.findOne({ where: { empresaId, usuarioId, activo: true } });
  return !!miembro;
}

// ── Dashboard de empresa ──────────────────────────────────────────────────────
/**
 * GET /api/empresas/dashboard
 * Devuelve en una sola llamada las métricas del panel corporativo:
 *
 *   ofertasActivas              — ofertas con estado 'activa'
 *   ofertasPausadas             — ofertas con estado 'pausada'
 *   ofertasCerradas             — ofertas con estado 'cerrada'
 *   ofertasPendienteModeracion  — publicadas pero aún no aprobadas por el admin
 *   totalPostulaciones          — total de candidatos en todas las ofertas
 *   candidatosEnRevision        — postulaciones sin respuesta aún
 *   candidatosPreseleccionados  — con interés inicial de la empresa
 *   entrevistasPendientes       — en proceso de entrevista
 *   contrataciones              — candidatos contratados
 *   miembrosEquipo              — cantidad de reclutadores en el equipo
 *   ofertasRecientes            — últimas 5 ofertas publicadas
 *
 * Acceso: empresa
 */
exports.getDashboard = async (req, res) => {
  try {
    const empresa = await _getEmpresaUsuario(req.usuario.id);
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
    // Se ejecutan en paralelo para mejorar el rendimiento
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
      // Acepta tanto el estado legacy como el nuevo
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
 * Devuelve todas las ofertas de la empresa autenticada,
 * con el conteo de postulaciones por oferta.
 */
exports.getMisOfertas = async (req, res) => {
  try {
    const empresa = await _getEmpresaUsuario(req.usuario.id);
    if (!empresa) return res.status(404).json({ success: false, message: 'No tenés empresa registrada.' });

    const ofertas = await Oferta.findAll({
      where: { empresaId: empresa.id },
      attributes: ['id', 'titulo', 'modalidad', 'ciudad', 'estado', 'moderada',
                   'cantidadVacantes', 'fechaLimite', 'area', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });

    // Agrega el conteo de postulaciones para cada oferta
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
    const empresa = await _getEmpresaUsuario(req.usuario.id);
    if (!empresa) return res.status(404).json({ success: false, message: 'No tenés empresa registrada.' });
    return res.json({ success: true, data: empresa });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al obtener la empresa.' });
  }
};

/**
 * PUT /api/empresas/mi-empresa
 * Actualiza el perfil de la empresa del usuario autenticado.
 */
exports.updateMiEmpresa = async (req, res) => {
  try {
    await Empresa.update(req.body, { where: { usuarioId: req.usuario.id } });
    const empresa = await _getEmpresaUsuario(req.usuario.id);
    return res.json({ success: true, data: empresa });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al actualizar la empresa.' });
  }
};

// ── Gestión del equipo de reclutadores ────────────────────────────────────────
/**
 * GET /api/empresas/equipo
 * Lista todos los miembros activos del equipo de la empresa.
 * Incluye los datos básicos del usuario (nombre, email, rol).
 */
exports.getEquipo = async (req, res) => {
  try {
    const empresa = await _getEmpresaUsuario(req.usuario.id);
    if (!empresa) return res.status(404).json({ success: false, message: 'No tenés empresa registrada.' });

    const equipo = await EmpresaUsuario.findAll({
      where: { empresaId: empresa.id },
      include: [{
        model: Usuario,
        as: 'usuario',
        attributes: ['id', 'nombre', 'apellido', 'email', 'fotoPerfil', 'ultimoAcceso'],
      }],
      order: [['createdAt', 'ASC']],
    });

    return res.json({ success: true, total: equipo.length, data: equipo });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al obtener el equipo.' });
  }
};

/**
 * POST /api/empresas/equipo
 * Agrega un usuario existente del sistema al equipo de la empresa.
 *
 * Body:
 *   email      {string} — email del usuario a agregar
 *   rolInterno {string} — 'reclutador' | 'gerente' (default: 'reclutador')
 *
 * Restricciones:
 * - El usuario debe existir en el sistema
 * - No puede agregarse a sí mismo
 * - Un usuario no puede estar dos veces en el mismo equipo
 */
exports.addMiembro = async (req, res) => {
  try {
    const { email, rolInterno = 'reclutador' } = req.body;

    const empresa = await _getEmpresaUsuario(req.usuario.id);
    if (!empresa) return res.status(404).json({ success: false, message: 'No tenés empresa registrada.' });

    // Busca el usuario por email
    const usuarioAgregar = await Usuario.findOne({ where: { email } });
    if (!usuarioAgregar) {
      return res.status(404).json({ success: false, message: 'No existe un usuario con ese email.' });
    }

    // No se puede agregar al propietario de la empresa
    if (usuarioAgregar.id === req.usuario.id) {
      return res.status(400).json({ success: false, message: 'No podés agregarte a vos mismo como reclutador.' });
    }

    // Verifica si ya es miembro (activo o no)
    const yaExiste = await EmpresaUsuario.findOne({
      where: { empresaId: empresa.id, usuarioId: usuarioAgregar.id },
    });

    if (yaExiste) {
      if (yaExiste.activo) {
        return res.status(400).json({ success: false, message: 'Este usuario ya es miembro del equipo.' });
      }
      // Si estaba inactivo, lo reactiva
      await yaExiste.update({ activo: true, rolInterno });
      return res.json({ success: true, message: 'Miembro reactivado en el equipo.', data: yaExiste });
    }

    const miembro = await EmpresaUsuario.create({
      empresaId: empresa.id,
      usuarioId: usuarioAgregar.id,
      rolInterno,
      activo: true,
    });

    return res.status(201).json({ success: true, message: 'Miembro agregado al equipo.', data: miembro });
  } catch (error) {
    console.error('Error en addMiembro:', error);
    return res.status(500).json({ success: false, message: 'Error al agregar el miembro.' });
  }
};

/**
 * PATCH /api/empresas/equipo/:id
 * Actualiza el rol interno o el estado activo de un miembro del equipo.
 *
 * Body (al menos uno requerido):
 *   rolInterno {string}  — nuevo rol ('reclutador' | 'gerente')
 *   activo     {boolean} — true para reactivar, false para suspender
 */
exports.updateMiembro = async (req, res) => {
  try {
    const empresa = await _getEmpresaUsuario(req.usuario.id);
    if (!empresa) return res.status(404).json({ success: false, message: 'No tenés empresa registrada.' });

    const miembro = await EmpresaUsuario.findOne({
      where: { id: req.params.id, empresaId: empresa.id },
    });
    if (!miembro) return res.status(404).json({ success: false, message: 'Miembro no encontrado.' });

    // No se puede modificar al propietario
    if (miembro.rolInterno === 'propietario') {
      return res.status(403).json({ success: false, message: 'No se puede modificar al propietario.' });
    }

    const { rolInterno, activo } = req.body;
    const updateData = {};
    if (rolInterno !== undefined) updateData.rolInterno = rolInterno;
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
 */
exports.removeMiembro = async (req, res) => {
  try {
    const empresa = await _getEmpresaUsuario(req.usuario.id);
    if (!empresa) return res.status(404).json({ success: false, message: 'No tenés empresa registrada.' });

    const miembro = await EmpresaUsuario.findOne({
      where: { id: req.params.id, empresaId: empresa.id },
    });
    if (!miembro) return res.status(404).json({ success: false, message: 'Miembro no encontrado.' });

    if (miembro.rolInterno === 'propietario') {
      return res.status(403).json({ success: false, message: 'No se puede eliminar al propietario del equipo.' });
    }

    await miembro.update({ activo: false });
    return res.json({ success: true, message: 'Miembro eliminado del equipo.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al eliminar el miembro.' });
  }
};
