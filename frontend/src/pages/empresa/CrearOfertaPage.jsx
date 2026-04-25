/**
 * CrearOfertaPage.jsx — Formulario para publicar una nueva oferta laboral.
 *
 * Campos originales mantenidos:
 *   titulo, descripcion, requisitos, area, modalidad,
 *   ciudad, remuneracion, nivelExperiencia, fechaLimite
 *
 * Campos nuevos agregados:
 *   salario            — rango salarial (texto libre)
 *   beneficios         — beneficios adicionales (textarea)
 *   cantidadVacantes   — número de puestos disponibles
 *   modalidadExtendida — tipo de jornada (tiempo completo, medio tiempo, etc.)
 *   fechaPublicacion   — fecha en que se publica la oferta
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ofertaService } from '../../services/api';

export default function CrearOfertaPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    // ── Campos originales ───────────────────────────────────────────────────
    titulo:           '',
    descripcion:      '',
    requisitos:       '',
    area:             '',
    modalidad:        'presencial',
    ciudad:           '',
    remuneracion:     '',
    nivelExperiencia: 'sin_experiencia',
    fechaLimite:      '',
    // ── Campos nuevos ───────────────────────────────────────────────────────
    salario:            '',
    beneficios:         '',
    cantidadVacantes:   1,
    modalidadExtendida: 'tiempo_completo',
    fechaPublicacion:   '',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm({ ...form, [name]: type === 'number' ? Number(value) : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
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

        {/* ── Información principal ─────────────────────────────────────── */}
        <div className="form-group">
          <label>Título del puesto *</label>
          <input
            name="titulo"
            value={form.titulo}
            onChange={handleChange}
            required
            placeholder="Ej: Desarrollador Full Stack Jr."
          />
        </div>

        <div className="form-group">
          <label>Descripción *</label>
          <textarea
            name="descripcion"
            value={form.descripcion}
            onChange={handleChange}
            required
            rows={5}
            placeholder="Describí las responsabilidades y el contexto del puesto..."
          />
        </div>

        <div className="form-group">
          <label>Requisitos</label>
          <textarea
            name="requisitos"
            value={form.requisitos}
            onChange={handleChange}
            rows={3}
            placeholder="Ej: React, Node.js, 1 año de experiencia..."
          />
        </div>

        {/* ── Fila: Área + Nivel de experiencia ────────────────────────── */}
        <div className="form-row">
          <div className="form-group">
            <label>Área</label>
            <input
              name="area"
              value={form.area}
              onChange={handleChange}
              placeholder="Ej: Tecnología, Marketing..."
            />
          </div>
          <div className="form-group">
            <label>Nivel de Experiencia</label>
            <select name="nivelExperiencia" value={form.nivelExperiencia} onChange={handleChange}>
              <option value="sin_experiencia">Sin Experiencia</option>
              <option value="junior">Junior</option>
              <option value="semi_senior">Semi Senior</option>
              <option value="senior">Senior</option>
            </select>
          </div>
        </div>

        {/* ── Fila: Modalidad + Modalidad extendida ────────────────────── */}
        <div className="form-row">
          <div className="form-group">
            <label>Modalidad de trabajo</label>
            <select name="modalidad" value={form.modalidad} onChange={handleChange}>
              <option value="presencial">Presencial</option>
              <option value="remoto">Remoto</option>
              <option value="hibrido">Híbrido</option>
            </select>
          </div>
          <div className="form-group">
            <label>Tipo de jornada</label>
            <select name="modalidadExtendida" value={form.modalidadExtendida} onChange={handleChange}>
              <option value="tiempo_completo">Tiempo completo</option>
              <option value="medio_tiempo">Medio tiempo</option>
              <option value="pasantia">Pasantía</option>
              <option value="freelance">Freelance / Por proyecto</option>
            </select>
          </div>
        </div>

        {/* ── Fila: Ciudad + Cantidad de vacantes ──────────────────────── */}
        <div className="form-row">
          <div className="form-group">
            <label>Ciudad</label>
            <input
              name="ciudad"
              value={form.ciudad}
              onChange={handleChange}
              placeholder="Ej: Buenos Aires"
            />
          </div>
          <div className="form-group">
            <label>Cantidad de vacantes</label>
            <input
              type="number"
              name="cantidadVacantes"
              value={form.cantidadVacantes}
              onChange={handleChange}
              min={1}
              max={999}
            />
          </div>
        </div>

        {/* ── Fila: Remuneración + Salario ─────────────────────────────── */}
        <div className="form-row">
          <div className="form-group">
            <label>Remuneración (visible)</label>
            <input
              name="remuneracion"
              value={form.remuneracion}
              onChange={handleChange}
              placeholder="Ej: A convenir / $200.000 / mes"
            />
          </div>
          <div className="form-group">
            <label>Salario estimado (interno)</label>
            <input
              name="salario"
              value={form.salario}
              onChange={handleChange}
              placeholder="Ej: $150.000 – $200.000 / mes"
            />
          </div>
        </div>

        {/* ── Beneficios ───────────────────────────────────────────────── */}
        <div className="form-group">
          <label>Beneficios</label>
          <textarea
            name="beneficios"
            value={form.beneficios}
            onChange={handleChange}
            rows={3}
            placeholder="Ej: Obra social, prepaga, home office, bonos, capacitaciones..."
          />
        </div>

        {/* ── Fila: Fecha publicación + Fecha límite ────────────────────── */}
        <div className="form-row">
          <div className="form-group">
            <label>Fecha de publicación</label>
            <input
              type="date"
              name="fechaPublicacion"
              value={form.fechaPublicacion}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Fecha límite de postulación</label>
            <input
              type="date"
              name="fechaLimite"
              value={form.fechaLimite}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* ── Error + Submit ────────────────────────────────────────────── */}
        {error && <p className="error-msg">{error}</p>}

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Publicando...' : '✓ Publicar Oferta'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/empresa')}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
