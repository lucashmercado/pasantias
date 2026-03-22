'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Postulacion = sequelize.define('Postulacion', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    usuarioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'usuarios', key: 'id' },
    },
    ofertaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'ofertas', key: 'id' },
    },
    cartaPresentacion: { type: DataTypes.TEXT, allowNull: true },
    estado: {
      type: DataTypes.ENUM(
        'en_revision',
        'preseleccionado',
        'entrevista_programada',
        'no_seleccionado',
        'contratado'
      ),
      defaultValue: 'en_revision',
    },
    fechaPostulacion: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    notasEmpresa: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'postulaciones',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['usuarioId', 'ofertaId'],
        name: 'unique_postulacion',
      },
    ],
  });

  return Postulacion;
};
