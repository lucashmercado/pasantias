const router = require('express').Router();
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');
const { Usuario, Empresa, Oferta, Postulacion, Perfil } = require('../models');
const { sequelize } = require('../models');

// ── Estadísticas generales ────────────────────────────────────────────────────
router.get('/stats', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const [totalUsuarios, totalEmpresas, totalOfertas, totalPostulaciones] = await Promise.all([
      Usuario.count({ where: { rol: ['alumno', 'egresado'] } }),
      Empresa.count(),
      Oferta.count(),
      Postulacion.count(),
    ]);

    const contratados = await Postulacion.count({ where: { estado: 'contratado' } });

    return res.json({
      success: true,
      data: {
        totalUsuarios,
        totalEmpresas,
        totalOfertas,
        totalPostulaciones,
        contratados,
        tasaInsercion: totalPostulaciones > 0
          ? ((contratados / totalPostulaciones) * 100).toFixed(1) + '%'
          : '0%',
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error al obtener estadísticas.' });
  }
});

// ── Gestión de empresas pendientes ────────────────────────────────────────────
router.get('/empresas/pendientes', verifyToken, authorizeRoles('admin'), async (req, res) => {
  const empresas = await Empresa.findAll({
    where: { estadoAprobacion: 'pendiente' },
    include: [{ model: Usuario, as: 'usuario', attributes: ['nombre', 'apellido', 'email'] }],
  });
  return res.json({ success: true, data: empresas });
});

router.patch('/empresas/:id/aprobar', verifyToken, authorizeRoles('admin'), async (req, res) => {
  const empresa = await Empresa.findByPk(req.params.id);
  if (!empresa) return res.status(404).json({ success: false, message: 'Empresa no encontrada.' });
  await empresa.update({ estadoAprobacion: 'aprobada' });
  await Usuario.update({ habilitado: true }, { where: { id: empresa.usuarioId } });
  return res.json({ success: true, message: 'Empresa aprobada.' });
});

router.patch('/empresas/:id/rechazar', verifyToken, authorizeRoles('admin'), async (req, res) => {
  const empresa = await Empresa.findByPk(req.params.id);
  if (!empresa) return res.status(404).json({ success: false, message: 'Empresa no encontrada.' });
  await empresa.update({ estadoAprobacion: 'rechazada' });
  return res.json({ success: true, message: 'Empresa rechazada.' });
});

// ── Moderación de ofertas ─────────────────────────────────────────────────────
router.get('/ofertas/pendientes', verifyToken, authorizeRoles('admin'), async (req, res) => {
  const ofertas = await Oferta.findAll({
    where: { moderada: false },
    include: [{ model: Empresa, as: 'empresa', attributes: ['razonSocial'] }],
  });
  return res.json({ success: true, data: ofertas });
});

router.patch('/ofertas/:id/moderar', verifyToken, authorizeRoles('admin'), async (req, res) => {
  const { aprobada } = req.body;
  const oferta = await Oferta.findByPk(req.params.id);
  if (!oferta) return res.status(404).json({ success: false, message: 'Oferta no encontrada.' });
  await oferta.update({ moderada: aprobada, estado: aprobada ? 'activa' : 'cerrada' });
  return res.json({ success: true, message: aprobada ? 'Oferta aprobada.' : 'Oferta rechazada.' });
});

// ── Gestión de usuarios ───────────────────────────────────────────────────────
router.get('/usuarios', verifyToken, authorizeRoles('admin'), async (req, res) => {
  const usuarios = await Usuario.findAll({ attributes: { exclude: ['password'] } });
  return res.json({ success: true, data: usuarios });
});

router.patch('/usuarios/:id/toggle', verifyToken, authorizeRoles('admin'), async (req, res) => {
  const usuario = await Usuario.findByPk(req.params.id);
  if (!usuario) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
  await usuario.update({ activo: !usuario.activo });
  return res.json({ success: true, message: `Usuario ${usuario.activo ? 'activado' : 'desactivado'}.` });
});

module.exports = router;
