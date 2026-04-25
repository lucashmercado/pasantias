/**
 * MisPostulacionesPage.jsx — Lista de postulaciones del alumno/egresado.
 *
 * Muestra todas las postulaciones del usuario con:
 * - Estado actual (en_revision, preseleccionado, entrevista_programada,
 *   no_seleccionado, contratado)
 * - Fecha de última actualización
 * - Observaciones de la empresa (si existen)
 * - Estado del aval académico (si fue solicitado)
 * - Botón para solicitar aval a un profesor, con modal de selección
 *
 * Ruta: /mis-postulaciones
 * Roles: alumno, egresado
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { postulacionService, profesorService } from '../../services/api';
import styles from './MisPostulacionesPage.module.css';

// Configuración de estados con color, etiqueta e ícono
const ESTADOS = {
  en_revision:           { label: 'En revisión',          color: '#f59e0b', icon: '🔍', bg: '#fffbeb' },
  preseleccionado:       { label: 'Preseleccionado',      color: '#3b82f6', icon: '✅', bg: '#eff6ff' },
  entrevista_programada: { label: 'Entrevista programada',color: '#8b5cf6', icon: '🗓️', bg: '#f5f3ff' },
  no_seleccionado:       { label: 'No seleccionado',      color: '#ef4444', icon: '❌', bg: '#fef2f2' },
  contratado:            { label: '¡Contratado!',         color: '#10b981', icon: '🎉', bg: '#ecfdf5' },
};

const AVAL_BADGE = {
  pendiente:  { label: 'Aval pendiente',  color: '#e67e22', icon: '⏳' },
  aprobado:   { label: 'Aval aprobado',   color: '#27ae60', icon: '🎓' },
  rechazado:  { label: 'Aval rechazado',  color: '#c0392b', icon: '✕'  },
};

function formatFecha(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function formatFechaHora(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/* ── Modal para solicitar aval ───────────────────────────────────────────────── */
function SolicitarAvalModal({ postulacion, onClose, onSuccess }) {
  const [profesores,     setProfesores]     = useState([]);
  const [loadingProfs,   setLoadingProfs]   = useState(true);
  const [profesorId,     setProfesorId]     = useState('');
  const [mensaje,        setMensaje]        = useState('');
  const [enviando,       setEnviando]       = useState(false);
  const [error,          setError]          = useState('');

  useEffect(() => {
    profesorService.listarProfesores()
      .then(({ data }) => setProfesores(data.data ?? []))
      .catch(() => setError('No se pudo cargar la lista de profesores.'))
      .finally(() => setLoadingProfs(false));
  }, []);

  const handleEnviar = async (e) => {
    e.preventDefault();
    if (!profesorId) return;
    setEnviando(true);
    setError('');
    try {
      const res = await profesorService.solicitarAval({
        postulacionId: postulacion.id,
        profesorId: Number(profesorId),
        mensajeAlumno: mensaje.trim() || undefined,
      });
      onSuccess(res.data.message ?? 'Solicitud enviada.');
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al enviar la solicitud.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Cabecera */}
        <div className={styles.modalHeader}>
          <div>
            <h2>🎓 Solicitar Aval Académico</h2>
            <p className={styles.modalSubtitle}>
              Postulación a <strong>{postulacion.oferta?.titulo ?? '—'}</strong>
              {postulacion.oferta?.empresa?.razonSocial && (
                <span> · {postulacion.oferta.empresa.razonSocial}</span>
              )}
            </p>
          </div>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleEnviar} className={styles.modalBody}>
          {error && <p className="error-msg">{error}</p>}

          <div className="form-group">
            <label htmlFor="profesor-select">Elegí un profesor *</label>
            {loadingProfs ? (
              <p className="msg">Cargando profesores...</p>
            ) : profesores.length === 0 ? (
              <p className="error-msg">No hay profesores disponibles en el sistema.</p>
            ) : (
              <select
                id="profesor-select"
                value={profesorId}
                onChange={(e) => setProfesorId(e.target.value)}
                required
              >
                <option value="">— Seleccioná un profesor —</option>
                {profesores.map((p) => (
                  <option key={p.id} value={p.id}>
                    Prof. {p.apellido}, {p.nombre}
                    {p.ubicacion ? ` (${p.ubicacion})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="mensaje-aval">
              Mensaje para el profesor <span className={styles.opcional}>(opcional)</span>
            </label>
            <textarea
              id="mensaje-aval"
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={4}
              placeholder="Podés agregar contexto sobre tu desempeño académico, materias relevantes, logros, etc. El profesor verá este mensaje al revisar tu solicitud."
              maxLength={600}
            />
            <small className={styles.charCount}>{mensaje.length}/600</small>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={enviando || !profesorId || loadingProfs}
            >
              {enviando ? 'Enviando...' : '🎓 Enviar solicitud'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Componente principal ────────────────────────────────────────────────────── */
export default function MisPostulacionesPage() {
  const [postulaciones, setPostulaciones] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [filtroEstado, setFiltroEstado]   = useState('');
  const [modalPost, setModalPost]         = useState(null);  // postulacion para solicitar aval
  const [successMsg, setSuccessMsg]       = useState('');

  const cargar = useCallback(() => {
    setLoading(true);
    postulacionService.getMias()
      .then(({ data }) => setPostulaciones(data.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const filtradas = filtroEstado
    ? postulaciones.filter((p) => p.estado === filtroEstado)
    : postulaciones;

  // Conteo por estado para los tabs/filtros
  const conteos = postulaciones.reduce((acc, p) => {
    acc[p.estado] = (acc[p.estado] || 0) + 1;
    return acc;
  }, {});

  const handleAvalSuccess = (msg) => {
    setModalPost(null);
    setSuccessMsg(msg);
    cargar(); // Recarga para ver el nuevo estado del aval
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  if (loading) {
    return (
      <div className="page-container">
        <h1>Mis Postulaciones</h1>
        <div className={styles.loadingList}>
          {[1,2,3].map(i => <div key={i} className={styles.skeletonCard} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="dashboard-header">
        <h1>Mis Postulaciones</h1>
        <Link to="/ofertas" className="btn-primary">
          🔍 Ver más ofertas
        </Link>
      </div>

      {/* Mensaje de éxito */}
      {successMsg && (
        <div className={styles.successBanner}>
          ✅ {successMsg}
        </div>
      )}

      {postulaciones.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>📋</span>
          <h3>Todavía no te postulaste a ninguna oferta</h3>
          <p>Explorá las ofertas disponibles y postulate a las que se ajusten a tu perfil.</p>
          <Link to="/ofertas" className="btn-primary">Ver ofertas disponibles</Link>
        </div>
      ) : (
        <>
          {/* ── Resumen visual ───────────────────────────────────────────── */}
          <div className={styles.resumenGrid}>
            {Object.entries(ESTADOS).map(([key, cfg]) => (
              <button
                key={key}
                className={`${styles.resumenCard} ${filtroEstado === key ? styles.resumenCardActive : ''}`}
                style={filtroEstado === key ? { borderColor: cfg.color, background: cfg.bg } : {}}
                onClick={() => setFiltroEstado(filtroEstado === key ? '' : key)}
              >
                <span className={styles.resumenIcon}>{cfg.icon}</span>
                <span className={styles.resumenCount} style={filtroEstado === key ? { color: cfg.color } : {}}>
                  {conteos[key] ?? 0}
                </span>
                <span className={styles.resumenLabel}>{cfg.label}</span>
              </button>
            ))}
          </div>

          {/* Indicador de filtro activo */}
          {filtroEstado && (
            <div className={styles.filtroActivo}>
              Mostrando: <strong>{ESTADOS[filtroEstado]?.label}</strong>
              <button className={styles.limpiarFiltro} onClick={() => setFiltroEstado('')}>
                ✕ Limpiar filtro
              </button>
            </div>
          )}

          {/* ── Lista de postulaciones ───────────────────────────────────── */}
          <div className={styles.postulacionesList}>
            {filtradas.length === 0 ? (
              <p className={styles.sinResultados}>No hay postulaciones con ese estado.</p>
            ) : (
              filtradas.map((p) => {
                const estado = ESTADOS[p.estado] ?? {
                  label: p.estado, color: '#6b7280', icon: '❓', bg: '#f9fafb',
                };

                // Avales asociados a esta postulación
                const avales  = p.avales ?? [];
                const tieneAval = avales.length > 0;
                const avalAprobado  = avales.find((a) => a.estado === 'aprobado');
                const avalPendiente = avales.find((a) => a.estado === 'pendiente');
                const avalRechazado = avales.find((a) => a.estado === 'rechazado');
                // Badge a mostrar: aprobado > pendiente > rechazado
                const avalMostrar = avalAprobado ?? avalPendiente ?? avalRechazado ?? null;

                return (
                  <div
                    key={p.id}
                    className={styles.postulacionCard}
                    style={{ borderLeftColor: estado.color }}
                  >
                    {/* Cabecera: oferta + empresa + estado */}
                    <div className={styles.cardHeader}>
                      <div>
                        <h3 className={styles.ofertaTitulo}>
                          {p.oferta?.titulo ?? 'Oferta eliminada'}
                        </h3>
                        <p className={styles.empresaNombre}>
                          {p.oferta?.empresa?.razonSocial ?? '—'}
                        </p>
                      </div>
                      <span
                        className={styles.estadoBadge}
                        style={{ background: estado.bg, color: estado.color, border: `1px solid ${estado.color}` }}
                      >
                        {estado.icon} {estado.label}
                      </span>
                    </div>

                    {/* Fechas y detalles */}
                    <div className={styles.cardMeta}>
                      <span>📅 Postulado el {formatFecha(p.fechaPostulacion ?? p.createdAt)}</span>
                      {p.ultimaActualizacion && (
                        <span>🔄 Actualizado: {formatFechaHora(p.ultimaActualizacion)}</span>
                      )}
                      {p.oferta?.ciudad    && <span>📍 {p.oferta.ciudad}</span>}
                      {p.oferta?.modalidad && <span>💼 {p.oferta.modalidad}</span>}
                    </div>

                    {/* Observaciones de la empresa */}
                    {p.observacionesEmpresa && (
                      <div className={styles.observaciones}>
                        <span className={styles.observacionesLabel}>💬 Comentario de la empresa:</span>
                        <p className={styles.observacionesTexto}>{p.observacionesEmpresa}</p>
                      </div>
                    )}

                    {/* ── Sección de Avales ─────────────────────────────── */}
                    <div className={styles.avalSection}>
                      <div className={styles.avalSectionHeader}>
                        <span className={styles.avalSectionTitle}>🎓 Aval Académico</span>
                        {avalMostrar && (
                          <span
                            className={styles.avalBadge}
                            style={{ '--aval-color': AVAL_BADGE[avalMostrar.estado]?.color ?? '#7f8c8d' }}
                          >
                            {AVAL_BADGE[avalMostrar.estado]?.icon} {AVAL_BADGE[avalMostrar.estado]?.label}
                          </span>
                        )}
                      </div>

                      {/* Detalles del aval existente */}
                      {avales.length > 0 ? (
                        <div className={styles.avalesList}>
                          {avales.map((aval) => {
                            const def = AVAL_BADGE[aval.estado] ?? { label: aval.estado, icon: '•', color: '#7f8c8d' };
                            return (
                              <div key={aval.id} className={styles.avalItem}>
                                <div className={styles.avalItemHeader}>
                                  <span style={{ color: def.color, fontWeight: 700, fontSize: '0.82rem' }}>
                                    {def.icon} {def.label}
                                  </span>
                                  {aval.profesor && (
                                    <span className={styles.avalProfesor}>
                                      Prof. {aval.profesor?.nombre ?? '—'} {aval.profesor?.apellido ?? ''}
                                    </span>
                                  )}
                                </div>
                                {aval.comentario && (
                                  <p className={styles.avalComentario}>"{aval.comentario}"</p>
                                )}
                                {aval.estado === 'pendiente' && (
                                  <small className={styles.avalPendienteNote}>
                                    El profesor aún no revisó tu solicitud.
                                  </small>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className={styles.avalSinSolicitud}>
                          No solicitaste un aval para esta postulación.
                        </p>
                      )}

                      {/* Botón solicitar (siempre disponible mientras no haya uno aprobado) */}
                      {!avalAprobado && (
                        <button
                          className={styles.btnSolicitarAval}
                          onClick={() => setModalPost(p)}
                        >
                          {tieneAval ? '+ Solicitar a otro profesor' : '+ Solicitar Aval'}
                        </button>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className={styles.cardActions}>
                      {p.oferta?.id && (
                        <Link to={`/ofertas/${p.oferta.id}`} className="btn-small">
                          Ver oferta
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Modal de solicitar aval */}
      {modalPost && (
        <SolicitarAvalModal
          postulacion={modalPost}
          onClose={() => setModalPost(null)}
          onSuccess={handleAvalSuccess}
        />
      )}
    </div>
  );
}
