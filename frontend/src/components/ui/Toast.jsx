import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

const ToastContext = createContext(null);

let counter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback(id => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, variant = 'success', duration = 4000 }) => {
      counter += 1;
      const id = counter;
      setToasts(prev => [...prev, { id, title, description, variant }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

const VARIANT_STYLES = {
  success: {
    bar: 'border-l-success',
    icon: <CheckCircle2 size={18} className="text-success" />,
  },
  error: {
    bar: 'border-l-danger',
    icon: <AlertCircle size={18} className="text-danger" />,
  },
  info: {
    bar: 'border-l-primary',
    icon: <Info size={18} className="text-primary" />,
  },
};

function ToastCard({ toast: t, onDismiss }) {
  const style = VARIANT_STYLES[t.variant] || VARIANT_STYLES.info;
  const [entering, setEntering] = useState(true);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntering(false));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div
      className={cn(
        'pointer-events-auto flex items-start gap-3 min-w-[280px] max-w-sm bg-white rounded-md shadow-lg border border-border border-l-4 px-4 py-3 transition-all duration-200',
        style.bar,
        entering ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0',
      )}
      role="status"
    >
      <div className="shrink-0 mt-0.5">{style.icon}</div>
      <div className="flex-1 min-w-0">
        {t.title && <div className="text-sm font-semibold text-text-light">{t.title}</div>}
        {t.description && <div className="text-xs text-text-muted mt-0.5">{t.description}</div>}
      </div>
      <button
        onClick={() => onDismiss(t.id)}
        className="shrink-0 text-text-muted hover:text-text-light"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <ToastCard key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
