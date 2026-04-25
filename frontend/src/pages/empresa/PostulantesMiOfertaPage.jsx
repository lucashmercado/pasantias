/**
 * PostulantesMiOfertaPage.jsx — Vista de candidatos de una oferta específica.
 *
 * Muestra para cada postulante:
 * - Nombre, email y datos de perfil
 * - Barra de compatibilidad con la oferta (compatibilidadOferta %)
 * - Botón para descargar el CV
 * - Historial académico (carrera, institución, año de egreso)
 * - Disponibilidad horaria/inicio
 * - Carta de presentación (desplegable)
 * - Selector de estado (PATCH /api/postulaciones/:id/estado)
 *
 * Estados soportados: en_revision, preseleccionado, entrevista, contratado, rechazado
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { postulacionService } from '../../services/api';
import styles from './PostulantesMiOfertaPage.module.css';

/* Estados válidos del nuevo backend corporativo */
const ESTADOS = [
  { value: 'en_revision',    label: 'En revisión' },
  { value: 'preseleccionado', label: 'Preseleccionado' },
  { value: 'entrevista',     label: 'Entrevista' },
  { value: 'contratado',     label: 'Contratado' },
  { value: 'rechazado',      label: 'Rechazado' },
];

/* Colores de badge según estado */
const ESTADO_COLOR = {
  en_revision:    '#7f8c8d',
  preseleccionado: '#2980b9',
  entrevista:     '#8e44ad',
  contratado:     '#27ae60',
  rechazado:      '#c0392b',
};

/** Barra de compatibilidad visual */
function CompatibilidadBar({ valor }) {
  const pct  = Math.min(Math.max(Number(valor) || 0, 0), 100);
  const color = pct >= 75 ? '#27ae60' : pct >= 50 ? '#e67e22' : '#c0392b';
  return (
    <div className={styles.compatWrap}>
      <span className={styles.compatLabel}>Compatibilidad</span>
      <div className={styles.compatBar}>
        <div
          className={styles.compatFill}
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className={styles.compatPct} style={{ color }}>{pct}%</span>
    </div>
  );
}

/** Badge de aval académico visible para la empresa */
function AvalBadge({ avales = [] }) {
  if (!avales || avales.length === 0) {
    return (
      <div className={styles.avalBadge} style={{ '--aval-bg': '#f4f6f8', '--aval-color': '#95a5a6', '--aval-border': '#dde1e4' }}>
        <span>🎓</span>
        <span>Sin aval académico</span>
      </div>
    );
  }

  // Prioridad: aprobado > pendiente > rechazado
  const aprobado  = avales.find((a) => a.estado === 'aprobado');
  const pendiente = avales.find((a) => a.estado === 'pendiente');

  if (aprobado) {
    return (
      <div className={styles.avalBadge} style={{ '--aval-bg': '#eafaf1', '--aval-color': '#1e8449', '--aval-border': '#a9dfbf' }}>
        <span>🎓</span>
        <div>
          <strong>Aval académico aprobado</strong>
          {aprobado.profesor && (
            <small>Prof. {aprobado.profesor.nombre} {aprobado.profesor.apellido}</small>
          )}
          {aprobado.comentario && (
            <em>"{aprobado.comentario}"</em>
          )}
        </div>
      </div>
    );
  }

  if (pendiente) {
    return (
      <div className={styles.avalBadge} style={{ '--aval-bg': '#fef9ec', '--aval-color': '#d68910', '--aval-border': '#f9e4a0' }}>
        <span>⏳</span>
        <div>
          <strong>Aval pendiente</strong>
          {pendiente.profesor && (
            <small>Esperando respuesta del Prof. {pendiente.profesor.nombre} {pendiente.profesor.apellido}</small>
          )}
        </div>
      </div>
    );
  }

  // Solo avales rechazados
  return (
    <div className={styles.avalBadge} style={{ '--aval-bg': '#fdf2f2', '--aval-color': '#922b21', '--aval-border': '#f1948a' }}>
      <span>✕</span>
      <span>Aval rechazado</span>
    </div>
  );
}

export default function PostulantesMiOfertaPage() {
  const { ofertaId } = useParams();
  const [postulaciones, setPostulaciones] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [filtroEstado,  setFiltroEstado]  = useState('');

  useEffect(() => {
    postulacionService
      .getByOferta(ofertaId)
      .then(({ data }) => setPostulaciones(data.data ?? data ?? []))
      .catch((err) => {
        const msg = err.response?.data?.detail ?? err.response?.data?.message ?? 'Error al cargar los candidatos.';
        setError(msg);
        console.error('getByOferta error:', err.response?.data ?? err.message);
      })
      .finally(() => setLoading(false));
  }, [ofertaId]);

  const handleCambiarEstado = async (id, estado) => {
    try {
      await postulacionService.updateEstado(id, estado);
      setPostulaciones(postulaciones.map((p) => (p.id === id ? { ...p, estado } : p)));
    } catch (err) {
      alert('Error al cambiar el estado de la postulación.');
    }
  };

  const postulacionesFiltradas = filtroEstado
    ? postulaciones.filter((p) => p.estado === filtroEstado)
    : postulaciones;

  if (loading) return <p className="msg" style={{ padding: '2rem' }}>Cargando candidatos...</p>;

  return (
    <div className="page-container">
      {/* ── Cabecera ─────────────────────────────────────────────────────── */}
      <div className="dashboard-header">
        <div>
          <Link to="/empresa" className="btn-back">← Volver al panel</Link>
          <h1>Candidatos Postulados</h1>
        </div>
        <span className={`badge badge-activa`} style={{ alignSelf: 'flex-end' }}>
          {postulaciones.length} postulación{postulaciones.length !== 1 ? 'es' : ''}
        </span>
      </div>

      {/* Error de carga */}
      {error && (
        <div className="error-msg" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem', borderRadius: 'var(--radius)' }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Filtro de estado ─────────────────────────────────────────────── */}
      <div className={styles.filtroBar}>
        <label>Filtrar por estado:</label>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className={styles.filtroSelect}
        >
          <option value="">Todos</option>
          {ESTADOS.map((e) => (
            <option key={e.value} value={e.value}>{e.label}</option>
          ))}
        </select>
      </div>

      {/* ── Lista de candidatos ──────────────────────────────────────────── */}
      {postulacionesFiltradas.length === 0 ? (
        <div className={styles.emptyState}>
          <span>📭</span>
          <p>No hay candidatos{filtroEstado ? ` con estado "${filtroEstado}"` : ' para esta oferta'}.</p>
        </div>
      ) : (
        <div className="candidatos-list">
          {postulacionesFiltradas.map((p) => {
            const perfil    = p.usuario?.perfil ?? {};
            const cvUrl     = perfil.cvPath
              ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${perfil.cvPath}`
              : null;

            return (
              <div key={p.id} className={`candidato-card ${styles.candidatoCard}`}>

                {/* ── Info izquierda ──────────────────────────────────────── */}
                <div className="candidato-info">
                  {/* Nombre + estado actual */}
                  <div className={styles.candidatoHeader}>
                    <h3>{p.usuario?.nombre} {p.usuario?.apellido}</h3>
                    <span
                      className="badge"
                      style={{ background: ESTADO_COLOR[p.estado] ?? '#7f8c8d' }}
                    >
                      {ESTADOS.find((e) => e.value === p.estado)?.label ?? p.estado}
                    </span>
                  </div>

                  {/* Email */}
                  <p>✉️ {p.usuario?.email}</p>

                  {/* Compatibilidad */}
                  {p.compatibilidadOferta != null && (
                    <CompatibilidadBar valor={p.compatibilidadOferta} />
                  )}

                  {/* Historial académico */}
                  {(perfil.carrera || perfil.institucion || perfil.anioEgreso) && (
                    <div className={styles.academicBox}>
                      <span className={styles.academicTitle}>🎓 Historial académico</span>
                      {perfil.carrera     && <span>{perfil.carrera}</span>}
                      {perfil.institucion && <span>{perfil.institucion}</span>}
                      {perfil.anioEgreso  && <span>Egresado en {perfil.anioEgreso}</span>}
                    </div>
                  )}

                  {/* Disponibilidad */}
                  {perfil.disponibilidad && (
                    <p>🕐 <strong>Disponibilidad:</strong> {perfil.disponibilidad}</p>
                  )}

                  {/* Área de interés */}
                  {perfil.areaInteres && <p>💼 {perfil.areaInteres}</p>}

                  {/* ── Aval académico ───────────────────────────────────── */}
                  <AvalBadge avales={p.avales ?? []} />

                  {/* Botón descargar CV */}
                  {cvUrl ? (
                    <a
                      href={cvUrl}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className="btn-small"
                      style={{ marginTop: '0.5rem' }}
                    >
                      📄 Descargar CV
                    </a>
                  ) : (
                    <span className={styles.sinCv}>Sin CV cargado</span>
                  )}

                  {/* Carta de presentación */}
                  {p.cartaPresentacion && (
                    <details className={styles.cartaDetails}>
                      <summary>📝 Carta de presentación</summary>
                      <p>{p.cartaPresentacion}</p>
                    </details>
                  )}
                </div>

                {/* ── Selector de estado (lado derecho) ─────────────────── */}
                <div className="candidato-estado">
                  <label className={styles.estadoLabel}>Cambiar estado</label>
                  <select
                    value={p.estado}
                    onChange={(e) => handleCambiarEstado(p.id, e.target.value)}
                    className="select-estado"
                    style={{ borderColor: ESTADO_COLOR[p.estado] ?? 'var(--border)' }}
                  >
                    {ESTADOS.map((e) => (
                      <option key={e.value} value={e.value}>{e.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
