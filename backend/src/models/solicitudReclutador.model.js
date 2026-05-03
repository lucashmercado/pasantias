'use strict';
const { DataTypes } = require('sequelize');

/**
 * solicitudReclutador.model.js — Solicitud de alta de reclutador enviada por una empresa.
 *
 * La empresa NO puede crear usuarios directamente.
 * En su lugar, envía una solicitud que el administrador evalúa.
 * Al aprobarla, el admin crea el usuario y lo asocia a la empresa.
 *
 * Estados:
 *   pendiente  → recién enviada, esperando revisión
 *   aprobado   → admin aceptó → usuario creado
 *   rechazado  → admin rechazó → sin usuario creado
 */
module.exports = (sequelize) => {
  const SolicitudReclutador = sequelize.define('SolicitudReclutador', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    empresaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'empresas', key: 'id' },
    },

    nombre: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },

    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    estado: {
      type: DataTypes.ENUM('pendiente', 'aprobado', 'rechazado'),
      defaultValue: 'pendiente',
      allowNull: false,
    },

    // Motivo de rechazo (opcional, se envía en el email de notificación)
    motivoRechazo: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'solicitudes_reclutador',
    timestamps: true,
  });

  return SolicitudReclutador;
};
