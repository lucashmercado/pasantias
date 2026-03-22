'use strict';
const sequelize = require('../config/database');

const Usuario     = require('./usuario.model')(sequelize);
const Perfil      = require('./perfil.model')(sequelize);
const Empresa     = require('./empresa.model')(sequelize);
const Oferta      = require('./oferta.model')(sequelize);
const Postulacion = require('./postulacion.model')(sequelize);
const Notificacion= require('./notificacion.model')(sequelize);

// ── Asociaciones ──────────────────────────────────────────────────────────────

// Usuario <-> Perfil (1:1)
Usuario.hasOne(Perfil, { foreignKey: 'usuarioId', as: 'perfil', onDelete: 'CASCADE' });
Perfil.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' });

// Usuario <-> Empresa (1:1)
Usuario.hasOne(Empresa, { foreignKey: 'usuarioId', as: 'empresa', onDelete: 'CASCADE' });
Empresa.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' });

// Empresa <-> Oferta (1:N)
Empresa.hasMany(Oferta, { foreignKey: 'empresaId', as: 'ofertas', onDelete: 'CASCADE' });
Oferta.belongsTo(Empresa, { foreignKey: 'empresaId', as: 'empresa' });

// Usuario <-> Postulacion (1:N)
Usuario.hasMany(Postulacion, { foreignKey: 'usuarioId', as: 'postulaciones', onDelete: 'CASCADE' });
Postulacion.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' });

// Oferta <-> Postulacion (1:N)
Oferta.hasMany(Postulacion, { foreignKey: 'ofertaId', as: 'postulaciones', onDelete: 'CASCADE' });
Postulacion.belongsTo(Oferta, { foreignKey: 'ofertaId', as: 'oferta' });

// Usuario <-> Notificacion (1:N)
Usuario.hasMany(Notificacion, { foreignKey: 'usuarioId', as: 'notificaciones', onDelete: 'CASCADE' });
Notificacion.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' });

module.exports = {
  sequelize,
  Usuario,
  Perfil,
  Empresa,
  Oferta,
  Postulacion,
  Notificacion,
};
