'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Oferta = sequelize.define('Oferta', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    empresaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'empresas', key: 'id' },
    },
    titulo: { type: DataTypes.STRING(200), allowNull: false },
    descripcion: { type: DataTypes.TEXT, allowNull: false },
    requisitos: { type: DataTypes.TEXT, allowNull: true },
    area: { type: DataTypes.STRING(150), allowNull: true },
    modalidad: {
      type: DataTypes.ENUM('presencial', 'remoto', 'hibrido'),
      defaultValue: 'presencial',
    },
    ciudad: { type: DataTypes.STRING(100), allowNull: true },
    remuneracion: { type: DataTypes.STRING(100), allowNull: true },
    habilidadesRequeridas: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
    nivelExperiencia: {
      type: DataTypes.ENUM('sin_experiencia', 'junior', 'semi_senior'),
      defaultValue: 'sin_experiencia',
    },
    fechaLimite: { type: DataTypes.DATE, allowNull: true },
    estado: {
      type: DataTypes.ENUM('activa', 'pausada', 'cerrada'),
      defaultValue: 'activa',
    },
    moderada: { type: DataTypes.BOOLEAN, defaultValue: false },
    vistas: { type: DataTypes.INTEGER, defaultValue: 0 },
  }, {
    tableName: 'ofertas',
    timestamps: true,
  });

  return Oferta;
};
