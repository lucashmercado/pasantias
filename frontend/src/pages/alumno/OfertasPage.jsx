import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ofertaService } from '../../services/api';

export default function OfertasPage() {
  const [ofertas, setOfertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({ q: '', area: '', modalidad: '', ciudad: '' });

  const cargarOfertas = async () => {
    setLoading(true);
    try {
      const { data } = await ofertaService.getAll(filtros);
      setOfertas(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarOfertas(); }, []);

  const handleFiltro = (e) => setFiltros({ ...filtros, [e.target.name]: e.target.value });
  const handleBuscar = (e) => { e.preventDefault(); cargarOfertas(); };

  return (
    <div className="page-container">
      <h1>Ofertas Disponibles</h1>
      <form onSubmit={handleBuscar} className="filtros-form">
        <input name="q" placeholder="Buscar por título..." value={filtros.q} onChange={handleFiltro} />
        <input name="area" placeholder="Área" value={filtros.area} onChange={handleFiltro} />
        <select name="modalidad" value={filtros.modalidad} onChange={handleFiltro}>
          <option value="">Toda modalidad</option>
          <option value="presencial">Presencial</option>
          <option value="remoto">Remoto</option>
          <option value="hibrido">Híbrido</option>
        </select>
        <input name="ciudad" placeholder="Ciudad" value={filtros.ciudad} onChange={handleFiltro} />
        <button type="submit" className="btn-primary">Buscar</button>
      </form>

      {loading ? (
        <p>Cargando ofertas...</p>
      ) : ofertas.length === 0 ? (
        <p>No hay ofertas disponibles con esos filtros.</p>
      ) : (
        <div className="ofertas-grid">
          {ofertas.map((oferta) => (
            <div key={oferta.id} className="oferta-card">
              <h3>{oferta.titulo}</h3>
              <p className="empresa-nombre">{oferta.empresa?.razonSocial}</p>
              <p>{oferta.ciudad} · {oferta.modalidad}</p>
              {oferta.remuneracion && <p>💰 {oferta.remuneracion}</p>}
              <span className={`badge badge-${oferta.nivelExperiencia}`}>
                {oferta.nivelExperiencia?.replace(/_/g, ' ')}
              </span>
              <Link to={`/ofertas/${oferta.id}`} className="btn-secondary">Ver detalle</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
