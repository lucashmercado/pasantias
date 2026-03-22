const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// ── Middlewares ───────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
];
app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (Postman, curl, etc.)
    if (!origin) return callback(null, true);
    // Permitir localhost y cualquier subdominio de trycloudflare.com
    if (
      allowedOrigins.includes(origin) ||
      /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(origin)
    ) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origen no permitido → ${origin}`));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos estáticos (CVs subidos)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Rutas ─────────────────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth.routes'));
app.use('/api/users',         require('./routes/user.routes'));
app.use('/api/empresas',      require('./routes/empresa.routes'));
app.use('/api/ofertas',       require('./routes/oferta.routes'));
app.use('/api/postulaciones', require('./routes/postulacion.routes'));
app.use('/api/admin',         require('./routes/admin.routes'));
app.use('/api/notificaciones',require('./routes/notificacion.routes'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// ── Manejo de errores global ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
  });
});

module.exports = app;
