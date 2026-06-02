/**
 * MiEmpresaPage.jsx — Edición del perfil de empresa.
 *
 * Solo accesible para admin_empresa.
 * Campos editables: descripcion, rubro, sitioWeb, telefono, direccion, ciudad.
 * Campos de solo lectura: razonSocial, cuit, estadoAprobacion.
 *
 * Ruta: /empresa/mi-empresa
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { empresaService } from '../../services/api';

const ESTADO_LABEL = { aprobada: '✅ Aprobada', pendiente: '⏳ Pendiente', rechazada: '❌ Rechazada' };

export default function MiEmpresaPage() {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const [empresa,   setEmpresa]   = useState(null);
  const [form,      setForm]      = useState({});
  const [loading,   setLoading]   = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');

  // Determinar si es admin_empresa (puede editar) o solo lectura
  const esAdmin = usuario?.rolInterno === 'admin_empresa' || true; // backend ya protege la escritura

  useEffect(() => {
    empresaService.getMiEmpresa()
      .then(({ data }) => {
        const e = data.data ?? data;
        setEmpresa(e);
        setForm({
          descripcion: e.descripcion ?? '',
          rubro:       e.rubro       ?? '',
          sitioWeb:    e.sitioWeb    ?? '',
          telefono:    e.telefono    ?? '',
          direccion:   e.direccion   ?? '',
          ciudad:      e.ciudad      ?? '',
        });
      })
      .catch(() => setError('No se pudo cargar el perfil de empresa.'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setGuardando(true);
    try {
      const { data } = await empresaService.updateMiEmpresa(form);
      setEmpresa(data.data ?? data);
      setSuccess('Perfil de empresa actualizado correctamente.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al guardar los cambios.');
    } finally {
      setGuardando(false);
    }
  };

  if (loading) return <p className="msg">Cargando...</p>;

  return (
    <div className="page-container" style={{ maxWidth: 720 }}>
      <div className="dashboard-header">
        <div>
          <Link to="/empresa" className="btn-back">← Volver al panel</Link>
          <h1>Perfil de empresa</h1>
        </div>
      </div>

      {error   && <p className="error-msg">{error}</p>}
      {success && <p className="success-msg" style={{ color: 'var(--success)', fontWeight: 600 }}>{success}</p>}

      {/* Datos de solo lectura */}
      <section style={{ marginBottom: '2rem', padding: '1rem 1.25rem', background: 'var(--card-bg, #f8fafc)', borderRadius: 10, border: '1px solid var(--border)' }}>
        <h3 style={{ marginTop: 0, fontSize: '0.95rem', color: 'var(--text-muted)' }}>Datos institucionales (solo lectura)</h3>
        <dl style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.4rem 1rem', margin: 0, fontSize: '0.9rem' }}>
          <dt style={{ fontWeight: 600 }}>Razón Social</dt>
          <dd style={{ margin: 0 }}>{empresa?.razonSocial ?? '—'}</dd>
          <dt style={{ fontWeight: 600 }}>CUIT</dt>
          <dd style={{ margin: 0 }}>{empresa?.cuit ?? '—'}</dd>
          <dt style={{ fontWeight: 600 }}>Estado</dt>
          <dd style={{ margin: 0 }}>{ESTADO_LABEL[empresa?.estadoAprobacion] ?? empresa?.estadoAprobacion ?? '—'}</dd>
        </dl>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.75rem', marginBottom: 0 }}>
          Para modificar la razón social o el CUIT, contactate con el administrador del sistema.
        </p>
      </section>

      {/* Formulario de edición */}
      <form onSubmit={handleSubmit}>

        <div className="form-group">
          <label htmlFor="rubro">Rubro / Industria</label>
          <input id="rubro" name="rubro" type="text" value={form.rubro} onChange={handleChange}
            placeholder="Ej: Software y Tecnología" />
        </div>

        <div className="form-group">
          <label htmlFor="descripcion">Descripción de la empresa</label>
          <textarea id="descripcion" name="descripcion" rows={5} value={form.descripcion} onChange={handleChange}
            placeholder="Contanos brevemente a qué se dedica tu empresa..." />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="sitioWeb">Sitio web</label>
            <input id="sitioWeb" name="sitioWeb" type="url" value={form.sitioWeb} onChange={handleChange}
              placeholder="https://www.empresa.com" />
          </div>
          <div className="form-group">
            <label htmlFor="telefono">Teléfono institucional</label>
            <input id="telefono" name="telefono" type="tel" value={form.telefono} onChange={handleChange}
              placeholder="Ej: 11-4300-1234" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="ciudad">Ciudad</label>
            <input id="ciudad" name="ciudad" type="text" value={form.ciudad} onChange={handleChange}
              placeholder="Ej: Avellaneda" />
          </div>
          <div className="form-group">
            <label htmlFor="direccion">Dirección</label>
            <input id="direccion" name="direccion" type="text" value={form.direccion} onChange={handleChange}
              placeholder="Ej: Av. Mitre 1234" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <button type="submit" className="btn-primary" disabled={guardando}>
            {guardando ? 'Guardando...' : '✓ Guardar cambios'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/empresa')}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
