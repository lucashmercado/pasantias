/**
 * OfertasPage.jsx — Explorador de ofertas disponibles para el alumno/egresado.
 *
 * Funcionalidades:
 * - Búsqueda y filtros (título, área, modalidad, ciudad)
 * - Grid de tarjetas de ofertas
 * - Tab "Ver recomendadas" que consume GET /api/ofertas/recomendadas
 *
 * Ruta: /ofertas
 * Roles: alumno, egresado
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ofertaService } from '../../services/api';
import styles from './OfertasPage.module.css';

// Tarjeta individual de oferta
function OfertaCard({ oferta }) {
  return (
    <div className={styles.card}>
      {oferta.matchScore != null && (
        <span className={styles.matchPill}>⭐ {oferta.matchScore}% match</span>
      )}
      <h3 className={styles.cardTitle}>{oferta.titulo}</h3>
      <p className={styles.cardEmpresa}>{oferta.empresa?.razonSocial}</p>
      <div className={styles.cardMeta}>
        {oferta.ciudad   && <span>📍 {oferta.ciudad}</span>}
        {oferta.modalidad && <span>💼 {oferta.modalidad}</span>}
        {oferta.remuneracion && <span>💰 {oferta.remuneracion}</span>}
      </div>
      {oferta.nivelExperiencia && (
        <span className={`badge badge-${oferta.nivelExperiencia}`}>
          {oferta.nivelExperiencia.replace(/_/g, ' ')}
        </span>
      )}
      {oferta.fechaLimite && (
        <p className={styles.fechaLimite}>
          📅 Cierre: {new Date(oferta.fechaLimite).toLocaleDateString('es-AR')}
        </p>
      )}
      <Link to={`/ofertas/${oferta.id}`} className="btn-secondary" style={{ marginTop: 'auto' }}>
        Ver detalle →
      </Link>
    </div>
  );
}

export default function OfertasPage() {
  const [modo, setModo]             = useState('todas');    // 'todas' | 'recomendadas'
  const [ofertas, setOfertas]       = useState([]);
  const [recomendadas, setRecomendadas] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [loadingRec, setLoadingRec] = useState(false);
  const [recCargadas, setRecCargadas] = useState(false);
  const [filtros, setFiltros]       = useState({
    q: '', area: '', modalidad: '', ciudad: '',
  });

  // Carga todas las ofertas (con filtros)
  const cargarOfertas = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await ofertaService.getAll(filtros);
      setOfertas(data.data ?? []);
    } catch {
      setOfertas([]);
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  // Carga ofertas recomendadas (lazy: solo al hacer click)
  const cargarRecomendadas = async () => {
    if (recCargadas) return;
    setLoadingRec(true);
    try {
      const { data } = await ofertaService.getRecomendadas();
      setRecomendadas(data.data ?? []);
      setRecCargadas(true);
    } catch {
      setRecomendadas([]);
      setRecCargadas(true);
    } finally {
      setLoadingRec(false);
    }
  };

  useEffect(() => { cargarOfertas(); }, []);

  const handleFiltro  = (e) => setFiltros({ ...filtros, [e.target.name]: e.target.value });
  const handleBuscar  = (e) => { e.preventDefault(); cargarOfertas(); };
  const handleLimpiar = () => {
    setFiltros({ q: '', area: '', modalidad: '', ciudad: '' });
    setOfertas([]);
    setLoading(true);
    ofertaService.getAll({}).then(({ data }) => setOfertas(data.data ?? [])).finally(() => setLoading(false));
  };

  const handleTabRecomendadas = () => {
    setModo('recomendadas');
    cargarRecomendadas();
  };

  const listaActual = modo === 'recomendadas' ? recomendadas : ofertas;
  const cargandoActual = modo === 'recomendadas' ? loadingRec : loading;

  return (
    <div className="page-container">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="dashboard-header">
        <h1>Ofertas Disponibles</h1>
        <Link to="/dashboard" className="btn-secondary">← Dashboard</Link>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${modo === 'todas' ? styles.tabActive : ''}`}
          onClick={() => setModo('todas')}
        >
          🏢 Todas las ofertas
          {!loading && <span className={styles.tabCount}>{ofertas.length}</span>}
        </button>
        <button
          className={`${styles.tab} ${modo === 'recomendadas' ? styles.tabActive : ''}`}
          onClick={handleTabRecomendadas}
        >
          ⭐ Recomendadas para vos
          {recCargadas && <span className={styles.tabCount}>{recomendadas.length}</span>}
        </button>
      </div>

      {/* ── Filtros (solo en modo "todas") ─────────────────────────────── */}
      {modo === 'todas' && (
        <form onSubmit={handleBuscar} className="filtros-form">
          <input
            name="q"
            placeholder="🔍 Buscar por título..."
            value={filtros.q}
            onChange={handleFiltro}
          />
          <input
            name="area"
            placeholder="Área"
            value={filtros.area}
            onChange={handleFiltro}
          />
          <select name="modalidad" value={filtros.modalidad} onChange={handleFiltro}>
            <option value="">Toda modalidad</option>
            <option value="presencial">Presencial</option>
            <option value="remoto">Remoto</option>
            <option value="hibrido">Híbrido</option>
          </select>
          <input
            name="ciudad"
            placeholder="Ciudad"
            value={filtros.ciudad}
            onChange={handleFiltro}
          />
          <button type="submit" className="btn-primary">Buscar</button>
          {(filtros.q || filtros.area || filtros.modalidad || filtros.ciudad) && (
            <button type="button" className="btn-secondary" onClick={handleLimpiar}>
              Limpiar
            </button>
          )}
        </form>
      )}

      {/* ── Aviso recomendadas ──────────────────────────────────────────── */}
      {modo === 'recomendadas' && recCargadas && (
        <div className={styles.recInfo}>
          ⭐ Las ofertas se ordenan por compatibilidad con tu perfil.
          ¿Pocas recomendaciones?{' '}
          <Link to="/perfil">Completá tu perfil</Link> para mejorar los resultados.
        </div>
      )}

      {/* ── Resultados ─────────────────────────────────────────────────── */}
      {cargandoActual ? (
        <div className={styles.skeletonGrid}>
          {[1,2,3,4,5,6].map(i => <div key={i} className={styles.skeletonCard} />)}
        </div>
      ) : listaActual.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>
            {modo === 'recomendadas' ? '🎯' : '🔍'}
          </span>
          <h3>
            {modo === 'recomendadas'
              ? 'Completá tu perfil para recibir recomendaciones'
              : 'No hay ofertas con esos filtros'}
          </h3>
          {modo === 'recomendadas' ? (
            <Link to="/perfil" className="btn-primary">Completar perfil</Link>
          ) : (
            <button className="btn-secondary" onClick={handleLimpiar}>
              Ver todas las ofertas
            </button>
          )}
        </div>
      ) : (
        <>
          <p className={styles.resultCount}>
            {listaActual.length} oferta{listaActual.length !== 1 ? 's' : ''}
            {modo === 'recomendadas' ? ' recomendadas' : ' encontradas'}
          </p>
          <div className="ofertas-grid">
            {listaActual.map((oferta) => (
              <OfertaCard key={oferta.id} oferta={oferta} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
