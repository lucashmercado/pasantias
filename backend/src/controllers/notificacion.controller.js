const { Notificacion } = require('../models');

const getNotificaciones = async (req, res) => {
  try {
    const notificaciones = await Notificacion.findAll({
      where: { usuarioId: req.usuario.id },
      order: [
        ['leida', 'ASC'],
        ['createdAt', 'DESC'],
      ],
      limit: 50,
    });
    const sinLeer = notificaciones.filter((n) => !n.leida).length;
    return res.json({ success: true, sinLeer, total: notificaciones.length, data: notificaciones });
  } catch {
    return res.status(500).json({ success: false, message: 'Error al obtener notificaciones.' });
  }
};

const getSinLeerCount = async (req, res) => {
  try {
    const count = await Notificacion.count({
      where: { usuarioId: req.usuario.id, leida: false },
    });
    return res.json({ success: true, count });
  } catch {
    return res.json({ success: true, count: 0 });
  }
};

const leerTodas = async (req, res) => {
  try {
    await Notificacion.update(
      { leida: true },
      { where: { usuarioId: req.usuario.id, leida: false } }
    );
    return res.json({ success: true, message: 'Todas las notificaciones marcadas como leídas.' });
  } catch {
    return res.status(500).json({ success: false, message: 'Error al marcar notificaciones.' });
  }
};

const leerUna = async (req, res) => {
  try {
    await Notificacion.update(
      { leida: true },
      { where: { id: req.params.id, usuarioId: req.usuario.id } }
    );
    return res.json({ success: true, message: 'Notificación marcada como leída.' });
  } catch {
    return res.status(500).json({ success: false, message: 'Error al marcar la notificación.' });
  }
};

const eliminarNotificacion = async (req, res) => {
  try {
    await Notificacion.destroy({
      where: { id: req.params.id, usuarioId: req.usuario.id },
    });
    return res.json({ success: true, message: 'Notificación eliminada.' });
  } catch {
    return res.status(500).json({ success: false, message: 'Error al eliminar la notificación.' });
  }
};

module.exports = {
  getNotificaciones,
  getSinLeerCount,
  leerTodas,
  leerUna,
  eliminarNotificacion,
};
