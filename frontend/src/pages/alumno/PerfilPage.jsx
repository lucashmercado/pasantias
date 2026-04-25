/**
 * PerfilPage.jsx — Perfil profesional del alumno/egresado.
 *
 * Secciones:
 * 1. Datos básicos  → carrera, año egreso, descripción, área interés
 * 2. Redes sociales → linkedin, github, portfolio, redesSociales
 * 3. Experiencia    → experienciaLaboral, proyectos, certificaciones
 * 4. Preferencias   → disponibilidad, salarioPretendido, preferenciasLaborales,
 *                     visibilidadPerfil
 * 5. CV             → subida de archivo (existente, mantenido)
 *
 * Compatibilidad: mantiene todos los campos existentes (carrera, anioEgreso,
 * descripcion, areaInteres, linkedin, github, disponibilidad, cvPath).
 */

import { useState, useEffect } from 'react';
import { userService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import styles from './PerfilPage.module.css';

// Porcentaje de completitud del perfil
function calcularCompletitud(form) {
  const campos = [
    form.carrera, form.anioEgreso, form.descripcion, form.areaInteres,
    form.linkedin || form.github || form.portfolio,
    form.experienciaLaboral, form.disponibilidad,
    form.salarioPretendido, form.preferenciasLaborales,
  ];
  const completos = campos.filter(Boolean).length;
  return Math.round((completos / campos.length) * 100);
}

// Sección del formulario con encabezado
function FormSection({ title, icon, children }) {
  return (
    <div className={styles.formSection}>
      <h2 className={styles.sectionTitle}>
        <span className={styles.sectionIcon}>{icon}</span> {title}
      </h2>
      {children}
    </div>
  );
}

export default function PerfilPage() {
  const { actualizarUsuario } = useAuth();

  const [perfil, setPerfil]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg]           = useState('');
  const [cvFile, setCvFile]     = useState(null);
  const [subiendoCV, setSubiendoCV] = useState(false);

  const [form, setForm] = useState({
    // Campos existentes
    carrera:      '',
    anioEgreso:   '',
    descripcion:  '',
    areaInteres:  '',
    linkedin:     '',
    github:       '',
    disponibilidad: 'inmediata',
    // Nuevos campos
    portfolio:               '',
    experienciaLaboral:      '',
    proyectos:               '',
    certificaciones:         '',
    salarioPretendido:       '',
    preferenciasLaborales:   '',
    visibilidadPerfil:       'publica',
    redesSociales:           '',
    fotoPerfil:              '',
  });

  useEffect(() => {
    userService.getPerfil()
      .then(({ data }) => {
        const d = data.data || {};
        setPerfil(d);
        setForm((prev) => ({ ...prev, ...d }));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    setMsg('');
    setGuardando(true);
    try {
      const { data } = await userService.updatePerfil(form);
      setPerfil(data.data);
      // Sincroniza fotoPerfil con el AuthContext si cambió
      if (form.fotoPerfil) actualizarUsuario({ fotoPerfil: form.fotoPerfil });
      setMsg('✅ Perfil actualizado correctamente.');
    } catch {
      setMsg('❌ Error al guardar el perfil.');
    } finally {
      setGuardando(false);
      setTimeout(() => setMsg(''), 4000);
    }
  };

  const handleSubirCV = async () => {
    if (!cvFile) return;
    setSubiendoCV(true);
    const formData = new FormData();
    formData.append('cv', cvFile);
    try {
      await userService.subirCV(formData);
      setMsg('✅ CV subido correctamente.');
    } catch {
      setMsg('❌ Error al subir el CV.');
    } finally {
      setSubiendoCV(false);
      setTimeout(() => setMsg(''), 4000);
    }
  };

  if (loading) return <p style={{ padding: '2rem' }}>Cargando perfil...</p>;

  const pct = calcularCompletitud(form);
  const pctColor = pct < 40 ? '#ef4444' : pct < 75 ? '#f59e0b' : '#10b981';

  return (
    <div className="page-container">
      <div className="dashboard-header">
        <h1>Mi Perfil Profesional</h1>
      </div>

      {/* Barra de completitud */}
      <div className={styles.completitudBar}>
        <div className={styles.completitudHeader}>
          <span>Perfil completado</span>
          <span style={{ color: pctColor, fontWeight: 700 }}>{pct}%</span>
        </div>
        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ width: `${pct}%`, background: pctColor }}
          />
        </div>
      </div>

      <form onSubmit={handleGuardar}>

        {/* ── 1. Datos básicos ────────────────────────────────────────────── */}
        <FormSection title="Datos Académicos" icon="🎓">
          <div className="form-row">
            <div className="form-group">
              <label>Carrera</label>
              <input name="carrera" value={form.carrera || ''} onChange={handleChange}
                placeholder="Ej: Ingeniería en Sistemas" />
            </div>
            <div className="form-group">
              <label>Año de Egreso</label>
              <input type="number" name="anioEgreso" value={form.anioEgreso || ''}
                onChange={handleChange} placeholder="2024" min="1990" max="2035" />
            </div>
          </div>
          <div className="form-group">
            <label>Descripción / Resumen Profesional</label>
            <textarea name="descripcion" value={form.descripcion || ''} onChange={handleChange}
              rows={4} placeholder="Describí tu perfil, fortalezas y objetivos profesionales..." />
          </div>
          <div className="form-group">
            <label>Área de Interés</label>
            <input name="areaInteres" value={form.areaInteres || ''} onChange={handleChange}
              placeholder="Ej: Desarrollo Web, Data Science, Redes..." />
          </div>
        </FormSection>

        {/* ── 2. Redes sociales y portfolio ───────────────────────────────── */}
        <FormSection title="Redes y Portfolio" icon="🌐">
          <div className="form-row">
            <div className="form-group">
              <label>LinkedIn</label>
              <input name="linkedin" value={form.linkedin || ''} onChange={handleChange}
                placeholder="https://linkedin.com/in/tu-perfil" />
            </div>
            <div className="form-group">
              <label>GitHub</label>
              <input name="github" value={form.github || ''} onChange={handleChange}
                placeholder="https://github.com/tu-usuario" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Portfolio / Sitio web</label>
              <input name="portfolio" value={form.portfolio || ''} onChange={handleChange}
                placeholder="https://mi-portfolio.com" />
            </div>
            <div className="form-group">
              <label>Otras redes sociales</label>
              <input name="redesSociales" value={form.redesSociales || ''} onChange={handleChange}
                placeholder="Twitter, Behance, etc." />
            </div>
          </div>
          <div className="form-group">
            <label>URL de foto de perfil</label>
            <input name="fotoPerfil" value={form.fotoPerfil || ''} onChange={handleChange}
              placeholder="https://ejemplo.com/mi-foto.jpg" />
          </div>
        </FormSection>

        {/* ── 3. Experiencia y proyectos ──────────────────────────────────── */}
        <FormSection title="Experiencia y Proyectos" icon="💼">
          <div className="form-group">
            <label>Experiencia Laboral</label>
            <textarea name="experienciaLaboral" value={form.experienciaLaboral || ''}
              onChange={handleChange} rows={4}
              placeholder="Describí tus trabajos previos, roles y responsabilidades..." />
          </div>
          <div className="form-group">
            <label>Proyectos Destacados</label>
            <textarea name="proyectos" value={form.proyectos || ''}
              onChange={handleChange} rows={3}
              placeholder="Proyectos propios, académicos o freelance relevantes..." />
          </div>
          <div className="form-group">
            <label>Certificaciones y Cursos</label>
            <textarea name="certificaciones" value={form.certificaciones || ''}
              onChange={handleChange} rows={3}
              placeholder="Ej: AWS Cloud Practitioner, Scrum Master, etc." />
          </div>
        </FormSection>

        {/* ── 4. Preferencias laborales ───────────────────────────────────── */}
        <FormSection title="Preferencias Laborales" icon="🎯">
          <div className="form-row">
            <div className="form-group">
              <label>Disponibilidad</label>
              <select name="disponibilidad" value={form.disponibilidad || 'inmediata'}
                onChange={handleChange}>
                <option value="inmediata">Inmediata</option>
                <option value="1_mes">En 1 mes</option>
                <option value="3_meses">En 3 meses</option>
                <option value="no_disponible">No disponible</option>
              </select>
            </div>
            <div className="form-group">
              <label>Salario Pretendido (mensual)</label>
              <input name="salarioPretendido" value={form.salarioPretendido || ''}
                onChange={handleChange} placeholder="Ej: $300.000 - $400.000 ARS" />
            </div>
          </div>
          <div className="form-group">
            <label>Preferencias Laborales</label>
            <textarea name="preferenciasLaborales" value={form.preferenciasLaborales || ''}
              onChange={handleChange} rows={2}
              placeholder="Modalidad preferida, tipo de empresa, sector, etc." />
          </div>
          <div className="form-group">
            <label>Visibilidad del Perfil</label>
            <select name="visibilidadPerfil" value={form.visibilidadPerfil || 'publica'}
              onChange={handleChange}>
              <option value="publica">Público — visible para todas las empresas</option>
              <option value="privada">Privado — solo yo puedo verlo</option>
              <option value="solo_empresas_verificadas">Solo empresas verificadas</option>
            </select>
          </div>
        </FormSection>

        {/* Mensajes de feedback */}
        {msg && <p className={msg.startsWith('✅') ? styles.msgOk : 'error-msg'}>{msg}</p>}

        <button type="submit" className="btn-primary" disabled={guardando}
          style={{ width: '100%', maxWidth: '300px', marginTop: '0.5rem' }}>
          {guardando ? 'Guardando...' : '💾 Guardar cambios'}
        </button>
      </form>

      {/* ── 5. Currículum Vitae (mantenido) ─────────────────────────────── */}
      <div className="cv-section">
        <h2>Currículum Vitae</h2>
        {perfil?.cvPath && (
          <p>
            CV actual:{' '}
            <a href={`http://localhost:5000${perfil.cvPath}`} target="_blank" rel="noreferrer">
              📄 Ver CV actual
            </a>
          </p>
        )}
        <div className={styles.cvUpload}>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setCvFile(e.target.files[0])}
          />
          <button
            className="btn-secondary"
            onClick={handleSubirCV}
            disabled={!cvFile || subiendoCV}
          >
            {subiendoCV ? 'Subiendo...' : '⬆️ Subir nuevo CV'}
          </button>
        </div>
        <p className={styles.cvHint}>Solo archivos PDF. Máximo 5 MB.</p>
      </div>
    </div>
  );
}
