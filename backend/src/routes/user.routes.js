const router = require('express').Router();
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');
const { Perfil, Usuario } = require('../models');
const multer = require('multer');
const path = require('path');

// Configuración de multer para CV
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => cb(null, `cv_${req.usuario.id}_${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Solo se aceptan archivos PDF.'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Obtener perfil propio
router.get('/perfil', verifyToken, async (req, res) => {
  const perfil = await Perfil.findOne({ where: { usuarioId: req.usuario.id } });
  return res.json({ success: true, data: perfil });
});

// Actualizar perfil
router.put('/perfil', verifyToken, authorizeRoles('alumno', 'egresado'), async (req, res) => {
  try {
    const [updated] = await Perfil.update(req.body, { where: { usuarioId: req.usuario.id } });
    const perfil = await Perfil.findOne({ where: { usuarioId: req.usuario.id } });
    return res.json({ success: true, data: perfil });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error al actualizar el perfil.' });
  }
});

// Subir CV
router.post('/perfil/cv', verifyToken, authorizeRoles('alumno', 'egresado'), upload.single('cv'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No se subió ningún archivo.' });
    const cvPath = `/uploads/${req.file.filename}`;
    await Perfil.update({ cvPath }, { where: { usuarioId: req.usuario.id } });
    return res.json({ success: true, message: 'CV subido correctamente.', cvPath });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error al subir el CV.' });
  }
});

// Ver perfil público de un usuario
router.get('/:id/perfil', verifyToken, async (req, res) => {
  const usuario = await Usuario.findByPk(req.params.id, {
    attributes: ['id', 'nombre', 'apellido'],
    include: [{ model: Perfil, as: 'perfil' }],
  });
  if (!usuario) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
  return res.json({ success: true, data: usuario });
});

module.exports = router;
