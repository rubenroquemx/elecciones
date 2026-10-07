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
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen
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
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeNav,
  onNavChange,
  structureMode,
  onStructureModeChange,
  currentUser,
  visibleCount: _visibleCount = 0,
  sectionsCount: _sectionsCount = 0,
  promotersCount: _promotersCount = 0,
  onOpenAddModal,
  onOpenQuickCapture,
  onOpenCreateUser,
  onExportData,
  onImportData,
  isMobileOpen = false,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
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
        style={{
          background: 'linear-gradient(180deg, #000000 0%, #2E2E2E 50%, #141414 100%)',
        }}
        className={`fixed lg:static inset-y-0 left-0 z-50 text-slate-100 flex flex-col transition-all duration-300 ease-in-out shrink-0 border-r border-white/[0.08] ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'w-20' : 'w-64 sm:w-72'}`}
      >
        {/* Header / Brand: Centrado, ocupa el ancho, sin etiquetas ni textos extras */}
        <div className={`border-b border-white/[0.08] flex items-center justify-center transition-all duration-300 ${
          isCollapsed ? 'p-3.5 min-h-[64px]' : 'px-4 py-5 min-h-[72px]'
        }`}>
          {isCollapsed ? (
            <img 
              src="/icon.svg" 
              alt="VERTEX" 
              className="w-9 h-9 object-contain mx-auto" 
              title="VERTEX"
            />
          ) : (
            <img 
              src="/logo-oscuro.svg" 
              alt="VERTEX" 
              className="w-full max-h-9 object-contain mx-auto" 
            />
          )}
        </div>

        {/* Primary Navigation Menu */}
        <div className={`flex-1 overflow-y-auto space-y-4 flex flex-col ${isCollapsed ? 'p-2' : 'p-3.5'}`}>
          <div className="space-y-1.5 flex-1 flex flex-col">

            {/* 1. ESCRITORIO */}
            <button
              type="button"
              onClick={() => {
                onNavChange('escritorio');
                onCloseMobile?.();
              }}
              title={isPromotor ? 'Mi Escritorio' : 'Escritorio'}
              className={`w-full flex items-center rounded-xl text-xs font-semibold transition-[background-color,color] duration-140 cursor-pointer ${
                isCollapsed ? 'justify-center p-3' : 'justify-start gap-3 px-3.5 py-2.5'
              } ${
                activeNav === 'escritorio'
                  ? 'bg-white/[0.14] text-white shadow-xs'
                  : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
              }`}
            >
              <BarChart3 className={`w-5 h-5 shrink-0 ${activeNav === 'escritorio' ? 'text-indigo-400' : 'text-slate-400'}`} />
              {!isCollapsed && (
                <span>{isPromotor ? 'Mi Escritorio' : 'Escritorio'}</span>
              )}
            </button>

            {/* 1b. MIS SECCIONES (Promotor Territorial) */}
            {isPromotor && (
              <button
                type="button"
                onClick={() => {
                  onNavChange('mis-secciones');
                  onCloseMobile?.();
                }}
                title="Mis Secciones"
                className={`w-full flex items-center rounded-xl text-xs font-semibold transition-[background-color,color] duration-140 cursor-pointer ${
                  isCollapsed ? 'justify-center p-3' : 'justify-start gap-3 px-3.5 py-2.5'
                } ${
                  activeNav === 'mis-secciones'
                    ? 'bg-emerald-500/25 text-white border border-emerald-400/40 shadow-xs'
                    : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                }`}
              >
                <MapPin className={`w-5 h-5 shrink-0 ${activeNav === 'mis-secciones' ? 'text-emerald-300' : 'text-emerald-400'}`} />
                {!isCollapsed && <span>Mis Secciones</span>}
              </button>
            )}

            {/* 2. ESTRUCTURA (Oculto para Promotor, Campaña y Superadmin) */}
            {!isPromotor && !isCampana && !isAdmin && (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    onNavChange('estructura');
                    if (isTerritorial) {
                      onStructureModeChange('lista');
                    }
                    onCloseMobile?.();
                  }}
                  title={isTerritorial ? 'Promotores y Referidos' : 'Estructura'}
                  className={`w-full flex items-center rounded-xl text-xs font-semibold transition-[background-color,color] duration-140 cursor-pointer ${
                    isCollapsed ? 'justify-center p-3' : 'justify-start gap-3 px-3.5 py-2.5'
                  } ${
                    activeNav === 'estructura'
                      ? 'bg-white/[0.14] text-white shadow-xs'
                      : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                  }`}
                >
                  <Network className={`w-5 h-5 shrink-0 ${activeNav === 'estructura' ? 'text-sky-400' : 'text-slate-400'}`} />
                  {!isCollapsed && (
                    <span>{isTerritorial ? 'Promotores y Referidos' : 'Estructura'}</span>
                  )}
                </button>

                {/* Sub-vistas de Estructura cuando está expandido */}
                {activeNav === 'estructura' && !isTerritorial && !isCollapsed && (
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

            {/* 3. SECCIONES & MAPAS (Oculto para Promotor, Campaña y Superadmin) */}
            {!isPromotor && !isCampana && !isAdmin && (
              <button
                type="button"
                onClick={() => {
                  onNavChange('secciones');
                  onCloseMobile?.();
                }}
                title={isTerritorial ? 'Secciones Asignadas' : 'Secciones & Mapas'}
                className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isCollapsed ? 'justify-center p-3' : 'justify-start gap-3 px-3.5 py-2.5'
                } ${
                  activeNav === 'secciones'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <MapPin className={`w-5 h-5 shrink-0 ${activeNav === 'secciones' ? 'text-white' : 'text-rose-400'}`} />
                {!isCollapsed && (
                  <span>{isTerritorial ? 'Secciones Asignadas' : 'Secciones & Mapas'}</span>
                )}
              </button>
            )}

            {/* SECCIÓN DEDICADA PARA COORDINADOR TERRITORIAL */}
            {isTerritorial && (
              <div className="space-y-1 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => {
                    onNavChange('promotores');
                    onCloseMobile?.();
                  }}
                  title="Directorio de Promotores"
                  className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isCollapsed ? 'justify-center p-3' : 'justify-start gap-3 px-3.5 py-2.5'
                  } ${
                    activeNav === 'promotores'
                      ? 'bg-sky-500/25 text-white border border-sky-400/40 shadow-xs'
                      : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                  }`}
                >
                  <Users className={`w-5 h-5 shrink-0 ${activeNav === 'promotores' ? 'text-sky-300' : 'text-sky-400'}`} />
                  {!isCollapsed && <span>Ver Promotores</span>}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onNavChange('crear-promotor');
                    onCloseMobile?.();
                  }}
                  title="Crear Promotor"
                  className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isCollapsed ? 'justify-center p-3' : 'justify-start gap-3 px-3.5 py-2.5'
                  } ${
                    activeNav === 'crear-promotor'
                      ? 'bg-emerald-500/25 text-white border border-emerald-400/40 shadow-xs'
                      : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                  }`}
                >
                  <UserPlus className={`w-5 h-5 shrink-0 ${activeNav === 'crear-promotor' ? 'text-emerald-300' : 'text-emerald-400'}`} />
                  {!isCollapsed && <span>Crear Promotor</span>}
                </button>
              </div>
            )}

            {/* SECCIONES PARA COORDINADOR DE CAMPAÑA: SIEMPRE MANTENERSE DEBAJO */}
            {isCampana && (
              <div className="mt-auto pt-4 border-t border-white/[0.08] space-y-1.5">
                {/* 1. Usuario */}
                <button
                  type="button"
                  onClick={() => {
                    onNavChange('usuarios');
                    onCloseMobile?.();
                  }}
                  title="Usuario (Coordinadores Territoriales)"
                  className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isCollapsed ? 'justify-center p-3' : 'justify-start gap-3 px-3.5 py-2.5'
                  } ${
                    activeNav === 'usuarios' || activeNav === 'crear-coordinador-territorial'
                      ? 'bg-[#9d2449] text-white shadow-xs'
                      : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                  }`}
                >
                  <Users className={`w-5 h-5 shrink-0 ${activeNav === 'usuarios' || activeNav === 'crear-coordinador-territorial' ? 'text-white' : 'text-slate-400'}`} />
                  {!isCollapsed && <span>Usuario</span>}
                </button>

                {/* 2. Configuración */}
                <button
                  type="button"
                  onClick={() => {
                    onNavChange('configuracion');
                    onCloseMobile?.();
                  }}
                  title="Configuración"
                  className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isCollapsed ? 'justify-center p-3' : 'justify-start gap-3 px-3.5 py-2.5'
                  } ${
                    activeNav === 'configuracion'
                      ? 'bg-[#9d2449] text-white shadow-xs'
                      : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                  }`}
                >
                  <Settings className={`w-5 h-5 shrink-0 ${activeNav === 'configuracion' ? 'text-white' : 'text-slate-400'}`} />
                  {!isCollapsed && <span>Configuración</span>}
                </button>

                {/* 3. Acerca de */}
                <button
                  type="button"
                  onClick={() => {
                    onNavChange('acerca-de');
                    onCloseMobile?.();
                  }}
                  title="Acerca de"
                  className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isCollapsed ? 'justify-center p-3' : 'justify-start gap-3 px-3.5 py-2.5'
                  } ${
                    activeNav === 'acerca-de'
                      ? 'bg-[#9d2449] text-white shadow-xs'
                      : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                  }`}
                >
                  <HelpCircle className={`w-5 h-5 shrink-0 ${activeNav === 'acerca-de' ? 'text-white' : 'text-slate-400'}`} />
                  {!isCollapsed && <span>Acerca de</span>}
                </button>
              </div>
            )}
          </div>

          {/* Quick Actions & Data Controls: Oculto para Coordinador de Campaña y Superadmin */}
          {!isCampana && !isAdmin && (
            <div className="space-y-2 pt-3 border-t border-white/[0.08]">
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
                  className={`w-full flex items-center rounded-xl bg-gradient-to-r from-emerald-600 to-rose-900 hover:from-emerald-500 hover:to-rose-800 text-white text-xs font-bold shadow-md shadow-emerald-950/30 transition-all active:scale-98 cursor-pointer ${
                    isCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5'
                  }`}
                  title="Capturar Ciudadano Promovido"
                >
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-emerald-200" />
                    {!isCollapsed && <span>{isPromotor ? 'Capturar Promovido' : 'Captura Rápida'}</span>}
                  </div>
                  {!isCollapsed && <span className="bg-emerald-400/20 text-emerald-200 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">+</span>}
                </button>
              )}

              {/* Crear en estructura */}
              {!isPromotor && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenAddModal();
                    onCloseMobile?.();
                  }}
                  className={`w-full flex items-center rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-900/30 transition-all active:scale-98 cursor-pointer ${
                    isCollapsed ? 'justify-center p-3' : 'justify-center gap-2 px-3.5 py-2.5'
                  }`}
                  title={getAddButtonLabel()}
                >
                  <UserPlus className="w-4 h-4" />
                  {!isCollapsed && <span>{getAddButtonLabel()}</span>}
                </button>
              )}

              {/* Alta Manual de Usuario */}
              {!isPromotor && onOpenCreateUser && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenCreateUser();
                    onCloseMobile?.();
                  }}
                  className={`w-full flex items-center rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-indigo-300 hover:text-white text-xs font-bold border border-indigo-500/30 transition-all active:scale-98 cursor-pointer ${
                    isCollapsed ? 'justify-center p-3' : 'justify-center gap-2 px-3 py-2'
                  }`}
                  title="Alta Manual de Usuario"
                >
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  {!isCollapsed && <span>Alta Manual</span>}
                </button>
              )}

              {/* Exportar e Importar */}
              <div className={`grid gap-2 pt-1 ${isCollapsed ? 'grid-cols-1' : 'grid-cols-2'}`}>
                <button
                  type="button"
                  onClick={onExportData}
                  className="flex items-center justify-center gap-1.5 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-semibold border border-slate-700/60 transition-colors"
                  title="Descargar estructura visible en CSV"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  {!isCollapsed && <span>Exportar</span>}
                </button>

                <label
                  className="flex items-center justify-center gap-1.5 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-semibold border border-slate-700/60 transition-colors cursor-pointer"
                  title="Cargar estructura desde JSON"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-400" />
                  {!isCollapsed && <span>Importar</span>}
                  <input
                    type="file"
                    accept=".json"
                    onChange={onImportData}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Botón de Colapso de Barra Lateral (Desktop) */}
          {onToggleCollapse && (
            <div className="pt-3 border-t border-white/[0.08] mt-auto hidden lg:block">
              <button
                type="button"
                onClick={onToggleCollapse}
                className={`w-full flex items-center rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer text-xs font-medium ${
                  isCollapsed ? 'justify-center p-3' : 'justify-start gap-3 px-3.5 py-2.5'
                }`}
                title={isCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
              >
                {isCollapsed ? (
                  <PanelLeftOpen className="w-5 h-5 shrink-0" />
                ) : (
                  <>
                    <PanelLeftClose className="w-5 h-5 shrink-0" />
                    <span>Colapsar menú</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
