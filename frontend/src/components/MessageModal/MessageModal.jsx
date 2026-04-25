/**
 * MessageModal.jsx — Modal de mensaje genérico.
 *
 * Muestra un cuadro de diálogo superpuesto con un título, un mensaje
 * y un botón para cerrarlo. Se usa principalmente para mostrar avisos
 * de funcionalidades en construcción o mensajes de confirmación.
 *
 * Props:
 * - title {string}    — Título del modal
 * - message {string}  — Cuerpo del mensaje
 * - onClose {Function}— Función que se llama al cerrar el modal
 *
 * Los estilos se cargan desde MessageModal.module.css (CSS Modules).
 */

import styles from './MessageModal.module.css';

export default function MessageModal({ title, message, onClose }) {
  return (
    // Overlay semitransparente que cubre toda la pantalla
    <div className={styles.modalOverlay}>
      {/* Caja del modal centrada en la pantalla */}
      <div className={styles.modalBox}>
        <h3>{title}</h3>
        <p>{message}</p>
        {/* Botón para cerrar el modal. Usa la clase global btn-primary */}
        <button className="btn-primary" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
