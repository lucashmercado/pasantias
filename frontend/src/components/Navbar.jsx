import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificacionService } from '../services/api';

export default function Navbar() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [noLeidas, setNoLeidas] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!usuario) return;
    notificacionService.getAll()
      .then(({ data }) => setNoLeidas(data.data.filter((n) => !n.leida).length))
      .catch(() => {});
  }, [usuario, location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!usuario) return null;

  const linksAlumno = [
    { to: '/ofertas', label: 'Ofertas' },
    { to: '/mis-postulaciones', label: 'Mis Postulaciones' },
    { to: '/perfil', label: 'Mi Perfil' },
  ];
  const linksEmpresa = [
    { to: '/empresa', label: 'Panel' },
    { to: '/empresa/nueva-oferta', label: '+ Nueva Oferta' },
  ];
  const linksAdmin = [
    { to: '/admin', label: 'Administración' },
  ];

  const links =
    usuario.rol === 'admin' ? linksAdmin :
    usuario.rol === 'empresa' ? linksEmpresa :
    linksAlumno;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">🎓</span>
          <span>SisPasantías</span>
        </Link>

        {/* Links desktop */}
        <div className="navbar-links">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`nav-link ${location.pathname === l.to ? 'active' : ''}`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Acciones */}
        <div className="navbar-actions">
          {noLeidas > 0 && (
            <span className="notif-badge" title={`${noLeidas} notificaciones sin leer`}>
              🔔 {noLeidas}
            </span>
          )}
          <div className="user-menu" onClick={() => setMenuOpen(!menuOpen)}>
            <div className="avatar">{usuario.nombre?.[0]?.toUpperCase()}</div>
            <span className="user-name">{usuario.nombre}</span>
            <span className="arrow">▾</span>
            {menuOpen && (
              <div className="dropdown">
                <span className="dropdown-info">{usuario.email}</span>
                <span className="dropdown-role badge badge-{usuario.rol}">{usuario.rol}</span>
                <button onClick={handleLogout} className="dropdown-logout">Cerrar sesión</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
