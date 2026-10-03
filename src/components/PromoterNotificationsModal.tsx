import React from 'react';
import type { UserAccount } from '../types/auth';
import { 
  Bell, 
  X, 
  CheckCircle2, 
  Target, 
  MapPin, 
  ShieldCheck, 
  Clock 
} from 'lucide-react';

interface PromoterNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
}

export const PromoterNotificationsModal: React.FC<PromoterNotificationsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  if (!isOpen) return null;

  const notifications = [
    {
      id: 'notif-1',
      title: 'Meta de Promoción Asignada',
      description: `Tienes asignada una meta de captación en tu demarcación (${currentUser.territoryName}). Registra promovidos para avanzar en el cumplimiento.`,
      icon: Target,
      iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      time: 'Hace 30 min',
      unread: true,
    },
    {
      id: 'notif-2',
      title: 'Validación de Credenciales INE',
      description: 'Los promovidos registrados con clave de elector y CURP se verifican automáticamente en el padrón territorial.',
      icon: ShieldCheck,
      iconColor: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      time: 'Hace 2 horas',
      unread: true,
    },
    {
      id: 'notif-3',
      title: 'Contacto Directo con Promovidos',
      description: 'Recuerda que puedes llamar o enviar WhatsApp a tus promovidos directamente desde las acciones de tu lista.',
      icon: CheckCircle2,
      iconColor: 'text-sky-600 bg-sky-50 border-sky-200',
      time: 'Ayer',
      unread: false,
    },
    {
      id: 'notif-4',
      title: 'Enfoque Territorial 2027',
      description: 'El registro de ciudadanos debe ser exclusivamente de tu sección electoral asignada para garantizar la cobertura.',
      icon: MapPin,
      iconColor: 'text-amber-600 bg-amber-50 border-amber-200',
      time: 'Hace 2 días',
      unread: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-2xs p-0 sm:p-4 animate-fade-in">
      <div 
        className="w-full sm:max-w-lg bg-white rounded-none border border-slate-300 shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[80vh] overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado del modal */}
        <div className="bg-slate-900 text-white px-5 py-3.5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 rounded-none">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Notificaciones del Promotor
              </h3>
              <p className="text-[10px] text-slate-400">
                Avisos operativos y seguimiento de meta
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-none transition-colors cursor-pointer"
            title="Cerrar notificaciones"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de Notificaciones */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 divide-y divide-slate-100 flex-1">
          {notifications.map((item) => {
            const Icon = item.icon;
            return (
              <div 
                key={item.id} 
                className={`pt-3 first:pt-0 flex items-start gap-3 p-3 transition-colors ${
                  item.unread ? 'bg-emerald-50/40 border-l-2 border-emerald-500' : 'bg-white'
                }`}
              >
                <div className={`p-2 border rounded-none shrink-0 mt-0.5 ${item.iconColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {item.title}
                    </h4>
                    {item.unread && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                    <Clock className="w-3 h-3" />
                    <span>{item.time}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-none transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
