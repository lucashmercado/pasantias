import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { postulacionService } from '../../services/api';

const ESTADOS = ['en_revision', 'preseleccionado', 'entrevista_programada', 'no_seleccionado', 'contratado'];

export default function PostulantesMiOfertaPage() {
  const { ofertaId } = useParams();
  const [postulaciones, setPostulaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    postulacionService.getByOferta(ofertaId)
      .then(({ data }) => setPostulaciones(data.data))
      .finally(() => setLoading(false));
  }, [ofertaId]);

  const handleCambiarEstado = async (id, estado) => {
    try {
      await postulacionService.updateEstado(id, estado);
      setPostulaciones(postulaciones.map((p) => (p.id === id ? { ...p, estado } : p)));
    } catch (err) {
      alert('Error al cambiar el estado.');
    }
  };

  if (loading) return <p>Cargando candidatos...</p>;

  return (
    <div className="page-container">
      <h1>Candidatos Postulados</h1>
      {postulaciones.length === 0 ? (
        <p>Todavía no hay postulaciones para esta oferta.</p>
      ) : (
        <div className="candidatos-list">
          {postulaciones.map((p) => (
            <div key={p.id} className="candidato-card">
              <div className="candidato-info">
                <h3>{p.usuario?.nombre} {p.usuario?.apellido}</h3>
                <p>{p.usuario?.email}</p>
                {p.usuario?.perfil?.carrera && <p>🎓 {p.usuario.perfil.carrera}</p>}
                {p.usuario?.perfil?.areaInteres && <p>💼 {p.usuario.perfil.areaInteres}</p>}
                {p.usuario?.perfil?.cvPath && (
                  <a href={`http://localhost:5000${p.usuario.perfil.cvPath}`} target="_blank" rel="noreferrer" className="btn-small">
                    Ver CV
                  </a>
                )}
                {p.cartaPresentacion && (
                  <details>
                    <summary>Carta de presentación</summary>
                    <p>{p.cartaPresentacion}</p>
                  </details>
                )}
              </div>
              <div className="candidato-estado">
                <select
                  value={p.estado}
                  onChange={(e) => handleCambiarEstado(p.id, e.target.value)}
                  className="select-estado"
                >
                  {ESTADOS.map((e) => <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
