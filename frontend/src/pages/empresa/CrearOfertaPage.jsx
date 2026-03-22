import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ofertaService } from '../../services/api';

export default function CrearOfertaPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    titulo: '', descripcion: '', requisitos: '', area: '', modalidad: 'presencial',
    ciudad: '', remuneracion: '', nivelExperiencia: 'sin_experiencia', fechaLimite: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await ofertaService.create(form);
      navigate('/empresa');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear la oferta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h1>Publicar Nueva Oferta</h1>
      <form onSubmit={handleSubmit} className="oferta-form">
        <div className="form-group">
          <label>Título del puesto *</label>
          <input name="titulo" value={form.titulo} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Descripción *</label>
          <textarea name="descripcion" value={form.descripcion} onChange={handleChange} required rows={5} />
        </div>
        <div className="form-group">
          <label>Requisitos</label>
          <textarea name="requisitos" value={form.requisitos} onChange={handleChange} rows={3} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Área</label>
            <input name="area" value={form.area} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Modalidad</label>
            <select name="modalidad" value={form.modalidad} onChange={handleChange}>
              <option value="presencial">Presencial</option>
              <option value="remoto">Remoto</option>
              <option value="hibrido">Híbrido</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Ciudad</label>
            <input name="ciudad" value={form.ciudad} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Remuneración</label>
            <input name="remuneracion" value={form.remuneracion} onChange={handleChange} placeholder="Ej: $150.000 / mes" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Nivel de Experiencia</label>
            <select name="nivelExperiencia" value={form.nivelExperiencia} onChange={handleChange}>
              <option value="sin_experiencia">Sin Experiencia</option>
              <option value="junior">Junior</option>
              <option value="semi_senior">Semi Senior</option>
            </select>
          </div>
          <div className="form-group">
            <label>Fecha Límite</label>
            <input type="date" name="fechaLimite" value={form.fechaLimite} onChange={handleChange} />
          </div>
        </div>
        {error && <p className="error-msg">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Publicando...' : 'Publicar Oferta'}
        </button>
      </form>
    </div>
  );
}
