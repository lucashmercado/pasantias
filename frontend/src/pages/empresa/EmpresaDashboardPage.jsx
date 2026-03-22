import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ofertaService } from '../../services/api';

export default function EmpresaDashboardPage() {
  const [ofertas, setOfertas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ofertaService.getAll({}).then(({ data }) => setOfertas(data.data)).finally(() => setLoading(false));
  }, []);

  const handleCambiarEstado = async (id, estado) => {
    try {
      await ofertaService.update(id, { estado });
      setOfertas(ofertas.map((o) => (o.id === id ? { ...o, estado } : o)));
    } catch (err) {
      alert('Error al cambiar el estado.');
    }
  };

  return (
    <div className="page-container">
      <div className="dashboard-header">
        <h1>Panel de Empresa</h1>
        <Link to="/empresa/nueva-oferta" className="btn-primary">+ Nueva Oferta</Link>
      </div>

      <h2>Mis Ofertas</h2>
      {loading ? <p>Cargando...</p> : ofertas.length === 0 ? (
        <p>Todavía no publicaste ninguna oferta.</p>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>Título</th>
              <th>Modalidad</th>
              <th>Ciudad</th>
              <th>Estado</th>
              <th>Vistas</th>
              <th>Candidatos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ofertas.map((o) => (
              <tr key={o.id}>
                <td>{o.titulo}</td>
                <td>{o.modalidad}</td>
                <td>{o.ciudad || '-'}</td>
                <td>
                  <span className={`badge badge-${o.estado}`}>{o.estado}</span>
                </td>
                <td>{o.vistas}</td>
                <td>
                  <Link to={`/empresa/postulantes/${o.id}`} className="btn-small">Ver</Link>
                </td>
                <td>
                  {o.estado === 'activa' && (
                    <button className="btn-small btn-warn" onClick={() => handleCambiarEstado(o.id, 'pausada')}>Pausar</button>
                  )}
                  {o.estado === 'pausada' && (
                    <button className="btn-small btn-ok" onClick={() => handleCambiarEstado(o.id, 'activa')}>Activar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
