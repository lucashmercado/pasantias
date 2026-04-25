/**
 * ProfesorAvalesPage.jsx — Gestión de avales académicos del profesor.
 *
 * Ruta: /profesor/avales
 *
 * Permite al profesor:
 * - Ver todos los avales que recibió de alumnos (solicitudes pendientes)
 * - Aprobar un aval con comentario opcional
 * - Rechazar un aval con motivo obligatorio
 * - Editar un aval ya emitido (cambiar estado o comentario)
 * - Filtrar por estado (pendiente / aprobado / rechazado)
 *
 * Endpoints:
 *  GET   /api/profesor/avales
 *  PATCH /api/profesor/avales/:id  { estado?, comentario? }
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { profesorService } from '../../services/api';
import styles from './ProfesorAvalesPage.module.css';

const ESTADO_FILTROS = ['todos', 'pendiente', 'aprobado', 'rechazado'];

const ESTADO_BADGE = {
  pendiente:  { color: '#e67e22', label: 'Pendiente', bg: '#fef9ec' },
  aprobado:   { color: '#27ae60', label: 'Aprobado',  bg: '#eafaf1' },
  rechazado:  { color: '#c0392b', label: 'Rechazado', bg: '#fdf2f2' },
};

/* ── Modal de Editar / Aprobar / Rechazar ─────────────────────────────────── */
function EditarAvalModal({ aval, onConfirm, onCancel }) {
  const alumno = aval.postulacion?.usuario;
  const oferta = aval.postulacion?.oferta;

  const [estado,     setEstado]     = useState(aval.estado);
  const [comentario, setComentario] = useState(aval.comentario ?? '');
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Si rechaza, el comentario es obligatorio
    if (estado === 'rechazado' && !comentario.trim()) {
      setError('El motivo es obligatorio al rechazar.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onConfirm(aval.id, estado, comentario.trim() || undefined);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al guardar el aval.');
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Cabecera */}
        <div className={styles.modalHeader}>
          <div>
            <h3>Editar Aval</h3>
            <p className={styles.modalSubtitle}>
              <strong>{alumno?.nombre} {alumno?.apellido}</strong>
              {oferta?.titulo && <> · {oferta.titulo}</>}
            </p>
          </div>
          <button className={styles.modalCloseBtn} onClick={onCancel}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalBody}>
          {error && <p className="error-msg">{error}</p>}

          {/* Mensaje del alumno (solo lectura) */}
          {aval.mensajeAlumno && (
            <div className={styles.mensajeAlumnoBox}>
              <span className={styles.mensajeAlumnoLabel}>💬 Mensaje del alumno:</span>
              <p>"{aval.mensajeAlumno}"</p>
            </div>
          )}

          {/* Estado */}
          <div className="form-group">
            <label>Decisión *</label>
            <div className={styles.estadoRadios}>
              {['pendiente', 'aprobado', 'rechazado'].map((op) => (
                <label
                  key={op}
                  className={`${styles.radioLabel} ${estado === op ? styles.radioActive : ''}`}
                  style={estado === op ? { borderColor: ESTADO_BADGE[op].color, background: ESTADO_BADGE[op].bg } : {}}
                >
                  <input
                    type="radio"
                    name="estado"
                    value={op}
                    checked={estado === op}
                    onChange={() => setEstado(op)}
                  />
                  <span style={estado === op ? { color: ESTADO_BADGE[op].color } : {}}>
                    {ESTADO_BADGE[op].label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Comentario */}
          <div className="form-group">
            <label>
              {estado === 'rechazado' ? 'Motivo del rechazo *' : 'Comentario para el alumno'}
              {estado !== 'rechazado' && (
                <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.82rem' }}> (opcional)</span>
              )}
            </label>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={4}
              required={estado === 'rechazado'}
              placeholder={
                estado === 'rechazado'
                  ? 'Explicá el motivo para que el alumno pueda entender la decisión...'
                  : 'Podés agregar observaciones, fortalezas del alumno, contexto académico, etc.'
              }
            />
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancelar
            </button>
            <button
              type="submit"
              className={estado === 'rechazado' ? 'btn-danger' : 'btn-primary'}
              disabled={saving}
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Card individual de aval ──────────────────────────────────────────────── */
function AvalCard({ aval, onEditar }) {
  const alumno = aval.postulacion?.usuario;
  const oferta = aval.postulacion?.oferta;

  const estado    = aval.estado ?? 'pendiente';
  const badge     = ESTADO_BADGE[estado] ?? { color: '#7f8c8d', label: estado, bg: '#f4f6f8' };
  const esPendiente = estado === 'pendiente';

  return (
    <div
      className={styles.avalCard}
      style={{ borderLeftColor: badge.color }}
    >
      {/* ── Cabecera: alumno + badge ─────────────────────────────────── */}
      <div className={styles.avalHeader}>
        <div className={styles.avalAlumno}>
          <div className={styles.avalAvatar} style={{ background: `linear-gradient(135deg, ${badge.color}, ${badge.color}99)` }}>
            {(alumno?.nombre?.[0] ?? '?').toUpperCase()}
          </div>
          <div>
            <strong>{alumno?.nombre ?? '—'} {alumno?.apellido ?? ''}</strong>
            <span>{alumno?.email ?? ''}</span>
          </div>
        </div>
        <span
          className={styles.estadoBadge}
          style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.color}40` }}
        >
          {badge.label}
        </span>
      </div>

      {/* ── Oferta ──────────────────────────────────────────────────── */}
      <div className={styles.avalOferta}>
        <span>📋</span>
        <div>
          <strong>{oferta?.titulo ?? 'Oferta no disponible'}</strong>
          {oferta?.empresa?.razonSocial && <span>{oferta.empresa.razonSocial}</span>}
          {oferta?.area && <small>{oferta.area}{oferta.ciudad ? ` · ${oferta.ciudad}` : ''}</small>}
        </div>
      </div>

      {/* ── Mensaje del alumno ──────────────────────────────────────── */}
      {aval.mensajeAlumno && (
        <div className={styles.avalMensajeAlumno}>
          <span>💬 El alumno escribió:</span>
          <p>"{aval.mensajeAlumno}"</p>
        </div>
      )}

      {/* ── Comentario/motivo del profesor (si ya hay decisión) ─────── */}
      {aval.comentario && (
        <div className={styles.avalComentarioExistente}>
          <span>{estado === 'rechazado' ? '❌ Tu motivo:' : '✅ Tu comentario:'}</span>
          <p>{aval.comentario}</p>
        </div>
      )}

      {/* ── Pie: fecha + acciones ────────────────────────────────────── */}
      <div className={styles.avalFooter}>
        <span className={styles.avalFecha}>
          {esPendiente ? '⏳ Solicitado' : '📅 Revisado'}{' '}
          {new Date(esPendiente ? aval.createdAt : (aval.fechaRevision ?? aval.updatedAt)).toLocaleDateString('es-AR')}
        </span>

        <button
          className={`btn-small ${esPendiente ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => onEditar(aval)}
        >
          {esPendiente ? '✍️ Responder' : '✏️ Editar'}
        </button>
      </div>
    </div>
  );
}

/* ── Componente principal ─────────────────────────────────────────────────── */
export default function ProfesorAvalesPage() {
  const [avales,       setAvales]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState('');
  const [filtro,       setFiltro]       = useState('pendiente');
  const [avalEditar,   setAvalEditar]   = useState(null);

  /* ── Carga ──────────────────────────────────────────────────────────── */
  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await profesorService.getAvales();
      setAvales(data.data ?? data ?? []);
    } catch {
      setError('No se pudo cargar la lista de avales.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  /* ── Guardar aval (crear decisión o editar) ─────────────────────────── */
  const handleGuardar = async (id, estado, comentario) => {
    await profesorService.updateAval(id, estado, comentario);
    // Actualiza optimistamente sin recargar
    setAvales((prev) => prev.map((a) =>
      a.id === id
        ? { ...a, estado, comentario: comentario ?? a.comentario, fechaRevision: estado !== 'pendiente' ? new Date().toISOString() : null }
        : a
    ));
    setAvalEditar(null);
    setSuccess('Aval guardado correctamente.');
    setTimeout(() => setSuccess(''), 3500);
  };

  /* ── Filtrado ───────────────────────────────────────────────────────── */
  const avalesFiltrados = filtro === 'todos'
    ? avales
    : avales.filter((a) => (a.estado ?? 'pendiente') === filtro);

  const conteos = {
    todos:     avales.length,
    pendiente: avales.filter((a) => (a.estado ?? 'pendiente') === 'pendiente').length,
    aprobado:  avales.filter((a) => a.estado === 'aprobado').length,
    rechazado: avales.filter((a) => a.estado === 'rechazado').length,
  };

  const pendientes = conteos.pendiente;

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="page-container">
      {/* ── Cabecera ───────────────────────────────────────────────────── */}
      <div className="dashboard-header">
        <div>
          <Link to="/profesor" className="btn-back">← Volver al panel</Link>
          <h1>Gestión de Avales</h1>
          <p className={styles.headerSubtitle}>
            Los alumnos te solicitan avales desde su panel de postulaciones.
          </p>
        </div>
        {pendientes > 0 && (
          <span className="badge" style={{ background: '#e67e22', fontSize: '0.9rem', alignSelf: 'flex-start', marginTop: '0.5rem' }}>
            {pendientes} pendiente{pendientes !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Mensajes */}
      {error   && <p className="error-msg" style={{ marginBottom: '1.5rem' }}>{error}</p>}
      {success && <div className={styles.successBanner}>✅ {success}</div>}

      {/* ── Filtros / tabs ─────────────────────────────────────────────── */}
      <div className={styles.filtroTabs}>
        {ESTADO_FILTROS.map((f) => (
          <button
            key={f}
            id={`tab-avales-${f}`}
            className={`${styles.filtroTab} ${filtro === f ? styles.filtroActivo : ''}`}
            onClick={() => setFiltro(f)}
          >
            {f === 'todos' ? 'Todos' : ESTADO_BADGE[f]?.label ?? f}
            <span className={styles.filtroCount}>{conteos[f] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* ── Lista de avales ────────────────────────────────────────────── */}
      {loading ? (
        <div className={styles.skeletonList}>
          {[1, 2, 3].map((i) => <div key={i} className={styles.skeletonCard} />)}
        </div>
      ) : avalesFiltrados.length === 0 ? (
        <div className={styles.emptyState}>
          <span>{filtro === 'pendiente' ? '✅' : '📭'}</span>
          <p>
            {filtro === 'pendiente'
              ? '¡Estás al día! No tenés avales pendientes de revisión.'
              : avales.length === 0
                ? 'Todavía no recibiste solicitudes de aval. Los alumnos te buscarán desde su panel de postulaciones.'
                : `No hay avales con estado "${ESTADO_BADGE[filtro]?.label ?? filtro}".`}
          </p>
          {avales.length === 0 && filtro === 'pendiente' && (
            <small className={styles.emptyHint}>
              Cuando un alumno solicite tu aval, recibirás una notificación y aparecerá aquí.
            </small>
          )}
        </div>
      ) : (
        <div className={styles.avalesList}>
          {avalesFiltrados.map((aval) => (
            <AvalCard
              key={aval.id}
              aval={aval}
              onEditar={(a) => setAvalEditar(a)}
            />
          ))}
        </div>
      )}

      {/* ── Modal Editar / Responder ───────────────────────────────────── */}
      {avalEditar && (
        <EditarAvalModal
          aval={avalEditar}
          onConfirm={handleGuardar}
          onCancel={() => setAvalEditar(null)}
        />
      )}
    </div>
  );
}
