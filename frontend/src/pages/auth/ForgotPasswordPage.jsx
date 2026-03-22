import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [devToken, setDevToken] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    setDevToken('');
    setLoading(true);
    try {
      const { data } = await authService.forgotPassword(email);
      setMsg(data.message);
      if (data.devToken) setDevToken(data.devToken);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Sistema de Pasantías</h1>
        <h2 className="auth-subtitle">Recuperar contraseña</h2>
        <p className="auth-desc">
          Ingresá tu email y te enviaremos un link para restablecer tu contraseña.
        </p>

        {!msg ? (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
              />
            </div>
            {error && <p className="error-msg">{error}</p>}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar instrucciones'}
            </button>
          </form>
        ) : (
          <div className="reset-success">
            <div className="reset-success-icon">✉️</div>
            <p className="reset-success-msg">{msg}</p>

            {/* Solo en desarrollo cuando no hay email configurado */}
            {devToken && (
              <div className="dev-token-box">
                <p className="dev-token-label">⚠️ Modo desarrollo — copiá este token:</p>
                <Link
                  to={`/reset-password/${devToken}`}
                  className="btn-primary"
                  style={{ marginTop: '0.75rem', display: 'inline-block', textAlign: 'center' }}
                >
                  Ir a restablecer contraseña →
                </Link>
              </div>
            )}
          </div>
        )}

        <p className="auth-link">
          <Link to="/login">← Volver al inicio de sesión</Link>
        </p>
      </div>
    </div>
  );
}
