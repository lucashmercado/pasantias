import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ofertaService, postulacionService } from '../../services/api';

export default function OfertaDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [oferta, setOferta] = useState(null);
  const [cartaPresentacion, setCartaPresentacion] = useState('');
  const [postulado, setPostulado] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    ofertaService.getById(id).then(({ data }) => setOferta(data.data)).finally(() => setLoading(false));
  }, [id]);

  const handlePostular = async () => {
    setEnviando(true);
    try {
      await postulacionService.postular({ ofertaId: id, cartaPresentacion });
      setPostulado(true);
      setMsg('✅ Te postulaste correctamente.');
    } catch (err) {
      setMsg(err.response?.data?.message || 'Error al postularse.');
    } finally {
      setEnviando(false);
    }
  };

  if (loading) return <p>Cargando...</p>;
  if (!oferta) return <p>Oferta no encontrada.</p>;

  return (
    <div className="page-container detalle-container">
      <button onClick={() => navigate(-1)} className="btn-back">← Volver</button>
      <h1>{oferta.titulo}</h1>
      <h2 className="empresa-nombre">{oferta.empresa?.razonSocial}</h2>
      <div className="oferta-meta">
        <span>📍 {oferta.ciudad}</span>
        <span>💼 {oferta.modalidad}</span>
        {oferta.remuneracion && <span>💰 {oferta.remuneracion}</span>}
        <span>👤 {oferta.nivelExperiencia?.replace(/_/g, ' ')}</span>
        {oferta.fechaLimite && <span>📅 Hasta: {new Date(oferta.fechaLimite).toLocaleDateString('es-AR')}</span>}
      </div>
      <div className="oferta-section"><h3>Descripción</h3><p>{oferta.descripcion}</p></div>
      {oferta.requisitos && <div className="oferta-section"><h3>Requisitos</h3><p>{oferta.requisitos}</p></div>}
      {oferta.habilidadesRequeridas?.length > 0 && (
        <div className="oferta-section">
          <h3>Habilidades requeridas</h3>
          <div className="tags">{oferta.habilidadesRequeridas.map((h) => <span key={h} className="tag">{h}</span>)}</div>
        </div>
      )}
      {!postulado ? (
        <div className="postular-section">
          <h3>Postularse</h3>
          <textarea
            placeholder="Carta de presentación (opcional)"
            value={cartaPresentacion}
            onChange={(e) => setCartaPresentacion(e.target.value)}
            rows={5}
          />
          <button className="btn-primary" onClick={handlePostular} disabled={enviando}>
            {enviando ? 'Enviando...' : 'Enviar postulación'}
          </button>
        </div>
      ) : null}
      {msg && <p className="msg">{msg}</p>}
    </div>
  );
}
