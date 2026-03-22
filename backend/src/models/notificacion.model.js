'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Notificacion = sequelize.define('Notificacion', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    usuarioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'usuarios', key: 'id' },
    },
    titulo: { type: DataTypes.STRING(200), allowNull: false },
    mensaje: { type: DataTypes.TEXT, allowNull: false },
    tipo: {
      type: DataTypes.ENUM('postulacion', 'estado', 'oferta', 'sistema'),
      defaultValue: 'sistema',
    },
    leida: { type: DataTypes.BOOLEAN, defaultValue: false },
    enlace: { type: DataTypes.STRING(255), allowNull: true },
  }, {
    tableName: 'notificaciones',
    timestamps: true,
  });

  return Notificacion;
};
