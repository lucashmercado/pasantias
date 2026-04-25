/**
 * ChatPage.jsx — Sistema de mensajería interna de la plataforma.
 *
 * Rutas: /chat  y  /chat/:usuarioId
 *
 * Funciones:
 *  - Lista de conversaciones activas en el panel izquierdo
 *  - Mensajes de la conversación seleccionada en el panel derecho
 *  - Envío de nuevos mensajes
 *  - Marca como leído al abrir una conversación
 *  - Sincronización de mensajes cada 10 segundos (polling)
 *
 * Endpoints:
 *  GET  /api/mensajes/conversaciones
 *  GET  /api/mensajes/:conversacionId
 *  POST /api/mensajes
 *  PATCH /api/mensajes/:mensajeId/leer
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mensajeService } from '../services/api';
import styles from './ChatPage.module.css';

const POLL_INTERVAL = 10_000; // ms

/** Formatea hora para mostrar en burbuja de mensaje */
function formatHora(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

/** Formatea fecha para separadores de día */
function formatFecha(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Avatar circular con inicial */
function Avatar({ nombre, size = 36, color = 'var(--primary)' }) {
  return (
    <div
      className={styles.avatar}
      style={{ width: size, height: size, minWidth: size, background: color, fontSize: size * 0.38 }}
    >
      {(nombre?.[0] ?? '?').toUpperCase()}
    </div>
  );
}

/** Card de conversación en el panel lateral */
function ConversacionItem({ conv, activo, onClick }) {
  const noLeidos = conv.mensajesNoLeidos ?? 0;
  return (
    <div
      className={`${styles.convItem} ${activo ? styles.convActivo : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <Avatar nombre={conv.participante?.nombre} color={activo ? '#fff' : 'var(--primary)'} />
      <div className={styles.convInfo}>
        <div className={styles.convNombreRow}>
          <strong className={styles.convNombre}>
            {conv.participante?.nombre} {conv.participante?.apellido}
          </strong>
          <span className={styles.convHora}>
            {formatHora(conv.ultimoMensaje?.createdAt)}
          </span>
        </div>
        <div className={styles.convPreviewRow}>
          <span className={styles.convPreview}>
            {conv.ultimoMensaje?.contenido ?? 'Sin mensajes'}
          </span>
          {noLeidos > 0 && (
            <span className={styles.convBadge}>{noLeidos}</span>
          )}
        </div>
      </div>
    </div>
  );
}

/** Burbuja de mensaje individual */
function BurbujaMensaje({ mensaje, esMio }) {
  return (
    <div className={`${styles.burbujaWrap} ${esMio ? styles.burbujaWrapMia : ''}`}>
      {!esMio && (
        <Avatar nombre={mensaje.remitente?.nombre} size={30} />
      )}
      <div className={`${styles.burbuja} ${esMio ? styles.burbujaMia : styles.burbujaSuya}`}>
        <p>{mensaje.contenido}</p>
        <span className={styles.burbujaHora}>
          {formatHora(mensaje.createdAt)}
          {esMio && (
            <span className={styles.burbujaLeido} title={mensaje.leido ? 'Leído' : 'Enviado'}>
              {mensaje.leido ? ' ✓✓' : ' ✓'}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

/* ── Componente principal ──────────────────────────────────────────────────── */
export default function ChatPage() {
  const { usuarioId }   = useParams();   // Conversación preseleccionada (opcional)
  const { usuario }     = useAuth();
  const navigate        = useNavigate();

  const [conversaciones,      setConversaciones]      = useState([]);
  const [convActiva,          setConvActiva]          = useState(null);  // ID de conversación activa
  const [mensajes,            setMensajes]            = useState([]);
  const [nuevoMensaje,        setNuevoMensaje]        = useState('');
  const [loadingConvs,        setLoadingConvs]        = useState(true);
  const [loadingMensajes,     setLoadingMensajes]     = useState(false);
  const [enviando,            setEnviando]            = useState(false);
  const [errorConvs,          setErrorConvs]          = useState('');

  const mensajesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const pollRef        = useRef(null);

  /* ── Scroll al último mensaje ──────────────────────────────────────────── */
  const scrollBottom = useCallback(() => {
    mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  /* ── Cargar conversaciones ─────────────────────────────────────────────── */
  useEffect(() => {
    mensajeService
      .getConversaciones()
      .then(({ data }) => {
        const lista = data.data ?? data ?? [];
        setConversaciones(lista);
        // Si viene un usuarioId en la URL, seleccionar esa conversación
        if (usuarioId) {
          const match = lista.find((c) => String(c.participante?.id) === String(usuarioId));
          if (match) setConvActiva(match.id ?? match.conversacionId);
        }
      })
      .catch(() => setErrorConvs('No se pudo cargar las conversaciones.'))
      .finally(() => setLoadingConvs(false));
  }, [usuarioId]);

  /* ── Cargar mensajes cuando cambia la conversación activa ──────────────── */
  useEffect(() => {
    if (!convActiva) return;

    const cargarMensajes = async () => {
      setLoadingMensajes(true);
      try {
        const { data } = await mensajeService.getMensajes(convActiva);
        const lista = data.data ?? data ?? [];
        setMensajes(lista);
        // Marcar como leído el último mensaje no propio
        const noLeido = lista.filter((m) => !m.leido && m.remitenteId !== usuario?.id);
        for (const m of noLeido) {
          mensajeService.marcarLeido(m.id).catch(() => {});
        }
        // Actualizar contador en la lista
        setConversaciones((prev) =>
          prev.map((c) =>
            (c.id ?? c.conversacionId) === convActiva
              ? { ...c, mensajesNoLeidos: 0 }
              : c
          )
        );
      } catch {
        // Fallo silencioso para el polling
      } finally {
        setLoadingMensajes(false);
      }
    };

    cargarMensajes().then(scrollBottom);

    // Polling cada 10 segundos
    clearInterval(pollRef.current);
    pollRef.current = setInterval(cargarMensajes, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [convActiva, usuario?.id]);

  useEffect(() => { scrollBottom(); }, [mensajes]);

  /* ── Enviar mensaje ────────────────────────────────────────────────────── */
  const handleEnviar = async (e) => {
    e.preventDefault();
    const texto = nuevoMensaje.trim();
    if (!texto || !convActiva || enviando) return;

    setEnviando(true);
    setNuevoMensaje('');
    try {
      const { data } = await mensajeService.enviar({
        conversacionId: convActiva,
        contenido: texto,
      });
      const nuevo = data.data ?? data;
      setMensajes((prev) => [...prev, nuevo]);
    } catch {
      setNuevoMensaje(texto); // Restaurar si falla
      alert('No se pudo enviar el mensaje. Intentá de nuevo.');
    } finally {
      setEnviando(false);
      inputRef.current?.focus();
    }
  };

  /* ── Conversación activa (objeto completo) ─────────────────────────────── */
  const convActivaObj = conversaciones.find(
    (c) => (c.id ?? c.conversacionId) === convActiva
  );

  return (
    <div className={styles.chatLayout}>
      {/* ── Panel izquierdo: lista de conversaciones ──────────────────── */}
      <aside className={`${styles.sidebar} ${convActiva ? styles.sidebarHiddenMobile : ''}`}>
        <div className={styles.sidebarHeader}>
          <h2>💬 Mensajes</h2>
        </div>

        {loadingConvs ? (
          <div className={styles.sidebarLoading}>
            {[1, 2, 3].map((i) => <div key={i} className={styles.skeletonConv} />)}
          </div>
        ) : errorConvs ? (
          <p className={styles.sidebarError}>{errorConvs}</p>
        ) : conversaciones.length === 0 ? (
          <div className={styles.sidebarEmpty}>
            <span>✉️</span>
            <p>No tenés conversaciones aún.</p>
          </div>
        ) : (
          <div className={styles.convList}>
            {conversaciones.map((conv) => {
              const id = conv.id ?? conv.conversacionId;
              return (
                <ConversacionItem
                  key={id}
                  conv={conv}
                  activo={id === convActiva}
                  onClick={() => {
                    setConvActiva(id);
                    if (conv.participante?.id) {
                      navigate(`/chat/${conv.participante.id}`, { replace: true });
                    }
                  }}
                />
              );
            })}
          </div>
        )}
      </aside>

      {/* ── Panel derecho: vista de mensajes ──────────────────────────── */}
      <main className={`${styles.chatMain} ${!convActiva ? styles.chatMainHiddenMobile : ''}`}>
        {!convActiva ? (
          <div className={styles.chatEmpty}>
            <span>💬</span>
            <h3>Seleccioná una conversación</h3>
            <p>Elegí un contacto de la lista para ver los mensajes.</p>
          </div>
        ) : (
          <>
            {/* Encabezado de la conversación */}
            <div className={styles.chatHeader}>
              <button
                className={styles.backBtn}
                onClick={() => { setConvActiva(null); navigate('/chat', { replace: true }); }}
                aria-label="Volver a conversaciones"
              >
                ←
              </button>
              <Avatar nombre={convActivaObj?.participante?.nombre} size={36} />
              <div className={styles.chatHeaderInfo}>
                <strong>
                  {convActivaObj?.participante?.nombre} {convActivaObj?.participante?.apellido}
                </strong>
                <span>{convActivaObj?.participante?.email}</span>
              </div>
            </div>

            {/* Mensajes */}
            <div className={styles.mensajesArea}>
              {loadingMensajes && mensajes.length === 0 ? (
                <p className={styles.cargandoMsg}>Cargando mensajes...</p>
              ) : mensajes.length === 0 ? (
                <p className={styles.cargandoMsg}>Aún no hay mensajes en esta conversación.</p>
              ) : (
                <>
                  {mensajes.map((m, idx) => {
                    const esMio = m.remitenteId === usuario?.id || m.remitente?.id === usuario?.id;
                    // Separador de fecha
                    const fechaAnterior = idx > 0 ? mensajes[idx - 1].createdAt : null;
                    const mismaFecha = fechaAnterior &&
                      new Date(m.createdAt).toDateString() === new Date(fechaAnterior).toDateString();
                    return (
                      <div key={m.id}>
                        {!mismaFecha && (
                          <div className={styles.fechaSep}>
                            <span>{formatFecha(m.createdAt)}</span>
                          </div>
                        )}
                        <BurbujaMensaje mensaje={m} esMio={esMio} />
                      </div>
                    );
                  })}
                  <div ref={mensajesEndRef} />
                </>
              )}
            </div>

            {/* Input de envío */}
            <form className={styles.inputBar} onSubmit={handleEnviar}>
              <input
                ref={inputRef}
                type="text"
                value={nuevoMensaje}
                onChange={(e) => setNuevoMensaje(e.target.value)}
                placeholder="Escribí un mensaje..."
                disabled={enviando}
                maxLength={2000}
                autoComplete="off"
              />
              <button
                type="submit"
                className={styles.sendBtn}
                disabled={enviando || !nuevoMensaje.trim()}
                aria-label="Enviar mensaje"
              >
                {enviando ? '…' : '➤'}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
