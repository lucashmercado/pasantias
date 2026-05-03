/**
 * SolicitudEmpresaPage.jsx — Formulario público de solicitud de registro de empresa.
 *
 * Permite a una empresa interesada enviar su pre-registro sin crear cuenta.
 * La solicitud queda en estado "pendiente" hasta que el administrador la evalúa.
 *
 * Ruta: /registro-empresa
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import styles from './SolicitudEmpresaPage.module.css';

// ── Lista de carreras disponibles ─────────────────────────────────────────────
const CARRERAS = [
  'Análisis de Sistemas',
  'Diseño Industrial',
  'Enfermería',
  'Radiología',
  'Higiene y Seguridad',
  'Tecnicatura en Programación',
  'Administración de Empresas',
  'Contabilidad',
  'Marketing y Publicidad',
  'Diseño Gráfico',
  'Laboratorio',
  'Fisioterapia',
];

const INITIAL_FORM = {
  razonSocial: '',
  cuit: '',
  rubro: '',
  direccion: '',
  ciudad: '',
  email: '',
  telefono: '',
  descripcion: '',
  puestos: '',
};

export default function SolicitudEmpresaPage() {
  const [form, setForm]           = useState(INITIAL_FORM);
  const [carreras, setCarreras]   = useState([]);
  const [reclutadores, setReclutadores] = useState([{ nombre: '', email: '' }]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState(false);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function handleCarreraToggle(carrera) {
    setCarreras(prev =>
      prev.includes(carrera)
        ? prev.filter(c => c !== carrera)
        : [...prev, carrera]
    );
  }

  // Handlers reclutadores
  function handleReclutadorChange(idx, field, value) {
    setReclutadores(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }
  function agregarReclutador() {
    setReclutadores(prev => [...prev, { nombre: '', email: '' }]);
  }
  function quitarReclutador(idx) {
    setReclutadores(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // Validación mínima
    if (!form.razonSocial || !form.cuit || !form.rubro || !form.email) {
      setError('Por favor completá los campos obligatorios: Razón Social, CUIT, Rubro y Email.');
      return;
    }

    setLoading(true);
    try {
      // Filtrar reclutadores vacíos antes de enviar
      const recls = reclutadores.filter(r => r.nombre.trim() && r.email.trim());
      await api.post('/solicitudes-empresa', { ...form, carrerasInteres: carreras, reclutadores: recls });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al enviar la solicitud. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  // ── Modal de éxito ────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>🎉</div>
          <h2 className={styles.successTitle}>¡Solicitud enviada!</h2>
          <p className={styles.successMsg}>
            Tu solicitud fue enviada correctamente.<br />
            <strong>Será evaluada por el instituto</strong> y te contactaremos al
            email proporcionado con la resolución.
          </p>
          <Link to="/" className={styles.successBtn}>
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  // ── Formulario principal ──────────────────────────────────────────────────────
  return (
    <div className={styles.pageWrapper}>
      <div className={styles.formCard}>

        {/* Encabezado */}
        <div className={styles.header}>
          <span className={styles.headerBadge}>🏢 Empresas</span>
          <h1 className={styles.title}>Registrarse como empresa</h1>
          <p className={styles.subtitle}>
            Completá el formulario y el equipo del instituto revisará tu solicitud
            para habilitarte como empresa colaboradora.
          </p>
        </div>

        {/* Aviso informativo */}
        <div className={styles.infoBanner}>
          <span className={styles.infoIcon}>ℹ️</span>
          <span>
            Tu cuenta no se creará automáticamente. El instituto evaluará la solicitud
            y se comunicará con vos por email.
          </span>
        </div>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>

          {/* ── Datos de la empresa ── */}
          <fieldset className={styles.section}>
            <legend className={styles.sectionTitle}>Datos de la empresa</legend>

            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="razonSocial" className={styles.label}>
                  Razón Social <span className={styles.required}>*</span>
                </label>
                <input
                  id="razonSocial"
                  name="razonSocial"
                  type="text"
                  value={form.razonSocial}
                  onChange={handleChange}
                  placeholder="Ej: Tech Solutions S.A."
                  className={styles.input}
                  required
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="cuit" className={styles.label}>
                  CUIT <span className={styles.required}>*</span>
                </label>
                <input
                  id="cuit"
                  name="cuit"
                  type="text"
                  value={form.cuit}
                  onChange={handleChange}
                  placeholder="Ej: 30-12345678-9"
                  className={styles.input}
                  required
                />
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="rubro" className={styles.label}>
                  Rubro <span className={styles.required}>*</span>
                </label>
                <input
                  id="rubro"
                  name="rubro"
                  type="text"
                  value={form.rubro}
                  onChange={handleChange}
                  placeholder="Ej: Tecnología e Informática"
                  className={styles.input}
                  required
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="ciudad" className={styles.label}>Ciudad</label>
                <input
                  id="ciudad"
                  name="ciudad"
                  type="text"
                  value={form.ciudad}
                  onChange={handleChange}
                  placeholder="Ej: Rosario"
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="direccion" className={styles.label}>Dirección</label>
              <input
                id="direccion"
                name="direccion"
                type="text"
                value={form.direccion}
                onChange={handleChange}
                placeholder="Ej: Av. Pellegrini 1234, piso 3"
                className={styles.input}
              />
            </div>
          </fieldset>

          {/* ── Contacto ── */}
          <fieldset className={styles.section}>
            <legend className={styles.sectionTitle}>Datos de contacto</legend>

            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="email" className={styles.label}>
                  Email <span className={styles.required}>*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="contacto@empresa.com"
                  className={styles.input}
                  required
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="telefono" className={styles.label}>Teléfono</label>
                <input
                  id="telefono"
                  name="telefono"
                  type="tel"
                  value={form.telefono}
                  onChange={handleChange}
                  placeholder="Ej: +54 341 555-1234"
                  className={styles.input}
                />
              </div>
            </div>
          </fieldset>

          {/* ── Carreras de interés ── */}
          <fieldset className={styles.section}>
            <legend className={styles.sectionTitle}>Carreras de interés</legend>
            <p className={styles.sectionHint}>
              Seleccioná las carreras cuyos estudiantes o egresados te interesan contratar:
            </p>
            <div className={styles.checkGrid}>
              {CARRERAS.map(carrera => {
                const checked = carreras.includes(carrera);
                return (
                  <label
                    key={carrera}
                    className={`${styles.checkItem} ${checked ? styles.checkItemActive : ''}`}
                    htmlFor={`carrera-${carrera}`}
                  >
                    <input
                      id={`carrera-${carrera}`}
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleCarreraToggle(carrera)}
                      className={styles.checkboxHidden}
                    />
                    <span className={styles.checkIcon}>{checked ? '✔' : ''}</span>
                    <span className={styles.checkLabel}>{carrera}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* ── Descripción y puestos ── */}
          <fieldset className={styles.section}>
            <legend className={styles.sectionTitle}>Información adicional</legend>

            <div className={styles.field}>
              <label htmlFor="descripcion" className={styles.label}>Descripción de la empresa</label>
              <textarea
                id="descripcion"
                name="descripcion"
                value={form.descripcion}
                onChange={handleChange}
                placeholder="Contanos a qué se dedica tu empresa, su historia y cultura..."
                className={styles.textarea}
                rows={4}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="puestos" className={styles.label}>Puestos o áreas de interés</label>
              <textarea
                id="puestos"
                name="puestos"
                value={form.puestos}
                onChange={handleChange}
                placeholder="Ej: Desarrollo de software, diseño UX/UI, soporte técnico..."
                className={styles.textarea}
                rows={3}
              />
            </div>
          </fieldset>

          {/* ── Reclutadores iniciales ── */}
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>👥 Reclutadores iniciales (opcional)</legend>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted, #64748b)', marginBottom: '1rem', lineHeight: 1.5 }}>
              Podés indicar los reclutadores que querés dar de alta. El admin creará sus cuentas al aprobar la solicitud y les enviará las credenciales por email.
            </p>

            {reclutadores.map((r, idx) => (
              <div key={idx} className={styles.reclutadorRow}>
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={r.nombre}
                  onChange={e => handleReclutadorChange(idx, 'nombre', e.target.value)}
                  className={styles.input}
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={r.email}
                  onChange={e => handleReclutadorChange(idx, 'email', e.target.value)}
                  className={styles.input}
                />
                {reclutadores.length > 1 && (
                  <button
                    type="button"
                    className={styles.btnQuitarReclutador}
                    onClick={() => quitarReclutador(idx)}
                    title="Quitar"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              className={styles.btnAgregarReclutador}
              onClick={agregarReclutador}
            >
              + Agregar otro reclutador
            </button>
          </fieldset>

          {/* ── Error ── */}
          {error && (
            <div className={styles.errorBanner} role="alert">
              <span>⚠️</span> {error}
            </div>
          )}


          {/* ── Acciones ── */}
          <div className={styles.actions}>
            <Link to="/" className={styles.btnSecondary}>
              ← Cancelar
            </Link>
            <button
              type="submit"
              id="btn-enviar-solicitud"
              className={styles.btnPrimary}
              disabled={loading}
            >
              {loading ? 'Enviando...' : '📤 Enviar Solicitud'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
