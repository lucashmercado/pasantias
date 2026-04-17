import { Link } from 'react-router-dom';
import './NavbarPublic.css';

export default function NavbarPublic() {
  return (
    <nav className="navbar-public">
      <div className="navbar-public-inner">
        {/* Logo / Nombre del sitio */}
        <Link to="/" className="navbar-public-brand">
          <span className="brand-icon">🎓</span>
          <div className="brand-text">
            <span className="brand-title">SisPasantías</span>
            <span className="brand-subtitle">Portal de Empleo</span>
          </div>
        </Link>

        {/* Acciones: Botón de Login */}
        <div className="navbar-public-actions">
          <Link to="/login" className="btn-login">
            Iniciar Sesión
          </Link>
        </div>
      </div>
    </nav>
  );
}