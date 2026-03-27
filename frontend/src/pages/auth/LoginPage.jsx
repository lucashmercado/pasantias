import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

//Modal de mensaje
import MessageModal from '../../components/MessageModal';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  //estado del mensaje modal
  const [showMessage, setShowMessage] = useState(false);

  //funcion para abrir el modal
  const handleConstructionMessage = (e) => {
    e.preventDefault();
    setShowMessage(true);
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

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
      <div className="auth-container">
        <div className="auth-card">
          {/* <h1 className="auth-title">Sistema de Pasantías</h1> */}
          <h2 className="auth-subtitle">Iniciar Sesión</h2>
          <form
            onSubmit={handleSubmit}
            className="auth-form"
          >
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <div className="label-row">
                <label>Contraseña</label>
                {/* <Link to="/forgot-password" className="forgot-link">¿Olvidaste tu contraseña?</Link> */}
                <Link
                  to="#"
                  className="forgot-link"
                  onClick={handleConstructionMessage}
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>
            {error && <p className="error-msg">{error}</p>}
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
          <p className="auth-link">
            {/* ¿No tenés cuenta? <Link to="/register">Registrate</Link> */}
            ¿No tenés cuenta?{' '}
            <Link
              to="#"
              onClick={handleConstructionMessage}
            >
              Registrate
            </Link>
          </p>
        </div>
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
