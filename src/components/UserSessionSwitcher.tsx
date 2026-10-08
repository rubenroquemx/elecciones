import React, { useState, useRef, useEffect } from 'react';
import type { UserAccount } from '../types/auth';
import { 
  Shield, 
  ChevronDown, 
  LogOut,
  Mail,
  MapPin,
  CheckCircle2,
  User
} from 'lucide-react';

interface UserSessionSwitcherProps {
  currentUser: UserAccount;
  onSelectUser?: (user: UserAccount) => void;
  visibleCount?: number;
  onLogout?: () => void;
  accounts?: UserAccount[];
  onOpenCreateUser?: () => void;
  onOpenProfile?: () => void;
}

export const UserSessionSwitcher: React.FC<UserSessionSwitcherProps> = ({
  currentUser,
  onLogout,
  onOpenProfile,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Session Pill Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl text-left transition-all shadow-2xs hover:shadow-xs group cursor-pointer"
        title="Perfil y sesión activa"
      >
        {currentUser.picture ? (
          <img src={currentUser.picture} alt={currentUser.name} className="w-7 h-7 rounded-lg object-cover shadow-xs shrink-0" />
        ) : (
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs ${currentUser.avatarBg || 'bg-[#9d2449]'}`}>
            {currentUser.level === 'admin' ? <Shield className="w-3.5 h-3.5" /> : currentUser.name.charAt(0)}
          </div>
        )}

        <div className="hidden sm:flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-800 truncate max-w-[130px] lg:max-w-[180px]">
              {currentUser.name}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 bg-white border border-slate-200 text-slate-600 rounded">
              {currentUser.accountRoleLabel}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 truncate max-w-[170px]">
            {currentUser.territoryName}
          </span>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden text-xs animate-emil-popover">
          {/* Header Info */}
          <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-md shrink-0 ${currentUser.avatarBg || 'bg-[#9d2449]'}`}>
                {currentUser.level === 'admin' ? <Shield className="w-5 h-5" /> : currentUser.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-white text-sm truncate">{currentUser.name}</h4>
                <div className="flex items-center gap-1 text-[11px] text-slate-300 mt-0.5">
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    En línea
                  </span>
                  <span>•</span>
                  <span className="text-slate-300">{currentUser.accountRoleLabel}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="p-3.5 space-y-2 bg-slate-50 border-b border-slate-100 text-slate-600 text-[11px]">
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{currentUser.email || currentUser.username}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{currentUser.territoryName}</span>
            </div>
          </div>

          {/* Quick Profile Link */}
          {onOpenProfile && (
            <div className="p-2 bg-slate-50/80 border-b border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenProfile();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 font-bold text-xs transition-colors cursor-pointer text-left"
              >
                <User className="w-4 h-4 text-[#9d2449]" />
                <span>Mi Perfil y Configuración</span>
              </button>
            </div>
          )}

          {/* Logout */}
          <div className="p-2.5 bg-white flex items-center justify-between">
            <span className="text-[10px] text-slate-400">Sistema Seguro Cerrado</span>
            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                className="flex items-center gap-1.5 text-rose-600 hover:text-rose-800 font-bold px-3 py-1.5 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                title="Cerrar sesión en este dispositivo"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cerrar sesión</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
