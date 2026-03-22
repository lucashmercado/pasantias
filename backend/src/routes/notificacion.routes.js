const router = require('express').Router();
const { verifyToken } = require('../middleware/auth.middleware');
const { Notificacion } = require('../models');

router.get('/', verifyToken, async (req, res) => {
  const notificaciones = await Notificacion.findAll({
    where: { usuarioId: req.usuario.id },
    order: [['createdAt', 'DESC']],
    limit: 50,
  });
  return res.json({ success: true, data: notificaciones });
});

router.patch('/:id/leer', verifyToken, async (req, res) => {
  await Notificacion.update({ leida: true }, {
    where: { id: req.params.id, usuarioId: req.usuario.id },
  });
  return res.json({ success: true, message: 'Notificación marcada como leída.' });
});

router.patch('/leer-todas', verifyToken, async (req, res) => {
  await Notificacion.update({ leida: true }, { where: { usuarioId: req.usuario.id } });
  return res.json({ success: true, message: 'Todas las notificaciones marcadas como leídas.' });
});

module.exports = router;
