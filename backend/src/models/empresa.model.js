/**
 * empresa.model.js — Modelo Sequelize para la tabla "empresas".
 *
 * Representa la información institucional de una empresa empleadora.
 * Cada empresa está vinculada a un Usuario con rol 'empresa'.
 *
 * Proceso de alta:
 * - La empresa se registra y queda en estado "pendiente"
 * - El administrador la aprueba o rechaza desde el panel de administración
 * - Solo las empresas "aprobadas" pueden publicar ofertas de pasantía
 */

'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Empresa = sequelize.define('Empresa', {
    // Identificador único autoincremental
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    // Referencia al usuario dueño de esta empresa (clave foránea)
    usuarioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'usuarios', key: 'id' },
    },

    // Nombre legal/comercial de la empresa
    razonSocial: { type: DataTypes.STRING(200), allowNull: false },

    // Número de CUIT de la empresa (opcional)
    cuit: { type: DataTypes.STRING(20), allowNull: true },

    // Descripción general de la empresa (qué hace, su historia, etc.)
    descripcion: { type: DataTypes.TEXT, allowNull: true },

    // Rubro o industria a la que pertenece la empresa
    rubro: { type: DataTypes.STRING(150), allowNull: true },

    // URL del sitio web oficial de la empresa
    sitioWeb: { type: DataTypes.STRING(255), allowNull: true },

    // Número de contacto de la empresa
    telefono: { type: DataTypes.STRING(30), allowNull: true },

    // Dirección física de la empresa
    direccion: { type: DataTypes.STRING(255), allowNull: true },

    // Ciudad donde opera la empresa
    ciudad: { type: DataTypes.STRING(100), allowNull: true },

    // Ruta al logo de la empresa (imagen subida al servidor)
    logo: { type: DataTypes.STRING(255), allowNull: true },

    // Estado de aprobación por parte del administrador
    // 'pendiente' → esperando revisión | 'aprobada' → puede publicar ofertas | 'rechazada' → acceso denegado
    estadoAprobacion: {
      type: DataTypes.ENUM('pendiente', 'aprobada', 'rechazada'),
      defaultValue: 'pendiente',
    },
  }, {
    tableName: 'empresas', // Nombre exacto de la tabla en PostgreSQL
    timestamps: true,      // Agrega automáticamente createdAt y updatedAt
  });

  return Empresa;
};
