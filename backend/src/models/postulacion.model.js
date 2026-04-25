/**
 * postulacion.model.js — Modelo Sequelize para la tabla "postulaciones".
 *
 * Representa la acción de un alumno/egresado de aplicar a una oferta de pasantía.
 *
 * Restricción importante:
 * - Un mismo usuario no puede postularse dos veces a la misma oferta
 *   (índice único compuesto por usuarioId + ofertaId)
 *
 * Flujo de estados (completo):
 *
 *   en_revision
 *       ↓
 *   preseleccionado
 *       ↓
 *   entrevista_programada  (legacy)
 *   entrevista             (nuevo — alias más corto)
 *       ↓               ↘
 *   contratado         no_seleccionado / rechazado
 *
 * Los valores legacy (entrevista_programada, no_seleccionado) se mantienen
 * para compatibilidad con registros existentes en la base de datos.
 *
 * Changelog:
 * - v1.2: agregados 'entrevista' y 'rechazado' al ENUM de estado
 */

'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Postulacion = sequelize.define('Postulacion', {
    // Identificador único autoincremental
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    // Usuario que se postula (alumno o egresado)
    usuarioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'usuarios', key: 'id' },
    },

    // Oferta a la que se postula el usuario
    ofertaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'ofertas', key: 'id' },
    },

    // Texto libre que el alumno puede escribir para presentarse a la empresa
    cartaPresentacion: { type: DataTypes.TEXT, allowNull: true },

    // Estado actual del proceso de selección para esta postulación
    estado: {
      type: DataTypes.ENUM(
        'en_revision',           // Recién enviada, esperando revisión de la empresa
        'preseleccionado',       // La empresa mostró interés inicial
        'entrevista_programada', // [LEGACY] Se agendó una entrevista (mantener por datos existentes)
        'entrevista',            // [NUEVO] Alias moderno de entrevista_programada
        'no_seleccionado',       // [LEGACY] El postulante no fue elegido
        'rechazado',             // [NUEVO] Alias moderno de no_seleccionado
        'contratado'             // El postulante fue seleccionado para la pasantía
      ),
      defaultValue: 'en_revision',
    },

    // Fecha y hora en que se realizó la postulación
    fechaPostulacion: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },

    // Notas internas de la empresa sobre el candidato (no visibles para el alumno)
    notasEmpresa: { type: DataTypes.TEXT, allowNull: true },

  }, {
    tableName: 'postulaciones', // Nombre exacto de la tabla en PostgreSQL
    timestamps: true,           // Agrega automáticamente createdAt y updatedAt
    indexes: [
      {
        // Evita que un usuario se postule dos veces a la misma oferta
        unique: true,
        fields: ['usuarioId', 'ofertaId'],
        name: 'unique_postulacion',
      },
    ],
  });

  return Postulacion;
};
