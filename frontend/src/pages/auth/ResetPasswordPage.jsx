import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../../services/api';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      return setError('La contraseña debe tener al menos 6 caracteres.');
    }
    if (password !== confirm) {
      return setError('Las contraseñas no coinciden.');
    }

    setLoading(true);
    try {
      const { data } = await authService.resetPassword(token, password);
      setSuccess(data.message);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al restablecer la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Sistema de Pasantías</h1>
        <h2 className="auth-subtitle">Nueva contraseña</h2>

        {success ? (
          <div className="reset-success">
            <div className="reset-success-icon">✅</div>
            <p className="reset-success-msg">{success}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.5rem' }}>
              Redirigiendo al login en 3 segundos...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Nueva contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label>Confirmar contraseña</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repetí la contraseña"
                required
              />
            </div>

            {/* Indicador de fortaleza */}
            {password.length > 0 && (
              <div className="password-strength">
                <div className={`strength-bar ${
                  password.length < 6 ? 'weak' :
                  password.length < 10 ? 'medium' : 'strong'
                }`} />
                <span className="strength-label">
                  {password.length < 6 ? 'Muy corta' :
                   password.length < 10 ? 'Aceptable' : '✓ Segura'}
                </span>
              </div>
            )}

            {error && <p className="error-msg">{error}</p>}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Restablecer contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
