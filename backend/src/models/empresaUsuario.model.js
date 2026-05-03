/**
 * empresaUsuario.model.js — Modelo Sequelize para la tabla "empresa_usuarios".
 *
 * Tabla de unión que permite que una empresa tenga múltiples usuarios con
 * distintos niveles de acceso gestionados por la cuenta propietaria.
 *
 * Casos de uso:
 * - Una empresa registra reclutadores adicionales para gestionar postulaciones
 * - El gerente puede ver qué reclutador asignó cada candidato
 * - Los reclutadores pueden crear ofertas y gestionar candidatos
 * - Los viewers pueden consultar información sin poder modificarla
 *
 * Roles internos:
 *   propietario → el usuario que registró la empresa (se crea automáticamente al registrar)
 *   gerente     → puede gestionar reclutadores y ver todas las ofertas
 *   reclutador  → puede crear ofertas y gestionar postulantes
 *   viewer      → solo lectura (ve dashboard, ofertas y postulaciones; no puede modificar)
 *
 * Changelog:
 * - v1.2: creación inicial con roles propietario/gerente/reclutador
 * - v1.5: agregado rol 'viewer' (solo lectura) — migración 009
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
    // Jerarquía: propietario > gerente > reclutador > viewer
    rolInterno: {
      type: DataTypes.ENUM('propietario', 'gerente', 'reclutador', 'viewer'),
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
