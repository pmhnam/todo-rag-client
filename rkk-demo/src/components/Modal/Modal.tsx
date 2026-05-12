import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="rkk-modal-overlay" onClick={onClose}>
      <div
        className={`rkk-modal rkk-modal--${size}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="rkk-modal-header">
            <h3 className="rkk-modal-title">{title}</h3>
            <button className="rkk-modal-close" onClick={onClose}>
              ✕
            </button>
          </div>
        )}
        <div className="rkk-modal-body">{children}</div>
        {footer && <div className="rkk-modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
