const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { enviarEmail } = require('../utils/mailer');

const generarToken = (usuario) =>
  jwt.sign({ id: usuario.id, rol: usuario.rol }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const serializarUsuario = (usuario) => ({
  id: usuario.id,
  nombre: usuario.nombre,
  apellido: usuario.apellido,
  email: usuario.email,
  rol: usuario.rol,
  telefono: usuario.telefono || null,
  ubicacion: usuario.ubicacion || null,
  fotoPerfil: usuario.fotoPerfil || null,
});

const hashPassword = (plain) => bcrypt.hash(plain, 12);

const compararPassword = (plain, hash) => bcrypt.compare(plain, hash);

const generarTokenReset = () => crypto.randomBytes(32).toString('hex');

const enviarEmailReset = async (email, token) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;
  await enviarEmail({
    to: email,
    subject: 'Recupero de contraseña',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#6366f1">Recupero de contraseña</h2>
        <p>Hacé clic en el siguiente enlace para restablecer tu contraseña.<br>El link expira en <strong>1 hora</strong>.</p>
        <a href="${resetUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;font-weight:bold">
          Restablecer contraseña
        </a>
        <p style="margin-top:24px;color:#888;font-size:0.85rem">Si no solicitaste esto, ignorá este email.</p>
      </div>
    `,
  });
};

module.exports = {
  generarToken,
  serializarUsuario,
  hashPassword,
  compararPassword,
  generarTokenReset,
  enviarEmailReset,
};
