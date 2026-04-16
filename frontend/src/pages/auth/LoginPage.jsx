import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import MessageModal from '../../components/MessageModal';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', remember:false, });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  //funcion para abrir el modal
  const handleConstructionMessage = (e) => {
    e.preventDefault();
    setShowMessage(true);
  };

  //Nuevo Abril
  const handleBack = () => {
    navigate(-1);
  }

  // const handleChange = (e) =>
  //   setForm({ ...form, [e.target.name]: e.target.value });
  //Modificacion Abril
  const handleChange = (e) => {
    const {name, value, type, checked} = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const usuario = await login(form.email, form.password);
      if (usuario.rol === 'admin') navigate('/admin');
      else if (usuario.rol === 'empresa') navigate('/empresa');
      else navigate('/ofertas');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
   <>
      <div className="auth-layout">
        {/* Top bar desktop */}
        <header className="auth-topbar">
          <button
            type="button"
            className="auth-back"
            onClick={handleBack}
          >
            <span className="auth-back-icon">←</span>
            <span>volver</span>
          </button>

          <img 
            src="/logo1-itb.png"
            alt="Instituto Tecnológico Beltrán"
            className="auth-top-logo"
          />
        </header>

        <main className="auth-container auth-container-wireframe">
          <div className="auth-card auth-card-wireframe">
            {/* Logo mobile */}
           <img
              src="/logo1-itb.png"
              alt="Instituto Tecnológico Beltrán"
              className="auth-logo-mobile"
          />

            <div className="auth-header">
              <h1 className="auth-subtitle">Inicia Sesión</h1>
              <p className="auth-desc">Accedé a tu cuenta</p>
              <div className="auth-divider" />
            </div>

            <form
              onSubmit={handleSubmit}
              className="auth-form"
            >
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Contraseña</label>

                <div className="password-input-wrapper">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={
                      showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                    }
                  >
                    {showPassword ? (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.89 1 12c.92-2.6 2.63-4.8 4.86-6.32" />
                        <path d="M10.58 10.58a2 2 0 1 0 2.83 2.83" />
                        <path d="M1 1l22 22" />
                        <path d="M9.88 4.24A10.94 10.94 0 0 1 12 4c5 0 9.27 3.11 11 8a11.05 11.05 0 0 1-3.17 4.59" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="auth-options">
                <label className="remember-checkbox">
                  <input
                    type="checkbox"
                    name="remember"
                    checked={form.remember}
                    onChange={handleChange}
                  />
                  <span>Recordarme</span>
                </label>

                <Link
                  to="#"
                  className="forgot-link"
                  onClick={handleConstructionMessage}
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              {error && <p className="error-msg">{error}</p>}

              <button
                type="submit"
                className="btn-primary auth-submit"
                disabled={loading}
              >
                {loading ? 'Ingresando...' : 'INGRESAR'}
              </button>
            </form>

            <div className="auth-divider auth-divider-bottom" />

            <p className="auth-link auth-register">
              ¿No tenés cuenta?{' '}
              <Link
                to="#"
                onClick={handleConstructionMessage}
              >
                Registrarse
              </Link>
            </p>
          </div>
        </main>
      </div>

      {showMessage && (
        <MessageModal
          title="Sitio en construcción"
          message="Esta funcionalidad todavía no está disponible."
          onClose={() => setShowMessage(false)}
        />
      )}
    </>
  );
}

//  <>
//       <div className="auth-container">
//         <div className="auth-card">
//           {/* <h1 className="auth-title">Sistema de Pasantías</h1> */}
//           <h2 className="auth-subtitle">Iniciar Sesión</h2>
//           <form
//             onSubmit={handleSubmit}
//             className="auth-form"
//           >
//             <div className="form-group">
//               <label>Email</label>
//               <input
//                 type="email"
//                 name="email"
//                 value={form.email}
//                 onChange={handleChange}
//                 required
//               />
//             </div>
//             <div className="form-group">
//               <div className="label-row">
//                 <label>Contraseña</label>
//                 {/* <Link to="/forgot-password" className="forgot-link">¿Olvidaste tu contraseña?</Link> */}
//                 <Link
//                   to="#"
//                   className="forgot-link"
//                   onClick={handleConstructionMessage}
//                 >
//                   ¿Olvidaste tu contraseña?
//                 </Link>
//               </div>
//               <input
//                 type="password"
//                 name="password"
//                 value={form.password}
//                 onChange={handleChange}
//                 required
//               />
//             </div>
//             {error && <p className="error-msg">{error}</p>}
//             <button
//               type="submit"
//               className="btn-primary"
//               disabled={loading}
//             >
//               {loading ? 'Ingresando...' : 'Ingresar'}
//             </button>
//           </form>
//           <p className="auth-link">
//             {/* ¿No tenés cuenta? <Link to="/register">Registrate</Link> */}
//             ¿No tenés cuenta?{' '}
//             <Link
//               to="#"
//               onClick={handleConstructionMessage}
//             >
//               Registrate
//             </Link>
//           </p>
//         </div>
//       </div>

//       {showMessage && (
//         <MessageModal
//           title="Sitio en construcción"
//           message="Esta funcionalidad todavía no está disponible."
//           onClose={() => setShowMessage(false)}
//         />
//       )}
//     </>