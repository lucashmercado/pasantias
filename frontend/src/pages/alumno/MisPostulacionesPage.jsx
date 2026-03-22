import { useState, useEffect } from 'react';
import { postulacionService } from '../../services/api';

const ESTADOS = {
  en_revision: { label: 'En revisión', color: '#f59e0b' },
  preseleccionado: { label: 'Preseleccionado', color: '#3b82f6' },
  entrevista_programada: { label: 'Entrevista programada', color: '#8b5cf6' },
  no_seleccionado: { label: 'No seleccionado', color: '#ef4444' },
  contratado: { label: '¡Contratado!', color: '#10b981' },
};

export default function MisPostulacionesPage() {
  const [postulaciones, setPostulaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    postulacionService.getMias()
      .then(({ data }) => setPostulaciones(data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Cargando tus postulaciones...</p>;

  return (
    <div className="page-container">
      <h1>Mis Postulaciones</h1>
      {postulaciones.length === 0 ? (
        <p>Todavía no te postulaste a ninguna oferta.</p>
      ) : (
        <div className="postulaciones-list">
          {postulaciones.map((p) => {
            const estado = ESTADOS[p.estado] || { label: p.estado, color: '#6b7280' };
            return (
              <div key={p.id} className="postulacion-card">
                <div className="postulacion-info">
                  <h3>{p.oferta?.titulo}</h3>
                  <p className="empresa-nombre">{p.oferta?.empresa?.razonSocial}</p>
                  <p className="fecha">Postulado el {new Date(p.fechaPostulacion).toLocaleDateString('es-AR')}</p>
                </div>
                <span className="badge" style={{ background: estado.color }}>{estado.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
