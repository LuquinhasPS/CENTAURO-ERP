import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import './ConfirmModal.css';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  const [timeLeft, setTimeLeft] = useState(3);
  const [canConfirm, setCanConfirm] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      setTimeLeft(3);
      setCanConfirm(false);
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanConfirm(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        clearInterval(timer);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="confirm-modal-overlay" onClick={onClose}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-header">
          <h3>{title}</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="confirm-modal-body">
          <p>{message}</p>
        </div>
        <div className="confirm-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={!canConfirm}
            style={{ opacity: canConfirm ? 1 : 0.5, cursor: canConfirm ? 'pointer' : 'not-allowed' }}
          >
            {canConfirm ? 'Confirmar' : `Aguarde ${timeLeft}s...`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
