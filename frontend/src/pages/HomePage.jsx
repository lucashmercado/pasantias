/**
 * HomePage.jsx — Página de inicio pública del sistema.
 *
 * Es la primera pantalla que ven los visitantes no autenticados.
 * Muestra la barra de navegación pública y una página de "en construcción"
 * mientras se desarrolla el contenido definitivo del portal.
 *
 * Ruta: /
 * Acceso: público (sin autenticación requerida)
 */

// Barra de navegación para usuarios no autenticados (incluye botón de login)
import NavbarPublic from '../components/NavbarPublic/NavbarPublic';
// Página temporal que indica que el contenido está en construcción
import UnderConstructionPage from './placeholder/UnderConstructionPage';

export default function HomePage() {
  return (
    <>
      {/* Navbar público con logo y botón de acceso al sistema */}
      <NavbarPublic />
      {/* Contenido temporal hasta que se desarrolle la landing page definitiva */}
      <UnderConstructionPage />
    </>
  );
}
