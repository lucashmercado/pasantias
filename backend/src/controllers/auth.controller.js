const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Usuario, Perfil, Empresa } = require('../models');

const generateToken = (usuario) =>
  jwt.sign({ id: usuario.id, rol: usuario.rol }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// ── Registro ──────────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { nombre, apellido, email, password, rol, razonSocial } = req.body;

    const existe = await Usuario.findOne({ where: { email } });
    if (existe) return res.status(400).json({ success: false, message: 'El email ya está registrado.' });

    const hash = await bcrypt.hash(password, 12);

    const nuevoUsuario = await Usuario.create({
      nombre, apellido, email, password: hash, rol,
      habilitado: rol === 'empresa' ? false : true,
    });

    if (rol === 'alumno' || rol === 'egresado') {
      await Perfil.create({ usuarioId: nuevoUsuario.id });
    } else if (rol === 'empresa') {
      await Empresa.create({ usuarioId: nuevoUsuario.id, razonSocial: razonSocial || '' });
    }

    const token = generateToken(nuevoUsuario);

    return res.status(201).json({
      success: true,
      message: rol === 'empresa'
        ? 'Cuenta de empresa creada. Aguardá la aprobación del administrador.'
        : 'Cuenta creada correctamente.',
      token,
      usuario: {
        id: nuevoUsuario.id,
        nombre: nuevoUsuario.nombre,
        apellido: nuevoUsuario.apellido,
        email: nuevoUsuario.email,
        rol: nuevoUsuario.rol,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Error al registrar el usuario.' });
  }
};

// ── Login ─────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const usuario = await Usuario.findOne({ where: { email } });
    if (!usuario) return res.status(401).json({ success: false, message: 'Credenciales inválidas.' });

    if (!usuario.activo) return res.status(403).json({ success: false, message: 'Cuenta desactivada.' });
    if (!usuario.habilitado) return res.status(403).json({
      success: false,
      message: 'Tu cuenta está pendiente de aprobación por el administrador.',
    });

    const match = await bcrypt.compare(password, usuario.password);
    if (!match) return res.status(401).json({ success: false, message: 'Credenciales inválidas.' });

    const token = generateToken(usuario);

    return res.json({
      success: true,
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Error al iniciar sesión.' });
  }
};

// ── Perfil propio ─────────────────────────────────────────────────────────────
exports.me = async (req, res) => {
  return res.json({ success: true, usuario: req.usuario });
};

// ── Solicitar recupero de contraseña ──────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Ingresá tu email.' });

    const usuario = await Usuario.findOne({ where: { email } });

    if (!usuario) {
      return res.json({ success: true, message: 'Si el email está registrado, recibirás las instrucciones.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
    await usuario.update({ tokenReset: token, tokenResetExpira: expira });

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: Number(process.env.EMAIL_PORT),
          secure: false,
          auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        });
        const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;
        await transporter.sendMail({
          from: `"Sistema de Pasantías" <${process.env.EMAIL_USER}>`,
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
        return res.json({ success: true, message: 'Te enviamos un email con las instrucciones.' });
      } catch (emailErr) {
        console.error('Error enviando email:', emailErr.message);
        return res.status(500).json({ success: false, message: 'Error al enviar el email. Intentá más tarde.' });
      }
    } else {
      // Modo desarrollo: el token se devuelve en la respuesta
      console.log(`\n🔑 TOKEN DE RECUPERO para ${email}:\n   ${token}\n`);
      return res.json({
        success: true,
        message: 'Token generado (modo desarrollo — email no configurado).',
        devToken: token,
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Error al procesar la solicitud.' });
  }
};

// ── Restablecer contraseña ────────────────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    const usuario = await Usuario.findOne({ where: { tokenReset: token } });

    if (!usuario) {
      return res.status(400).json({ success: false, message: 'Token inválido o ya utilizado.' });
    }
    if (new Date() > new Date(usuario.tokenResetExpira)) {
      return res.status(400).json({ success: false, message: 'El token expiró. Solicitá uno nuevo.' });
    }

    const hash = await bcrypt.hash(password, 12);
    await usuario.update({ password: hash, tokenReset: null, tokenResetExpira: null });

    return res.json({ success: true, message: 'Contraseña restablecida correctamente. Ya podés iniciar sesión.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Error al restablecer la contraseña.' });
  }
};
