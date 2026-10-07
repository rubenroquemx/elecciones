import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
}

interface ToastNotificationProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: () => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 4500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const bgStyles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    error: 'bg-rose-50 border-rose-200 text-rose-900',
    info: 'bg-indigo-50 border-indigo-200 text-indigo-900',
  }[toast.type];

  const iconColor = {
    success: 'text-emerald-600',
    error: 'text-rose-600',
    info: 'text-indigo-600',
  }[toast.type];

  return (
    <div 
      className={`pointer-events-auto p-3.5 rounded-2xl border shadow-lg flex items-start gap-3 animate-in slide-in-from-top-2 duration-200 ${bgStyles}`}
      role="alert"
    >
      <div className={`mt-0.5 shrink-0 ${iconColor}`}>
        {toast.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
        {toast.type === 'error' && <AlertCircle className="w-4 h-4" />}
        {toast.type === 'info' && <Info className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        {toast.title && <h5 className="text-xs font-bold leading-tight">{toast.title}</h5>}
        <p className="text-xs opacity-90 leading-snug">{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
