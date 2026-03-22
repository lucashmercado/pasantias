const router = require('express').Router();
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');
const { Empresa } = require('../models');

// Obtener perfil de empresa propio
router.get('/mi-empresa', verifyToken, authorizeRoles('empresa'), async (req, res) => {
  const empresa = await Empresa.findOne({ where: { usuarioId: req.usuario.id } });
  return res.json({ success: true, data: empresa });
});

// Actualizar perfil de empresa
router.put('/mi-empresa', verifyToken, authorizeRoles('empresa'), async (req, res) => {
  try {
    await Empresa.update(req.body, { where: { usuarioId: req.usuario.id } });
    const empresa = await Empresa.findOne({ where: { usuarioId: req.usuario.id } });
    return res.json({ success: true, data: empresa });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error al actualizar la empresa.' });
  }
});

module.exports = router;
