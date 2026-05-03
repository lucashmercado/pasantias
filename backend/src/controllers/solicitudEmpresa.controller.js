/**
 * solicitudEmpresa.controller.js — Controladores del flujo de solicitudes de empresa.
 *
 * Endpoints:
 *  - POST /api/solicitudes-empresa  → Registra una nueva solicitud con estado "pendiente"
 */

'use strict';
const { SolicitudEmpresa } = require('../models');

/**
 * crearSolicitud — Registra una nueva solicitud de empresa.
 *
 * Recibe los datos del formulario de pre-registro, los valida mínimamente
 * y los persiste en la tabla solicitudes_empresa con estado = "pendiente".
 * No crea usuario ni empresa.
 */
async function crearSolicitud(req, res) {
  try {
    const {
      razonSocial,
      cuit,
      rubro,
      direccion,
      ciudad,
      email,
      telefono,
      carrerasInteres,
      descripcion,
      puestos,
    } = req.body;

    // ── Validación de campos obligatorios ──────────────────────────────────────
    if (!razonSocial || !cuit || !rubro || !email) {
      return res.status(400).json({
        success: false,
        message: 'Los campos razonSocial, cuit, rubro y email son obligatorios.',
      });
    }

    // ── Persistencia ───────────────────────────────────────────────────────────
    const solicitud = await SolicitudEmpresa.create({
      razonSocial: razonSocial.trim(),
      cuit: cuit.trim(),
      rubro: rubro.trim(),
      direccion: direccion?.trim() || null,
      ciudad: ciudad?.trim() || null,
      email: email.trim().toLowerCase(),
      telefono: telefono?.trim() || null,
      // carrerasInteres puede llegar como array o como string JSON
      carrerasInteres: Array.isArray(carrerasInteres)
        ? carrerasInteres
        : (carrerasInteres ? JSON.parse(carrerasInteres) : []),
      descripcion: descripcion?.trim() || null,
      puestos: puestos?.trim() || null,
      estado: 'pendiente',
    });

    return res.status(201).json({
      success: true,
      message: 'Tu solicitud fue enviada. Será evaluada por el instituto.',
      data: {
        id: solicitud.id,
        estado: solicitud.estado,
        createdAt: solicitud.createdAt,
      },
    });
  } catch (error) {
    console.error('[SolicitudEmpresa] Error al crear solicitud:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al registrar la solicitud. Intentá de nuevo más tarde.',
    });
  }
}

module.exports = { crearSolicitud };
