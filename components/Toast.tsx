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
        className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 mb-4">
          <div className="p-2 bg-yellow-500/20 rounded-xl text-yellow-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 id="confirm-title" className="text-lg font-bold text-white">{title}</h3>
            {message && <p className="text-sm text-slate-400 mt-1">{message}</p>}
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
            aria-label="Отменить действие"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl transition-colors"
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
