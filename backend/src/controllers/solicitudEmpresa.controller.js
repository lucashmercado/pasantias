/**
 * solicitudEmpresa.controller.js — Controladores del flujo de solicitudes de empresa.
 *
 * Endpoints:
 *  - POST /api/solicitudes-empresa  → Registra una nueva solicitud con estado "pendiente"
 */

'use strict';
const { SolicitudEmpresa } = require('../models');

// Validación mínima de formato de email
function esEmailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * crearSolicitud — Registra una nueva solicitud de empresa.
 *
 * Campos requeridos:
 *   Empresa:     razonSocial, cuit, rubro, email (institucional)
 *   Responsable: responsableNombre, responsableApellido, responsableEmail
 *
 * Campos opcionales:
 *   Empresa:     sitioWeb, direccion, ciudad, telefono
 *   Responsable: responsableTelefono, responsableCargo
 *   Contenido:   carrerasInteres, descripcion, puestos
 *   Reclutadores iniciales: [{ nombre, apellido, email }]
 */
async function crearSolicitud(req, res) {
  try {
    const {
      // Empresa
      razonSocial,
      cuit,
      rubro,
      sitioWeb,
      direccion,
      ciudad,
      email,
      telefono,
      // Responsable
      responsableNombre,
      responsableApellido,
      responsableEmail,
      responsableTelefono,
      responsableCargo,
      // Contenido
      carrerasInteres,
      descripcion,
      puestos,
      // Reclutadores iniciales
      reclutadores,
    } = req.body;

    // ── Validación de campos obligatorios ──────────────────────────────────────
    const faltantes = [];
    if (!razonSocial?.trim())        faltantes.push('Razón Social');
    if (!cuit?.trim())               faltantes.push('CUIT');
    if (!rubro?.trim())              faltantes.push('Rubro');
    if (!email?.trim())              faltantes.push('Email de contacto institucional');
    if (!responsableNombre?.trim())  faltantes.push('Nombre del responsable');
    if (!responsableApellido?.trim()) faltantes.push('Apellido del responsable');
    if (!responsableEmail?.trim())   faltantes.push('Email del responsable');

    if (faltantes.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Faltan campos obligatorios: ${faltantes.join(', ')}.`,
      });
    }

    // ── Validación de formato de emails ────────────────────────────────────────
    if (!esEmailValido(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'El email de contacto institucional no tiene un formato válido.',
      });
    }

    if (!esEmailValido(responsableEmail.trim())) {
      return res.status(400).json({
        success: false,
        message: 'El email del responsable no tiene un formato válido.',
      });
    }

    // ── Normalizar reclutadores ────────────────────────────────────────────────
    // Se requiere nombre, apellido y email si se agrega un reclutador
    const reclutadoresLimpios = [];
    const reclsRaw = Array.isArray(reclutadores) ? reclutadores : [];

    for (let i = 0; i < reclsRaw.length; i++) {
      const r = reclsRaw[i];
      const nombre   = r?.nombre?.trim()   || '';
      const apellido = r?.apellido?.trim() || '';
      const rEmail   = r?.email?.trim()    || '';

      // Ignorar filas completamente vacías
      if (!nombre && !apellido && !rEmail) continue;

      // Si tiene algún campo, exigir los 3
      if (!nombre || !apellido || !rEmail) {
        return res.status(400).json({
          success: false,
          message: `El reclutador #${i + 1} requiere nombre, apellido y email completos.`,
        });
      }

      if (!esEmailValido(rEmail)) {
        return res.status(400).json({
          success: false,
          message: `El email del reclutador #${i + 1} (${rEmail}) no tiene un formato válido.`,
        });
      }

      reclutadoresLimpios.push({
        nombre,
        apellido,
        email: rEmail.toLowerCase(),
      });
    }

    // ── Persistencia ───────────────────────────────────────────────────────────
    const solicitud = await SolicitudEmpresa.create({
      // Empresa
      razonSocial:   razonSocial.trim(),
      cuit:          cuit.trim(),
      rubro:         rubro.trim(),
      sitioWeb:      sitioWeb?.trim()      || null,
      direccion:     direccion?.trim()     || null,
      ciudad:        ciudad?.trim()        || null,
      email:         email.trim().toLowerCase(),
      telefono:      telefono?.trim()      || null,
      // Responsable
      responsableNombre:   responsableNombre.trim(),
      responsableApellido: responsableApellido.trim(),
      responsableEmail:    responsableEmail.trim().toLowerCase(),
      responsableTelefono: responsableTelefono?.trim() || null,
      responsableCargo:    responsableCargo?.trim()    || null,
      // Contenido
      carrerasInteres: Array.isArray(carrerasInteres)
        ? carrerasInteres
        : (carrerasInteres ? JSON.parse(carrerasInteres) : []),
      descripcion: descripcion?.trim() || null,
      puestos:     puestos?.trim()     || null,
      // Reclutadores
      reclutadores: reclutadoresLimpios,
      estado: 'pendiente',
    });

    return res.status(201).json({
      success: true,
      message: 'Tu solicitud fue enviada. Será evaluada por el instituto.',
      data: {
        id:        solicitud.id,
        estado:    solicitud.estado,
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
