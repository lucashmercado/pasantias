'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Perfil = sequelize.define('Perfil', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    usuarioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'usuarios', key: 'id' },
    },
    carrera: { type: DataTypes.STRING(150), allowNull: true },
    anioEgreso: { type: DataTypes.INTEGER, allowNull: true },
    descripcion: { type: DataTypes.TEXT, allowNull: true },
    habilidades: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
    idiomas: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
    linkedin: { type: DataTypes.STRING(255), allowNull: true },
    github: { type: DataTypes.STRING(255), allowNull: true },
    cvPath: { type: DataTypes.STRING(255), allowNull: true },
    fotoPerfil: { type: DataTypes.STRING(255), allowNull: true },
    areaInteres: { type: DataTypes.STRING(150), allowNull: true },
    disponibilidad: {
      type: DataTypes.ENUM('inmediata', '1_mes', '3_meses', 'no_disponible'),
      defaultValue: 'inmediata',
    },
  }, {
    tableName: 'perfiles',
    timestamps: true,
  });

  return Perfil;
};
