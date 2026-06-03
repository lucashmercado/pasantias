'use strict';

const { Oferta, Postulacion, Perfil, Usuario, EmpresaUsuario, sequelize } = require('../models');
const { Op } = require('sequelize');

async function obtenerMetricasDashboard(empresaId) {
  const ofertas = await Oferta.findAll({
    where: { empresaId },
    attributes: ['id', 'estado', 'moderada'],
  });
  const ofertaIds = ofertas.map((o) => o.id);

  const ofertasActivas             = ofertas.filter((o) => o.estado === 'activa').length;
  const ofertasPausadas            = ofertas.filter((o) => o.estado === 'pausada').length;
  const ofertasCerradas            = ofertas.filter((o) => o.estado === 'cerrada').length;
  const ofertasPendienteModeracion = ofertas.filter((o) => !o.moderada && o.estado === 'activa').length;

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
    EmpresaUsuario.count({ where: { empresaId, activo: true } }),
  ]);

  const ofertasRecientes = await Oferta.findAll({
    where: { empresaId },
    attributes: ['id', 'titulo', 'estado', 'moderada', 'vistas', 'createdAt', 'cantidadVacantes'],
    order: [['createdAt', 'DESC']],
    limit: 5,
  });

  return {
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
    equipo: { totalMiembros: miembrosEquipo },
    ofertasRecientes,
  };
}

// Reemplaza el N+1 de getMisOfertas con una sola query GROUP BY
async function obtenerOfertasConConteo(empresaId) {
  const ofertas = await Oferta.findAll({
    where: { empresaId },
    attributes: ['id', 'titulo', 'modalidad', 'ciudad', 'estado', 'moderada',
                 'cantidadVacantes', 'fechaLimite', 'area', 'createdAt'],
    order: [['createdAt', 'DESC']],
  });

  if (ofertas.length === 0) return [];

  const ofertaIds = ofertas.map((o) => o.id);

  const conteos = await Postulacion.findAll({
    where: { ofertaId: { [Op.in]: ofertaIds } },
    attributes: [
      'ofertaId',
      [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
    ],
    group: ['ofertaId'],
    raw: true,
  });

  const conteoMap = {};
  conteos.forEach((c) => { conteoMap[c.ofertaId] = parseInt(c.total, 10); });

  return ofertas.map((o) => ({ ...o.toJSON(), totalPostulaciones: conteoMap[o.id] || 0 }));
}

async function obtenerCandidatosConFoto(empresaId, estado) {
  const ofertas = await Oferta.findAll({ where: { empresaId }, attributes: ['id'] });
  const ofertaIds = ofertas.map((o) => o.id);

  if (ofertaIds.length === 0) return [];

  const where = { ofertaId: { [Op.in]: ofertaIds } };
  if (estado) where.estado = estado;

  const postulaciones = await Postulacion.findAll({
    where,
    include: [
      { model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'apellido', 'email', 'fotoPerfil'] },
      { model: Oferta,  as: 'oferta',  attributes: ['id', 'titulo', 'area'] },
    ],
    order: [['updatedAt', 'DESC']],
  });

  const usuariosSinFoto = [...new Set(
    postulaciones.filter((p) => p.usuario?.id && !p.usuario.fotoPerfil).map((p) => p.usuario.id)
  )];

  const fotoMap = {};
  if (usuariosSinFoto.length > 0) {
    const perfiles = await Perfil.findAll({
      where: { usuarioId: { [Op.in]: usuariosSinFoto }, fotoPerfil: { [Op.ne]: null } },
      attributes: ['usuarioId', 'fotoPerfil'],
    });
    perfiles.forEach((p) => { fotoMap[p.usuarioId] = p.fotoPerfil; });
  }

  return postulaciones.map((p) => {
    const plain = p.toJSON();
    if (plain.usuario && !plain.usuario.fotoPerfil) {
      plain.usuario.fotoPerfil = fotoMap[plain.usuario.id] ?? null;
    }
    return plain;
  });
}

module.exports = {
  obtenerMetricasDashboard,
  obtenerOfertasConConteo,
  obtenerCandidatosConFoto,
};
