import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import './Modal.css';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = '700px',
  headerActions
}) => {

  // Lógica global para fechar com o ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Evitar scroll duplo com o fundo
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="std-modal-overlay">
      <div
        className="std-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: maxWidth }}
      >
        <div className="std-modal-header">
          <h3 className="std-modal-title">{title}</h3>

          <div className="std-modal-header-actions">
            {headerActions}
            <button
              type="button"
              onClick={onClose}
              className="std-modal-close-btn"
              title="Fechar"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="std-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
