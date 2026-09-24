import React, { useState, useRef, useEffect } from 'react';
import type { UserAccount } from '../types/auth';
import { MOCK_ACCOUNTS } from '../data/mockAuthData';
import { getAllowedChildLevel } from '../utils/hierarchy';
import { LEVEL_CONFIG } from '../data/mockTerritoryData';
import { 
  Shield, 
  ChevronDown, 
  Check, 
  Eye, 
  UserPlus, 
  Sparkles,
  LogOut
} from 'lucide-react';

interface UserSessionSwitcherProps {
  currentUser: UserAccount;
  onSelectUser: (user: UserAccount) => void;
  visibleCount: number;
  onLogout?: () => void;
}

export const UserSessionSwitcher: React.FC<UserSessionSwitcherProps> = ({
  currentUser,
  onSelectUser,
  visibleCount,
  onLogout,
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

  const allowedChildLevel = getAllowedChildLevel(currentUser.level);
  const targetConfig = allowedChildLevel ? LEVEL_CONFIG[allowedChildLevel] : null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Session Pill Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl text-left transition-all shadow-2xs hover:shadow-xs group"
        title="Cambiar sesión de usuario para probar permisos y alcances"
      >
        {currentUser.picture ? (
          <img src={currentUser.picture} alt={currentUser.name} className="w-7 h-7 rounded-lg object-cover shadow-xs shrink-0" />
        ) : (
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs ${currentUser.avatarBg || 'bg-slate-700'}`}>
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
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150">
          {/* Header Info */}
          <div className="p-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Simulador de Cuenta Activa (RBAC)
              </span>
              <span className="text-[10px] bg-slate-700/80 px-2 py-0.5 rounded-full text-slate-200 font-mono">
                {visibleCount} nodos visibles
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-300">
                <Eye className="w-3.5 h-3.5 shrink-0" />
                <span><strong>Visibilidad:</strong> Solo ve su propia sub-pirámide.</span>
              </div>
              <div className="flex items-center gap-1.5 text-sky-300">
                <UserPlus className="w-3.5 h-3.5 shrink-0" />
                <span>
                  <strong>Creación:</strong> {
                    currentUser.level === 'promotor'
                      ? 'No crea cuentas; registra Ciudadanos Promovidos.'
                      : currentUser.level === 'admin'
                        ? 'Crea Comités Distritales.'
                        : targetConfig 
                          ? `Solo puede crear cuentas de ${targetConfig.label}.`
                          : 'Sin permisos de creación.'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Accounts List */}
          <div className="p-2 divide-y divide-slate-100 max-h-80 overflow-y-auto">
            <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Selecciona una cuenta para probar:
            </div>
            {MOCK_ACCOUNTS.map((acc) => {
              const isSelected = acc.id === currentUser.id;
              const childLvl = getAllowedChildLevel(acc.level);
              const childCfg = childLvl ? LEVEL_CONFIG[childLvl] : null;

              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => {
                    onSelectUser(acc);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-3 my-0.5 ${
                    isSelected
                      ? 'bg-sky-50 border border-sky-200 text-sky-900 shadow-2xs'
                      : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5 shadow-xs ${acc.avatarBg || 'bg-slate-700'}`}>
                    {acc.level === 'admin' ? <Shield className="w-4 h-4" /> : acc.name.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate">
                        <h4 className="font-bold text-slate-900 truncate text-xs">
                          {acc.name}
                        </h4>
                        {acc.username === 'ruben.roque' && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                            ⭐ Tu Cuenta
                          </span>
                        )}
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-sky-600 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-semibold text-slate-600 bg-white border border-slate-200 px-1.5 py-0.2 rounded">
                        {acc.accountRoleLabel}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono truncate">
                        @{acc.username}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-1">
                      {acc.territoryName}
                    </p>
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
                      <span className="font-semibold text-slate-600">Puede crear:</span>
                      {acc.level === 'promotor' ? (
                        <span className="text-emerald-700 font-medium bg-emerald-50 px-1 rounded">
                          Promovidos (Ciudadanos)
                        </span>
                      ) : childCfg ? (
                        <span className="text-indigo-700 font-medium bg-indigo-50 px-1 rounded">
                          {childCfg.label}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Ninguno</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer note & Logout */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
            <span>Visibilidad descendente protegida</span>
            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                className="flex items-center gap-1 text-rose-600 hover:text-rose-800 font-bold px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                title="Cerrar sesión en este dispositivo"
              >
                <LogOut className="w-3 h-3" />
                <span>Cerrar sesión</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
