/**
 * RegisterPage.jsx — Página de registro de nuevos usuarios.
 *
 * Permite crear cuentas con los siguientes roles:
 * - alumno    → redirige a /dashboard
 * - egresado  → redirige a /dashboard
 * - empresa   → requiere aprobación admin, redirige a /login con mensaje
 * - profesor  → requiere aprobación admin, redirige a /login con mensaje
 *
 * Campos del formulario:
 * - nombre, apellido, email, password (siempre requeridos)
 * - rol (select)
 * - razonSocial (solo empresa)
 * - telefono (opcional para todos los roles)
 * - ubicacion (opcional para todos los roles)
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Roles que requieren aprobación manual del administrador
const ROLES_PENDIENTES = ['empresa', 'profesor'];

// Roles disponibles en el selector
const OPCIONES_ROL = [
  { value: 'alumno',   label: 'Alumno' },
  { value: 'egresado', label: 'Egresado' },
  { value: 'empresa',  label: 'Empresa' },
  { value: 'profesor', label: 'Profesor' },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nombre:      '',
    apellido:    '',
    email:       '',
    password:    '',
    rol:         'alumno',
    razonSocial: '',
    telefono:    '',
    ubicacion:   '',
  });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await register(form);

      // Roles que esperan aprobación → aviso + redirige a login
      if (ROLES_PENDIENTES.includes(form.rol)) {
        alert(data.message || 'Tu cuenta fue creada y está pendiente de aprobación.');
        navigate('/login');
      } else {
        // Alumno / egresado → ingresan directo al dashboard
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrarse.');
    } finally {
      setLoading(false);
    }
  };

  const esEmpresa  = form.rol === 'empresa';
  const esProfesor = form.rol === 'profesor';

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Sistema de Pasantías</h1>
        <h2 className="auth-subtitle">Crear Cuenta</h2>

        <form onSubmit={handleSubmit} className="auth-form">
          {/* ── Nombre y Apellido ── */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="reg-nombre">Nombre</label>
              <input
                id="reg-nombre"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="reg-apellido">Apellido</label>
              <input
                id="reg-apellido"
                name="apellido"
                value={form.apellido}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* ── Email ── */}
          <div className="form-group">
            <label htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          {/* ── Contraseña ── */}
          <div className="form-group">
            <label htmlFor="reg-password">Contraseña</label>
            <input
              id="reg-password"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>

          {/* ── Tipo de cuenta ── */}
          <div className="form-group">
            <label htmlFor="reg-rol">Tipo de cuenta</label>
            <select id="reg-rol" name="rol" value={form.rol} onChange={handleChange}>
              {OPCIONES_ROL.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* ── Razón Social (solo empresa) ── */}
          {esEmpresa && (
            <div className="form-group">
              <label htmlFor="reg-razonSocial">Razón Social</label>
              <input
                id="reg-razonSocial"
                name="razonSocial"
                value={form.razonSocial}
                onChange={handleChange}
                required
                placeholder="Nombre legal de la empresa"
              />
            </div>
          )}

          {/* ── Teléfono (opcional) ── */}
          <div className="form-group">
            <label htmlFor="reg-telefono">
              Teléfono{' '}
              <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(opcional)</span>
            </label>
            <input
              id="reg-telefono"
              type="tel"
              name="telefono"
              value={form.telefono}
              onChange={handleChange}
              placeholder="+54 11 1234-5678"
            />
          </div>

          {/* ── Ubicación (opcional) ── */}
          <div className="form-group">
            <label htmlFor="reg-ubicacion">
              Ubicación{' '}
              <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(opcional)</span>
            </label>
            <input
              id="reg-ubicacion"
              name="ubicacion"
              value={form.ubicacion}
              onChange={handleChange}
              placeholder="Ciudad, Provincia"
            />
          </div>

          {/* Aviso para roles que necesitan aprobación */}
          {(esEmpresa || esProfesor) && (
            <p style={{
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              background: '#fef9e7',
              border: '1px solid #f0c040',
              borderRadius: 'var(--radius)',
              padding: '0.6rem 1rem',
            }}>
              ℹ️ Las cuentas de{' '}
              <strong>{esEmpresa ? 'empresa' : 'profesor'}</strong> requieren
              aprobación del administrador antes de poder ingresar.
            </p>
          )}

          {error && <p className="error-msg">{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Registrando...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="auth-link">
          ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link>
        </p>
      </div>
    </div>
  );
}
