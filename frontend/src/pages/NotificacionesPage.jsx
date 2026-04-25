/**
 * NotificacionesPage.jsx — Centro de notificaciones del usuario.
 *
 * Ruta: /notificaciones (accesible para todos los roles autenticados)
 *
 * Funcionalidades:
 * - Lista todas las notificaciones (no leídas primero, ordenadas por fecha)
 * - Filtro por tipo (todas / no leídas / leídas)
 * - Marcar una notificación como leída (clic en card)
 * - Marcar todas como leídas
 * - Eliminar notificaciones individualmente
 * - Navegar a la acción asociada (accionURL o enlace)
 * - Indicadores visuales de prioridad y tipo
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificacionService } from '../services/api';
import styles from './NotificacionesPage.module.css';

/* ── Configuración visual por tipo ─────────────────────────────────────────── */
const TIPO_CONFIG = {
  postulacion: { icon: '📋', label: 'Postulación',  color: '#3498db' },
  estado:      { icon: '🔄', label: 'Estado',       color: '#8e44ad' },
  oferta:      { icon: '📢', label: 'Oferta',       color: '#27ae60' },
  aval:        { icon: '🎓', label: 'Aval',         color: '#e67e22' },
  chat:        { icon: '💬', label: 'Mensaje',      color: '#16a085' },
  sistema:     { icon: '⚙️', label: 'Sistema',      color: '#7f8c8d' },
};

const VISUAL_CONFIG = {
  info:    { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
  success: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
  warning: { bg: '#fffbeb', border: '#fed7aa', text: '#92400e' },
  error:   { bg: '#fef2f2', border: '#fecaca', text: '#991b1b' },
};

const FILTROS = ['todas', 'no-leidas', 'leidas'];

/* ── Formatea fecha relativa ────────────────────────────────────────────────── */
function formatearFecha(fecha) {
  const d = new Date(fecha);
  const ahora = new Date();
  const diffMs = ahora - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH   = Math.floor(diffMs / 3600000);
  const diffD   = Math.floor(diffMs / 86400000);

  if (diffMin < 1)  return 'Ahora mismo';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffH   < 24) return `Hace ${diffH}h`;
  if (diffD   < 7)  return `Hace ${diffD} día${diffD !== 1 ? 's' : ''}`;
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ── Card individual ────────────────────────────────────────────────────────── */
function NotifCard({ notif, onLeer, onEliminar }) {
  const navigate = useNavigate();
  const tipo     = TIPO_CONFIG[notif.tipo]   ?? TIPO_CONFIG.sistema;
  const visual   = VISUAL_CONFIG[notif.tipoVisual] ?? VISUAL_CONFIG.info;

  const handleClick = async () => {
    if (!notif.leida) await onLeer(notif.id);
    const url = notif.accionURL || notif.enlace;
    if (url) navigate(url);
  };

  return (
    <div
      className={`${styles.notifCard} ${!notif.leida ? styles.noLeida : ''}`}
      style={!notif.leida ? { background: visual.bg, borderLeftColor: visual.border } : {}}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      {/* Ícono del tipo */}
      <div className={styles.notifIcon} style={{ background: `${tipo.color}18`, color: tipo.color }}>
        {tipo.icon}
      </div>

      {/* Contenido */}
      <div className={styles.notifContent}>
        <div className={styles.notifTopRow}>
          <span className={styles.notifTipo} style={{ color: tipo.color }}>
            {tipo.label}
          </span>
          {notif.prioridad === 'alta' || notif.prioridad === 'urgente' ? (
            <span className={styles.notifUrgente}>🔴 Urgente</span>
          ) : null}
          <span className={styles.notifFecha}>{formatearFecha(notif.createdAt)}</span>
        </div>

        <strong className={styles.notifTitulo}>{notif.titulo}</strong>
        <p className={styles.notifMensaje}>{notif.mensaje}</p>

        {(notif.accionURL || notif.enlace) && (
          <span className={styles.notifAccion}>Ver más →</span>
        )}
      </div>

      {/* Acciones */}
      <div className={styles.notifAcciones} onClick={(e) => e.stopPropagation()}>
        {!notif.leida && (
          <button
            className={styles.btnLeer}
            title="Marcar como leída"
            onClick={() => onLeer(notif.id)}
          >
            ✓
          </button>
        )}
        <button
          className={styles.btnEliminar}
          title="Eliminar notificación"
          onClick={() => onEliminar(notif.id)}
        >
          ✕
        </button>
      </div>

      {/* Punto indicador de no leída */}
      {!notif.leida && <span className={styles.puntoBadge} />}
    </div>
  );
}

/* ── Página principal ───────────────────────────────────────────────────────── */
export default function NotificacionesPage() {
  const [notifs,   setNotifs]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filtro,   setFiltro]   = useState('todas');
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');

  /* Carga */
  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await notificacionService.getAll();
      setNotifs(data.data ?? []);
    } catch {
      setError('No se pudieron cargar las notificaciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  /* Marcar como leída (optimista) */
  const handleLeer = async (id) => {
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, leida: true } : n));
    try {
      await notificacionService.leer(id);
    } catch {
      // Revertir si falla
      setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, leida: false } : n));
    }
  };

  /* Marcar todas como leídas */
  const handleLeerTodas = async () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, leida: true })));
    try {
      await notificacionService.leerTodas();
      setSuccess('Todas marcadas como leídas.');
      setTimeout(() => setSuccess(''), 2500);
    } catch {
      cargar(); // Recargar si falla
    }
  };

  /* Eliminar (optimista) */
  const handleEliminar = async (id) => {
    setNotifs((prev) => prev.filter((n) => n.id !== id));
    try {
      await notificacionService.eliminar(id);
    } catch {
      cargar(); // Recargar si falla
    }
  };

  /* Filtrado */
  const noLeidasCount = notifs.filter((n) => !n.leida).length;

  const notifsFiltradas = notifs.filter((n) => {
    if (filtro === 'no-leidas') return !n.leida;
    if (filtro === 'leidas')    return n.leida;
    return true;
  });

  return (
    <div className="page-container">

      {/* ── Cabecera ────────────────────────────────────────────────────── */}
      <div className="dashboard-header">
        <div>
          <h1>Notificaciones</h1>
          <p className={styles.headerSub}>
            {noLeidasCount > 0
              ? `Tenés ${noLeidasCount} notificación${noLeidasCount !== 1 ? 'es' : ''} sin leer`
              : 'Todas las notificaciones al día ✓'}
          </p>
        </div>
        {noLeidasCount > 0 && (
          <button className="btn-secondary" onClick={handleLeerTodas}>
            ✓ Marcar todas como leídas
          </button>
        )}
      </div>

      {/* Mensajes */}
      {error   && <p className="error-msg" style={{ marginBottom: '1rem' }}>⚠️ {error}</p>}
      {success && <div className={styles.successBanner}>✅ {success}</div>}

      {/* ── Filtro tabs ─────────────────────────────────────────────────── */}
      <div className={styles.filtroTabs}>
        {FILTROS.map((f) => {
          const count = f === 'todas'     ? notifs.length
                      : f === 'no-leidas' ? notifs.filter((n) => !n.leida).length
                      : notifs.filter((n) => n.leida).length;
          const label = f === 'todas' ? 'Todas' : f === 'no-leidas' ? 'Sin leer' : 'Leídas';
          return (
            <button
              key={f}
              className={`${styles.filtroTab} ${filtro === f ? styles.filtroActivo : ''}`}
              onClick={() => setFiltro(f)}
            >
              {label}
              <span className={styles.filtroCount}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Lista ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className={styles.skeletonList}>
          {[1, 2, 3, 4].map((i) => <div key={i} className={styles.skeletonItem} />)}
        </div>
      ) : notifsFiltradas.length === 0 ? (
        <div className={styles.emptyState}>
          <span>{filtro === 'no-leidas' ? '✅' : '🔔'}</span>
          <p>
            {filtro === 'no-leidas'
              ? '¡Sin notificaciones pendientes! Estás al día.'
              : filtro === 'leidas'
              ? 'No hay notificaciones leídas todavía.'
              : 'Todavía no tenés ninguna notificación.'}
          </p>
        </div>
      ) : (
        <div className={styles.notifList}>
          {notifsFiltradas.map((n) => (
            <NotifCard
              key={n.id}
              notif={n}
              onLeer={handleLeer}
              onEliminar={handleEliminar}
            />
          ))}
        </div>
      )}
    </div>
  );
}
