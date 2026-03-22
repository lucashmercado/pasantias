import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Adjuntar token automáticamente en cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Manejar errores de autenticación globalmente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post(`/auth/reset-password/${token}`, { password }),
};

// ── Ofertas ───────────────────────────────────────────────────────────────────
export const ofertaService = {
  getAll: (params) => api.get('/ofertas', { params }),
  getById: (id) => api.get(`/ofertas/${id}`),
  create: (data) => api.post('/ofertas', data),
  update: (id, data) => api.put(`/ofertas/${id}`, data),
  delete: (id) => api.delete(`/ofertas/${id}`),
};

// ── Postulaciones ─────────────────────────────────────────────────────────────
export const postulacionService = {
  postular: (data) => api.post('/postulaciones', data),
  getMias: () => api.get('/postulaciones/mis'),
  getByOferta: (ofertaId) => api.get(`/postulaciones/oferta/${ofertaId}`),
  updateEstado: (id, estado) => api.patch(`/postulaciones/${id}/estado`, { estado }),
};

// ── Usuario/Perfil ────────────────────────────────────────────────────────────
export const userService = {
  getPerfil: () => api.get('/users/perfil'),
  updatePerfil: (data) => api.put('/users/perfil', data),
  subirCV: (formData) => api.post('/users/perfil/cv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// ── Notificaciones ────────────────────────────────────────────────────────────
export const notificacionService = {
  getAll: () => api.get('/notificaciones'),
  leer: (id) => api.patch(`/notificaciones/${id}/leer`),
  leerTodas: () => api.patch('/notificaciones/leer-todas'),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminService = {
  getStats: () => api.get('/admin/stats'),
  getEmpresasPendientes: () => api.get('/admin/empresas/pendientes'),
  aprobarEmpresa: (id) => api.patch(`/admin/empresas/${id}/aprobar`),
  rechazarEmpresa: (id) => api.patch(`/admin/empresas/${id}/rechazar`),
  getOfertasPendientes: () => api.get('/admin/ofertas/pendientes'),
  moderarOferta: (id, aprobada) => api.patch(`/admin/ofertas/${id}/moderar`, { aprobada }),
  getUsuarios: () => api.get('/admin/usuarios'),
  toggleUsuario: (id) => api.patch(`/admin/usuarios/${id}/toggle`),
};

export default api;
