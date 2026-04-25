/**
 * api.js — Cliente HTTP centralizado para comunicarse con el backend.
 *
 * Usa Axios para hacer las peticiones a la API REST.
 * Configura automáticamente:
 * - La URL base del backend (desde variables de entorno)
 * - El token JWT en el header Authorization de cada request
 * - La redirección al login si el token expira (error 401)
 *
 * Exporta servicios agrupados por funcionalidad para usar en los componentes.
 */

import axios from 'axios';

// Crea una instancia de Axios con la configuración base
// La URL base se toma de la variable de entorno VITE_API_URL o usa localhost en desarrollo
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// ── Interceptor de request ────────────────────────────────────────────────────
// Antes de cada request, adjunta el token JWT del localStorage en el header Authorization
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Interceptor de response ───────────────────────────────────────────────────
// Si el servidor responde con 401 (no autorizado), limpia la sesión y redirige al login
api.interceptors.response.use(
  (response) => response, // Si la respuesta es exitosa, la devuelve sin cambios
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token'); // Elimina el token inválido/expirado
      window.location.href = '/login';  // Redirige al login
    }
    return Promise.reject(error);
  }
);

// ── Servicio de autenticación ─────────────────────────────────────────────────
// Funciones para los endpoints de /api/auth
export const authService = {
  register: (data) => api.post('/auth/register', data),                         // Registrar usuario
  login: (data) => api.post('/auth/login', data),                               // Iniciar sesión
  me: () => api.get('/auth/me'),                                                 // Obtener usuario actual
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),      // Solicitar recupero
  resetPassword: (token, password) => api.post(`/auth/reset-password/${token}`, { password }), // Cambiar contraseña
};

// ── Servicio de ofertas ───────────────────────────────────────────────────────
// Funciones para los endpoints de /api/ofertas
export const ofertaService = {
  getAll:          (params) => api.get('/ofertas', { params }),       // Listar ofertas (con filtros opcionales)
  getById:         (id) => api.get(`/ofertas/${id}`),                 // Ver detalle de una oferta
  create:          (data) => api.post('/ofertas', data),              // Publicar nueva oferta
  update:          (id, data) => api.put(`/ofertas/${id}`, data),     // Editar oferta existente
  delete:          (id) => api.delete(`/ofertas/${id}`),              // Cerrar oferta
  getRecomendadas: () => api.get('/ofertas/recomendadas'),            // Ofertas recomendadas para el alumno
};

// ── Servicio de postulaciones ─────────────────────────────────────────────────
// Funciones para los endpoints de /api/postulaciones
export const postulacionService = {
  postular: (data) => api.post('/postulaciones', data),                          // Postularse a una oferta
  getMias: () => api.get('/postulaciones/mis'),                                  // Ver mis postulaciones
  getByOferta: (ofertaId) => api.get(`/postulaciones/oferta/${ofertaId}`),      // Ver candidatos de una oferta
  updateEstado: (id, estado) => api.patch(`/postulaciones/${id}/estado`, { estado }), // Cambiar estado
};

// ── Servicio de perfil de usuario ─────────────────────────────────────────────
// Funciones para los endpoints de /api/users
export const userService = {
  getPerfil: () => api.get('/users/perfil'),              // Ver mi perfil
  updatePerfil: (data) => api.put('/users/perfil', data), // Actualizar mi perfil
  subirCV: (formData) => api.post('/users/perfil/cv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },  // Header especial para subida de archivos
  }),
};

// ── Servicio de notificaciones ────────────────────────────────────────────────
// Funciones para los endpoints de /api/notificaciones
export const notificacionService = {
  getAll:       () => api.get('/notificaciones'),
  sinLeerCount: () => api.get('/notificaciones/sin-leer-count'),
  leer:         (id) => api.patch(`/notificaciones/${id}/leer`),
  leerTodas:    () => api.patch('/notificaciones/leer-todas'),
  eliminar:     (id) => api.delete(`/notificaciones/${id}`),
};

// ── Servicio de administración ────────────────────────────────────────────────
// Funciones para los endpoints de /api/admin (solo accesibles con rol admin)
export const adminService = {
  // Dashboard y métricas
  getStats:              () => api.get('/admin/stats'),
  getDashboardGeneral:   () => api.get('/admin/dashboard-general'),
  getActividadReciente:  () => api.get('/admin/actividad-reciente'),

  // Gestión de empresas
  getEmpresasPendientes: () => api.get('/admin/empresas/pendientes'),
  aprobarEmpresa:        (id) => api.patch(`/admin/empresas/${id}/aprobar`),
  rechazarEmpresa:       (id) => api.patch(`/admin/empresas/${id}/rechazar`),

  // Moderación de ofertas
  getOfertasPendientes:  () => api.get('/admin/ofertas/pendientes'),
  moderarOferta:         (id, aprobada) => api.patch(`/admin/ofertas/${id}/moderar`, { aprobada }),

  // CRUD de usuarios (v1.4)
  getUsuarios:           (params) => api.get('/admin/usuarios', { params }),
  getUsuario:            (id) => api.get(`/admin/usuarios/${id}`),
  crearUsuario:          (data) => api.post('/admin/usuarios', data),
  editarUsuario:         (id, data) => api.put(`/admin/usuarios/${id}`, data),
  eliminarUsuario:       (id) => api.delete(`/admin/usuarios/${id}`),
  toggleUsuario:         (id) => api.patch(`/admin/usuarios/${id}/toggle`),

  // Logs del sistema (v1.4)
  getLogs:               (params) => api.get('/admin/logs', { params }),
  exportarLogs:          (params) => api.get('/admin/logs/export', { params, responseType: 'blob' }),
};

// ── Servicio del profesor ───────────────────────────────────────────────────
// Funciones para los endpoints de /api/profesor (accesibles con rol profesor o admin)
export const profesorService = {
  getMisAlumnos:       () => api.get('/profesor/alumnos'),
  getPostulaciones:    () => api.get('/profesor/postulaciones'),
  getAvalesPendientes: () => api.get('/profesor/avales/pendientes'),
  getAvales:           () => api.get('/profesor/avales'),

  // Método unificado para crear/editar cualquier decisión sobre un aval
  updateAval: (id, estado, comentario) =>
    api.patch(`/profesor/avales/${id}`, { estado, comentario }),

  // Atajos específicos (mantienen retrocompatibilidad)
  aprobarAval:  (id, comentario) => api.patch(`/profesor/avales/${id}`, { estado: 'aprobado', comentario }),
  rechazarAval: (id, motivo)    => api.patch(`/profesor/avales/${id}`, { estado: 'rechazado', comentario: motivo }),
  getReportes:  () => api.get('/profesor/reportes'),

  // Accesibles por el alumno
  listarProfesores: () => api.get('/profesor/lista'),
  solicitarAval:    (data) => api.post('/profesor/solicitar-aval', data),
};

// ── Servicio de mensajes (chat) ─────────────────────────────────────────────
// Funciones para los endpoints de /api/mensajes (todos los roles autenticados)
export const mensajeService = {
  getConversaciones: () => api.get('/mensajes/conversaciones'),                      // Listar conversaciones
  getMensajes: (conversacionId) => api.get(`/mensajes/${conversacionId}`),          // Ver mensajes de una conversación
  enviar: (data) => api.post('/mensajes', data),                                     // Enviar mensaje
  marcarLeido: (mensajeId) => api.patch(`/mensajes/${mensajeId}/leer`),             // Marcar como leído
};

// ── Servicio de empresa ───────────────────────────────────────────────────────
// Funciones para los endpoints de /api/empresas (accesibles con rol empresa)
export const empresaService = {
  getDashboard:    () => api.get('/empresas/dashboard'),
  getMisOfertas:   () => api.get('/empresas/mis-ofertas'),
  getEquipo:       () => api.get('/empresas/equipo'),
  agregarMiembro:  (data) => api.post('/empresas/equipo', data),
  editarMiembro:   (id, data) => api.patch(`/empresas/equipo/${id}`, data),
  eliminarMiembro: (id) => api.delete(`/empresas/equipo/${id}`),
};

export default api;
