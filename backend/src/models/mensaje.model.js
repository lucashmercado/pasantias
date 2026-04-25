/**
 * mensaje.model.js — Modelo Sequelize para la tabla "mensajes".
 *
 * Implementa un sistema de mensajería directa (DM) entre usuarios del sistema.
 * Permite la comunicación entre:
 * - Alumno ↔ Empresa
 * - Alumno ↔ Profesor
 * - Admin ↔ cualquier usuario
 * - Cualquier combinación de roles autenticados
 *
 * Una "conversación" es el conjunto de mensajes entre dos usuarios.
 * No existe una tabla de conversaciones; se deriva de emisorId + receptorId.
 */

'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Mensaje = sequelize.define('Mensaje', {
    // Identificador único autoincremental
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    // Usuario que envía el mensaje
    emisorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'usuarios', key: 'id' },
    },

    // Usuario destinatario del mensaje
    receptorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'usuarios', key: 'id' },
    },

    // Contenido del mensaje (texto libre)
    mensaje: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'El mensaje no puede estar vacío.' },
        len: { args: [1, 2000], msg: 'El mensaje debe tener entre 1 y 2000 caracteres.' },
      },
    },

    // Si el receptor ya leyó el mensaje
    leido: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

  }, {
    tableName: 'mensajes',   // Nombre exacto de la tabla en PostgreSQL
    timestamps: true,        // createdAt = fecha de envío; updatedAt = fecha de lectura
    indexes: [
      // Índices para acelerar la consulta de conversaciones
      { fields: ['emisorId'] },
      { fields: ['receptorId'] },
      { fields: ['emisorId', 'receptorId'] },
      { fields: ['receptorId', 'leido'] }, // Para contar no leídos eficientemente
    ],
  });

  return Mensaje;
};
