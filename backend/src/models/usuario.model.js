/**
 * usuario.model.js — Modelo Sequelize para la tabla "usuarios".
 *
 * Representa a todas las personas que pueden acceder al sistema:
 * alumnos, egresados, empresas, profesores y administradores.
 *
 * Campos destacados:
 * - rol: define qué tipo de usuario es y qué puede hacer en el sistema
 * - activo: permite desactivar una cuenta sin eliminarla
 * - habilitado: las cuentas de empresa empiezan deshabilitadas hasta que el admin las aprueba
 * - tokenReset / tokenResetExpira: se usan para el flujo de recuperación de contraseña
 * - ultimoAcceso: se actualiza cada vez que el usuario hace una request autenticada
 *
 * Changelog:
 * - v1.1: agregado rol 'profesor', campos telefono, ubicacion, ultimoAcceso, fotoPerfil
 */

'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Usuario = sequelize.define('Usuario', {
    // Identificador único autoincremental
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // Nombre de pila del usuario
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    // Apellido del usuario
    apellido: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    // Email único que se usa para iniciar sesión
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: { isEmail: true }, // Valida que tenga formato de email
    },
    // Contraseña almacenada como hash bcrypt (nunca en texto plano)
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    // Rol del usuario en el sistema — determina sus permisos y flujos de registro
    rol: {
      type: DataTypes.ENUM('alumno', 'egresado', 'empresa', 'profesor', 'admin'),
      allowNull: false,
      defaultValue: 'alumno',
    },
    // Si es false la cuenta está desactivada y no puede iniciar sesión
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    // Para empresas: empieza en false hasta que el admin aprueba la cuenta
    habilitado: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Para empresas: requiere aprobación del admin',
    },
    // Número de teléfono de contacto del usuario (opcional)
    telefono: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    // Ciudad / provincia / país donde reside el usuario
    ubicacion: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    // Fecha y hora del último acceso autenticado al sistema
    // Se actualiza automáticamente en cada request con token válido
    ultimoAcceso: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Ruta o URL de la foto de perfil del usuario (avatar)
    fotoPerfil: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    // Token temporal para recuperación de contraseña (generado con crypto)
    tokenReset: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Fecha de expiración del token de recuperación (válido por 1 hora)
    tokenResetExpira: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'usuarios',  // Nombre exacto de la tabla en PostgreSQL
    timestamps: true,       // Agrega automáticamente createdAt y updatedAt
  });

  return Usuario;
};
