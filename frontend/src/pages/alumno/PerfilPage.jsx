import { useState, useEffect } from 'react';
import { userService } from '../../services/api';

export default function PerfilPage() {
  const [perfil, setPerfil] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState('');
  const [cvFile, setCvFile] = useState(null);

  useEffect(() => {
    userService.getPerfil().then(({ data }) => {
      setPerfil(data.data);
      setForm(data.data || {});
    }).finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleGuardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const { data } = await userService.updatePerfil(form);
      setPerfil(data.data);
      setMsg('✅ Perfil actualizado correctamente.');
    } catch (err) {
      setMsg('❌ Error al guardar el perfil.');
    } finally {
      setGuardando(false);
    }
  };

  const handleSubirCV = async () => {
    if (!cvFile) return;
    const formData = new FormData();
    formData.append('cv', cvFile);
    try {
      await userService.subirCV(formData);
      setMsg('✅ CV subido correctamente.');
    } catch (err) {
      setMsg('❌ Error al subir el CV.');
    }
  };

  if (loading) return <p>Cargando perfil...</p>;

  return (
    <div className="page-container">
      <h1>Mi Perfil Profesional</h1>
      <form onSubmit={handleGuardar} className="perfil-form">
        <div className="form-row">
          <div className="form-group">
            <label>Carrera</label>
            <input name="carrera" value={form.carrera || ''} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Año de Egreso</label>
            <input type="number" name="anioEgreso" value={form.anioEgreso || ''} onChange={handleChange} />
          </div>
        </div>
        <div className="form-group">
          <label>Descripción / Resumen Profesional</label>
          <textarea name="descripcion" value={form.descripcion || ''} onChange={handleChange} rows={4} />
        </div>
        <div className="form-group">
          <label>Área de Interés</label>
          <input name="areaInteres" value={form.areaInteres || ''} onChange={handleChange} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>LinkedIn</label>
            <input name="linkedin" value={form.linkedin || ''} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>GitHub</label>
            <input name="github" value={form.github || ''} onChange={handleChange} />
          </div>
        </div>
        <div className="form-group">
          <label>Disponibilidad</label>
          <select name="disponibilidad" value={form.disponibilidad || 'inmediata'} onChange={handleChange}>
            <option value="inmediata">Inmediata</option>
            <option value="1_mes">En 1 mes</option>
            <option value="3_meses">En 3 meses</option>
            <option value="no_disponible">No disponible</option>
          </select>
        </div>
        <button type="submit" className="btn-primary" disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>

      <div className="cv-section">
        <h2>Currículum Vitae</h2>
        {perfil?.cvPath && <p>CV actual: <a href={`http://localhost:5000${perfil.cvPath}`} target="_blank" rel="noreferrer">Ver CV actual</a></p>}
        <input type="file" accept=".pdf" onChange={(e) => setCvFile(e.target.files[0])} />
        <button className="btn-secondary" onClick={handleSubirCV}>Subir nuevo CV</button>
      </div>

      {msg && <p className="msg">{msg}</p>}
    </div>
  );
}
