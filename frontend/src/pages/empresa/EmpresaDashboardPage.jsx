/**
 * EmpresaDashboardPage.jsx — Panel principal de la empresa.
 *
 * Consume:
 *  GET /api/empresas/dashboard   — métricas (ofertas, postulaciones, equipo)
 *  GET /api/empresas/mis-ofertas — lista completa de ofertas PROPIAS con postulaciones
 *
 * Ruta: /empresa
 * Rol: empresa
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { empresaService, ofertaService } from '../../services/api';
import styles from './EmpresaDashboardPage.module.css';

/* Configuración de tarjetas de métricas */
const METRIC_CARDS = [
  { key: 'ofertasActivas',  label: 'Ofertas Activas',   icon: '📢', color: 'var(--success)' },
  { key: 'ofertasCerradas', label: 'Ofertas Cerradas',  icon: '🔒', color: 'var(--text-muted)' },
  { key: 'postulaciones',   label: 'Postulaciones',     icon: '📋', color: 'var(--primary)' },
  { key: 'entrevistas',     label: 'Entrevistas',       icon: '🗓️', color: '#8e44ad' },
  { key: 'contrataciones',  label: 'Contrataciones',    icon: '🤝', color: '#16a085' },
  { key: 'miembrosEquipo',  label: 'Equipo Reclutador', icon: '👥', color: 'var(--secondary)' },
];

/* Colores de badge por estado de oferta */
const ESTADO_COLOR = {
  activa:   '#27ae60',
  pausada:  '#e67e22',
  cerrada:  '#7f8c8d',
  pendiente:'#3498db',
};

export default function EmpresaDashboardPage() {
  const [metricas,     setMetricas]     = useState(null);
  const [ofertas,      setOfertas]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [guardando,    setGuardando]    = useState(null); // id oferta en proceso de cambio

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Carga en paralelo: métricas del dashboard + lista de ofertas propias
      const [dashRes, ofertasRes] = await Promise.all([
        empresaService.getDashboard(),
        empresaService.getMisOfertas(),
      ]);

      // Normaliza el objeto de métricas desde la respuesta anidada del backend
      const raw = dashRes.data?.data ?? dashRes.data ?? {};
      setMetricas({
        ofertasActivas:  raw.ofertas?.activas              ?? 0,
        ofertasCerradas: raw.ofertas?.cerradas             ?? 0,
        postulaciones:   raw.postulaciones?.total          ?? 0,
        entrevistas:     raw.postulaciones?.entrevistas    ?? 0,
        contrataciones:  raw.postulaciones?.contrataciones ?? 0,
        miembrosEquipo:  raw.equipo?.totalMiembros         ?? 0,
      });

      setOfertas(ofertasRes.data?.data ?? []);
    } catch (err) {
      const msg = err.response?.data?.message ?? 'No se pudo cargar el panel.';
      setError(msg);
      console.error('Dashboard error:', err.response?.data ?? err.message);

      // Fallback: al menos intentar traer las ofertas
      try {
        const ofertasRes = await empresaService.getMisOfertas();
        setOfertas(ofertasRes.data?.data ?? []);
      } catch (_) {}
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  /* Cambia estado de una oferta (pausar / activar / cerrar) */
  const handleCambiarEstado = async (id, estado) => {
    setGuardando(id);
    try {
      await ofertaService.update(id, { estado });
      setOfertas((prev) => prev.map((o) => (o.id === id ? { ...o, estado } : o)));
      // Actualiza la métrica de activas/cerradas sin recargar todo
      if (metricas) {
        setMetricas((m) => ({
          ...m,
          ofertasActivas:  estado === 'activa'  ? m.ofertasActivas + 1 : Math.max(0, m.ofertasActivas - 1),
          ofertasCerradas: estado === 'cerrada' ? m.ofertasCerradas + 1 : m.ofertasCerradas,
        }));
      }
    } catch {
      alert('Error al cambiar el estado de la oferta. Intentá de nuevo.');
    } finally {
      setGuardando(null);
    }
  };

  return (
    <div className="page-container">

      {/* ── Cabecera ─────────────────────────────────────────────────────── */}
      <div className="dashboard-header">
        <h1>Panel de Empresa</h1>
        <div className={styles.headerActions}>
          <Link to="/empresa/equipo"      className="btn-secondary">👥 Mi Equipo</Link>
          <Link to="/empresa/nueva-oferta" className="btn-primary">+ Nueva Oferta</Link>
        </div>
      </div>

      {/* Error global */}
      {error && <p className="error-msg" style={{ marginBottom: '1.5rem' }}>⚠️ {error}</p>}

      {/* ── Tarjetas de métricas ──────────────────────────────────────────── */}
      {loading ? (
        <div className={styles.skeletonGrid}>
          {METRIC_CARDS.map((c) => <div key={c.key} className={styles.skeletonCard} />)}
        </div>
      ) : (
        <div className={styles.metricsGrid}>
          {METRIC_CARDS.map(({ key, label, icon, color }) => (
            <div key={key} className={styles.metricCard} style={{ '--card-color': color }}>
              <span className={styles.metricIcon}>{icon}</span>
              <span className={styles.metricValue}>{metricas?.[key] ?? '—'}</span>
              <span className={styles.metricLabel}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Tabla de ofertas propias ──────────────────────────────────────── */}
      <div className="dashboard-header" style={{ marginTop: '2rem' }}>
        <h2 style={{ margin: 0 }}>Mis Ofertas</h2>
        <span className={styles.totalBadge}>{ofertas.length} publicada{ofertas.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <p className="msg">Cargando ofertas...</p>
      ) : ofertas.length === 0 ? (
        <div className={styles.emptyState}>
          <span>📭</span>
          <p>Todavía no publicaste ninguna oferta.</p>
          <Link to="/empresa/nueva-oferta" className="btn-primary">Publicar primera oferta</Link>
        </div>
      ) : (
        <div className={styles.ofertasTablaWrap}>
          <table className="tabla">
            <thead>
              <tr>
                <th>Título</th>
                <th>Área / Modalidad</th>
                <th>Ciudad</th>
                <th>Estado</th>
                <th>Vacantes</th>
                <th>Postulados</th>
                <th>Candidatos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ofertas.map((o) => (
                <tr key={o.id} className={guardando === o.id ? styles.rowGuardando : ''}>
                  <td>
                    <strong>{o.titulo}</strong>
                    {!o.moderada && (
                      <span className={styles.pendienteMod} title="Pendiente de moderación por el admin">
                        · ⏳ Pendiente
                      </span>
                    )}
                  </td>
                  <td>
                    <div>{o.area ?? '—'}</div>
                    {o.modalidad && <small className={styles.modalidadSmall}>{o.modalidad}</small>}
                  </td>
                  <td>{o.ciudad || '—'}</td>
                  <td>
                    <span
                      className="badge"
                      style={{ background: ESTADO_COLOR[o.estado] ?? '#7f8c8d' }}
                    >
                      {o.estado}
                    </span>
                  </td>
                  <td className={styles.centrado}>{o.cantidadVacantes ?? '—'}</td>
                  <td className={styles.centrado}>
                    <strong style={{ color: o.totalPostulaciones > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
                      {o.totalPostulaciones ?? 0}
                    </strong>
                  </td>
                  <td>
                    <Link to={`/empresa/postulantes/${o.id}`} className="btn-small">
                      Ver candidatos
                    </Link>
                  </td>
                  <td className={styles.accionesTd}>
                    {guardando === o.id ? (
                      <span className={styles.guardandoSpan}>Guardando...</span>
                    ) : (
                      <>
                        {o.estado === 'activa' && (
                          <>
                            <button
                              className="btn-warn"
                              onClick={() => handleCambiarEstado(o.id, 'pausada')}
                            >
                              Pausar
                            </button>
                            <button
                              className="btn-danger"
                              onClick={() => handleCambiarEstado(o.id, 'cerrada')}
                            >
                              Cerrar
                            </button>
                          </>
                        )}
                        {o.estado === 'pausada' && (
                          <button
                            className="btn-ok"
                            onClick={() => handleCambiarEstado(o.id, 'activa')}
                          >
                            Activar
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
