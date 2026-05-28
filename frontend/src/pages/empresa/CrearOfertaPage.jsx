/**
 * CrearOfertaPage.jsx — Formulario para publicar una nueva oferta laboral.
 *
 * Campos de empresa/puesto:
 *   titulo, descripcion, requisitos, area, modalidad, modalidadExtendida,
 *   ciudad, cantidadVacantes, remuneracion, salario, beneficios,
 *   fechaPublicacion, fechaLimite
 *
 * Campos normalizados (Etapa 4 — reemplazan nivelExperiencia en el UI):
 *   tipoPuesto          → pasante | trainee | junior  (requerido)
 *   requiereExperiencia → boolean
 *   experienciaDetalle  → texto libre (visible solo si requiereExperiencia)
 *   carrerasDestinatarias → array de carreras del instituto
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ofertaService } from '../../services/api';

// Carreras del instituto (lista canónica de catalogos.json)
const CARRERAS_INSTITUTO = [
  'Tecnicatura Superior en Programación',
  'Tecnicatura en Redes y Telecomunicaciones',
  'Tecnicatura en Ciberseguridad',
  'Tecnicatura en Electrónica',
  'Tecnicatura en Automatización y Control',
  'Tecnicatura en Mecánica',
  'Tecnicatura en Administración',
  'Tecnicatura en Contabilidad',
  'Tecnicatura en Logística',
  'Tecnicatura en Marketing',
  'Tecnicatura en Diseño Industrial',
];

const TIPO_PUESTO_CONFIG = {
  pasante: {
    label:    'Pasante',
    emoji:    '🎓',
    desc:     'Rol educativo. Sin requerimiento de experiencia laboral previa.',
    forzarSinExp: true,
  },
  trainee: {
    label:    'Trainee',
    emoji:    '🌱',
    desc:     'Incorporación con acompañamiento. Puede valorarse experiencia en proyectos académicos.',
    forzarSinExp: false,
  },
  junior: {
    label:    'Junior',
    emoji:    '💼',
    desc:     'Requiere habilidades comprobables o experiencia inicial.',
    forzarSinExp: false,
  },
};

export default function CrearOfertaPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    titulo:             '',
    descripcion:        '',
    requisitos:         '',
    area:               '',
    modalidad:          'presencial',
    modalidadExtendida: 'tiempo_completo',
    ciudad:             '',
    cantidadVacantes:   1,
    remuneracion:       '',
    salario:            '',
    beneficios:         '',
    fechaPublicacion:   '',
    fechaLimite:        '',
    // Campos normalizados (Etapa 4)
    tipoPuesto:          'pasante',
    requiereExperiencia: false,
    experienciaDetalle:  '',
  });

  const [carrerasDestinatarias, setCarrerasDestinatarias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value),
    }));
  };

  const handleTipoPuesto = (tipo) => {
    setForm(prev => ({
      ...prev,
      tipoPuesto: tipo,
      // Pasante: forzar sin experiencia. Junior: experiencia por defecto.
      requiereExperiencia: tipo === 'junior' ? true : (tipo === 'pasante' ? false : prev.requiereExperiencia),
      // Si pasamos a no-requiere, limpiar el detalle
      experienciaDetalle: tipo === 'pasante' ? '' : prev.experienciaDetalle,
    }));
  };

  const handleCarreraToggle = (carrera) => {
    setCarrerasDestinatarias(prev =>
      prev.includes(carrera) ? prev.filter(c => c !== carrera) : [...prev, carrera]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.tipoPuesto) {
      setError('Por favor seleccioná el tipo de puesto (Pasante, Trainee o Junior).');
      return;
    }

    setLoading(true);
    try {
      await ofertaService.create({ ...form, carrerasDestinatarias });
      navigate('/empresa');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear la oferta.');
    } finally {
      setLoading(false);
    }
  };

  const tipoCfg = TIPO_PUESTO_CONFIG[form.tipoPuesto] ?? {};

  return (
    <div className="page-container">
      <h1>Publicar Nueva Oferta</h1>

      <form onSubmit={handleSubmit} className="oferta-form">

        {/* ── Información principal ─────────────────────────────────────── */}
        <div className="form-group">
          <label>Título del puesto *</label>
          <input
            name="titulo" value={form.titulo} onChange={handleChange} required
            placeholder="Ej: Pasantía en Desarrollo Web"
          />
        </div>

        <div className="form-group">
          <label>Descripción *</label>
          <textarea
            name="descripcion" value={form.descripcion} onChange={handleChange} required
            rows={5} placeholder="Describí las responsabilidades y el contexto del puesto..."
          />
        </div>

        <div className="form-group">
          <label>Requisitos</label>
          <textarea
            name="requisitos" value={form.requisitos} onChange={handleChange}
            rows={3} placeholder="Ej: Conocimientos básicos en React y Node.js..."
          />
        </div>

        {/* ── Tipo de puesto ────────────────────────────────────────────── */}
        <div className="form-group">
          <label>Tipo de puesto *</label>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            {Object.entries(TIPO_PUESTO_CONFIG).map(([value, cfg]) => (
              <label
                key={value}
                style={{
                  display:      'flex',
                  alignItems:   'flex-start',
                  gap:          '0.5rem',
                  padding:      '0.75rem 1rem',
                  border:       `2px solid ${form.tipoPuesto === value ? '#0073AD' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  cursor:       'pointer',
                  background:   form.tipoPuesto === value ? '#f0f8ff' : '#fff',
                  flex:         '1 1 180px',
                  minWidth:     '180px',
                }}
              >
                <input
                  type="radio" name="tipoPuesto" value={value}
                  checked={form.tipoPuesto === value}
                  onChange={() => handleTipoPuesto(value)}
                  style={{ marginTop: '2px' }}
                />
                <div>
                  <strong style={{ color: form.tipoPuesto === value ? '#0073AD' : '#1e293b' }}>
                    {cfg.emoji} {cfg.label}
                  </strong>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0', lineHeight: 1.4 }}>
                    {cfg.desc}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* ── Experiencia ────────────────────────────────────────────────── */}
        <div className="form-group">
          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: tipoCfg.forzarSinExp ? 'not-allowed' : 'pointer' }}
          >
            <input
              type="checkbox"
              name="requiereExperiencia"
              checked={form.requiereExperiencia}
              onChange={handleChange}
              disabled={tipoCfg.forzarSinExp}
            />
            Requiere experiencia previa
            {tipoCfg.forzarSinExp && (
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                (no aplica para pasantes)
              </span>
            )}
          </label>
        </div>

        {form.requiereExperiencia && (
          <div className="form-group">
            <label>Detalle de experiencia requerida</label>
            <textarea
              name="experienciaDetalle" value={form.experienciaDetalle} onChange={handleChange}
              rows={2} placeholder="Ej: Proyectos académicos comprobables o 6 meses de experiencia en área similar"
            />
          </div>
        )}

        {/* ── Área + Modalidad ──────────────────────────────────────────── */}
        <div className="form-row">
          <div className="form-group">
            <label>Área</label>
            <input
              name="area" value={form.area} onChange={handleChange}
              placeholder="Ej: Programación, Marketing..."
            />
          </div>
          <div className="form-group">
            <label>Modalidad de trabajo</label>
            <select name="modalidad" value={form.modalidad} onChange={handleChange}>
              <option value="presencial">Presencial</option>
              <option value="remoto">Remoto</option>
              <option value="hibrido">Híbrido</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Tipo de jornada</label>
            <select name="modalidadExtendida" value={form.modalidadExtendida} onChange={handleChange}>
              <option value="tiempo_completo">Tiempo completo</option>
              <option value="medio_tiempo">Medio tiempo</option>
              <option value="pasantia">Pasantía</option>
              <option value="freelance">Freelance / Por proyecto</option>
            </select>
          </div>
          <div className="form-group">
            <label>Ciudad</label>
            <input
              name="ciudad" value={form.ciudad} onChange={handleChange}
              placeholder="Ej: Avellaneda"
            />
          </div>
        </div>

        {/* ── Vacantes + Remuneración ───────────────────────────────────── */}
        <div className="form-row">
          <div className="form-group">
            <label>Cantidad de vacantes</label>
            <input
              type="number" name="cantidadVacantes" value={form.cantidadVacantes}
              onChange={handleChange} min={1} max={999}
            />
          </div>
          <div className="form-group">
            <label>Remuneración (visible)</label>
            <input
              name="remuneracion" value={form.remuneracion} onChange={handleChange}
              placeholder="Ej: A convenir / $200.000"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Salario estimado (interno)</label>
            <input
              name="salario" value={form.salario} onChange={handleChange}
              placeholder="Ej: 150000"
            />
          </div>
          <div className="form-group">
            <label>Beneficios</label>
            <input
              name="beneficios" value={form.beneficios} onChange={handleChange}
              placeholder="Ej: Capacitaciones, comedor, certificado"
            />
          </div>
        </div>

        {/* ── Fechas ────────────────────────────────────────────────────── */}
        <div className="form-row">
          <div className="form-group">
            <label>Fecha de publicación</label>
            <input type="date" name="fechaPublicacion" value={form.fechaPublicacion} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Fecha límite de postulación</label>
            <input type="date" name="fechaLimite" value={form.fechaLimite} onChange={handleChange} />
          </div>
        </div>

        {/* ── Carreras destinatarias ────────────────────────────────────── */}
        <div className="form-group">
          <label>
            Carreras destinatarias
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 400, marginLeft: '0.5rem' }}>
              (opcional — seleccioná las carreras a las que está orientada la oferta)
            </span>
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
            {CARRERAS_INSTITUTO.map(carrera => {
              const activa = carrerasDestinatarias.includes(carrera);
              return (
                <label
                  key={carrera}
                  style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          '0.4rem',
                    padding:      '0.35rem 0.75rem',
                    border:       `1.5px solid ${activa ? '#0073AD' : '#e2e8f0'}`,
                    borderRadius: '99px',
                    cursor:       'pointer',
                    background:   activa ? '#f0f8ff' : '#fff',
                    fontSize:     '0.85rem',
                    color:        activa ? '#0073AD' : '#475569',
                    fontWeight:   activa ? 600 : 400,
                    userSelect:   'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={activa}
                    onChange={() => handleCarreraToggle(carrera)}
                    style={{ display: 'none' }}
                  />
                  {activa ? '✓ ' : ''}{carrera}
                </label>
              );
            })}
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
