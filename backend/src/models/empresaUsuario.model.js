/**
 * empresaUsuario.model.js — Modelo Sequelize para la tabla "empresa_usuarios".
 *
 * Tabla de unión que permite que una empresa tenga múltiples usuarios con
 * distintos niveles de acceso.
 *
 * Casos de uso:
 * - El administrador de empresa gestiona el equipo y el perfil
 * - Los reclutadores crean ofertas y gestionan postulantes
 *
 * Roles internos:
 *   admin_empresa → administrador: puede editar empresa, solicitar reclutadores, ver equipo
 *   reclutador    → puede crear ofertas y gestionar candidatos; no puede gestionar equipo
 *
 * Changelog:
 * - v1.2: creación inicial con roles propietario/gerente/reclutador
 * - v1.5: agregado rol 'viewer' (solo lectura) — migración 009
 * - v2.0: simplificación a admin_empresa/reclutador — migración 010
 */

'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EmpresaUsuario = sequelize.define('EmpresaUsuario', {
    // Identificador único autoincremental
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    // Empresa a la que pertenece este miembro del equipo
    empresaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'empresas', key: 'id' },
    },

    // Usuario que forma parte del equipo de la empresa
    usuarioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'usuarios', key: 'id' },
    },

    // Rol que cumple este usuario dentro del equipo de la empresa
    // admin_empresa: acceso completo (editar empresa, gestionar equipo, ofertas, postulaciones)
    // reclutador:    acceso operativo (ofertas, postulaciones, chat); sin gestión de equipo
    rolInterno: {
      type: DataTypes.ENUM('admin_empresa', 'reclutador'),
      allowNull: false,
      defaultValue: 'reclutador',
    },

    // Si false, el usuario ya no tiene acceso al panel de la empresa
    // pero se conserva el registro histórico
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: 'empresa_usuarios', // Nombre exacto de la tabla en PostgreSQL
    timestamps: true,             // createdAt y updatedAt automáticos
    indexes: [
      {
        // Un usuario no puede tener dos membresías en la misma empresa
        unique: true,
        fields: ['empresaId', 'usuarioId'],
        name: 'unique_empresa_usuario',
      },
    ],
  });

  return EmpresaUsuario;
};
