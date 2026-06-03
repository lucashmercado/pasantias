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

// ── Configuración de almacenamiento de archivos ───────────────────────────────
// multer se usa para gestionar la subida de archivos al servidor
const storage = multer.diskStorage({
  // Carpeta de destino donde se guardan los archivos subidos
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  // Nombre del archivo: <tipo>_<idUsuario>_<timestamp>.<extension>
  filename: (req, file, cb) => {
    const prefix = file.fieldname === 'carta' ? 'carta' : 'cv';
    cb(null, `${prefix}_${req.usuario.id}_${Date.now()}${path.extname(file.originalname)}`);
  },
});

// Filtro para CV: solo PDF
const uploadCV = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Solo se aceptan archivos PDF.'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // Límite: 5 MB
});

// Filtro para carta de recomendación: PDF o imagen
const uploadCarta = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const permitidos = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (permitidos.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Solo se aceptan PDF o imágenes (JPG, PNG, WEBP).'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // Límite: 5 MB
});

// ── Rutas ─────────────────────────────────────────────────────────────────────

// GET /api/users/perfil — Obtiene el perfil del usuario autenticado
// Incluye telefono y ubicacion del modelo Usuario para calcular completitud
router.get('/perfil', verifyToken, async (req, res) => {
  try {
    const perfil = await Perfil.findOne({ where: { usuarioId: req.usuario.id } });
    const usuario = await Usuario.findByPk(req.usuario.id, {
      attributes: ['telefono', 'ubicacion'],
    });
    // Combinar datos de perfil con telefono/ubicacion del usuario
    const datos = perfil ? perfil.toJSON() : {};
    datos.telefono = usuario?.telefono || null;
    datos.ubicacion = usuario?.ubicacion || null;
    return res.json({ success: true, data: datos });
  } catch (err) {
    console.error('[GET /perfil] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Error al obtener el perfil.' });
  }
});

// PUT /api/users/perfil — Actualiza el perfil del usuario autenticado
// Solo accesible para alumnos y egresados
router.put('/perfil', verifyToken, authorizeRoles('alumno', 'egresado'), async (req, res) => {
  try {
    const body = { ...req.body };

    // ── Sanitizar campos ARRAY ────────────────────────────────────────────────
    // PostgreSQL no puede hacer el cast de '' → ARRAY. Si viene vacío o string,
    // se convierte a array vacío; si ya es array se deja igual.
    ['habilidades', 'idiomas', 'certificaciones'].forEach((campo) => {
      if (body[campo] === undefined || body[campo] === null) return;
      if (typeof body[campo] === 'string') {
        // Intentar parsear si viene como JSON string (ej: '["JavaScript","React"]')
        try {
          const parsed = JSON.parse(body[campo]);
          body[campo] = Array.isArray(parsed) ? parsed : [];
        } catch {
          // Si es string vacío o texto plano → array vacío
          body[campo] = body[campo].trim() ? body[campo].split(',').map(s => s.trim()).filter(Boolean) : [];
        }
      } else if (!Array.isArray(body[campo])) {
        body[campo] = [];
      }
    });

    // ── Sanitizar campo redesSociales (texto libre, almacenado como JSONB en la BD) ──────────
    // Se recibe como string de texto plano desde el frontend.
    // Para evitar errores de casting, lo guardamos envuelto en un objeto JSON simple.
    if (body.redesSociales !== undefined) {
      if (typeof body.redesSociales === 'string') {
        if (!body.redesSociales.trim()) {
          body.redesSociales = null;
        } else {
          // Guardar como objeto JSON con clave "texto" para respetar el tipo JSONB
          body.redesSociales = { texto: body.redesSociales.trim() };
        }
      }
    }

    // ── Sanitizar visibilidadPerfil (BOOLEAN) ─────────────────────────────────
    if (body.visibilidadPerfil !== undefined) {
      if (typeof body.visibilidadPerfil === 'string') {
        body.visibilidadPerfil = body.visibilidadPerfil === 'true' || body.visibilidadPerfil === 'publica';
      }
    }

    // ── Extraer y guardar telefono/ubicacion en el modelo Usuario ─────────────
    // Estos campos no pertenecen al Perfil sino al Usuario
    const datosUsuario = {};
    if (body.telefono !== undefined) datosUsuario.telefono = body.telefono?.trim() || null;
    if (body.ubicacion !== undefined) datosUsuario.ubicacion = body.ubicacion?.trim() || null;
    if (Object.keys(datosUsuario).length > 0) {
      await Usuario.update(datosUsuario, { where: { id: req.usuario.id } });
    }

    // ── Eliminar campos que no pertenecen al modelo Perfil para evitar errores ─
    const camposPermitidos = [
      'carrera', 'anioEgreso', 'descripcion', 'habilidades', 'idiomas',
      'certificaciones', 'linkedin', 'github', 'portfolio', 'redesSociales',
      'fotoPerfil', 'areaInteres', 'disponibilidad', 'preferenciasLaborales',
      'salarioPretendido', 'visibilidadPerfil', 'experienciaLaboral', 'proyectos',
    ];
    const datosLimpios = Object.fromEntries(
      Object.entries(body).filter(([k]) => camposPermitidos.includes(k))
    );

    await Perfil.update(datosLimpios, { where: { usuarioId: req.usuario.id } });

    // Devolver el perfil actualizado junto con telefono/ubicacion del Usuario
    const perfil = await Perfil.findOne({ where: { usuarioId: req.usuario.id } });
    const usuarioActualizado = await Usuario.findByPk(req.usuario.id, {
      attributes: ['telefono', 'ubicacion'],
    });
    const datos = perfil ? perfil.toJSON() : {};
    datos.telefono = usuarioActualizado?.telefono || null;
    datos.ubicacion = usuarioActualizado?.ubicacion || null;

    return res.json({ success: true, data: datos });
  } catch (err) {
    console.error('[PUT /perfil] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Error al actualizar el perfil.' });
  }
});


// POST /api/users/perfil/cv — Sube un CV en PDF
router.post('/perfil/cv', verifyToken, authorizeRoles('alumno', 'egresado'), uploadCV.single('cv'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No se subió ningún archivo.' });
    const cvPath = `/uploads/${req.file.filename}`;
    await Perfil.update({ cvPath }, { where: { usuarioId: req.usuario.id } });
    return res.json({ success: true, message: 'CV subido correctamente.', cvPath });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error al subir el CV.' });
  }
});

// POST /api/users/perfil/carta-recomendacion — Sube carta de recomendación (PDF o imagen)
// Accesible para alumnos y egresados
router.post('/perfil/carta-recomendacion', verifyToken, authorizeRoles('alumno', 'egresado'), uploadCarta.single('carta'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No se subió ningún archivo.' });
    const cartaRecomendacion = `/uploads/${req.file.filename}`;
    await Perfil.update({ cartaRecomendacion }, { where: { usuarioId: req.usuario.id } });
    return res.json({ success: true, message: 'Carta de recomendación subida correctamente.', cartaRecomendacion });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error al subir la carta de recomendación.' });
  }
});

// GET /api/users/:id/perfil — Devuelve el perfil público de un usuario
// Solo alumno/egresado activos. Respeta visibilidadPerfil (BOOLEAN en DB).
// Excluye campos sensibles: salarioPretendido, preferenciasLaborales, redesSociales, cartaRecomendacion.
router.get('/:id/perfil', verifyToken, async (req, res) => {
  try {
    const usuario = await Usuario.findOne({
      where: { id: req.params.id, activo: true },
      attributes: ['id', 'nombre', 'apellido', 'rol', 'fotoPerfil', 'ubicacion'],
    });
    if (!usuario || !['alumno', 'egresado'].includes(usuario.rol)) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    const perfil = await Perfil.findOne({
      where: { usuarioId: req.params.id },
      attributes: [
        'carrera', 'anioEgreso', 'descripcion', 'habilidades', 'idiomas',
        'certificaciones', 'linkedin', 'github', 'portfolio', 'cvPath',
        'areaInteres', 'disponibilidad', 'experienciaLaboral', 'proyectos',
        'visibilidadPerfil',
      ],
    });

    // visibilidadPerfil es BOOLEAN: false → privado → 403
    if (perfil && perfil.visibilidadPerfil === false) {
      return res.status(403).json({ success: false, message: 'Este perfil es privado.', code: 'PERFIL_PRIVADO' });
    }

    const { visibilidadPerfil, ...perfilPublico } = perfil ? perfil.toJSON() : {};
    return res.json({
      success: true,
      data: {
        ...usuario.toJSON(),
        perfil: perfil ? perfilPublico : null,
      },
    });
  } catch (err) {
    console.error('[GET /:id/perfil]', err.message);
    return res.status(500).json({ success: false, message: 'Error al obtener el perfil.' });
  }
});

module.exports = router;
