/**
 * RegisterPage.jsx — Página de registro rediseñada.
 *
 * Mejoras sobre la versión anterior:
 * - Selección de rol con tarjetas visuales al inicio del formulario
 * - Campos específicos por rol (carrera para alumno, razón social para empresa, etc.)
 * - Indicador de fuerza de contraseña en tiempo real
 * - Toggle mostrar/ocultar contraseña
 * - Validación visual de formato de email
 * - Mismo sistema de diseño que LoginPage (topbar, gradiente, card)
 */

import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './LoginPage.module.css';   // Reutilizamos el módulo del Login
import regStyles from './RegisterPage.module.css';

/* ── Configuración de roles ──────────────────────────────────────────────── */
const ROLES = [
  {
    value:   'alumno',
    label:   'Alumno',
    emoji:   '🎓',
    desc:    'Estudiante universitario buscando pasantía',
    pending: false,
  },
  {
    value:   'egresado',
    label:   'Egresado',
    emoji:   '🏅',
    desc:    'Ya me recibí y busco mi primer empleo',
    pending: false,
  },
  {
    value:   'empresa',
    label:   'Empresa',
    emoji:   '🏢',
    desc:    'Busco pasantes para mi organización',
    pending: true,
  },
  {
    value:   'profesor',
    label:   'Profesor',
    emoji:   '👨‍🏫',
    desc:    'Otorgo avales académicos a mis alumnos',
    pending: true,
  },
];

/* ── Evaluador de fuerza de contraseña ───────────────────────────────────── */
function calcPasswordStrength(pwd) {
  if (!pwd) return { level: 0, label: '', color: 'transparent' };
  let score = 0;
  if (pwd.length >= 6)  score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 1) return { level: 1, label: 'Muy débil',  color: '#ef4444' };
  if (score === 2) return { level: 2, label: 'Débil',      color: '#f97316' };
  if (score === 3) return { level: 3, label: 'Regular',    color: '#eab308' };
  if (score === 4) return { level: 4, label: 'Buena',      color: '#22c55e' };
  return              { level: 5, label: 'Excelente',  color: '#16a34a' };
}

/* ── Ícono ojo (show/hide password) ─────────────────────────────────────── */
const EyeOpen = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOff = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.89 1 12c.92-2.6 2.63-4.8 4.86-6.32" />
    <path d="M10.58 10.58a2 2 0 1 0 2.83 2.83" />
    <path d="M1 1l22 22" />
    <path d="M9.88 4.24A10.94 10.94 0 0 1 12 4c5 0 9.27 3.11 11 8a11.05 11.05 0 0 1-3.17 4.59" />
  </svg>
);

/* ══════════════════════════════════════════════════════════════════════════ */
export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nombre:      '',
    apellido:    '',
    email:       '',
    password:    '',
    rol:         'alumno',
    // Alumno / Egresado
    carrera:     '',
    legajo:      '',
    anioEgreso:  '',
    // Empresa
    razonSocial: '',
    // Todos (opcionales)
    telefono:    '',
    ubicacion:   '',
  });

  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const rolActual   = ROLES.find(r => r.value === form.rol);
  const pwdStrength = useMemo(() => calcPasswordStrength(form.password), [form.password]);

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const emailError  = emailTouched && form.email && !emailValido;

  const handleChange = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...form };
      // Limpiar campos no relevantes para el rol
      if (form.rol !== 'alumno' && form.rol !== 'egresado') {
        delete payload.carrera; delete payload.legajo; delete payload.anioEgreso;
      }
      if (form.rol !== 'empresa') delete payload.razonSocial;

      const data = await register(payload);

      if (rolActual?.pending) {
        // empresa / profesor → aviso + redirige al login
        navigate('/login', {
          state: { mensaje: data.message || 'Cuenta creada. Aguardá la aprobación del administrador.' }
        });
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrarse. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authLayout}>

      {/* ── Topbar desktop ──────────────────────────────────────────────── */}
      <header className={styles.authTopbar}>
        <button type="button" className={styles.authBack} onClick={() => navigate('/')}>
          <span className={styles.authBackIcon}>←</span>
          <span>volver</span>
        </button>
        <img src="/logo1-itb.png" alt="Instituto Tecnológico Beltrán" className={styles.authTopLogo} />
      </header>

      {/* ── Contenedor principal ─────────────────────────────────────────── */}
      <main className={styles.authContainer}>
        <div className={`${styles.authCard} ${regStyles.regCard}`}>

          {/* Logo mobile */}
          <img src="/logo1-itb.png" alt="Instituto" className={styles.authLogoMobile} />

          <div className={styles.authHeader}>
            <h1 className={styles.authSubtitle}>Crear cuenta</h1>
            <p className={styles.authDesc}>Completá los datos para unirte a la plataforma</p>
            <div className={styles.authDivider} />
          </div>

          <form onSubmit={handleSubmit} className={styles.authForm} noValidate>

            {/* ── 1. Selección de rol (cards visuales) ────────────────── */}
            <div className={regStyles.rolSection}>
              <label className={regStyles.rolLabel}>Tipo de cuenta</label>
              <div className={regStyles.rolGrid}>
                {ROLES.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    id={`rol-${r.value}`}
                    className={`${regStyles.rolCard} ${form.rol === r.value ? regStyles.rolCardActive : ''}`}
                    onClick={() => setForm(prev => ({ ...prev, rol: r.value }))}
                  >
                    <span className={regStyles.rolEmoji}>{r.emoji}</span>
                    <strong>{r.label}</strong>
                    <span className={regStyles.rolDesc}>{r.desc}</span>
                    {r.pending && (
                      <span className={regStyles.rolPending}>Requiere aprobación</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* ── 2. Nombre y Apellido ─────────────────────────────────── */}
            <div className={regStyles.formRow}>
              <div className="form-group">
                <label htmlFor="reg-nombre">Nombre *</label>
                <input
                  id="reg-nombre" name="nombre" value={form.nombre}
                  onChange={handleChange} required placeholder="Juan"
                />
              </div>
              <div className="form-group">
                <label htmlFor="reg-apellido">Apellido *</label>
                <input
                  id="reg-apellido" name="apellido" value={form.apellido}
                  onChange={handleChange} required placeholder="Pérez"
                />
              </div>
            </div>

            {/* ── 3. Email ─────────────────────────────────────────────── */}
            <div className="form-group">
              <label htmlFor="reg-email">
                Email *
                {emailError && (
                  <span className={regStyles.fieldError}> — formato inválido</span>
                )}
                {emailTouched && form.email && emailValido && (
                  <span className={regStyles.fieldOk}> ✓</span>
                )}
              </label>
              <input
                id="reg-email" type="email" name="email" value={form.email}
                onChange={handleChange}
                onBlur={() => setEmailTouched(true)}
                required
                placeholder="juan@email.com"
                style={emailError ? { borderColor: '#ef4444' } : {}}
              />
            </div>

            {/* ── 4. Contraseña ────────────────────────────────────────── */}
            <div className="form-group">
              <label htmlFor="reg-password">
                Contraseña *
                {form.password && (
                  <span
                    className={regStyles.pwdLabel}
                    style={{ color: pwdStrength.color }}
                  >
                    {' '}— {pwdStrength.label}
                  </span>
                )}
              </label>
              <div className={styles.passwordInputWrapper}>
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password" value={form.password}
                  onChange={handleChange}
                  required minLength={6}
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button" className={styles.passwordToggle}
                  onClick={() => setShowPassword(p => !p)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff /> : <EyeOpen />}
                </button>
              </div>
              {/* Barra de fuerza */}
              {form.password && (
                <div className={regStyles.pwdStrengthBar}>
                  {[1,2,3,4,5].map(i => (
                    <div
                      key={i}
                      className={regStyles.pwdStrengthSegment}
                      style={{ background: i <= pwdStrength.level ? pwdStrength.color : '#e2e8f0' }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── 5. Campos específicos por rol ────────────────────────── */}

            {/* Empresa → Razón Social */}
            {form.rol === 'empresa' && (
              <div className="form-group">
                <label htmlFor="reg-razonSocial">Razón Social *</label>
                <input
                  id="reg-razonSocial" name="razonSocial" value={form.razonSocial}
                  onChange={handleChange} required
                  placeholder="Nombre legal de la empresa (ej: Shell Argentina S.A.)"
                />
              </div>
            )}

            {/* Alumno → Carrera y Legajo */}
            {form.rol === 'alumno' && (
              <div className={regStyles.formRow}>
                <div className="form-group">
                  <label htmlFor="reg-carrera">
                    Carrera <span className={regStyles.opcional}>(opcional)</span>
                  </label>
                  <input
                    id="reg-carrera" name="carrera" value={form.carrera}
                    onChange={handleChange}
                    placeholder="Ej: Analista de Sistemas"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="reg-legajo">
                    Legajo <span className={regStyles.opcional}>(opcional)</span>
                  </label>
                  <input
                    id="reg-legajo" name="legajo" value={form.legajo}
                    onChange={handleChange}
                    placeholder="Ej: 12345"
                  />
                </div>
              </div>
            )}

            {/* Egresado → Año de egreso */}
            {form.rol === 'egresado' && (
              <div className={regStyles.formRow}>
                <div className="form-group">
                  <label htmlFor="reg-carrera">
                    Carrera <span className={regStyles.opcional}>(opcional)</span>
                  </label>
                  <input
                    id="reg-carrera" name="carrera" value={form.carrera}
                    onChange={handleChange}
                    placeholder="Ej: Analista de Sistemas"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="reg-anioEgreso">
                    Año de egreso <span className={regStyles.opcional}>(opcional)</span>
                  </label>
                  <input
                    id="reg-anioEgreso" name="anioEgreso" value={form.anioEgreso}
                    onChange={handleChange} type="number"
                    min="2000" max={new Date().getFullYear()}
                    placeholder={String(new Date().getFullYear())}
                  />
                </div>
              </div>
            )}

            {/* ── 6. Datos de contacto (todos los roles, opcionales) ─── */}
            <div className={regStyles.formRow}>
              <div className="form-group">
                <label htmlFor="reg-telefono">
                  Teléfono <span className={regStyles.opcional}>(opcional)</span>
                </label>
                <input
                  id="reg-telefono" type="tel" name="telefono" value={form.telefono}
                  onChange={handleChange} placeholder="+54 11 1234-5678"
                />
              </div>
              <div className="form-group">
                <label htmlFor="reg-ubicacion">
                  Ubicación <span className={regStyles.opcional}>(opcional)</span>
                </label>
                <input
                  id="reg-ubicacion" name="ubicacion" value={form.ubicacion}
                  onChange={handleChange} placeholder="Ciudad, Provincia"
                />
              </div>
            </div>

            {/* ── 7. Aviso para roles con aprobación ──────────────────── */}
            {rolActual?.pending && (
              <div className={regStyles.avisoAprobacion}>
                <span>ℹ️</span>
                <div>
                  <strong>Cuenta de {rolActual.label}</strong> — requiere aprobación del
                  administrador antes de poder ingresar al sistema. Recibirás acceso
                  una vez que sea revisada.
                </div>
              </div>
            )}

            {/* ── Error global ─────────────────────────────────────────── */}
            {error && <p className="error-msg">{error}</p>}

            {/* ── Submit ───────────────────────────────────────────────── */}
            <button
              type="submit"
              id="btn-crear-cuenta"
              className={`btn-primary ${styles.authSubmit}`}
              disabled={loading}
            >
              {loading ? 'Creando cuenta...' : 'CREAR CUENTA'}
            </button>
          </form>

          <div className={`${styles.authDivider} ${styles.authDividerBottom}`} />

          <p className={`${styles.authLink} ${styles.authRegister}`}>
            ¿Ya tenés cuenta?{' '}
            <Link to="/login">Iniciá sesión</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
