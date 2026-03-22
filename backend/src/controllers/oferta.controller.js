const { Oferta, Empresa, Usuario } = require('../models');
const { Op } = require('sequelize');

// ── Listar ofertas con filtros ────────────────────────────────────────────────
exports.getOfertas = async (req, res) => {
  try {
    const { area, modalidad, ciudad, experiencia, q } = req.query;
    const where = { estado: 'activa', moderada: true };

    if (area) where.area = { [Op.iLike]: `%${area}%` };
    if (modalidad) where.modalidad = modalidad;
    if (ciudad) where.ciudad = { [Op.iLike]: `%${ciudad}%` };
    if (experiencia) where.nivelExperiencia = experiencia;
    if (q) where.titulo = { [Op.iLike]: `%${q}%` };

    const ofertas = await Oferta.findAll({
      where,
      include: [{ model: Empresa, as: 'empresa', attributes: ['razonSocial', 'logo', 'rubro', 'ciudad'] }],
      order: [['createdAt', 'DESC']],
    });

    return res.json({ success: true, total: ofertas.length, data: ofertas });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Error al obtener las ofertas.' });
  }
};

// ── Detalle de oferta ─────────────────────────────────────────────────────────
exports.getOfertaById = async (req, res) => {
  try {
    const oferta = await Oferta.findByPk(req.params.id, {
      include: [{ model: Empresa, as: 'empresa' }],
    });
    if (!oferta) return res.status(404).json({ success: false, message: 'Oferta no encontrada.' });

    // Incrementar vistas
    await oferta.increment('vistas');

    return res.json({ success: true, data: oferta });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al obtener la oferta.' });
  }
};

// ── Crear oferta (empresa) ────────────────────────────────────────────────────
exports.createOferta = async (req, res) => {
  try {
    const empresa = await Empresa.findOne({ where: { usuarioId: req.usuario.id } });
    if (!empresa) return res.status(400).json({ success: false, message: 'No tenés empresa registrada.' });
    if (empresa.estadoAprobacion !== 'aprobada') {
      return res.status(403).json({ success: false, message: 'Tu empresa aún no fue aprobada.' });
    }

    const oferta = await Oferta.create({ ...req.body, empresaId: empresa.id, moderada: false });
    return res.status(201).json({ success: true, message: 'Oferta creada. Pendiente de moderación.', data: oferta });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al crear la oferta.' });
  }
};

// ── Actualizar oferta ─────────────────────────────────────────────────────────
exports.updateOferta = async (req, res) => {
  try {
    const empresa = await Empresa.findOne({ where: { usuarioId: req.usuario.id } });
    const oferta = await Oferta.findOne({ where: { id: req.params.id, empresaId: empresa.id } });
    if (!oferta) return res.status(404).json({ success: false, message: 'Oferta no encontrada.' });

    await oferta.update(req.body);
    return res.json({ success: true, data: oferta });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al actualizar la oferta.' });
  }
};

// ── Eliminar/cerrar oferta ────────────────────────────────────────────────────
exports.deleteOferta = async (req, res) => {
  try {
    const empresa = await Empresa.findOne({ where: { usuarioId: req.usuario.id } });
    const oferta = await Oferta.findOne({ where: { id: req.params.id, empresaId: empresa.id } });
    if (!oferta) return res.status(404).json({ success: false, message: 'Oferta no encontrada.' });

    await oferta.update({ estado: 'cerrada' });
    return res.json({ success: true, message: 'Oferta cerrada correctamente.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al cerrar la oferta.' });
  }
};
