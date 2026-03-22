'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Empresa = sequelize.define('Empresa', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    usuarioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'usuarios', key: 'id' },
    },
    razonSocial: { type: DataTypes.STRING(200), allowNull: false },
    cuit: { type: DataTypes.STRING(20), allowNull: true },
    descripcion: { type: DataTypes.TEXT, allowNull: true },
    rubro: { type: DataTypes.STRING(150), allowNull: true },
    sitioWeb: { type: DataTypes.STRING(255), allowNull: true },
    telefono: { type: DataTypes.STRING(30), allowNull: true },
    direccion: { type: DataTypes.STRING(255), allowNull: true },
    ciudad: { type: DataTypes.STRING(100), allowNull: true },
    logo: { type: DataTypes.STRING(255), allowNull: true },
    estadoAprobacion: {
      type: DataTypes.ENUM('pendiente', 'aprobada', 'rechazada'),
      defaultValue: 'pendiente',
    },
  }, {
    tableName: 'empresas',
    timestamps: true,
  });

  return Empresa;
};
