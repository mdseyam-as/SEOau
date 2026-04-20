import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  confirm: (title: string, message?: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const TOAST_CONFIG: Record<ToastType, { icon: React.ReactNode; bg: string; border: string; iconColor: string }> = {
  success: {
    icon: <CheckCircle2 className="w-5 h-5" />,
    bg: 'bg-green-500/20',
    border: 'border-green-500/40',
    iconColor: 'text-green-400'
  },
  error: {
    icon: <AlertTriangle className="w-5 h-5" />,
    bg: 'bg-red-500/20',
    border: 'border-red-500/40',
    iconColor: 'text-red-400'
  },
  warning: {
    icon: <AlertCircle className="w-5 h-5" />,
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500/40',
    iconColor: 'text-yellow-400'
  },
  info: {
    icon: <Info className="w-5 h-5" />,
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/40',
    iconColor: 'text-blue-400'
  }
};

interface ConfirmModalProps {
  title: string;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ title, message, onConfirm, onCancel }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(17,24,39,0.95))] p-6 shadow-[0_30px_80px_rgba(2,6,23,0.55)] animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#10b981,#38bdf8,#f472b6)]" />
        <div className="pointer-events-none absolute -right-10 top-6 h-24 w-24 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-24 w-24 rounded-full bg-sky-400/10 blur-3xl" />

        <div className="relative flex items-start gap-4 mb-5">
          <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-amber-300 shadow-[0_16px_36px_rgba(245,158,11,0.12)]">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
              Подтверждение
            </div>
            <h3 id="confirm-title" className="text-xl font-bold tracking-tight text-white">{title}</h3>
            {message && <p className="mt-2 text-sm leading-relaxed text-slate-300">{message}</p>}
          </div>
        </div>

        <div className="relative flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 transition-all hover:bg-white/10 hover:text-white"
            aria-label="Отменить действие"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#ef4444_0%,#f97316_100%)] px-5 py-3 text-sm font-bold text-white shadow-[0_18px_40px_rgba(239,68,68,0.24)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_46px_rgba(239,68,68,0.30)]"
            aria-label="Подтвердить действие"
          >
            Подтвердить
          </button>
        </div>
      </div>
    </div>
  );
};

const ToastItem: React.FC<{ toast: Toast; onRemove: () => void }> = ({ toast, onRemove }) => {
  const config = TOAST_CONFIG[toast.type];

  useEffect(() => {
    const duration = toast.duration ?? 4000;
    if (duration > 0) {
      const timer = setTimeout(onRemove, duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, onRemove]);

  return (
    <div
      className={`${config.bg} ${config.border} border rounded-xl p-4 shadow-lg backdrop-blur-sm animate-in slide-in-from-right duration-300 flex items-start gap-3 min-w-[300px] max-w-[400px]`}
      role="alert"
      aria-live="polite"
    >
      <div className={config.iconColor}>{config.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-slate-300 mt-0.5">{toast.message}</p>
        )}
      </div>
      <button
        onClick={onRemove}
        className="text-slate-400 hover:text-white transition-colors p-1"
        aria-label="Закрыть уведомление"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message?: string;
    resolve: (value: boolean) => void;
  } | null>(null);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((title: string, message?: string) => {
    addToast({ type: 'success', title, message });
  }, [addToast]);

  const error = useCallback((title: string, message?: string) => {
    addToast({ type: 'error', title, message, duration: 6000 });
  }, [addToast]);

  const warning = useCallback((title: string, message?: string) => {
    addToast({ type: 'warning', title, message });
  }, [addToast]);

  const info = useCallback((title: string, message?: string) => {
    addToast({ type: 'info', title, message });
  }, [addToast]);

  const confirm = useCallback((title: string, message?: string): Promise<boolean> => {
    return new Promise(resolve => {
      setConfirmState({ title, message, resolve });
    });
  }, []);

  const handleConfirm = () => {
    confirmState?.resolve(true);
    setConfirmState(null);
  };

  const handleCancel = () => {
    confirmState?.resolve(false);
    setConfirmState(null);
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info, confirm }}>
      {children}

      {/* Toast Container */}
      <div
        className="fixed top-4 right-4 z-[90] flex flex-col gap-2"
        aria-label="Уведомления"
        role="region"
      >
        {toasts.map(toast => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={() => removeToast(toast.id)}
          />
        ))}
      </div>

      {/* Confirm Modal */}
      {confirmState && (
        <ConfirmModal
          title={confirmState.title}
          message={confirmState.message}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ToastContext.Provider>
  );
};
