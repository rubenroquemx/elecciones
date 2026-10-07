import React from 'react';
import {
  BarChart3,
  Network,
  TableProperties,
  MapPin,
  UserPlus,
  Download,
  Upload,
  Shield,
  Users,
  Settings,
  HelpCircle
} from 'lucide-react';

import type { UserAccount } from '../types/auth';

export type MainNavSection = 
  | 'escritorio' 
  | 'mis-secciones'
  | 'estructura' 
  | 'secciones' 
  | 'promotores' 
  | 'crear-promotor' 
  | 'editar-promotor'
  | 'capturar-promovido'
  | 'ver-promovido'
  | 'editar-promovido'
  | 'crear-coordinador'
  | 'usuarios'
  | 'crear-coordinador-territorial'
  | 'configuracion'
  | 'acerca-de';
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
  promotersCount?: number;
  onOpenAddModal: () => void;
  onOpenQuickCapture?: () => void;
  onOpenCreateUser?: () => void;
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
  promotersCount = 0,
  onOpenAddModal,
  onOpenQuickCapture,
  onOpenCreateUser,
  onExportData,
  onImportData,
  isMobileOpen = false,
  onCloseMobile,
  activeStateName = 'Tabasco',
  activeStateAbbr = 'tab',
}) => {
  const isPromotor = currentUser.level === 'promotor';
  const isTerritorial = currentUser.level === 'territorial';
  const isCampana = currentUser.level === 'campana' || currentUser.level === 'estatal' || currentUser.level === 'distrital';
  const isAdmin = currentUser.level === 'admin' || currentUser.isSuperAdmin;

  const getAddButtonLabel = () => {
    switch (currentUser.level) {
      case 'promotor': return 'Capturar Promovido';
      case 'territorial': return 'Crear Promotor Territorial';
      case 'campana': return 'Crear Coord. Territorial';
      case 'admin': return 'Crear Coord. de Campaña';
      default: return 'Registrar en Estructura';
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-xs animate-emil-fade"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 sm:w-72 apple-chrome-dark text-slate-100 flex flex-col transition-transform duration-280 [transition-timing-function:var(--ease-apple-sheet)] shrink-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header / Brand */}
        <div className="p-4 sm:p-5 border-b border-white/[0.08] flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <img 
              src="/logo-oscuro.svg" 
              alt="VERTEX" 
              className="h-8 max-w-[170px] object-contain object-left shrink-0" 
            />
            {isAdmin && (
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-white/[0.10] text-indigo-300 px-2 py-0.5 rounded">
                SaaS
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 font-medium truncate">
            {isAdmin ? 'Superadministrador Central' : `${activeStateName} (${activeStateAbbr.toUpperCase()}) • 4 Niveles`}
          </p>
        </div>

        {/* Primary Navigation Menu */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-6 flex flex-col">
          <div className="space-y-1 flex-1 flex flex-col">
            <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 apple-caption">
              Navegación Principal
            </span>

            {/* 1. ESCRITORIO (Tablero KPIs / Avance / SaaS) */}
            <button
              type="button"
              onClick={() => {
                onNavChange('escritorio');
                onCloseMobile?.();
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-[10px] text-xs font-medium transition-[background-color,color] duration-140 ${
                activeNav === 'escritorio'
                  ? 'bg-white/[0.14] text-white font-semibold shadow-xs'
                  : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BarChart3 className={`w-4 h-4 ${activeNav === 'escritorio' ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{isPromotor ? 'Mi Escritorio' : isAdmin ? 'Panel SaaS (Campañas)' : 'Escritorio'}</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-white/[0.08] text-indigo-300">
                {isPromotor ? 'Avance' : isAdmin ? 'SaaS' : 'KPIs'}
              </span>
            </button>

            {/* 1b. MIS SECCIONES (Mapa Pantalla Completa para Promotor Territorial) */}
            {isPromotor && (
              <button
                type="button"
                onClick={() => {
                  onNavChange('mis-secciones');
                  onCloseMobile?.();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-[10px] text-xs font-medium transition-[background-color,color] duration-140 ${
                  activeNav === 'mis-secciones'
                    ? 'bg-emerald-500/25 text-white font-bold border border-emerald-400/40 shadow-xs'
                    : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <MapPin className={`w-4 h-4 ${activeNav === 'mis-secciones' ? 'text-emerald-300' : 'text-emerald-400'}`} />
                  <span>Mis Secciones</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-emerald-500/20 text-emerald-300">
                  {currentUser.assignedSections?.length || 1}
                </span>
              </button>
            )}

            {/* 2. ESTRUCTURA (Oculto para Promotor y Coordinador de Campaña) */}
            {!isPromotor && !isCampana && (
              <div className="space-y-1 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onNavChange('estructura');
                    if (isTerritorial) {
                      onStructureModeChange('lista');
                    }
                    onCloseMobile?.();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-[10px] text-xs font-medium transition-[background-color,color] duration-140 ${
                    activeNav === 'estructura'
                      ? 'bg-white/[0.14] text-white font-semibold shadow-xs'
                      : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Network className={`w-4 h-4 ${activeNav === 'estructura' ? 'text-sky-400' : 'text-slate-400'}`} />
                    <span>{isTerritorial ? 'Promotores y Referidos' : 'Estructura'}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-white/[0.08] text-slate-300">
                    {visibleCount}
                  </span>
                </button>

                {/* Sub-vistas de Estructura: Solo para Admin */}
                {activeNav === 'estructura' && !isTerritorial && (
                  <div className="ml-4 pl-3 border-l-2 border-indigo-500/40 space-y-1 pt-1 animate-emil-fade">
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
            )}

            {/* 3. SECCIONES & MAPAS (Oculto para Promotor y Coordinador de Campaña) */}
            {!isPromotor && !isCampana && (
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
                  <span>{isTerritorial ? 'Secciones Asignadas' : 'Secciones & Mapas'}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-slate-800 text-rose-300">
                  {sectionsCount}
                </span>
              </button>
            )}

            {/* SECCIÓN DEDICADA PARA COORDINADOR TERRITORIAL: PROMOTORES TERRITORIALES */}
            {isTerritorial && (
              <div className="space-y-1 pt-3 border-t border-white/[0.08] animate-emil-fade">
                <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-sky-400 apple-caption">
                  Promotores Territoriales
                </span>

                {/* 1. Ver / Administrar */}
                <button
                  type="button"
                  onClick={() => {
                    onNavChange('promotores');
                    onCloseMobile?.();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-[10px] text-xs font-medium transition-[background-color,color] duration-140 cursor-pointer ${
                    activeNav === 'promotores'
                      ? 'bg-sky-500/25 text-white font-bold border border-sky-400/40 shadow-xs'
                      : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Users className={`w-4 h-4 ${activeNav === 'promotores' ? 'text-sky-300' : 'text-sky-400'}`} />
                    <span>Ver / Administrar</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-sky-500/20 text-sky-300">
                    {promotersCount}
                  </span>
                </button>

                {/* 2. Crear Promotor */}
                <button
                  type="button"
                  onClick={() => {
                    onNavChange('crear-promotor');
                    onCloseMobile?.();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-[10px] text-xs font-medium transition-[background-color,color] duration-140 cursor-pointer ${
                    activeNav === 'crear-promotor'
                      ? 'bg-emerald-500/25 text-white font-bold border border-emerald-400/40 shadow-xs'
                      : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <UserPlus className={`w-4 h-4 ${activeNav === 'crear-promotor' ? 'text-emerald-300' : 'text-emerald-400'}`} />
                    <span>Crear Promotor</span>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-200 font-mono">
                    + Nuevo
                  </span>
                </button>
              </div>
            )}

            {/* SECCIONES PARA COORDINADOR DE CAMPAÑA: SIEMPRE MANTENERSE DEBAJO */}
            {isCampana && (
              <div className="mt-auto pt-4 border-t border-white/[0.08] space-y-1">
                {/* 1. Usuario (Administración de Coordinadores Territoriales) */}
                <button
                  type="button"
                  onClick={() => {
                    onNavChange('usuarios');
                    onCloseMobile?.();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[10px] text-xs font-medium transition-[background-color,color] duration-140 cursor-pointer ${
                    activeNav === 'usuarios' || activeNav === 'crear-coordinador-territorial'
                      ? 'bg-[#9d2449] text-white font-bold shadow-xs'
                      : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                  }`}
                  title="Aquí se administran los Coordinadores Territoriales"
                >
                  <div className="flex items-center gap-2.5">
                    <Users className={`w-4 h-4 ${activeNav === 'usuarios' || activeNav === 'crear-coordinador-territorial' ? 'text-white' : 'text-slate-400'}`} />
                    <span>Usuario</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-white/[0.12] text-slate-200">
                    Coord. Territoriales
                  </span>
                </button>

                {/* 2. Configuración */}
                <button
                  type="button"
                  onClick={() => {
                    onNavChange('configuracion');
                    onCloseMobile?.();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[10px] text-xs font-medium transition-[background-color,color] duration-140 cursor-pointer ${
                    activeNav === 'configuracion'
                      ? 'bg-[#9d2449] text-white font-bold shadow-xs'
                      : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Settings className={`w-4 h-4 ${activeNav === 'configuracion' ? 'text-white' : 'text-slate-400'}`} />
                    <span>Configuración</span>
                  </div>
                </button>

                {/* 3. Acerca de */}
                <button
                  type="button"
                  onClick={() => {
                    onNavChange('acerca-de');
                    onCloseMobile?.();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[10px] text-xs font-medium transition-[background-color,color] duration-140 cursor-pointer ${
                    activeNav === 'acerca-de'
                      ? 'bg-[#9d2449] text-white font-bold shadow-xs'
                      : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                  }`}
                  title="Manuales de uso de la app"
                >
                  <div className="flex items-center gap-2.5">
                    <HelpCircle className={`w-4 h-4 ${activeNav === 'acerca-de' ? 'text-white' : 'text-slate-400'}`} />
                    <span>Acerca de</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Quick Actions & Data Controls (Oculto para Coordinador de Campaña) */}
          {!isCampana && (
            <div className="space-y-2 pt-4 border-t border-slate-800/80">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Acciones Rápidas
              </span>

              {/* Botón de Captura Rápida */}
              {onOpenQuickCapture && (
                <button
                  type="button"
                  onClick={() => {
                    if (isPromotor) {
                      onNavChange('capturar-promovido');
                    } else {
                      onOpenQuickCapture();
                    }
                    onCloseMobile?.();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-rose-900 hover:from-emerald-500 hover:to-rose-800 text-white text-xs font-bold shadow-md shadow-emerald-950/30 transition-all active:scale-98 cursor-pointer ${
                    isPromotor ? 'rounded-none' : 'rounded-xl'
                  }`}
                  title="Capturar Ciudadano Promovido"
                >
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-emerald-200" />
                    <span>{isPromotor ? 'Capturar Promovido' : 'Captura Rápida'}</span>
                  </div>
                  <span className="bg-emerald-400/20 text-emerald-200 text-[10px] px-1.5 py-0.5 rounded-none font-mono font-bold">+</span>
                </button>
              )}

              {/* Crear en estructura / Crear Coordinador: No mostrado a Promotor */}
              {!isPromotor && (
                <button
                  type="button"
                  onClick={() => {
                    if (isAdmin) {
                      onNavChange('crear-coordinador');
                    } else {
                      onOpenAddModal();
                    }
                    onCloseMobile?.();
                  }}
                  className={`w-full flex items-center justify-center gap-2 px-3.5 py-2.5 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-98 cursor-pointer ${
                    isAdmin 
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 shadow-indigo-950/40' 
                      : 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 shadow-indigo-900/30'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{getAddButtonLabel()}</span>
                </button>
              )}

              {/* Alta Manual de Usuario */}
              {!isPromotor && !isAdmin && onOpenCreateUser && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenCreateUser();
                    onCloseMobile?.();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800/90 hover:bg-slate-700/90 text-indigo-300 hover:text-white rounded-xl text-xs font-bold border border-indigo-500/30 transition-all active:scale-98 cursor-pointer"
                  title="Generar credenciales manuales para un nuevo usuario del sistema cerrado"
                >
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Alta Manual de Usuario</span>
                </button>
              )}

              {/* Exportar e Importar: Solo para Admin */}
              {isAdmin && (
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
              )}
            </div>
          )}
        </div>

        {/* User Session Footer Badge (Oculto para Promotor y Coordinador de Campaña) */}
        {!isPromotor && !isCampana && (
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
        )}
      </aside>
    </>
  );
};
