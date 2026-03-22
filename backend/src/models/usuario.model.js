'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Usuario = sequelize.define('Usuario', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    apellido: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    rol: {
      type: DataTypes.ENUM('alumno', 'egresado', 'empresa', 'admin'),
      allowNull: false,
      defaultValue: 'alumno',
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    habilitado: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Para empresas: requiere aprobación del admin',
    },
    tokenReset: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tokenResetExpira: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'usuarios',
    timestamps: true,
  });

  return Usuario;
};
