/**
 * solicitudEmpresa.model.js — Modelo Sequelize para la tabla "solicitudes_empresa".
 *
 * Representa una solicitud de registro de empresa enviada por un interesado.
 * NO crea ni una empresa ni un usuario; simplemente registra el pedido
 * para que el administrador lo evalúe y, si lo aprueba, cree la cuenta.
 *
 * Estados posibles:
 *  - 'pendiente'  → recién ingresada, aún no revisada
 *  - 'aprobado'   → el administrador aceptó la solicitud
 *  - 'rechazado'  → el administrador rechazó la solicitud
 */

'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SolicitudEmpresa = sequelize.define('SolicitudEmpresa', {
    // Identificador único autoincremental
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    // Nombre legal o razón social de la empresa
    razonSocial: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },

    // CUIT de la empresa
    cuit: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },

    // Rubro o industria a la que pertenece
    rubro: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },

    // Dirección física de la empresa
    direccion: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    // Ciudad donde opera la empresa
    ciudad: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    // Email de contacto del solicitante / empresa
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    // Teléfono de contacto
    telefono: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },

    // Carreras de interés para contratar pasantes (array almacenado como JSON)
    carrerasInteres: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },

    // Descripción general de la empresa
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Tipos de puestos o áreas donde buscan pasantes
    puestos: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Estado de la solicitud
    estado: {
      type: DataTypes.ENUM('pendiente', 'aprobado', 'rechazado'),
      defaultValue: 'pendiente',
      allowNull: false,
    },

    // Reclutadores iniciales cargados en el formulario de registro
    // Array de { nombre, email } — se crean como usuarios al aprobar la solicitud
    reclutadores: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },

  }, {
    tableName: 'solicitudes_empresa',
    timestamps: true,  // Genera createdAt y updatedAt automáticamente
  });

  return SolicitudEmpresa;
};
