import React from 'react';
import {
  BarChart3,
  Network,
  TableProperties,
  MapPin,
  UserPlus,
  Download,
  Upload,
  Smartphone
} from 'lucide-react';

import type { UserAccount } from '../types/auth';

export type MainNavSection = 'escritorio' | 'estructura' | 'secciones';
export type StructureMode = 'organigrama' | 'lista';

interface SidebarProps {
  activeNav: MainNavSection;
  onNavChange: (nav: MainNavSection) => void;
  structureMode: StructureMode;
  onStructureModeChange: (mode: StructureMode) => void;
  currentUser: UserAccount;
  onSelectUser?: (user: UserAccount) => void;
  visibleCount: number;
  sectionsCount: number;
  onOpenAddModal: () => void;
  onOpenQuickCapture?: () => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLogout?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  activeStateName?: string;
  activeStateAbbr?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeNav,
  onNavChange,
  structureMode,
  onStructureModeChange,
  currentUser,
  visibleCount,
  sectionsCount,
  onOpenAddModal,
  onOpenQuickCapture,
  onExportData,
  onImportData,
  isMobileOpen = false,
  onCloseMobile,
  activeStateName = 'Tabasco',
  activeStateAbbr = 'tab',
}) => {
  const getAddButtonLabel = () => {
    switch (currentUser.level) {
      case 'promotor': return 'Registrar Promovido';
      case 'seccional': return 'Crear Promotor';
      case 'territorial': return 'Crear Coord. Sección';
      case 'distrital': return 'Crear Comité Territorial';
      case 'estatal': return 'Crear Comité Distrital';
      default: return 'Registrar en Estructura';
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 sm:w-72 bg-slate-900 text-slate-200 flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out shrink-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header / Brand */}
        <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
            <Network className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-white tracking-tight">
                Estructura Territorial
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium truncate">
              {activeStateName} ({activeStateAbbr.toUpperCase()}) • 6 Niveles
            </p>
          </div>
        </div>

        {/* Primary Navigation Menu */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="space-y-1">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Navegación Principal
            </span>

            {/* 1. ESCRITORIO (Tablero KPIs) */}
            <button
              type="button"
              onClick={() => {
                onNavChange('escritorio');
                onCloseMobile?.();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeNav === 'escritorio'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <BarChart3 className={`w-4 h-4 ${activeNav === 'escritorio' ? 'text-white' : 'text-indigo-400'}`} />
                <span>Escritorio</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-slate-800 text-indigo-300">
                KPIs
              </span>
            </button>

            {/* 2. ESTRUCTURA (Directorio con Organigrama / Lista) */}
            <div className="space-y-1 pt-1">
              <button
                type="button"
                onClick={() => {
                  onNavChange('estructura');
                  onCloseMobile?.();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeNav === 'estructura'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Network className={`w-4 h-4 ${activeNav === 'estructura' ? 'text-white' : 'text-sky-400'}`} />
                  <span>Estructura</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-slate-800 text-slate-300">
                  {visibleCount}
                </span>
              </button>

              {/* Sub-vistas de Estructura: Organigrama y Lista */}
              {activeNav === 'estructura' && (
                <div className="ml-4 pl-3 border-l-2 border-indigo-500/40 space-y-1 pt-1 animate-in fade-in duration-200">
                  <button
                    type="button"
                    onClick={() => {
                      onStructureModeChange('organigrama');
                      onCloseMobile?.();
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      structureMode === 'organigrama'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Network className="w-3.5 h-3.5" />
                    <span>Organigrama</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onStructureModeChange('lista');
                      onCloseMobile?.();
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      structureMode === 'lista'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <TableProperties className="w-3.5 h-3.5" />
                    <span>Lista (Directorio)</span>
                  </button>
                </div>
              )}
            </div>

            {/* 3. SECCIONES & MAPAS */}
            <button
              type="button"
              onClick={() => {
                onNavChange('secciones');
                onCloseMobile?.();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeNav === 'secciones'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <MapPin className={`w-4 h-4 ${activeNav === 'secciones' ? 'text-white' : 'text-rose-400'}`} />
                <span>Secciones & Mapas</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-slate-800 text-rose-300">
                {sectionsCount}
              </span>
            </button>
          </div>

          {/* Quick Actions & Data Controls */}
          <div className="space-y-2 pt-4 border-t border-slate-800/80">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Acciones Rápidas
            </span>

            {onOpenQuickCapture && (
              <button
                type="button"
                onClick={() => {
                  onOpenQuickCapture();
                  onCloseMobile?.();
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/30 transition-all active:scale-98 cursor-pointer"
                title="Captura Rápida de Campo con validación de clave de elector y WhatsApp directo"
              >
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-200" />
                  <span>Captura Rápida</span>
                </div>
                <span className="bg-emerald-400/20 text-emerald-200 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">Móvil</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onOpenAddModal();
                onCloseMobile?.();
              }}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-900/30 transition-all active:scale-98"
            >
              <UserPlus className="w-4 h-4" />
              <span>{getAddButtonLabel()}</span>
            </button>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={onExportData}
                className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-semibold border border-slate-700/60 transition-colors"
                title="Descargar estructura visible en CSV"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>Exportar</span>
              </button>

              <label
                className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-semibold border border-slate-700/60 transition-colors cursor-pointer"
                title="Cargar estructura desde JSON"
              >
                <Upload className="w-3.5 h-3.5 text-slate-400" />
                <span>Importar</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={onImportData}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* User Session Footer Badge (Indicador estático de sesión) */}
        <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            {currentUser.picture ? (
              <img src={currentUser.picture} alt={currentUser.name} className="w-8 h-8 rounded-lg object-cover shadow-xs shrink-0" />
            ) : (
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs ${currentUser.avatarBg || 'bg-slate-700'}`}>
                {currentUser.level === 'admin' ? 'A' : currentUser.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">
                {currentUser.name}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {currentUser.accountRoleLabel}
              </div>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Sesión activa" />
          </div>
        </div>
      </aside>
    </>
  );
};
