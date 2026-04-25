/**
 * user.routes.js — Rutas del perfil de usuario (alumno/egresado).
 *
 * Prefijo de la API: /api/users
 *
 * Permite a los alumnos y egresados:
 * - Ver y editar su perfil académico/profesional
 * - Subir su CV en formato PDF
 * - Consultar el perfil público de otro usuario
 *
 * Nota: la lógica está directamente en las rutas (sin controller separado)
 * ya que son operaciones simples de lectura/escritura sobre el modelo Perfil.
 */

const router = require('express').Router();
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');
const { Perfil, Usuario } = require('../models');
const multer = require('multer');
const path = require('path');

// ── Configuración de almacenamiento de archivos (CV) ──────────────────────────
// multer se usa para gestionar la subida de archivos al servidor
const storage = multer.diskStorage({
  // Carpeta de destino donde se guardan los archivos subidos
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  // Nombre del archivo: cv_<idUsuario>_<timestamp>.<extension>
  // Esto evita colisiones de nombres entre diferentes usuarios
  filename: (req, file, cb) => cb(null, `cv_${req.usuario.id}_${Date.now()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  // Filtro: solo acepta archivos PDF
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Solo se aceptan archivos PDF.'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // Límite de tamaño: 5 MB
});

// ── Rutas ─────────────────────────────────────────────────────────────────────

// GET /api/users/perfil — Obtiene el perfil del usuario autenticado
router.get('/perfil', verifyToken, async (req, res) => {
  const perfil = await Perfil.findOne({ where: { usuarioId: req.usuario.id } });
  return res.json({ success: true, data: perfil });
});

// PUT /api/users/perfil — Actualiza el perfil del usuario autenticado
// Solo accesible para alumnos y egresados
router.put('/perfil', verifyToken, authorizeRoles('alumno', 'egresado'), async (req, res) => {
  try {
    // Actualiza el perfil y devuelve los datos actualizados
    const [updated] = await Perfil.update(req.body, { where: { usuarioId: req.usuario.id } });
    const perfil = await Perfil.findOne({ where: { usuarioId: req.usuario.id } });
    return res.json({ success: true, data: perfil });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error al actualizar el perfil.' });
  }
});

// POST /api/users/perfil/cv — Sube un CV en PDF y guarda la ruta en el perfil
// Solo accesible para alumnos y egresados. Usa multer para gestionar el archivo
router.post('/perfil/cv', verifyToken, authorizeRoles('alumno', 'egresado'), upload.single('cv'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No se subió ningún archivo.' });

    // Genera la URL pública del archivo subido
    const cvPath = `/uploads/${req.file.filename}`;

    // Guarda la ruta del CV en el perfil del usuario
    await Perfil.update({ cvPath }, { where: { usuarioId: req.usuario.id } });
    return res.json({ success: true, message: 'CV subido correctamente.', cvPath });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error al subir el CV.' });
  }
});

// GET /api/users/:id/perfil — Devuelve el perfil público de un usuario
// Accesible para cualquier usuario autenticado (ej: empresa viendo candidato)
router.get('/:id/perfil', verifyToken, async (req, res) => {
  const usuario = await Usuario.findByPk(req.params.id, {
    attributes: ['id', 'nombre', 'apellido'], // Solo datos básicos y no sensibles
    include: [{ model: Perfil, as: 'perfil' }],
  });
  if (!usuario) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
  return res.json({ success: true, data: usuario });
});

module.exports = router;
