import { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [empresasPendientes, setEmpresasPendientes] = useState([]);
  const [ofertasPendientes, setOfertasPendientes] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargarDatos = async () => {
    const [s, ep, op] = await Promise.all([
      adminService.getStats(),
      adminService.getEmpresasPendientes(),
      adminService.getOfertasPendientes(),
    ]);
    setStats(s.data.data);
    setEmpresasPendientes(ep.data.data);
    setOfertasPendientes(op.data.data);
    setLoading(false);
  };

  useEffect(() => { cargarDatos(); }, []);

  const handleAprobarEmpresa = async (id) => {
    await adminService.aprobarEmpresa(id);
    setEmpresasPendientes(empresasPendientes.filter((e) => e.id !== id));
  };
  const handleRechazarEmpresa = async (id) => {
    await adminService.rechazarEmpresa(id);
    setEmpresasPendientes(empresasPendientes.filter((e) => e.id !== id));
  };
  const handleModerarOferta = async (id, aprobada) => {
    await adminService.moderarOferta(id, aprobada);
    setOfertasPendientes(ofertasPendientes.filter((o) => o.id !== id));
  };

  if (loading) return <p>Cargando panel...</p>;

  const chartData = stats ? [
    { name: 'Usuarios', valor: stats.totalUsuarios },
    { name: 'Empresas', valor: stats.totalEmpresas },
    { name: 'Ofertas', valor: stats.totalOfertas },
    { name: 'Postulaciones', valor: stats.totalPostulaciones },
    { name: 'Contratados', valor: stats.contratados },
  ] : [];

  return (
    <div className="page-container">
      <h1>Panel de Administración</h1>

      {/* Estadísticas */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card"><span className="stat-num">{stats.totalUsuarios}</span><span>Usuarios</span></div>
          <div className="stat-card"><span className="stat-num">{stats.totalEmpresas}</span><span>Empresas</span></div>
          <div className="stat-card"><span className="stat-num">{stats.totalOfertas}</span><span>Ofertas</span></div>
          <div className="stat-card"><span className="stat-num">{stats.totalPostulaciones}</span><span>Postulaciones</span></div>
          <div className="stat-card highlight"><span className="stat-num">{stats.tasaInsercion}</span><span>Tasa de Inserción</span></div>
        </div>
      )}

      {/* Gráfico */}
      <div className="chart-container">
        <h2>Estadísticas Globales</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="valor" fill="#6366f1" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Empresas pendientes */}
      <section className="admin-section">
        <h2>Empresas Pendientes de Aprobación ({empresasPendientes.length})</h2>
        {empresasPendientes.length === 0 ? <p>No hay empresas pendientes.</p> : (
          <div className="pendientes-list">
            {empresasPendientes.map((e) => (
              <div key={e.id} className="pendiente-card">
                <div>
                  <strong>{e.razonSocial}</strong>
                  <p>{e.usuario?.nombre} {e.usuario?.apellido} — {e.usuario?.email}</p>
                </div>
                <div className="pendiente-actions">
                  <button className="btn-ok" onClick={() => handleAprobarEmpresa(e.id)}>Aprobar</button>
                  <button className="btn-danger" onClick={() => handleRechazarEmpresa(e.id)}>Rechazar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Ofertas pendientes de moderación */}
      <section className="admin-section">
        <h2>Ofertas Pendientes de Moderación ({ofertasPendientes.length})</h2>
        {ofertasPendientes.length === 0 ? <p>No hay ofertas pendientes.</p> : (
          <div className="pendientes-list">
            {ofertasPendientes.map((o) => (
              <div key={o.id} className="pendiente-card">
                <div>
                  <strong>{o.titulo}</strong>
                  <p>{o.empresa?.razonSocial}</p>
                </div>
                <div className="pendiente-actions">
                  <button className="btn-ok" onClick={() => handleModerarOferta(o.id, true)}>Aprobar</button>
                  <button className="btn-danger" onClick={() => handleModerarOferta(o.id, false)}>Rechazar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
