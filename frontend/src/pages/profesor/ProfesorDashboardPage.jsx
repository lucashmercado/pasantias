/**
 * ProfesorDashboardPage.jsx — Panel funcional del profesor.
 *
 * Consume en paralelo:
 *  - GET /api/profesor/alumnos       → lista de alumnos asignados
 *  - GET /api/profesor/postulaciones → postulaciones de sus alumnos
 *  - GET /api/profesor/avales/pendientes → avales sin resolver
 *
 * Muestra tarjetas métricas, lista de alumnos, postulaciones pendientes
 * y acceso rápido a la gestión de avales.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { profesorService } from '../../services/api';
import styles from './ProfesorDashboardPage.module.css';

/* Colores de badge de estado de postulación */
const ESTADO_COLOR = {
  en_revision:     '#7f8c8d',
  preseleccionado: '#2980b9',
  entrevista:      '#8e44ad',
  contratado:      '#27ae60',
  rechazado:       '#c0392b',
};

export default function ProfesorDashboardPage() {
  const { usuario } = useAuth();

  const [alumnos,      setAlumnos]      = useState([]);
  const [postulaciones, setPostulaciones] = useState([]);
  const [avales,       setAvales]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');

  useEffect(() => {
    const cargar = async () => {
      try {
        const [alnRes, posRes, avalRes] = await Promise.all([
          profesorService.getMisAlumnos(),
          profesorService.getPostulaciones(),
          profesorService.getAvalesPendientes(),
        ]);
        setAlumnos(alnRes.data.data      ?? alnRes.data  ?? []);
        setPostulaciones(posRes.data.data ?? posRes.data ?? []);
        setAvales(avalRes.data.data      ?? avalRes.data ?? []);
      } catch (err) {
        setError('No se pudo cargar el panel. Intentá de nuevo más tarde.');
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  /* ── Métricas rápidas ──────────────────────────────────────────────────── */
  const metricas = [
    { icon: '👥', label: 'Alumnos asignados', value: alumnos.length,       color: 'var(--primary)' },
    { icon: '📋', label: 'Postulaciones',     value: postulaciones.length,  color: '#2980b9' },
    { icon: '⏳', label: 'Avales pendientes', value: avales.length,         color: avales.length > 0 ? 'var(--warning)' : 'var(--success)' },
  ];

  return (
    <div className="page-container">
      {/* ── Cabecera ───────────────────────────────────────────────────────── */}
      <div className="dashboard-header">
        <h1>Panel del Profesor</h1>
        <Link to="/profesor/avales" className="btn-primary">
          ✅ Gestionar Avales {avales.length > 0 && `(${avales.length})`}
        </Link>
      </div>

      {/* ── Bienvenida ────────────────────────────────────────────────────── */}
      <div className={styles.welcomeCard}>
        <div className={styles.welcomeIcon}>👨‍🏫</div>
        <div>
          <h2 className={styles.welcomeTitle}>
            Bienvenido, {usuario?.nombre} {usuario?.apellido}
          </h2>
          <p className={styles.welcomeDesc}>
            Gestioná el seguimiento académico de tus alumnos, revisá avales y
            supervisá el proceso de inserción laboral.
          </p>
        </div>
      </div>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && <p className="error-msg" style={{ marginBottom: '1.5rem' }}>{error}</p>}

      {/* ── Tarjetas métricas ─────────────────────────────────────────────── */}
      <div className={styles.metricsRow}>
        {metricas.map(({ icon, label, value, color }) => (
          <div key={label} className={styles.metricCard} style={{ '--mc': color }}>
            <span className={styles.metricIcon}>{icon}</span>
            <span className={styles.metricValue}>{loading ? '—' : value}</span>
            <span className={styles.metricLabel}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── Alumnos asignados ─────────────────────────────────────────────── */}
      <h2>Mis Alumnos</h2>
      {loading ? (
        <p className="msg">Cargando alumnos...</p>
      ) : alumnos.length === 0 ? (
        <p className="msg">No tenés alumnos asignados actualmente.</p>
      ) : (
        <div className={styles.alumnosGrid}>
          {alumnos.map((a) => (
            <div key={a.id} className={styles.alumnoCard}>
              <div className={styles.alumnoAvatar}>
                {(a.nombre?.[0] ?? '?').toUpperCase()}
              </div>
              <div className={styles.alumnoInfo}>
                <strong>{a.nombre} {a.apellido}</strong>
                <span>{a.email}</span>
                {a.perfil?.carrera && <span>🎓 {a.perfil.carrera}</span>}
                {a.perfil?.disponibilidad && <span>🕐 {a.perfil.disponibilidad}</span>}
              </div>
              <span className={`badge badge-alumno`} style={{ alignSelf: 'flex-start' }}>
                {a.rol ?? 'alumno'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Postulaciones recientes ───────────────────────────────────────── */}
      <h2>Postulaciones de mis Alumnos</h2>
      {loading ? (
        <p className="msg">Cargando postulaciones...</p>
      ) : postulaciones.length === 0 ? (
        <p className="msg">Ningún alumno tuyo tiene postulaciones activas.</p>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>Alumno</th>
              <th>Oferta</th>
              <th>Empresa</th>
              <th>Estado</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {postulaciones.slice(0, 15).map((p) => (
              <tr key={p.id}>
                <td>{p.usuario?.nombre} {p.usuario?.apellido}</td>
                <td>{p.oferta?.titulo ?? '—'}</td>
                <td>{p.oferta?.empresa?.razonSocial ?? '—'}</td>
                <td>
                  <span
                    className="badge"
                    style={{ background: ESTADO_COLOR[p.estado] ?? '#7f8c8d' }}
                  >
                    {p.estado?.replace(/_/g, ' ') ?? '—'}
                  </span>
                </td>
                <td className={styles.fechaTd}>
                  {p.createdAt ? new Date(p.createdAt).toLocaleDateString('es-AR') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── Acceso rápido a avales ────────────────────────────────────────── */}
      {!loading && avales.length > 0 && (
        <div className={styles.avalesAlert}>
          <span>⚠️</span>
          <div>
            <strong>Tenés {avales.length} aval{avales.length !== 1 ? 'es' : ''} pendiente{avales.length !== 1 ? 's' : ''} de revisión.</strong>
            <p>Los alumnos están esperando tu aprobación para completar el proceso.</p>
          </div>
          <Link to="/profesor/avales" className="btn-primary">Revisar ahora</Link>
        </div>
      )}
    </div>
  );
}
