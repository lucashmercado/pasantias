/**
 * EquipoPage.jsx — Gestión del equipo reclutador de la empresa.
 *
 * Ruta: /empresa/equipo
 * Acceso: solo propietario puede enviar solicitudes y gestionar miembros.
 *         otros roles pueden ver (solo lectura).
 *
 * Flujo de alta de reclutadores:
 *   1. Propietario llena formulario (nombre + email) → POST /equipo/solicitar
 *   2. Admin aprueba → usuario creado automáticamente → email con credenciales
 *   3. Reclutador inicia sesión y cambia su contraseña desde /empresa/seguridad
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { empresaService } from '../../services/api';
import styles from './EquipoPage.module.css';

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
const ROL_COLORS = { propietario: '#7c3aed', gerente: '#2563eb', reclutador: '#0891b2', viewer: '#64748b' };
function rolColor(rol) { return ROL_COLORS[rol] ?? '#64748b'; }
function rolLabel(rol) {
  return { propietario: 'Propietario', gerente: 'Gerente', reclutador: 'Reclutador', viewer: 'Solo lectura' }[rol] ?? rol;
}
function formatFecha(iso) {
  if (!iso) return 'Nunca';
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const ESTADO_SOLICITUD = {
  pendiente:  { label: 'Pendiente',  color: '#ca8a04', bg: '#fef9c3' },
  aprobado:   { label: 'Aprobado',   color: '#15803d', bg: '#dcfce7' },
  rechazado:  { label: 'Rechazado',  color: '#dc2626', bg: '#fee2e2' },
};

/* ── Modal genérico ─────────────────────────────────────────────────────────── */
function Modal({ titulo, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{titulo}</h3>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Modal: Solicitar reclutador ────────────────────────────────────────────── */
function ModalSolicitarReclutador({ onClose, onEnviada }) {
  const [form, setForm] = useState({ nombre: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.email.trim()) {
      setError('Nombre y email son requeridos.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await empresaService.solicitarReclutador(form);
      onEnviada(data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al enviar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal titulo="📋 Solicitar nuevo reclutador" onClose={onClose}>
      <form onSubmit={handleSubmit} className={styles.modalForm}>

        <div className={styles.infoBox}>
          <span>ℹ️</span>
          <span>
            La solicitud será revisada por el administrador del instituto.
            Al aprobarla, se creará la cuenta y se enviarán las credenciales por email.
          </span>
        </div>

        <div className={styles.fieldGroup}>
          <label>Nombre completo *</label>
          <input
            type="text"
            value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            placeholder="Juan Pérez"
            required
            autoFocus
          />
        </div>

        <div className={styles.fieldGroup}>
          <label>Email *</label>
          <input
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="reclutador@empresa.com"
            required
          />
        </div>

        {error && <p className={styles.errorMsg}>⚠️ {error}</p>}

        <div className={styles.modalActions}>
          <button type="button" className={styles.btnSecondary} onClick={onClose}>Cancelar</button>
          <button type="submit" className={styles.btnPrimary} disabled={loading}>
            {loading ? 'Enviando...' : '📤 Enviar solicitud'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ── Modal: Cambiar contraseña ──────────────────────────────────────────────── */
function ModalCambiarPassword({ miembro, onClose, onGuardado }) {
  const [pwd, setPwd] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pwd.length < 6) { setError('Mínimo 6 caracteres.'); return; }
    setLoading(true);
    try {
      await empresaService.resetPasswordMiembro(miembro.id, pwd);
      onGuardado();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al cambiar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal titulo={`🔑 Cambiar contraseña — ${miembro.usuario?.nombre ?? miembro.nombre}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className={styles.modalForm}>
        <div className={styles.fieldGroup}>
          <label>Nueva contraseña *</label>
          <div className={styles.passwordField}>
            <input
              type={mostrar ? 'text' : 'password'}
              value={pwd}
              onChange={e => { setPwd(e.target.value); setError(''); }}
              placeholder="Mínimo 6 caracteres"
              autoFocus required
            />
            <button type="button" className={styles.togglePwd} onClick={() => setMostrar(p => !p)}>
              {mostrar ? '🙈' : '👁️'}
            </button>
          </div>
          {pwd.length > 0 && pwd.length < 6 && (
            <span className={styles.errorMsg}>Debe tener al menos 6 caracteres</span>
          )}
        </div>
        {error && <p className={styles.errorMsg}>{error}</p>}
        <div className={styles.modalActions}>
          <button type="button" className={styles.btnSecondary} onClick={onClose}>Cancelar</button>
          <button type="submit" className={styles.btnPrimary} disabled={loading || pwd.length < 6}>
            {loading ? 'Guardando...' : '🔑 Cambiar contraseña'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ── Modal: Editar rol ──────────────────────────────────────────────────────── */
const ROLES = [
  { value: 'reclutador', label: 'Reclutador',   color: '#0891b2', desc: 'Crea ofertas y gestiona candidatos' },
  { value: 'gerente',    label: 'Gerente',       color: '#2563eb', desc: 'Gestiona el perfil y el equipo' },
  { value: 'viewer',     label: 'Solo lectura',  color: '#64748b', desc: 'Solo puede visualizar' },
];

function ModalEditarRol({ miembro, onClose, onGuardado }) {
  const [rolInterno, setRol] = useState(miembro.rolInterno ?? 'reclutador');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await empresaService.editarMiembro(miembro.id, { rolInterno });
      onGuardado(rolInterno);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al cambiar el rol.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal titulo={`✏️ Cambiar rol — ${miembro.usuario?.nombre ?? miembro.nombre}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className={styles.modalForm}>
        <div className={styles.fieldGroup}>
          <label>Rol en el equipo</label>
          <div className={styles.rolRadioGroup}>
            {ROLES.map(r => (
              <label key={r.value}
                className={`${styles.rolRadio} ${rolInterno === r.value ? styles.rolRadioActive : ''}`}
                style={rolInterno === r.value ? { borderColor: r.color, background: r.color + '12' } : {}}
              >
                <input type="radio" name="rolInterno" value={r.value} checked={rolInterno === r.value} onChange={() => setRol(r.value)} />
                <div>
                  <strong style={rolInterno === r.value ? { color: r.color } : {}}>{r.label}</strong>
                  <span>{r.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
        {error && <p className={styles.errorMsg}>{error}</p>}
        <div className={styles.modalActions}>
          <button type="button" className={styles.btnSecondary} onClick={onClose}>Cancelar</button>
          <button type="submit" className={styles.btnPrimary} disabled={loading}>
            {loading ? 'Guardando...' : '✓ Guardar rol'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ── Tarjeta de miembro ─────────────────────────────────────────────────────── */
function MiembroCard({ miembro, esPropietario, onEditarRol, onCambiarPwd, onToggleActivo, onEliminar }) {
  const u = miembro.usuario ?? miembro;
  const nombre = `${u.nombre ?? ''} ${u.apellido ?? ''}`.trim() || u.email;
  const inicial = nombre[0]?.toUpperCase() ?? '?';
  const esProp = miembro.rolInterno === 'propietario';

  return (
    <div className={`${styles.miembroCard} ${!miembro.activo ? styles.miembroInactivo : ''}`}>
      <div className={styles.cardAvatar} style={{ background: rolColor(miembro.rolInterno) }}>{inicial}</div>
      <div className={styles.cardInfo}>
        <div className={styles.cardNombre}>
          <strong>{nombre}</strong>
          {esProp && <span className={styles.propietarioBadge}>Propietario</span>}
          {!miembro.activo && <span className={styles.suspendidoBadge}>Suspendido</span>}
        </div>
        <span className={styles.cardEmail}>{u.email}</span>
        <div className={styles.cardMeta}>
          <span className={styles.cardFecha}>Último acceso: {formatFecha(u.ultimoAcceso)}</span>
        </div>
      </div>
      {esPropietario && !esProp && (
        <div className={styles.cardAcciones}>
          <button className={`${styles.btnAccion} ${miembro.activo ? styles.btnWarning : styles.btnOk}`} onClick={() => onToggleActivo(miembro)}>
            {miembro.activo ? '⏸ Suspender' : '▶ Reactivar'}
          </button>
          <button className={`${styles.btnAccion} ${styles.btnDanger}`} onClick={() => onEliminar(miembro)}>🗑 Quitar</button>
        </div>
      )}
    </div>
  );
}

/* ── Fila de solicitud de reclutador ────────────────────────────────────────── */
function SolicitudRow({ sol }) {
  const est = ESTADO_SOLICITUD[sol.estado] ?? ESTADO_SOLICITUD.pendiente;
  return (
    <tr>
      <td><strong>{sol.nombre}</strong></td>
      <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{sol.email}</td>
      <td>
        <span style={{ background: est.bg, color: est.color, padding: '3px 10px', borderRadius: 99, fontSize: '0.8rem', fontWeight: 600 }}>
          {est.label}
        </span>
      </td>
      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
        {new Date(sol.createdAt).toLocaleDateString('es-AR')}
      </td>
    </tr>
  );
}

/* ── Componente principal ───────────────────────────────────────────────────── */
export default function EquipoPage() {
  const [equipo,      setEquipo]      = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [toast,       setToast]       = useState('');
  const [rolEnEquipo, setRolEnEquipo] = useState(null);

  const [modalSolicitar, setModalSolicitar] = useState(false);
  const [modalRol,       setModalRol]       = useState(null);
  const [modalPwd,       setModalPwd]       = useState(null);

  const esPropietario = rolEnEquipo === 'propietario';
  const activos    = equipo.filter(m => m.activo !== false);
  const suspendidos = equipo.filter(m => m.activo === false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  useEffect(() => {
    async function cargar() {
      try {
        const [equipoRes, solRes] = await Promise.all([
          empresaService.getEquipo(),
          empresaService.getMisSolicitudesReclutador(),
        ]);
        setEquipo(equipoRes.data.data ?? []);
        if (equipoRes.data.rolEnEquipo) setRolEnEquipo(equipoRes.data.rolEnEquipo);
        setSolicitudes(solRes.data.data ?? []);
      } catch {
        setError('No se pudo cargar el equipo. Intentá de nuevo.');
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, []);

  const handleEnviada = (nueva) => {
    setSolicitudes(prev => [nueva, ...prev]);
    showToast('✅ Solicitud enviada. El administrador la revisará pronto.');
  };

  const handleRolGuardado = (id, nuevoRol) => {
    setEquipo(prev => prev.map(m => m.id === id ? { ...m, rolInterno: nuevoRol } : m));
    showToast('✓ Rol actualizado.');
  };

  const handlePwdGuardada = () => {
    showToast('✓ Contraseña actualizada.');
  };

  const handleToggleActivo = async (miembro) => {
    const nuevoEstado = !miembro.activo;
    const accion = nuevoEstado ? 'reactivar' : 'suspender';
    if (!window.confirm(`¿Querés ${accion} la cuenta de ${miembro.usuario?.nombre ?? miembro.nombre}?`)) return;
    try {
      await empresaService.editarMiembro(miembro.id, { activo: nuevoEstado });
      setEquipo(prev => prev.map(m => m.id === miembro.id ? { ...m, activo: nuevoEstado } : m));
      showToast(`✓ Cuenta ${nuevoEstado ? 'reactivada' : 'suspendida'}.`);
    } catch {
      showToast('✗ Error al cambiar el estado.');
    }
  };

  const handleEliminar = async (miembro) => {
    const nombre = miembro.usuario?.nombre ?? miembro.nombre;
    if (!window.confirm(`¿Querés quitar a ${nombre} del equipo?`)) return;
    try {
      await empresaService.eliminarMiembro(miembro.id);
      setEquipo(prev => prev.filter(m => m.id !== miembro.id));
      showToast(`✓ ${nombre} fue quitado del equipo.`);
    } catch {
      showToast('✗ Error al eliminar el miembro.');
    }
  };

  const solicitudesPendientes = solicitudes.filter(s => s.estado === 'pendiente');

  return (
    <div className="page-container">

      {/* ── Cabecera ── */}
      <div className="dashboard-header">
        <div>
          <Link to="/empresa" className="btn-back">← Volver al panel</Link>
          <h1>Gestión del equipo</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
            Administrá los accesos y roles de tu equipo de reclutadores.
          </p>
        </div>
        {esPropietario && (
          <button className={styles.btnPrimary} onClick={() => setModalSolicitar(true)} id="btn-nuevo-miembro">
            + Solicitar reclutador
          </button>
        )}
      </div>

      {/* Toast y error */}
      {toast && <div className={styles.toast}>{toast}</div>}
      {error && <p className={styles.errorMsg}>{error}</p>}

      {/* Skeleton */}
      {loading && (
        <div className={styles.skeletonList}>
          {[1, 2, 3].map(i => <div key={i} className={styles.skeletonRow} />)}
        </div>
      )}

      {/* ── Solicitudes pendientes — aviso destacado ── */}
      {!loading && solicitudesPendientes.length > 0 && (
        <div className={styles.alertPendiente}>
          <span>⏳</span>
          <span>
            Tenés <strong>{solicitudesPendientes.length}</strong> solicitud{solicitudesPendientes.length > 1 ? 'es' : ''} de reclutador pendiente{solicitudesPendientes.length > 1 ? 's' : ''} de aprobación por el administrador.
          </span>
        </div>
      )}

      {/* ── Stats ── */}
      {!loading && equipo.length > 0 && (
        <div className={styles.statsRow}>
          <div className={styles.statChip}>
            <span className={styles.statNum}>{equipo.length}</span><span>Total</span>
          </div>
          <div className={styles.statChip}>
            <span className={styles.statNum} style={{ color: '#16a34a' }}>{activos.length}</span><span>Activos</span>
          </div>
          {suspendidos.length > 0 && (
            <div className={styles.statChip}>
              <span className={styles.statNum} style={{ color: '#dc2626' }}>{suspendidos.length}</span><span>Suspendidos</span>
            </div>
          )}
          {solicitudesPendientes.length > 0 && (
            <div className={styles.statChip}>
              <span className={styles.statNum} style={{ color: '#ca8a04' }}>{solicitudesPendientes.length}</span><span>Solicitudes</span>
            </div>
          )}
        </div>
      )}

      {/* ── Lista activos ── */}
      {!loading && activos.length > 0 && (
        <section className={styles.seccion}>
          <h2 className={styles.seccionTitulo}>Miembros activos</h2>
          <div className={styles.listaCards}>
            {activos.map(m => (
              <MiembroCard key={m.id} miembro={m} esPropietario={esPropietario}
                onEditarRol={() => setModalRol(m)}
                onCambiarPwd={() => setModalPwd(m)}
                onToggleActivo={handleToggleActivo}
                onEliminar={handleEliminar}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Lista suspendidos ── */}
      {!loading && suspendidos.length > 0 && (
        <section className={styles.seccion}>
          <h2 className={styles.seccionTitulo} style={{ color: 'var(--text-muted)' }}>Cuentas suspendidas</h2>
          <div className={styles.listaCards}>
            {suspendidos.map(m => (
              <MiembroCard key={m.id} miembro={m} esPropietario={esPropietario}
                onEditarRol={() => setModalRol(m)}
                onCambiarPwd={() => setModalPwd(m)}
                onToggleActivo={handleToggleActivo}
                onEliminar={handleEliminar}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Historial de solicitudes de reclutadores ── */}
      {!loading && solicitudes.length > 0 && (
        <section className={styles.seccion} style={{ marginTop: '2rem' }}>
          <h2 className={styles.seccionTitulo}>Solicitudes de reclutadores</h2>
          <div className={styles.tablaWrap}>
            <table className="tabla">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {solicitudes.map(s => <SolicitudRow key={s.id} sol={s} />)}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Estado vacío ── */}
      {!loading && equipo.length === 0 && solicitudes.length === 0 && (
        <div className={styles.emptyState}>
          <span>👥</span>
          <p>El equipo está vacío.</p>
          {esPropietario && (
            <button className={styles.btnPrimary} onClick={() => setModalSolicitar(true)}>
              + Solicitar primer reclutador
            </button>
          )}
        </div>
      )}

      {/* ── Modales ── */}
      {modalSolicitar && (
        <ModalSolicitarReclutador
          onClose={() => setModalSolicitar(false)}
          onEnviada={handleEnviada}
        />
      )}
      {modalRol && (
        <ModalEditarRol
          miembro={modalRol}
          onClose={() => setModalRol(null)}
          onGuardado={(nuevoRol) => { handleRolGuardado(modalRol.id, nuevoRol); setModalRol(null); }}
        />
      )}
      {modalPwd && (
        <ModalCambiarPassword
          miembro={modalPwd}
          onClose={() => setModalPwd(null)}
          onGuardado={handlePwdGuardada}
        />
      )}
    </div>
  );
}
