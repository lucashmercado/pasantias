/**
 * admin.routes.js — Rutas del panel de administración.
 *
 * Prefijo de la API: /api/admin
 *
 * Todas las rutas requieren: verifyToken + rol 'admin'
 *
 * Módulos:
 * 1. Dashboard general con métricas del sistema
 * 2. Gestión completa de usuarios (CRUD + cambio de rol)
 * 3. Gestión de empresas pendientes de aprobación
 * 4. Moderación de ofertas antes de publicarlas
 * 5. Logs de auditoría del sistema (con filtros y exportación CSV)
 * 6. Gestión de solicitudes de registro de empresa (v1.6)
 *
 * Changelog:
 * - v1.3: /dashboard-general con métricas y actividad reciente
 * - v1.4: CRUD de usuarios, /logs con filtros y exportación CSV
 * - v1.6: /solicitudes-empresa (listar, aprobar con creación automática, rechazar)
 */

const router = require('express').Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');
const {
  Usuario, Empresa, Oferta, Postulacion, Notificacion, ActivityLog,
  EmpresaUsuario, SolicitudEmpresa, SolicitudReclutador,
} = require('../models');

const { sequelize } = require('../models');
const { Op } = require('sequelize');

// ── Helper: envío de email (reutilizable) ─────────────────────────────────────
async function enviarEmail({ to, subject, html }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`[Email DEV] Para: ${to} | Asunto: ${subject}`);
    return;
  }
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  await transporter.sendMail({
    from: `"SisPasantías" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
}

// Shorthand para no repetir los middlewares en cada ruta
const soloAdmin = [verifyToken, authorizeRoles('admin')];

// ── Helper: registrar acción en el log ────────────────────────────────────────
/**
 * Registra una acción en la tabla activity_logs.
 * Llamar con await dentro de las rutas del admin.
 *
 * @param {object} opts
 * @param {number|null} opts.usuarioId  — Quién realizó la acción
 * @param {string}      opts.accion     — Tipo de acción (ver ENUM del modelo)
 * @param {string}      opts.entidad    — Entidad afectada ('usuario', 'empresa', ...)
 * @param {number|null} opts.entidadId  — ID del registro afectado
 * @param {object|null} opts.detalle    — Información adicional en JSON
 * @param {string|null} opts.ip         — IP de la petición
 */
async function logAction({ usuarioId, accion, entidad, entidadId, detalle, ip }) {
  try {
    await ActivityLog.create({ usuarioId, accion, entidad, entidadId, detalle, ip });
  } catch (e) {
    // El log nunca debe interrumpir la operación principal
    console.warn('[ActivityLog] Error al registrar acción:', e.message);
  }
}

// ── Dashboard general (v1.3) ──────────────────────────────────────────────────
/**
 * GET /api/admin/dashboard-general
 * Panel principal con métricas completas del sistema.
 */
router.get('/dashboard-general', ...soloAdmin, async (req, res) => {
  try {
    const [
      alumnosActivos, egresadosActivos, profesoresActivos,
      empresasAprobadas, totalUsuarios, ofertasActivas,
      ofertasPendiente, totalPostulaciones, contrataciones,
      entrevistas, notificacionesPendientes,
    ] = await Promise.all([
      Usuario.count({ where: { rol: 'alumno',   activo: true } }),
      Usuario.count({ where: { rol: 'egresado', activo: true } }),
      Usuario.count({ where: { rol: 'profesor', activo: true } }),
      Empresa.count({ where: { estadoAprobacion: 'aprobada' } }),
      Usuario.count({ where: { activo: true } }),
      Oferta.count({ where: { estado: 'activa', moderada: true } }),
      Oferta.count({ where: { moderada: false } }),
      Postulacion.count(),
      Postulacion.count({ where: { estado: 'contratado' } }),
      Postulacion.count({ where: { estado: ['entrevista_programada', 'entrevista'] } }),
      Notificacion.count({ where: { leida: false } }),
    ]);

    const tasaInsercion = totalPostulaciones > 0
      ? ((contrataciones / totalPostulaciones) * 100).toFixed(1) + '%'
      : '0%';

    const actividadReciente = await Postulacion.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']],
      include: [
        { model: Usuario, as: 'usuario', attributes: ['nombre', 'apellido', 'email', 'rol'] },
        {
          model: Oferta, as: 'oferta', attributes: ['titulo', 'area'],
          include: [{ model: Empresa, as: 'empresa', attributes: ['razonSocial'] }],
        },
      ],
    });

    return res.json({
      success: true,
      data: {
        usuarios: { alumnosActivos, egresadosActivos, profesoresActivos, empresasAprobadas, totalActivos: totalUsuarios },
        pasantias: { ofertasActivas, ofertasPendienteModeracion: ofertasPendiente, totalPostulaciones, entrevistas, contrataciones, tasaInsercion },
        sistema: { notificacionesPendientes },
        actividadReciente,
      },
    });
  } catch (err) {
    console.error('Error en dashboard-general:', err);
    return res.status(500).json({ success: false, message: 'Error al obtener el dashboard.' });
  }
});

// ── Estadísticas generales (legacy) ──────────────────────────────────────────
router.get('/stats', ...soloAdmin, async (req, res) => {
  try {
    const [totalUsuarios, totalEmpresas, totalOfertas, totalPostulaciones] = await Promise.all([
      Usuario.count({ where: { rol: ['alumno', 'egresado'] } }),
      Empresa.count(),
      Oferta.count(),
      Postulacion.count(),
    ]);
    const contratados = await Postulacion.count({ where: { estado: 'contratado' } });
    return res.json({
      success: true,
      data: {
        totalUsuarios, totalEmpresas, totalOfertas, totalPostulaciones, contratados,
        tasaInsercion: totalPostulaciones > 0
          ? ((contratados / totalPostulaciones) * 100).toFixed(1) + '%' : '0%',
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error al obtener estadísticas.' });
  }
});

// ── Actividad reciente ────────────────────────────────────────────────────────
router.get('/actividad-reciente', ...soloAdmin, async (req, res) => {
  try {
    const logs = await ActivityLog.findAll({
      limit: 20,
      order: [['createdAt', 'DESC']],
      include: [{ model: Usuario, as: 'usuario', attributes: ['nombre', 'apellido', 'email', 'rol'] }],
    });
    return res.json({ success: true, data: logs });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error al obtener actividad.' });
  }
});

// ── CRUD de usuarios (v1.4) ───────────────────────────────────────────────────

/**
 * GET /api/admin/usuarios
 * Lista todos los usuarios del sistema con filtros opcionales.
 * Query params: rol, activo (true/false), q (búsqueda por nombre o email)
 */
router.get('/usuarios', ...soloAdmin, async (req, res) => {
  try {
    const { rol, activo, q } = req.query;
    const where = {};

    if (rol) where.rol = rol;
    if (activo !== undefined) where.activo = activo === 'true';
    if (q) {
      where[Op.or] = [
        { nombre:   { [Op.iLike]: `%${q}%` } },
        { apellido: { [Op.iLike]: `%${q}%` } },
        { email:    { [Op.iLike]: `%${q}%` } },
      ];
    }

    const usuarios = await Usuario.findAll({
      where,
      attributes: { exclude: ['password', 'tokenReset', 'tokenResetExpira'] },
      order: [['createdAt', 'DESC']],
    });
    return res.json({ success: true, total: usuarios.length, data: usuarios });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error al listar usuarios.' });
  }
});

/**
 * GET /api/admin/usuarios/:id
 * Devuelve el detalle completo de un usuario por ID.
 */
router.get('/usuarios/:id', ...soloAdmin, async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id, {
      attributes: { exclude: ['password', 'tokenReset', 'tokenResetExpira'] },
    });
    if (!usuario) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    return res.json({ success: true, data: usuario });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error al obtener el usuario.' });
  }
});

/**
 * POST /api/admin/usuarios
 * Crea un nuevo usuario desde el panel admin.
 * El admin puede asignarle cualquier rol directamente.
 *
 * Body: { nombre, apellido, email, password, rol, telefono?, ubicacion? }
 */
router.post('/usuarios', ...soloAdmin, async (req, res) => {
  try {
    const { nombre, apellido, email, password, rol, telefono, ubicacion } = req.body;

    if (!nombre || !apellido || !email || !password || !rol) {
      return res.status(400).json({ success: false, message: 'Faltan campos obligatorios (nombre, apellido, email, password, rol).' });
    }

    // Verifica que el email no esté registrado
    const existe = await Usuario.findOne({ where: { email } });
    if (existe) return res.status(400).json({ success: false, message: 'Ya existe un usuario con ese email.' });

    const hash = await bcrypt.hash(password, 10);
    const nuevo = await Usuario.create({
      nombre, apellido, email, password: hash, rol,
      telefono: telefono || null, ubicacion: ubicacion || null,
      activo: true, habilitado: true,
    });

    await logAction({
      usuarioId: req.usuario.id,
      accion: 'crear_usuario',
      entidad: 'usuario',
      entidadId: nuevo.id,
      detalle: { nombre, apellido, email, rol },
      ip: req.ip,
    });

    const { password: _, ...data } = nuevo.toJSON();
    return res.status(201).json({ success: true, message: 'Usuario creado.', data });
  } catch (err) {
    console.error('Error en POST /admin/usuarios:', err);
    return res.status(500).json({ success: false, message: 'Error al crear el usuario.' });
  }
});

/**
 * PUT /api/admin/usuarios/:id
 * Edita los datos y/o el rol de un usuario.
 *
 * Body: { nombre?, apellido?, email?, rol?, activo?, telefono?, ubicacion?, password? }
 */
router.put('/usuarios/:id', ...soloAdmin, async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });

    // Evitar que el admin se auto-edite el rol a algo que lo deje sin acceso
    if (String(req.params.id) === String(req.usuario.id) && req.body.rol && req.body.rol !== 'admin') {
      return res.status(403).json({ success: false, message: 'No podés cambiar tu propio rol de administrador.' });
    }

    const {
      nombre, apellido, email, rol, activo,
      telefono, ubicacion, password,
    } = req.body;

    const updateData = {};
    if (nombre    !== undefined) updateData.nombre    = nombre;
    if (apellido  !== undefined) updateData.apellido  = apellido;
    if (email     !== undefined) updateData.email     = email;
    if (rol       !== undefined) updateData.rol       = rol;
    if (activo    !== undefined) updateData.activo    = activo;
    if (telefono  !== undefined) updateData.telefono  = telefono;
    if (ubicacion !== undefined) updateData.ubicacion = ubicacion;
    if (password) updateData.password = await bcrypt.hash(password, 10);

    const antes = { rol: usuario.rol, activo: usuario.activo };
    await usuario.update(updateData);

    const accion = rol && rol !== antes.rol ? 'cambiar_rol' : 'editar_usuario';
    await logAction({
      usuarioId: req.usuario.id,
      accion,
      entidad: 'usuario',
      entidadId: usuario.id,
      detalle: { antes, despues: { rol: usuario.rol, activo: usuario.activo } },
      ip: req.ip,
    });

    const { password: _, tokenReset: __, tokenResetExpira: ___, ...data } = usuario.toJSON();
    return res.json({ success: true, message: 'Usuario actualizado.', data });
  } catch (err) {
    console.error('Error en PUT /admin/usuarios/:id:', err);
    return res.status(500).json({ success: false, message: 'Error al actualizar el usuario.' });
  }
});

/**
 * DELETE /api/admin/usuarios/:id
 * Soft delete: desactiva la cuenta sin borrar el registro.
 * Preserva integridad referencial con postulaciones, avales y mensajes.
 */
router.delete('/usuarios/:id', ...soloAdmin, async (req, res) => {
  try {
    if (String(req.params.id) === String(req.usuario.id)) {
      return res.status(403).json({ success: false, message: 'No podés eliminar tu propia cuenta de administrador.' });
    }

    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });

    await usuario.update({ activo: false });

    await logAction({
      usuarioId: req.usuario.id,
      accion: 'eliminar_usuario',
      entidad: 'usuario',
      entidadId: usuario.id,
      detalle: { nombre: usuario.nombre, apellido: usuario.apellido, email: usuario.email, rol: usuario.rol },
      ip: req.ip,
    });

    return res.json({ success: true, message: 'Usuario desactivado (soft delete).' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error al eliminar el usuario.' });
  }
});

/**
 * PATCH /api/admin/usuarios/:id/toggle
 * Activa o desactiva una cuenta de usuario.
 */
router.patch('/usuarios/:id/toggle', ...soloAdmin, async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });

    await usuario.update({ activo: !usuario.activo });

    await logAction({
      usuarioId: req.usuario.id,
      accion: 'toggle_usuario',
      entidad: 'usuario',
      entidadId: usuario.id,
      detalle: { nuevoEstado: usuario.activo },
      ip: req.ip,
    });

    return res.json({ success: true, message: `Usuario ${usuario.activo ? 'activado' : 'desactivado'}.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error al cambiar estado del usuario.' });
  }
});

// ── Gestión de empresas pendientes ────────────────────────────────────────────

router.get('/empresas/pendientes', ...soloAdmin, async (req, res) => {
  const empresas = await Empresa.findAll({
    where: { estadoAprobacion: 'pendiente' },
    include: [{ model: Usuario, as: 'usuario', attributes: ['nombre', 'apellido', 'email'] }],
  });
  return res.json({ success: true, data: empresas });
});

router.patch('/empresas/:id/aprobar', ...soloAdmin, async (req, res) => {
  const empresa = await Empresa.findByPk(req.params.id);
  if (!empresa) return res.status(404).json({ success: false, message: 'Empresa no encontrada.' });
  await empresa.update({ estadoAprobacion: 'aprobada' });
  await Usuario.update({ habilitado: true }, { where: { id: empresa.usuarioId } });
  await logAction({ usuarioId: req.usuario.id, accion: 'aprobar_empresa', entidad: 'empresa', entidadId: empresa.id, detalle: { razonSocial: empresa.razonSocial }, ip: req.ip });
  return res.json({ success: true, message: 'Empresa aprobada.' });
});

router.patch('/empresas/:id/rechazar', ...soloAdmin, async (req, res) => {
  const empresa = await Empresa.findByPk(req.params.id);
  if (!empresa) return res.status(404).json({ success: false, message: 'Empresa no encontrada.' });
  await empresa.update({ estadoAprobacion: 'rechazada' });
  await logAction({ usuarioId: req.usuario.id, accion: 'rechazar_empresa', entidad: 'empresa', entidadId: empresa.id, detalle: { razonSocial: empresa.razonSocial }, ip: req.ip });
  return res.json({ success: true, message: 'Empresa rechazada.' });
});

// ── Moderación de ofertas ─────────────────────────────────────────────────────

router.get('/ofertas/pendientes', ...soloAdmin, async (req, res) => {
  const ofertas = await Oferta.findAll({
    where: { moderada: false },
    include: [{ model: Empresa, as: 'empresa', attributes: ['razonSocial'] }],
  });
  return res.json({ success: true, data: ofertas });
});

router.patch('/ofertas/:id/moderar', ...soloAdmin, async (req, res) => {
  const { aprobada } = req.body;
  const oferta = await Oferta.findByPk(req.params.id);
  if (!oferta) return res.status(404).json({ success: false, message: 'Oferta no encontrada.' });
  await oferta.update({ moderada: aprobada, estado: aprobada ? 'activa' : 'cerrada' });
  await logAction({ usuarioId: req.usuario.id, accion: aprobada ? 'aprobar_oferta' : 'rechazar_oferta', entidad: 'oferta', entidadId: oferta.id, detalle: { titulo: oferta.titulo }, ip: req.ip });
  return res.json({ success: true, message: aprobada ? 'Oferta aprobada.' : 'Oferta rechazada.' });
});

// ── Logs del sistema (v1.4) ───────────────────────────────────────────────────

/**
 * GET /api/admin/logs
 * Lista los registros de auditoría del sistema con filtros opcionales.
 *
 * Query params:
 *   accion       — filtra por tipo de acción
 *   usuarioId    — filtra por usuario que realizó la acción
 *   entidad      — filtra por entidad afectada
 *   desde        — fecha ISO de inicio del rango
 *   hasta        — fecha ISO de fin del rango
 *   page         — página (default: 1)
 *   limit        — registros por página (default: 25, max: 100)
 */
router.get('/logs', ...soloAdmin, async (req, res) => {
  try {
    const { accion, usuarioId, entidad, desde, hasta, page = 1, limit = 25 } = req.query;
    const where = {};

    if (accion)    where.accion    = accion;
    if (usuarioId) where.usuarioId = usuarioId;
    if (entidad)   where.entidad   = entidad;
    if (desde || hasta) {
      where.createdAt = {};
      if (desde) where.createdAt[Op.gte] = new Date(desde);
      if (hasta) where.createdAt[Op.lte] = new Date(hasta);
    }

    const pageNum  = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset   = (pageNum - 1) * limitNum;

    const { count, rows } = await ActivityLog.findAndCountAll({
      where,
      include: [{
        model: Usuario, as: 'usuario',
        attributes: ['nombre', 'apellido', 'email', 'rol'],
        required: false,
      }],
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset,
    });

    return res.json({
      success: true,
      total: count,
      page: pageNum,
      totalPages: Math.ceil(count / limitNum),
      data: rows,
    });
  } catch (err) {
    console.error('Error en GET /admin/logs:', err);
    return res.status(500).json({ success: false, message: 'Error al obtener los logs.' });
  }
});

/**
 * GET /api/admin/logs/export
 * Exporta los logs filtrados como un archivo CSV.
 */
router.get('/logs/export', ...soloAdmin, async (req, res) => {
  try {
    const { accion, usuarioId, entidad, desde, hasta } = req.query;
    const where = {};

    if (accion)    where.accion    = accion;
    if (usuarioId) where.usuarioId = usuarioId;
    if (entidad)   where.entidad   = entidad;
    if (desde || hasta) {
      where.createdAt = {};
      if (desde) where.createdAt[Op.gte] = new Date(desde);
      if (hasta) where.createdAt[Op.lte] = new Date(hasta);
    }

    const logs = await ActivityLog.findAll({
      where,
      include: [{ model: Usuario, as: 'usuario', attributes: ['nombre', 'apellido', 'email'], required: false }],
      order: [['createdAt', 'DESC']],
      limit: 5000, // Cap para no sobrecargar el servidor
    });

    // Construye CSV
    const header = 'ID,Fecha,Acción,Entidad,EntidadID,Usuario,Email,IP,Detalle\n';
    const rows = logs.map((l) => {
      const u = l.usuario;
      const nombreUsuario = u ? `${u.nombre} ${u.apellido}` : 'Sistema';
      const email = u ? u.email : '';
      const detalle = l.detalle ? JSON.stringify(l.detalle).replace(/"/g, '""') : '';
      return [l.id, new Date(l.createdAt).toISOString(), l.accion, l.entidad || '', l.entidadId || '', nombreUsuario, email, l.ip || '', `"${detalle}"`].join(',');
    });

    const csv = header + rows.join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="logs-${Date.now()}.csv"`);
    return res.send('\uFEFF' + csv); // BOM para que Excel lo abra bien
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error al exportar los logs.' });
  }
});

// ── Gestión de solicitudes de empresa (v1.6) ─────────────────────────────────

/**
 * GET /api/admin/solicitudes-empresa
 * Devuelve todas las solicitudes, con filtro opcional por estado.
 * Query param: estado (pendiente | aprobado | rechazado)
 */
router.get('/solicitudes-empresa', ...soloAdmin, async (req, res) => {
  try {
    const { estado } = req.query;
    const where = {};
    if (estado) where.estado = estado;

    const solicitudes = await SolicitudEmpresa.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });
    return res.json({ success: true, total: solicitudes.length, data: solicitudes });
  } catch (err) {
    console.error('[Admin] Error al listar solicitudes:', err);
    return res.status(500).json({ success: false, message: 'Error al obtener las solicitudes.' });
  }
});

/**
 * PATCH /api/admin/solicitudes-empresa/:id/aprobar
 *
 * Cuando el administrador aprueba una solicitud:
 *  1. Cambia el estado de la solicitud a "aprobado"
 *  2. Genera credenciales automáticas para el usuario reclutador
 *  3. Crea el Usuario con rol 'empresa'
 *  4. Crea la Empresa vinculada al usuario
 *  5. Registra al usuario como 'propietario' del equipo (EmpresaUsuario)
 *  6. Envía las credenciales por email al solicitante
 */
router.patch('/solicitudes-empresa/:id/aprobar', ...soloAdmin, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    // ── 1. Buscar y validar la solicitud ──────────────────────────────────────
    const solicitud = await SolicitudEmpresa.findByPk(req.params.id, { transaction: t });
    if (!solicitud) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada.' });
    }
    if (solicitud.estado !== 'pendiente') {
      await t.rollback();
      return res.status(400).json({ success: false, message: `La solicitud ya fue ${solicitud.estado}.` });
    }

    // ── 2. Generar credenciales ───────────────────────────────────────────────
    // Contraseña aleatoria de 12 caracteres legibles
    const passwordPlano = crypto.randomBytes(6).toString('hex'); // Ej: "a3f9b12c8e1d"
    const hash = await bcrypt.hash(passwordPlano, 12);

    // ── 3. Crear usuario con rol 'empresa' ────────────────────────────────────
    // Primero verificamos que el email no esté ya registrado
    const emailExistente = await Usuario.findOne({
      where: { email: solicitud.email },
      transaction: t,
    });
    if (emailExistente) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: `Ya existe una cuenta con el email ${solicitud.email}. Verificá si la empresa ya fue aprobada anteriormente.`,
      });
    }

    const nuevoUsuario = await Usuario.create({
      nombre:    solicitud.razonSocial,   // Nombre visible = razón social
      apellido:  'Empresa',
      email:     solicitud.email,
      password:  hash,
      rol:       'empresa',
      telefono:  solicitud.telefono || null,
      ubicacion: solicitud.ciudad   || null,
      activo:    true,
      habilitado: true,                  // Ya aprobada, puede iniciar sesión
    }, { transaction: t });

    // ── 4. Crear la Empresa ───────────────────────────────────────────────────
    const nuevaEmpresa = await Empresa.create({
      usuarioId:        nuevoUsuario.id,
      razonSocial:      solicitud.razonSocial,
      cuit:             solicitud.cuit,
      rubro:            solicitud.rubro,
      direccion:        solicitud.direccion || null,
      ciudad:           solicitud.ciudad    || null,
      telefono:         solicitud.telefono  || null,
      descripcion:      solicitud.descripcion || null,
      estadoAprobacion: 'aprobada',
    }, { transaction: t });

    // ── 5. Registrar al usuario como propietario del equipo ───────────────────
    await EmpresaUsuario.create({
      empresaId:  nuevaEmpresa.id,
      usuarioId:  nuevoUsuario.id,
      rolInterno: 'propietario',
      activo:     true,
    }, { transaction: t });

    // ── 6. Actualizar estado de la solicitud ──────────────────────────────────
    await solicitud.update({ estado: 'aprobado' }, { transaction: t });

    // ── Confirmar transacción ─────────────────────────────────────────────────
    await t.commit();

    // ── 7. Auditoría ──────────────────────────────────────────────────────────
    await logAction({
      usuarioId: req.usuario.id,
      accion:    'aprobar_solicitud_empresa',
      entidad:   'solicitud_empresa',
      entidadId: solicitud.id,
      detalle:   { razonSocial: solicitud.razonSocial, email: solicitud.email, empresaId: nuevaEmpresa.id },
      ip:        req.ip,
    });

    // ── 8. Enviar email con credenciales ──────────────────────────────────────
    try {
      const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`;
      await enviarEmail({
        to: solicitud.email,
        subject: '✅ Tu solicitud fue aprobada – SisPasantías',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#222">
            <h2 style="color:#0073AD">¡Tu solicitud fue aprobada! 🎉</h2>
            <p>Hola, <strong>${solicitud.razonSocial}</strong>.</p>
            <p>El equipo de <strong>SisPasantías</strong> revisó tu solicitud y la <strong>aprobó</strong>.
            Ya podés acceder al panel de empresa con las siguientes credenciales:</p>
            <table style="margin:1rem 0;border-collapse:collapse;width:100%">
              <tr>
                <td style="padding:8px 12px;background:#f0f6fc;border-radius:6px 0 0 6px;font-weight:600;width:130px">Email</td>
                <td style="padding:8px 12px;background:#e8f4fb;border-radius:0 6px 6px 0">${solicitud.email}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px;background:#f0f6fc;border-radius:6px 0 0 6px;font-weight:600;margin-top:4px">Contraseña</td>
                <td style="padding:8px 12px;background:#e8f4fb;border-radius:0 6px 6px 0;font-family:monospace;font-size:1.1rem;letter-spacing:0.05em">${passwordPlano}</td>
              </tr>
            </table>
            <p style="color:#c0392b;font-size:0.88rem">⚠️ Por seguridad, te recomendamos cambiar la contraseña al iniciar sesión por primera vez.</p>
            <a href="${loginUrl}" style="display:inline-block;margin-top:1rem;background:#0073AD;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">
              Ingresar al sistema
            </a>
            <p style="margin-top:2rem;color:#888;font-size:0.82rem">SisPasantías – Portal Institucional de Empleo</p>
          </div>
        `,
      });
    } catch (emailErr) {
      // El email falla de forma silenciosa: la transacción ya se confirmó
      console.error('[Admin] Error enviando email de aprobación:', emailErr.message);
    }

    return res.json({
      success: true,
      message: `Solicitud aprobada. Empresa y usuario creados. Credenciales enviadas a ${solicitud.email}.`,
      data: {
        empresaId:  nuevaEmpresa.id,
        usuarioId:  nuevoUsuario.id,
        email:      solicitud.email,
        // Solo en desarrollo devolvemos la contraseña en el body para facilitar pruebas
        ...(process.env.NODE_ENV !== 'production' && { passwordGenerada: passwordPlano }),
      },
    });
  } catch (err) {
    await t.rollback();
    console.error('[Admin] Error al aprobar solicitud:', err);
    return res.status(500).json({ success: false, message: 'Error al aprobar la solicitud.' });
  }
});

/**
 * PATCH /api/admin/solicitudes-empresa/:id/rechazar
 *
 * Cambia el estado a "rechazado" y notifica a la empresa por email.
 * Body opcional: { motivo } — razón del rechazo (se incluye en el email)
 */
router.patch('/solicitudes-empresa/:id/rechazar', ...soloAdmin, async (req, res) => {
  try {
    const solicitud = await SolicitudEmpresa.findByPk(req.params.id);
    if (!solicitud) return res.status(404).json({ success: false, message: 'Solicitud no encontrada.' });
    if (solicitud.estado !== 'pendiente') {
      return res.status(400).json({ success: false, message: `La solicitud ya fue ${solicitud.estado}.` });
    }

    const { motivo } = req.body;
    await solicitud.update({ estado: 'rechazado' });

    await logAction({
      usuarioId: req.usuario.id,
      accion:    'rechazar_solicitud_empresa',
      entidad:   'solicitud_empresa',
      entidadId: solicitud.id,
      detalle:   { razonSocial: solicitud.razonSocial, email: solicitud.email, motivo },
      ip:        req.ip,
    });

    // Notificar por email
    try {
      await enviarEmail({
        to: solicitud.email,
        subject: '❌ Tu solicitud no fue aprobada – SisPasantías',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#222">
            <h2 style="color:#c0392b">Solicitud no aprobada</h2>
            <p>Hola, <strong>${solicitud.razonSocial}</strong>.</p>
            <p>Luego de revisar tu solicitud de registro en <strong>SisPasantías</strong>,
            lamentablemente no pudimos aprobarla en esta oportunidad.</p>
            ${motivo ? `<p><strong>Motivo:</strong> ${motivo}</p>` : ''}
            <p>Si considerás que fue un error o querés más información, podés comunicarte
            directamente con el equipo del instituto.</p>
            <p style="margin-top:2rem;color:#888;font-size:0.82rem">SisPasantías – Portal Institucional de Empleo</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('[Admin] Error enviando email de rechazo:', emailErr.message);
    }

    return res.json({ success: true, message: 'Solicitud rechazada. Notificación enviada por email.' });
  } catch (err) {
    console.error('[Admin] Error al rechazar solicitud:', err);
    return res.status(500).json({ success: false, message: 'Error al rechazar la solicitud.' });
  }
});


// ── Solicitudes de reclutadores (v1.7) ───────────────────────────────────────

/**
 * GET /api/admin/solicitudes-reclutador
 * Lista todas las solicitudes de reclutadores con datos de empresa.
 * Query param: estado (pendiente | aprobado | rechazado)
 */
router.get('/solicitudes-reclutador', ...soloAdmin, async (req, res) => {
  try {
    const { estado } = req.query;
    const where = {};
    if (estado) where.estado = estado;

    const solicitudes = await SolicitudReclutador.findAll({
      where,
      include: [{ model: Empresa, as: 'empresa', attributes: ['id', 'razonSocial', 'usuarioId'] }],
      order: [['createdAt', 'DESC']],
    });
    return res.json({ success: true, total: solicitudes.length, data: solicitudes });
  } catch (err) {
    console.error('[Admin] Error al listar solicitudes-reclutador:', err);
    return res.status(500).json({ success: false, message: 'Error al obtener las solicitudes.' });
  }
});

/**
 * PATCH /api/admin/solicitudes-reclutador/:id/aprobar
 * Aprueba una solicitud de reclutador:
 *  1. Crea el usuario con rol 'empresa'
 *  2. Lo asocia a la empresa en EmpresaUsuario (rol reclutador)
 *  3. Envía email con credenciales al reclutador
 *  4. Envía notificación a la empresa (email al propietario)
 */
router.patch('/solicitudes-reclutador/:id/aprobar', ...soloAdmin, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const solicitud = await SolicitudReclutador.findByPk(req.params.id, {
      include: [{ model: Empresa, as: 'empresa', attributes: ['id', 'razonSocial', 'usuarioId'] }],
      transaction: t,
    });
    if (!solicitud) { await t.rollback(); return res.status(404).json({ success: false, message: 'Solicitud no encontrada.' }); }
    if (solicitud.estado !== 'pendiente') { await t.rollback(); return res.status(400).json({ success: false, message: `La solicitud ya fue ${solicitud.estado}.` }); }

    // Verificar duplicado de email
    const emailExistente = await Usuario.findOne({ where: { email: solicitud.email }, transaction: t });
    if (emailExistente) {
      await t.rollback();
      return res.status(400).json({ success: false, message: `Ya existe un usuario con el email ${solicitud.email}.` });
    }

    // Generar credenciales
    const passwordPlano = crypto.randomBytes(6).toString('hex');
    const hash = await bcrypt.hash(passwordPlano, 12);

    // Crear usuario con rol empresa
    const nuevoUsuario = await Usuario.create({
      nombre: solicitud.nombre,
      apellido: 'Reclutador',
      email: solicitud.email,
      password: hash,
      rol: 'empresa',
      activo: true,
      habilitado: true,
    }, { transaction: t });

    // Asociar a la empresa
    await EmpresaUsuario.create({
      empresaId: solicitud.empresaId,
      usuarioId: nuevoUsuario.id,
      rolInterno: 'reclutador',
      activo: true,
    }, { transaction: t });

    await solicitud.update({ estado: 'aprobado' }, { transaction: t });
    await t.commit();

    await logAction({ usuarioId: req.usuario.id, accion: 'aprobar_solicitud_reclutador', entidad: 'solicitud_reclutador', entidadId: solicitud.id, detalle: { email: solicitud.email, empresaId: solicitud.empresaId }, ip: req.ip });

    const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`;

    // Email al reclutador con credenciales
    try {
      await enviarEmail({
        to: solicitud.email,
        subject: '✅ Tu cuenta de reclutador fue creada – SisPasantías',
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#222">
          <h2 style="color:#0073AD">¡Tu cuenta fue creada! 🎉</h2>
          <p>Hola, <strong>${solicitud.nombre}</strong>.</p>
          <p>El equipo de <strong>SisPasantías</strong> activó tu cuenta de reclutador en <strong>${solicitud.empresa?.razonSocial}</strong>.</p>
          <table style="margin:1rem 0;border-collapse:collapse;width:100%">
            <tr><td style="padding:8px 12px;background:#f0f6fc;font-weight:600;width:130px">Email</td><td style="padding:8px 12px;background:#e8f4fb">${solicitud.email}</td></tr>
            <tr><td style="padding:8px 12px;background:#f0f6fc;font-weight:600">Contraseña</td><td style="padding:8px 12px;background:#e8f4fb;font-family:monospace;font-size:1.1rem">${passwordPlano}</td></tr>
          </table>
          <p style="color:#c0392b;font-size:0.88rem">⚠️ Cambiá tu contraseña al ingresar por primera vez.</p>
          <a href="${loginUrl}" style="display:inline-block;margin-top:1rem;background:#0073AD;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">Ingresar al sistema</a>
        </div>`,
      });
    } catch (e) { console.error('[Admin] Email reclutador aprobado:', e.message); }

    // Notificación email al propietario de la empresa
    try {
      const propietario = await Usuario.findByPk(solicitud.empresa?.usuarioId);
      if (propietario) {
        await enviarEmail({
          to: propietario.email,
          subject: '✅ Solicitud de reclutador aprobada – SisPasantías',
          html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#222">
            <h2 style="color:#0073AD">Solicitud aprobada</h2>
            <p>La solicitud de reclutador para <strong>${solicitud.nombre}</strong> (${solicitud.email}) fue <strong>aprobada</strong>.</p>
            <p>El reclutador ya puede acceder al sistema con las credenciales enviadas a su email.</p>
          </div>`,
        });
      }
    } catch (e) { console.error('[Admin] Email notif empresa aprobado:', e.message); }

    return res.json({
      success: true,
      message: `Reclutador aprobado. Cuenta creada para ${solicitud.email}.`,
      data: { usuarioId: nuevoUsuario.id, email: solicitud.email, ...(process.env.NODE_ENV !== 'production' && { passwordGenerada: passwordPlano }) },
    });
  } catch (err) {
    await t.rollback();
    console.error('[Admin] Error al aprobar solicitud-reclutador:', err);
    return res.status(500).json({ success: false, message: 'Error al aprobar la solicitud.' });
  }
});

/**
 * PATCH /api/admin/solicitudes-reclutador/:id/rechazar
 * Rechaza la solicitud y notifica a la empresa y al solicitante.
 * Body opcional: { motivo }
 */
router.patch('/solicitudes-reclutador/:id/rechazar', ...soloAdmin, async (req, res) => {
  try {
    const solicitud = await SolicitudReclutador.findByPk(req.params.id, {
      include: [{ model: Empresa, as: 'empresa', attributes: ['id', 'razonSocial', 'usuarioId'] }],
    });
    if (!solicitud) return res.status(404).json({ success: false, message: 'Solicitud no encontrada.' });
    if (solicitud.estado !== 'pendiente') return res.status(400).json({ success: false, message: `La solicitud ya fue ${solicitud.estado}.` });

    const { motivo } = req.body;
    await solicitud.update({ estado: 'rechazado', motivoRechazo: motivo || null });

    await logAction({ usuarioId: req.usuario.id, accion: 'rechazar_solicitud_reclutador', entidad: 'solicitud_reclutador', entidadId: solicitud.id, detalle: { email: solicitud.email, motivo }, ip: req.ip });

    // Notificar a la empresa (propietario)
    try {
      const propietario = await Usuario.findByPk(solicitud.empresa?.usuarioId);
      if (propietario) {
        await enviarEmail({
          to: propietario.email,
          subject: '❌ Solicitud de reclutador rechazada – SisPasantías',
          html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#222">
            <h2 style="color:#c0392b">Solicitud rechazada</h2>
            <p>La solicitud de reclutador para <strong>${solicitud.nombre}</strong> (${solicitud.email}) fue <strong>rechazada</strong>.</p>
            ${motivo ? `<p><strong>Motivo:</strong> ${motivo}</p>` : ''}
            <p>Si tenés consultas, contactate con el equipo del instituto.</p>
          </div>`,
        });
      }
    } catch (e) { console.error('[Admin] Email notif empresa rechazado:', e.message); }

    return res.json({ success: true, message: 'Solicitud rechazada. Notificación enviada a la empresa.' });
  } catch (err) {
    console.error('[Admin] Error al rechazar solicitud-reclutador:', err);
    return res.status(500).json({ success: false, message: 'Error al rechazar la solicitud.' });
  }
});

module.exports = router;

