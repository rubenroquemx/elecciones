import { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  ChevronDown,
  Search,
  Database,
  Shield,
  UserPlus,
  Download,
  Check,
  LogOut,
} from 'lucide-react';
import { MEXICAN_STATES, type StateData } from '../data/statesData';
import { MOCK_ACCOUNTS } from '../data/mockAuthData';
import type { UserAccount } from '../types/auth';

interface GlassTopHeaderProps {
  activeState: StateData;
  onSelectState: (stateId: number) => void;
  currentUser: UserAccount;
  onSwitchAccount: (account: UserAccount) => void;
  onOpenRegisterUserModal: () => void;
  onLogout: () => void;
  registeredUsers?: UserAccount[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenAddModal: () => void;
  onExportData: () => void;
}

export const GlassTopHeader: React.FC<GlassTopHeaderProps> = ({
  activeState,
  onSelectState,
  currentUser,
  onSwitchAccount,
  onOpenRegisterUserModal,
  onLogout,
  registeredUsers = [],
  searchQuery,
  onSearchChange,
  onOpenAddModal,
  onExportData,
}) => {
  const [isStateDropdownOpen, setIsStateDropdownOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [stateFilter, setStateFilter] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsStateDropdownOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredStates = MEXICAN_STATES.filter(
    (s) =>
      s.name.toLowerCase().includes(stateFilter.toLowerCase()) ||
      s.commonName.toLowerCase().includes(stateFilter.toLowerCase()) ||
      s.abbr.toLowerCase().includes(stateFilter.toLowerCase())
  );

  return (
    <header className="h-16 px-4 sm:px-6 glass-header flex items-center justify-between gap-4 z-40 shrink-0 select-none">
      {/* Brand & Active State Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 border border-white/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="hidden sm:block">
            <span className="text-xs font-black tracking-wider text-white uppercase flex items-center gap-1.5">
              <span>Coordinación Distrital</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                2027
              </span>
            </span>
            <span className="text-[10px] text-slate-400 block -mt-0.5">
              Estructura Operativa & Casillas
            </span>
          </div>
        </div>

        <div className="h-6 w-px bg-white/10 hidden sm:block mx-1" />

        {/* State Selector Pill */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsStateDropdownOpen(!isStateDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-button cursor-pointer hover:border-indigo-400/50"
          >
            <div className="w-5 h-5 rounded-md bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 font-bold text-[10px] uppercase">
              {activeState.abbr}
            </div>
            <div className="text-left">
              <span className="text-xs font-bold text-white block leading-tight">
                {activeState.commonName}
              </span>
              <span className="text-[10px] text-slate-400 block leading-none">
                {activeState.totalSections.toLocaleString()} secciones
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          {/* State Dropdown Popover */}
          {isStateDropdownOpen && (
            <div className="absolute left-0 mt-2 w-72 sm:w-80 rounded-2xl glass-dock p-2 z-50 shadow-2xl border border-white/15 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-2 border-b border-white/10 mb-1">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar estado..."
                    value={stateFilter}
                    onChange={(e) => setStateFilter(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs glass-input rounded-xl text-white placeholder-slate-400 focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-0.5 pr-1">
                {filteredStates.map((st) => {
                  const isSelected = st.stateId === activeState.stateId;
                  return (
                    <button
                      key={st.stateId}
                      type="button"
                      onClick={() => {
                        onSelectState(st.stateId);
                        setIsStateDropdownOpen(false);
                        setStateFilter('');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600/30 border border-indigo-400/40 text-white font-bold'
                          : 'hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-5 rounded bg-white/10 border border-white/10 flex items-center justify-center text-[10px] font-bold text-indigo-300 uppercase">
                          {st.abbr}
                        </span>
                        <div>
                          <span className="block">{st.commonName}</span>
                          <span className="text-[10px] text-slate-400 block">
                            {st.totalSections.toLocaleString()} secciones • Meta: {st.victoryGoalVotes.toLocaleString()} votos
                          </span>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center Search Bar */}
      <div className="hidden md:flex items-center flex-1 max-w-xs lg:max-w-md mx-4">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por líder, sección distrital, casilla..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs glass-input rounded-xl placeholder-slate-400 text-white"
          />
        </div>
      </div>

      {/* Right Actions & Coordinator Profile */}
      <div className="flex items-center gap-2.5">
        {/* PostgreSQL Live Indicator */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-400/20 text-emerald-300 text-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-medium hidden xl:inline">En Línea</span>
        </div>

        {/* Action Buttons */}
        <button
          type="button"
          onClick={onOpenRegisterUserModal}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-tr from-purple-600/80 to-indigo-600/80 hover:from-purple-600 hover:to-indigo-600 text-white border border-purple-400/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-purple-600/20"
          title="El Superadministrador da de alta un correo y asigna nivel y distrito"
        >
          <UserPlus className="w-3.5 h-3.5 text-purple-300" />
          <span className="hidden sm:inline">+ Alta Usuario</span>
        </button>

        <button
          type="button"
          onClick={onOpenAddModal}
          className="px-3 py-1.5 rounded-xl glass-button-primary text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Nuevo Integrante</span>
        </button>

        <button
          type="button"
          onClick={onExportData}
          className="p-2 sm:px-3 sm:py-1.5 rounded-xl glass-button text-xs font-medium flex items-center gap-1.5 cursor-pointer"
          title="Exportar estructura distrital en CSV"
        >
          <Download className="w-3.5 h-3.5 text-slate-300" />
          <span className="hidden sm:inline">Exportar</span>
        </button>

        {/* Coordinator Account Selector Pill */}
        <div className="relative pl-2 border-l border-white/10" ref={accountRef}>
          <button
            type="button"
            onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
            className="flex items-center gap-2 p-1 sm:px-2 sm:py-1 rounded-xl glass-button cursor-pointer hover:border-indigo-400/50"
            title="Cambiar cuenta o distrito"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 border border-white/20 flex items-center justify-center text-white font-black text-xs shadow-inner">
              {currentUser.name ? currentUser.name[0] : 'C'}
            </div>
            <div className="hidden xl:block text-left">
              <div className="text-xs font-bold text-white leading-tight flex items-center gap-1.5">
                <span>{currentUser.name}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
              <div className="text-[10px] text-indigo-300 flex items-center gap-1">
                <Shield className="w-2.5 h-2.5" />
                <span>{currentUser.accountRoleLabel}</span>
              </div>
            </div>
          </button>

          {/* Account Switcher Popover */}
          {isAccountDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl glass-dock p-2 z-50 shadow-2xl border border-white/15 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 border-b border-white/10 mb-1 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Cuentas de Coordinador:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onOpenRegisterUserModal();
                    setIsAccountDropdownOpen(false);
                  }}
                  className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                >
                  + Dar de Alta
                </button>
              </div>

              <div className="space-y-1 max-h-60 overflow-y-auto pr-0.5">
                {[...registeredUsers, ...MOCK_ACCOUNTS.slice(0, 3)].map((acc) => {
                  const isSelected = acc.id === currentUser.id;
                  const isNew = registeredUsers.some((r) => r.id === acc.id);
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => {
                        onSwitchAccount(acc);
                        setIsAccountDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600/30 border border-indigo-400/40 text-white font-bold'
                          : 'hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs ${acc.avatarBg || 'bg-indigo-600'}`}>
                          {acc.name[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="block leading-tight text-white font-semibold">{acc.name}</span>
                            {isNew && (
                              <span className="px-1.5 py-0.2 rounded-full text-[8px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                                Nuevo
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-indigo-300 block">{acc.accountRoleLabel}</span>
                          <span className="text-[9px] text-slate-400 block">{acc.territoryName}</span>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Logout Button */}
              <div className="pt-2 mt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountDropdownOpen(false);
                    onLogout();
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-rose-300 hover:bg-rose-500/15 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar Sesión (Simular Login)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
