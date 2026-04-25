/**
 * aval.model.js — Modelo Sequelize para la tabla "avales".
 *
 * Un aval es el respaldo institucional que un profesor otorga (o deniega)
 * a la postulación de un alumno a una oferta de pasantía.
 *
 * Flujo:
 * 1. El alumno se postula → se crea automáticamente un Aval en estado 'pendiente'
 *    (o el admin/sistema puede solicitarlo manualmente)
 * 2. El profesor revisa la postulación y su perfil académico
 * 3. El profesor aprueba o rechaza + escribe un comentario
 * 4. La empresa puede ver el estado del aval al revisar candidatos
 *
 * Un aval es único por postulación + profesor
 * (un profesor no puede avalar la misma postulación dos veces)
 */

'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Aval = sequelize.define('Aval', {
    // Identificador único autoincremental
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    // Postulación que está siendo avalada
    postulacionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'postulaciones', key: 'id' },
    },

    // Usuario con rol 'profesor' que emite el aval
    profesorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'usuarios', key: 'id' },
    },

    // Estado del aval en el flujo de revisión
    estado: {
      type: DataTypes.ENUM('pendiente', 'aprobado', 'rechazado'),
      allowNull: false,
      defaultValue: 'pendiente',
    },

    // Observaciones, fundamentos o motivo del rechazo escritos por el profesor
    comentario: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Mensaje que el alumno deja al solicitar el aval (contexto para el profesor)
    mensajeAlumno: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Fecha en que el profesor tomó la decisión (aprobó o rechazó)
    // null = aún sin decisión (estado: 'pendiente')
    fechaRevision: {
      type: DataTypes.DATE,
      allowNull: true,
    },

  }, {
    tableName: 'avales',         // Nombre exacto de la tabla en PostgreSQL
    timestamps: true,            // createdAt y updatedAt automáticos
    indexes: [
      {
        // Un profesor no puede avalar la misma postulación dos veces
        unique: true,
        fields: ['postulacionId', 'profesorId'],
        name: 'unique_aval_postulacion_profesor',
      },
    ],
  });

  return Aval;
};
