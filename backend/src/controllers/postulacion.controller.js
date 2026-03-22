const { Postulacion, Oferta, Usuario, Perfil, Empresa, Notificacion } = require('../models');

// ── Postularse ────────────────────────────────────────────────────────────────
exports.postular = async (req, res) => {
  try {
    const { ofertaId, cartaPresentacion } = req.body;

    const existe = await Postulacion.findOne({
      where: { usuarioId: req.usuario.id, ofertaId },
    });
    if (existe) return res.status(400).json({ success: false, message: 'Ya te postulaste a esta oferta.' });

    const oferta = await Oferta.findByPk(ofertaId, { include: [{ model: Empresa, as: 'empresa' }] });
    if (!oferta || oferta.estado !== 'activa') {
      return res.status(404).json({ success: false, message: 'Oferta no disponible.' });
    }

    const postulacion = await Postulacion.create({
      usuarioId: req.usuario.id,
      ofertaId,
      cartaPresentacion,
    });

    // Notificar a la empresa
    await Notificacion.create({
      usuarioId: oferta.empresa.usuarioId,
      titulo: 'Nueva postulación recibida',
      mensaje: `${req.usuario.nombre} ${req.usuario.apellido} se postuló a "${oferta.titulo}".`,
      tipo: 'postulacion',
      enlace: `/empresa/postulaciones/${postulacion.id}`,
    });

    return res.status(201).json({ success: true, message: 'Postulación enviada correctamente.', data: postulacion });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Error al postularse.' });
  }
};

// ── Historial de postulaciones del usuario ────────────────────────────────────
exports.getMisPostulaciones = async (req, res) => {
  try {
    const postulaciones = await Postulacion.findAll({
      where: { usuarioId: req.usuario.id },
      include: [{
        model: Oferta, as: 'oferta',
        include: [{ model: Empresa, as: 'empresa', attributes: ['razonSocial', 'logo'] }],
      }],
      order: [['createdAt', 'DESC']],
    });
    return res.json({ success: true, data: postulaciones });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al obtener postulaciones.' });
  }
};

// ── Postulaciones de una oferta (empresa) ─────────────────────────────────────
exports.getPostulacionesByOferta = async (req, res) => {
  try {
    const empresa = await Empresa.findOne({ where: { usuarioId: req.usuario.id } });
    const oferta = await Oferta.findOne({ where: { id: req.params.ofertaId, empresaId: empresa.id } });
    if (!oferta) return res.status(404).json({ success: false, message: 'Oferta no encontrada.' });

    const postulaciones = await Postulacion.findAll({
      where: { ofertaId: oferta.id },
      include: [{ model: Usuario, as: 'usuario', include: [{ model: Perfil, as: 'perfil' }] }],
      order: [['createdAt', 'DESC']],
    });
    return res.json({ success: true, data: postulaciones });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al obtener postulaciones.' });
  }
};

// ── Cambiar estado de postulación (empresa) ───────────────────────────────────
exports.updateEstado = async (req, res) => {
  try {
    const { estado } = req.body;
    const postulacion = await Postulacion.findByPk(req.params.id, {
      include: [{ model: Oferta, as: 'oferta', include: [{ model: Empresa, as: 'empresa' }] }],
    });

    if (!postulacion) return res.status(404).json({ success: false, message: 'Postulación no encontrada.' });

    const empresa = await Empresa.findOne({ where: { usuarioId: req.usuario.id } });
    if (postulacion.oferta.empresaId !== empresa.id) {
      return res.status(403).json({ success: false, message: 'No tenés permiso para modificar esta postulación.' });
    }

    await postulacion.update({ estado });

    // Notificar al postulante
    const estadoTexto = {
      preseleccionado: 'Fuiste preseleccionado/a',
      entrevista_programada: 'Tu entrevista fue programada',
      no_seleccionado: 'Tu postulación no fue seleccionada',
      contratado: '¡Felicitaciones! Fuiste seleccionado/a',
    };

    await Notificacion.create({
      usuarioId: postulacion.usuarioId,
      titulo: estadoTexto[estado] || 'Estado actualizado',
      mensaje: `Tu postulación para "${postulacion.oferta.titulo}" cambió a: ${estado.replace(/_/g, ' ')}.`,
      tipo: 'estado',
      enlace: `/mis-postulaciones/${postulacion.id}`,
    });

    return res.json({ success: true, message: 'Estado actualizado.', data: postulacion });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al actualizar el estado.' });
  }
};
