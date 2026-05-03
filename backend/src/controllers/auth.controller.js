/**
 * auth.controller.js — Controlador de autenticación del sistema.
 *
 * Maneja los siguientes flujos:
 * - Registro de nuevos usuarios (alumnos, egresados, empresas y profesores)
 * - Inicio de sesión con email y contraseña
 * - Obtención del perfil del usuario autenticado
 * - Solicitud de recuperación de contraseña (envío de email con token)
 * - Restablecimiento de contraseña usando el token recibido por email
 *
 * Usa JWT para generar tokens de sesión y bcrypt para hashear contraseñas.
 *
 * Changelog:
 * - v1.1: registro de 'profesor' (crea Perfil automático igual que alumno/egresado)
 *         respuesta de login incluye telefono, ubicacion, fotoPerfil
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Usuario, Perfil, Empresa, EmpresaUsuario, ActivityLog } = require('../models');

// Helper para registrar acciones en el log sin interrumpir el flujo principal
async function logAction(datos) {
  try { await ActivityLog.create(datos); } catch (e) { /* Fallo silencioso */ }
}

/**
 * Genera un token JWT firmado con los datos del usuario.
 * El token expira según la variable de entorno JWT_EXPIRES_IN (por defecto 7 días).
 *
 * @param {Object} usuario - Instancia del modelo Usuario
 * @returns {string} Token JWT firmado
 */
const generateToken = (usuario) =>
  jwt.sign({ id: usuario.id, rol: usuario.rol }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

/**
 * Serializa los campos públicos de un usuario para incluirlos en respuestas JSON.
 * Nunca expone password, tokenReset ni tokenResetExpira.
 *
 * @param {Object} usuario - Instancia del modelo Usuario
 * @returns {Object} Datos públicos del usuario
 */
const serializeUsuario = (usuario) => ({
  id: usuario.id,
  nombre: usuario.nombre,
  apellido: usuario.apellido,
  email: usuario.email,
  rol: usuario.rol,
  telefono: usuario.telefono || null,
  ubicacion: usuario.ubicacion || null,
  fotoPerfil: usuario.fotoPerfil || null,
});

// ── Registro ──────────────────────────────────────────────────────────────────
/**
 * POST /api/auth/register
 * Registra un nuevo usuario en el sistema.
 *
 * Según el rol:
 * - alumno/egresado/profesor → se crea un Perfil vacío asociado
 * - empresa → se crea una Empresa con estado 'pendiente' (requiere aprobación del admin)
 *
 * La contraseña siempre se almacena como hash bcrypt, nunca en texto plano.
 */
exports.register = async (req, res) => {
  try {
    const { nombre, apellido, email, password, rol, razonSocial, telefono, ubicacion,
            carrera, legajo, anioEgreso } = req.body;

    // Validación: solo estos roles pueden registrarse públicamente
    // 'empresa' solo puede crearse a través del flujo de solicitud aprobado por el admin
    const rolesPermitidos = ['alumno', 'egresado'];
    if (!rolesPermitidos.includes(rol)) {
      return res.status(400).json({ success: false, message: 'Rol no válido para registro.' });
    }

    // Verifica si ya existe un usuario con ese email
    const existe = await Usuario.findOne({ where: { email } });
    if (existe) return res.status(400).json({ success: false, message: 'El email ya está registrado.' });

    // Hashea la contraseña con bcrypt (12 rondas de salt para mayor seguridad)
    const hash = await bcrypt.hash(password, 12);

    // Crea el usuario. Las empresas empiezan deshabilitadas hasta que el admin las aprueba
    const nuevoUsuario = await Usuario.create({
      nombre,
      apellido,
      email,
      password: hash,
      rol,
      telefono: telefono || null,
      ubicacion: ubicacion || null,
      habilitado: rol === 'empresa' ? false : true,
    });

    // Crea el registro adicional según el rol del usuario
    if (['alumno', 'egresado'].includes(rol)) {
      // Perfil académico/profesional — opcionalmente con carrera, legajo y año de egreso
      await Perfil.create({
        usuarioId:  nuevoUsuario.id,
        carrera:    carrera    || null,
        legajo:     legajo     || null,
        anioEgreso: anioEgreso || null,
      });
    } else if (rol === 'empresa') {
      // Perfil de empresa en estado pendiente hasta aprobación del admin
      const empresa = await Empresa.create({ usuarioId: nuevoUsuario.id, razonSocial: razonSocial || '' });

      // Registra automáticamente al creador como propietario del equipo.
      // Este registro es la base del sistema multi-usuario: sin él el propietario
      // no aparecería en /api/empresas/equipo junto al resto de los miembros.
      await EmpresaUsuario.create({
        empresaId: empresa.id,
        usuarioId: nuevoUsuario.id,
        rolInterno: 'propietario',
        activo: true,
      });
    }

    // Genera el token JWT para que el usuario quede logueado inmediatamente tras el registro
    const token = generateToken(nuevoUsuario);

    return res.status(201).json({
      success: true,
      message: rol === 'empresa'
        ? 'Cuenta de empresa creada. Aguardá la aprobación del administrador.'
        : 'Cuenta creada correctamente.',
      token,
      usuario: serializeUsuario(nuevoUsuario),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Error al registrar el usuario.' });
  }
};

// ── Login ─────────────────────────────────────────────────────────────────────
/**
 * POST /api/auth/login
 * Autentica un usuario con email y contraseña.
 *
 * Validaciones:
 * 1. El email debe existir en la base de datos
 * 2. La cuenta debe estar activa (no desactivada por el admin)
 * 3. La cuenta debe estar habilitada (empresas aprobadas)
 * 4. La contraseña debe coincidir con el hash almacenado
 *
 * Devuelve un token JWT si las credenciales son correctas.
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Busca el usuario por email
    const usuario = await Usuario.findOne({ where: { email } });
    if (!usuario) return res.status(401).json({ success: false, message: 'Credenciales inválidas.' });

    // Verifica que la cuenta esté activa y habilitada
    if (!usuario.activo) return res.status(403).json({ success: false, message: 'Cuenta desactivada.' });
    if (!usuario.habilitado) return res.status(403).json({
      success: false,
      message: 'Tu cuenta está pendiente de aprobación por el administrador.',
    });

    // Compara la contraseña ingresada con el hash almacenado
    const match = await bcrypt.compare(password, usuario.password);
    if (!match) return res.status(401).json({ success: false, message: 'Credenciales inválidas.' });

    // Genera el token JWT de sesión
    const token = generateToken(usuario);

    // Actualiza ultimoAcceso de forma no bloqueante (fire-and-forget)
    // Si falla (ej: DB caída momentáneamente) no interrumpe el login
    usuario.update({ ultimoAcceso: new Date() }).catch((err) =>
      console.error('⚠️  No se pudo actualizar ultimoAcceso:', err.message)
    );

    // Registra el login en el log de auditoría (no bloquea el login si falla)
    logAction({
      usuarioId: usuario.id,
      accion: 'login',
      entidad: 'usuario',
      entidadId: usuario.id,
      detalle: { rol: usuario.rol, email: usuario.email },
      ip: req.ip,
    });

    return res.json({
      success: true,
      token,
      usuario: serializeUsuario(usuario),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Error al iniciar sesión.' });
  }
};

// ── Perfil propio ─────────────────────────────────────────────────────────────
/**
 * GET /api/auth/me
 * Devuelve los datos del usuario actualmente autenticado.
 * El usuario ya fue validado y adjuntado al request por el middleware verifyToken.
 */
exports.me = async (req, res) => {
  return res.json({ success: true, usuario: req.usuario });
};

// ── Solicitar recupero de contraseña ──────────────────────────────────────────
/**
 * POST /api/auth/forgot-password
 * Inicia el flujo de recuperación de contraseña.
 *
 * Genera un token aleatorio, lo guarda en la base de datos con expiración de 1 hora,
 * y envía un email con el link de recuperación.
 *
 * En modo desarrollo (sin EMAIL_USER configurado), el token se devuelve en la respuesta
 * directamente para facilitar las pruebas sin necesidad de un servidor de email.
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Ingresá tu email.' });

    const usuario = await Usuario.findOne({ where: { email } });

    // Por seguridad, se devuelve la misma respuesta aunque el email no exista
    // (evita que se pueda detectar si un email está registrado o no)
    if (!usuario) {
      return res.json({ success: true, message: 'Si el email está registrado, recibirás las instrucciones.' });
    }

    // Genera un token criptográficamente seguro de 32 bytes
    const token = crypto.randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + 60 * 60 * 1000); // El token expira en 1 hora

    // Guarda el token y su expiración en el registro del usuario
    await usuario.update({ tokenReset: token, tokenResetExpira: expira });

    // Si las credenciales de email están configuradas, envía el correo real
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const nodemailer = require('nodemailer');
        // Configura el transporte de email (SMTP)
        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: Number(process.env.EMAIL_PORT),
          secure: false,
          auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        });
        const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;
        // Envía el email con el link de restablecimiento
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
      // Modo desarrollo: el token se devuelve en la respuesta para facilitar pruebas
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
/**
 * POST /api/auth/reset-password/:token
 * Permite cambiar la contraseña usando el token recibido por email.
 *
 * Validaciones:
 * 1. El token debe existir en la base de datos (no fue usado aún)
 * 2. El token no debe haber expirado (máximo 1 hora de vida)
 * 3. La nueva contraseña debe tener al menos 6 caracteres
 *
 * Después de cambiar la contraseña, el token se invalida (se pone a null).
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Valida que la nueva contraseña cumpla el mínimo de longitud
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    // Busca el usuario por el token de recuperación
    const usuario = await Usuario.findOne({ where: { tokenReset: token } });

    if (!usuario) {
      return res.status(400).json({ success: false, message: 'Token inválido o ya utilizado.' });
    }
    // Verifica que el token no haya expirado
    if (new Date() > new Date(usuario.tokenResetExpira)) {
      return res.status(400).json({ success: false, message: 'El token expiró. Solicitá uno nuevo.' });
    }

    // Hashea la nueva contraseña y la guarda. Limpia el token para que no se pueda reusar
    const hash = await bcrypt.hash(password, 12);
    await usuario.update({ password: hash, tokenReset: null, tokenResetExpira: null });

    return res.json({ success: true, message: 'Contraseña restablecida correctamente. Ya podés iniciar sesión.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Error al restablecer la contraseña.' });
  }
};
