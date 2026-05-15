import React, { useState, useEffect, useCallback } from 'react';
import { ToastContext, type ToastType } from './ToastContext';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

let toastId = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="rkk-toast-container">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem: React.FC<{ toast: ToastItem; onRemove: (id: number) => void }> = ({
  toast,
  onRemove,
}) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const icons: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  return (
    <div
      className={`rkk-toast rkk-toast--${toast.type} ${isExiting ? 'rkk-toast--exit' : ''}`}
      onClick={() => {
        setIsExiting(true);
        setTimeout(() => onRemove(toast.id), 300);
      }}
    >
      <span className="rkk-toast-icon">{icons[toast.type]}</span>
      <span className="rkk-toast-message">{toast.message}</span>
    </div>
  );
};
