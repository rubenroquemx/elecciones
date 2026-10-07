import React from 'react';
import { AlertTriangle, Info, Trash2, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              variant === 'danger' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
              variant === 'warning' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
              'bg-indigo-50 text-indigo-600 border border-indigo-200'
            }`}>
              {variant === 'danger' && <Trash2 className="w-5 h-5" />}
              {variant === 'warning' && <AlertTriangle className="w-5 h-5" />}
              {variant === 'info' && <Info className="w-5 h-5" />}
            </div>

            <div className="space-y-1.5 flex-1 min-w-0">
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                {title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {message}
              </p>
            </div>

            <button
              type="button"
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-all cursor-pointer active:scale-98 ${
              variant === 'danger' ? 'bg-rose-600 hover:bg-rose-700' :
              variant === 'warning' ? 'bg-amber-600 hover:bg-amber-700' :
              'bg-[#9d2449] hover:bg-[#851e3e]'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
