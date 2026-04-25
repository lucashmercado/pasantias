/**
 * EquipoPage.jsx — Gestión del equipo reclutador de la empresa.
 *
 * Ruta: /empresa/equipo
 *
 * Funciones:
 * - Listar todos los reclutadores activos del equipo
 * - Agregar un nuevo miembro (email + rolInterno)
 * - Editar el rol interno de un miembro existente (inline)
 * - Eliminar un miembro con confirmación
 *
 * Servicios consumidos:
 * - GET    /api/empresas/equipo
 * - POST   /api/empresas/equipo
 * - PATCH  /api/empresas/equipo/:id
 * - DELETE /api/empresas/equipo/:id
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { empresaService } from '../../services/api';
import styles from './EquipoPage.module.css';

const ROLES_INTERNOS = [
  { value: 'reclutador',        label: 'Reclutador' },
  { value: 'reclutador_senior', label: 'Reclutador Senior' },
  { value: 'coordinador',       label: 'Coordinador de RRHH' },
  { value: 'gerente',           label: 'Gerente de RRHH' },
  { value: 'admin_empresa',     label: 'Administrador de empresa' },
];

/** Fila editable de un miembro del equipo */
function MiembroRow({ miembro, onSave, onDelete }) {
  const [editando, setEditando] = useState(false);
  const [rolEdit,  setRolEdit]  = useState(miembro.rolInterno ?? '');
  const [saving,   setSaving]   = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(miembro.id, rolEdit);
      setEditando(false);
    } catch (_) {
      alert('Error al guardar el rol.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr>
      {/* Avatar + Nombre */}
      <td>
        <div className={styles.miembroNombre}>
          <div className={styles.avatar}>
            {(miembro.nombre?.[0] ?? '?').toUpperCase()}
          </div>
          <div>
            <strong>{miembro.nombre} {miembro.apellido}</strong>
            <span className={styles.miembroEmail}>{miembro.email}</span>
          </div>
        </div>
      </td>

      {/* Rol interno — editable en línea */}
      <td>
        {editando ? (
          <select
            value={rolEdit}
            onChange={(e) => setRolEdit(e.target.value)}
            className={styles.rolSelect}
          >
            {ROLES_INTERNOS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        ) : (
          <span className="badge badge-empresa" style={{ textTransform: 'none', fontSize: '0.8rem' }}>
            {ROLES_INTERNOS.find((r) => r.value === miembro.rolInterno)?.label ?? miembro.rolInterno ?? '—'}
          </span>
        )}
      </td>

      {/* Estado del miembro */}
      <td>
        <span className={`badge badge-${miembro.activo !== false ? 'activa' : 'cerrada'}`}>
          {miembro.activo !== false ? 'Activo' : 'Inactivo'}
        </span>
      </td>

      {/* Acciones */}
      <td>
        <div className={styles.accionesRow}>
          {editando ? (
            <>
              <button className="btn-ok" onClick={handleSave} disabled={saving}>
                {saving ? '...' : '✓ Guardar'}
              </button>
              <button className="btn-secondary" onClick={() => { setEditando(false); setRolEdit(miembro.rolInterno ?? ''); }}>
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button className="btn-small" onClick={() => setEditando(true)}>
                ✏️ Editar rol
              </button>
              <button
                className="btn-danger"
                onClick={() => {
                  if (window.confirm(`¿Eliminar a ${miembro.nombre} del equipo?`)) {
                    onDelete(miembro.id);
                  }
                }}
              >
                🗑 Eliminar
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

/** Formulario para agregar un nuevo miembro */
function AgregarMiembroForm({ onAgregado }) {
  const [form, setForm]       = useState({ email: '', rolInterno: 'reclutador' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [abierto, setAbierto] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await empresaService.agregarMiembro(form);
      onAgregado(data.data ?? data);
      setForm({ email: '', rolInterno: 'reclutador' });
      setAbierto(false);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al agregar el miembro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formCard}>
      <button
        className={abierto ? 'btn-secondary' : 'btn-primary'}
        onClick={() => { setAbierto(!abierto); setError(''); }}
        style={{ marginBottom: abierto ? '1rem' : 0 }}
      >
        {abierto ? '✕ Cancelar' : '+ Agregar miembro'}
      </button>

      {abierto && (
        <form onSubmit={handleSubmit} className={styles.agregarForm}>
          <div className="form-row">
            <div className="form-group">
              <label>Email del nuevo reclutador *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                placeholder="reclutador@empresa.com"
              />
            </div>
            <div className="form-group">
              <label>Rol interno</label>
              <select
                value={form.rolInterno}
                onChange={(e) => setForm({ ...form, rolInterno: e.target.value })}
              >
                {ROLES_INTERNOS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Agregando...' : '✓ Confirmar'}
          </button>
        </form>
      )}
    </div>
  );
}

/* ── Componente principal ──────────────────────────────────────────────────── */
export default function EquipoPage() {
  const [equipo,  setEquipo]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    empresaService
      .getEquipo()
      .then(({ data }) => setEquipo(data.data ?? data ?? []))
      .catch(() => setError('No se pudo cargar el equipo. Intentá de nuevo.'))
      .finally(() => setLoading(false));
  }, []);

  const handleAgregado = (nuevoMiembro) => {
    setEquipo((prev) => [...prev, nuevoMiembro]);
  };

  const handleSave = async (id, rolInterno) => {
    await empresaService.editarMiembro(id, { rolInterno });
    setEquipo((prev) => prev.map((m) => (m.id === id ? { ...m, rolInterno } : m)));
  };

  const handleDelete = async (id) => {
    try {
      await empresaService.eliminarMiembro(id);
      setEquipo((prev) => prev.filter((m) => m.id !== id));
    } catch (_) {
      alert('Error al eliminar el miembro.');
    }
  };

  return (
    <div className="page-container">
      {/* ── Cabecera ─────────────────────────────────────────────────────── */}
      <div className="dashboard-header">
        <div>
          <Link to="/empresa" className="btn-back">← Volver al panel</Link>
          <h1>Equipo Reclutador</h1>
        </div>
        <span className="badge badge-empresa" style={{ alignSelf: 'flex-end', fontSize: '0.85rem' }}>
          {equipo.length} miembro{equipo.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Error global ─────────────────────────────────────────────────── */}
      {error && <p className="error-msg" style={{ marginBottom: '1.5rem' }}>{error}</p>}

      {/* ── Formulario agregar ───────────────────────────────────────────── */}
      <AgregarMiembroForm onAgregado={handleAgregado} />

      {/* ── Tabla del equipo ─────────────────────────────────────────────── */}
      {loading ? (
        <div className={styles.skeletonList}>
          {[1, 2, 3].map((i) => <div key={i} className={styles.skeletonRow} />)}
        </div>
      ) : equipo.length === 0 ? (
        <div className={styles.emptyState}>
          <span>👥</span>
          <p>El equipo está vacío. Agregá tu primer reclutador.</p>
        </div>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>Miembro</th>
              <th>Rol interno</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {equipo.map((m) => (
              <MiembroRow
                key={m.id}
                miembro={m}
                onSave={handleSave}
                onDelete={handleDelete}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
