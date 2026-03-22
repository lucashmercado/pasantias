const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');

/**
 * Middleware: verifica que el token JWT sea válido.
 */
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token requerido.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await Usuario.findByPk(decoded.id, {
      attributes: { exclude: ['password', 'tokenReset', 'tokenResetExpira'] },
    });

    if (!usuario || !usuario.activo) {
      return res.status(401).json({ success: false, message: 'Usuario no encontrado o inactivo.' });
    }

    req.usuario = usuario;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token inválido o expirado.' });
  }
};

/**
 * Middleware: verifica que el usuario tenga alguno de los roles permitidos.
 * @param  {...string} roles - Roles permitidos (ej: 'admin', 'empresa', 'alumno', 'egresado')
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({
        success: false,
        message: 'No tenés permisos para realizar esta acción.',
      });
    }
    next();
  };
};

module.exports = { verifyToken, authorizeRoles };
