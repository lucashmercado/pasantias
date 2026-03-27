import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

//Pagina de construcción
import UnderConstructionPage from './pages/placeholder/UnderConstructionPage';

// Páginas públicas
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Páginas alumno/egresado
import OfertasPage from './pages/alumno/OfertasPage';
import OfertaDetallePage from './pages/alumno/OfertaDetallePage';
import MisPostulacionesPage from './pages/alumno/MisPostulacionesPage';
import PerfilPage from './pages/alumno/PerfilPage';

// Páginas empresa
import EmpresaDashboardPage from './pages/empresa/EmpresaDashboardPage';
import CrearOfertaPage from './pages/empresa/CrearOfertaPage';
import PostulantesMiOfertaPage from './pages/empresa/PostulantesMiOfertaPage';

// Páginas admin
import AdminDashboardPage from './pages/admin/AdminDashboardPage';

// Componente de navegación
import Navbar from './components/Navbar';
import TopBanner from './components/TopBanner';

// Componente de ruta protegida
const ProtectedRoute = ({ children, roles }) => {
  const { usuario, loading } = useAuth();
  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}>Cargando...</div>;
  if (!usuario) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(usuario.rol)) return <Navigate to="/" replace />;
  return children;
};

function AppRoutes() {
  const { usuario } = useAuth();
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/login" element={!usuario ? <LoginPage /> : <Navigate to="/" replace />} />
      <Route path="/register" element={!usuario ? <RegisterPage /> : <Navigate to="/" replace />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

      {/* Redirección raíz según rol */}
      <Route path="/" element={
        !usuario ? <Navigate to="/login" replace />
        : usuario.rol === 'admin' ? <Navigate to="/admin" replace />
        : usuario.rol === 'empresa' ? <Navigate to="/empresa" replace />
        : <Navigate to="/ofertas" replace />
      } />

      {/* Alumno / Egresado */}
      <Route path="/ofertas" element={
        // <ProtectedRoute roles={['alumno', 'egresado']}><OfertasPage /></ProtectedRoute>
         <ProtectedRoute roles={['alumno', 'egresado']}><UnderConstructionPage /></ProtectedRoute>
      } />
      <Route path="/ofertas/:id" element={
        <ProtectedRoute roles={['alumno', 'egresado']}><OfertaDetallePage /></ProtectedRoute>
      } />
      <Route path="/mis-postulaciones" element={
        <ProtectedRoute roles={['alumno', 'egresado']}><MisPostulacionesPage /></ProtectedRoute>
      } />
      <Route path="/perfil" element={
        <ProtectedRoute roles={['alumno', 'egresado']}><PerfilPage /></ProtectedRoute>
      } />

      {/* Empresa */}
      <Route path="/empresa" element={
        <ProtectedRoute roles={['empresa']}><EmpresaDashboardPage /></ProtectedRoute>
      } />
      <Route path="/empresa/nueva-oferta" element={
        <ProtectedRoute roles={['empresa']}><CrearOfertaPage /></ProtectedRoute>
      } />
      <Route path="/empresa/postulantes/:ofertaId" element={
        <ProtectedRoute roles={['empresa']}><PostulantesMiOfertaPage /></ProtectedRoute>
      } />

      {/* Admin */}
      <Route path="/admin" element={
        <ProtectedRoute roles={['admin']}><AdminDashboardPage /></ProtectedRoute>
      } />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <TopBanner />
        {/* <Navbar /> */}
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
