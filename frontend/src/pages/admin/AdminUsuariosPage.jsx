/**
 * AdminUsuariosPage.jsx — Gestión completa de usuarios del sistema.
 *
 * Permite al administrador:
 * - Ver todos los usuarios con filtros por rol, estado y búsqueda de texto
 * - Crear nuevos usuarios con cualquier rol
 * - Editar datos, rol y estado de usuarios existentes
 * - Eliminar (desactivar) usuarios
 * - Activar/desactivar cuentas con un toggle
 */

import { useState, useEffect, useCallback } from 'react';
import { adminService } from '../../services/api';
import styles from './AdminUsuariosPage.module.css';

/* Roles disponibles en el sistema */
const ROLES = ['alumno', 'egresado', 'empresa', 'admin'];

/* Etiquetas y colores para cada rol */
const ROL_BADGE = {
  alumno:   { label: 'Alumno',   color: '#0073AD' },
  egresado: { label: 'Egresado', color: '#8e44ad' },
  empresa:  { label: 'Empresa',  color: '#e67e22' },

  admin:    { label: 'Admin',    color: '#c0392b' },
};

/* Estado inicial del formulario (crear/editar) */
const FORM_VACIO = {
  nombre: '', apellido: '', email: '',
  password: '', rol: 'alumno',
  telefono: '', ubicacion: '', activo: true,
};

export default function AdminUsuariosPage() {
  const [usuarios,    setUsuarios]   = useState([]);
  const [loading,     setLoading]    = useState(true);
  const [error,       setError]      = useState('');
  const [success,     setSuccess]    = useState('');

  // Filtros
  const [busqueda,    setBusqueda]   = useState('');
  const [filtroRol,   setFiltroRol]  = useState('');
  const [filtroActivo, setFiltroActivo] = useState('');

  // Modal
  const [modal,       setModal]      = useState(null);   // null | 'crear' | 'editar' | 'confirmar'
  const [editando,    setEditando]   = useState(null);   // usuario a editar
  const [eliminando,  setEliminando] = useState(null);   // usuario a eliminar
  const [form,        setForm]       = useState(FORM_VACIO);
  const [formLoading, setFormLoading] = useState(false);
  const [formError,   setFormError]  = useState('');

  /* ── Carga de usuarios con filtros ────────────────────────────────── */
  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filtroRol)           params.rol    = filtroRol;
      if (filtroActivo !== '') params.activo  = filtroActivo;
      if (busqueda)            params.q       = busqueda;
      const res = await adminService.getUsuarios(params);
      setUsuarios(res.data.data ?? res.data ?? []);
    } catch {
      setError('No se pudieron cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  }, [filtroRol, filtroActivo, busqueda]);

  useEffect(() => { cargar(); }, [cargar]);

  /* ── Helpers de UI ────────────────────────────────────────────────── */
  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  const abrirCrear = () => { setForm(FORM_VACIO); setFormError(''); setModal('crear'); };
  const abrirEditar = (u) => {
    setEditando(u);
    setForm({ nombre: u.nombre, apellido: u.apellido, email: u.email, password: '', rol: u.rol, telefono: u.telefono ?? '', ubicacion: u.ubicacion ?? '', activo: u.activo });
    setFormError('');
    setModal('editar');
  };
  const abrirConfirmar = (u) => { setEliminando(u); setModal('confirmar'); };
  const cerrarModal = () => { setModal(null); setEditando(null); setEliminando(null); setFormError(''); };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  /* ── Crear usuario ────────────────────────────────────────────────── */
  const handleCrear = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      await adminService.crearUsuario(form);
      showSuccess('Usuario creado correctamente.');
      cerrarModal();
      cargar();
    } catch (err) {
      setFormError(err.response?.data?.message ?? 'Error al crear el usuario.');
    } finally {
      setFormLoading(false);
    }
  };

  /* ── Editar usuario ───────────────────────────────────────────────── */
  const handleEditar = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password; // No enviar si está vacío
      await adminService.editarUsuario(editando.id, payload);
      showSuccess('Usuario actualizado.');
      cerrarModal();
      cargar();
    } catch (err) {
      setFormError(err.response?.data?.message ?? 'Error al actualizar el usuario.');
    } finally {
      setFormLoading(false);
    }
  };

  /* ── Eliminar usuario ─────────────────────────────────────────────── */
  const handleEliminar = async () => {
    try {
      await adminService.eliminarUsuario(eliminando.id);
      showSuccess('Usuario desactivado.');
      cerrarModal();
      cargar();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al eliminar el usuario.');
      cerrarModal();
    }
  };

  /* ── Toggle activo ────────────────────────────────────────────────── */
  const handleToggle = async (id) => {
    try {
      await adminService.toggleUsuario(id);
      setUsuarios((prev) => prev.map((u) => u.id === id ? { ...u, activo: !u.activo } : u));
    } catch {
      setError('Error al cambiar el estado del usuario.');
    }
  };

  /* ── Render ───────────────────────────────────────────────────────── */
  return (
    <div className="page-container">
      {/* Cabecera */}
      <div className="dashboard-header">
        <div>
          <h1>Gestión de Usuarios</h1>
          <p className={styles.subtitle}>
            {loading ? '...' : `${usuarios.length} usuario${usuarios.length !== 1 ? 's' : ''} encontrado${usuarios.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button id="btn-crear-usuario" className="btn-primary" onClick={abrirCrear}>
          + Nuevo Usuario
        </button>
      </div>

      {/* Mensajes */}
      {error   && <p className="error-msg" style={{ marginBottom: '1rem' }}>{error}</p>}
      {success && <p className={styles.successMsg}>{success}</p>}

      {/* Filtros */}
      <div className={styles.filtros}>
        <input
          id="busqueda-usuario"
          className={styles.searchInput}
          type="text"
          placeholder="🔍  Buscar por nombre o email..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select id="filtro-rol" className={styles.filterSelect} value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)}>
          <option value="">Todos los roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{ROL_BADGE[r]?.label ?? r}</option>)}
        </select>
        <select id="filtro-activo" className={styles.filterSelect} value={filtroActivo} onChange={(e) => setFiltroActivo(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
        <button className="btn-secondary" onClick={cargar}>↺ Actualizar</button>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className={styles.loadingWrap}>
          <div className={styles.spinner} />
          <p className="msg">Cargando usuarios...</p>
        </div>
      ) : usuarios.length === 0 ? (
        <div className={styles.empty}>
          <span>👤</span>
          <p>No se encontraron usuarios con los filtros actuales.</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className="tabla">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Último acceso</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => {
                const badge = ROL_BADGE[u.rol] ?? { label: u.rol, color: '#666' };
                return (
                  <tr key={u.id} className={u.activo ? '' : styles.rowInactiva}>
                    <td className={styles.idCell}>#{u.id}</td>
                    <td>
                      <div className={styles.userCell}>
                        <span className={styles.avatar}>{u.nombre?.[0]}{u.apellido?.[0]}</span>
                        <div>
                          <strong>{u.nombre} {u.apellido}</strong>
                          {u.ubicacion && <small className={styles.ubicacion}>{u.ubicacion}</small>}
                        </div>
                      </div>
                    </td>
                    <td className={styles.emailCell}>{u.email}</td>
                    <td>
                      <span className={styles.rolBadge} style={{ '--badge-color': badge.color }}>
                        {badge.label}
                      </span>
                    </td>
                    <td>
                      <button
                        className={u.activo ? styles.toggleOn : styles.toggleOff}
                        onClick={() => handleToggle(u.id)}
                        title={u.activo ? 'Click para desactivar' : 'Click para activar'}
                      >
                        {u.activo ? '● Activo' : '○ Inactivo'}
                      </button>
                    </td>
                    <td className={styles.fechaCell}>
                      {u.ultimoAcceso
                        ? new Date(u.ultimoAcceso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
                        : '—'}
                    </td>
                    <td>
                      <div className={styles.accionesBtns}>
                        <button className="btn-small" onClick={() => abrirEditar(u)} title="Editar usuario">✏️ Editar</button>
                        <button className="btn-danger btn-small" onClick={() => abrirConfirmar(u)} title="Eliminar usuario">🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal Crear / Editar ─────────────────────────────────────── */}
      {(modal === 'crear' || modal === 'editar') && (
        <div className={styles.modalOverlay} onClick={cerrarModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{modal === 'crear' ? '+ Nuevo Usuario' : '✏️ Editar Usuario'}</h2>
              <button className={styles.modalClose} onClick={cerrarModal}>✕</button>
            </div>

            <form onSubmit={modal === 'crear' ? handleCrear : handleEditar} className={styles.form}>
              {formError && <p className="error-msg">{formError}</p>}

              <div className={styles.formRow}>
                <div className="form-group">
                  <label>Nombre *</label>
                  <input name="nombre" value={form.nombre} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Apellido *</label>
                  <input name="apellido" value={form.apellido} onChange={handleChange} required />
                </div>
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label>{modal === 'crear' ? 'Contraseña *' : 'Nueva contraseña (dejar vacío para no cambiar)'}</label>
                <input name="password" type="password" value={form.password} onChange={handleChange} required={modal === 'crear'} placeholder={modal === 'editar' ? '••••••••' : ''} />
              </div>

              <div className={styles.formRow}>
                <div className="form-group">
                  <label>Rol *</label>
                  <select name="rol" value={form.rol} onChange={handleChange} required>
                    {ROLES.map((r) => <option key={r} value={r}>{ROL_BADGE[r]?.label ?? r}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="+54 11 1234-5678" />
                </div>
              </div>

              <div className="form-group">
                <label>Ubicación</label>
                <input name="ubicacion" value={form.ubicacion} onChange={handleChange} placeholder="Ciudad, Provincia" />
              </div>

              {modal === 'editar' && (
                <label className={styles.checkboxLabel}>
                  <input name="activo" type="checkbox" checked={form.activo} onChange={handleChange} />
                  <span>Cuenta activa</span>
                </label>
              )}

              <div className={styles.modalFooter}>
                <button type="button" className="btn-secondary" onClick={cerrarModal}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={formLoading}>
                  {formLoading ? 'Guardando...' : (modal === 'crear' ? 'Crear Usuario' : 'Guardar Cambios')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Confirmar Eliminar ─────────────────────────────────── */}
      {modal === 'confirmar' && eliminando && (
        <div className={styles.modalOverlay} onClick={cerrarModal}>
          <div className={styles.modalConfirm} onClick={(e) => e.stopPropagation()}>
            <span className={styles.confirmIcon}>⚠️</span>
            <h2>¿Eliminar usuario?</h2>
            <p>
              Se desactivará la cuenta de <strong>{eliminando.nombre} {eliminando.apellido}</strong> ({eliminando.email}).
              Los datos históricos se conservan.
            </p>
            <div className={styles.modalFooter}>
              <button className="btn-secondary" onClick={cerrarModal}>Cancelar</button>
              <button className="btn-danger" onClick={handleEliminar}>Sí, desactivar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
