import './MessageModal.css';

export default function MessageModal({ title, message, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h3>{title}</h3>
        <p>{message}</p>
        <button className="btn-primary" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}