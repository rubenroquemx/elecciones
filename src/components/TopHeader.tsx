import React from 'react';
import {
  Menu,
  Network,
  TableProperties,
  Search,
  X,
  Maximize2,
  Minimize2,
  MapPin,
  BarChart3,
  Compass,
  Users,
  UserPlus,
  Edit3,
  Settings,
  HelpCircle,
  LifeBuoy,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import type { FilterOptions } from '../types/territory';
import type { UserAccount } from '../types/auth';
import type { MainNavSection, StructureMode } from './Sidebar';
import { UserSessionSwitcher } from './UserSessionSwitcher';

interface TopHeaderProps {
  activeNav: MainNavSection;
  structureMode: StructureMode;
  onStructureModeChange: (mode: StructureMode) => void;
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  focusLeaderName?: string;
  onClearFocus: () => void;
  onToggleMobileMenu: () => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  activeStateName?: string;
  activeStateAbbr?: string;
  currentUser?: UserAccount;
  onSelectUser?: (user: UserAccount) => void;
  visibleCount?: number;
  onLogout?: () => void;
  onOpenGlobalSearch?: () => void;
  accounts?: UserAccount[];
  onOpenCreateUser?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavChange?: (nav: MainNavSection) => void;
  impersonatingAdminUser?: UserAccount | null;
  onExitImpersonation?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeNav,
  structureMode,
  onStructureModeChange,
  filters,
  onFilterChange,
  focusLeaderName,
  onClearFocus,
  onToggleMobileMenu,
  onExpandAll,
  onCollapseAll,
  activeStateName: _activeStateName,
  activeStateAbbr: _activeStateAbbr,
  currentUser,
  onSelectUser,
  visibleCount,
  onLogout,
  onOpenGlobalSearch,
  accounts,
  onOpenCreateUser,
  isSidebarCollapsed,
  onToggleCollapse,
  onNavChange,
  impersonatingAdminUser,
  onExitImpersonation,
}) => {
  const isCampana = currentUser?.level === 'cpv' || currentUser?.level === 'campana' || currentUser?.level === 'estatal';
  const isAdmin = currentUser?.level === 'admin' || currentUser?.isSuperAdmin;

  return (
    <header className={`apple-chrome px-3 sm:px-6 py-2.5 shrink-0 z-20 ${
      currentUser?.level === 'promotor' ? 'relative md:sticky md:top-0' : 'sticky top-0'
    }`}>
      <div className="flex items-center justify-between gap-3 w-full min-h-[40px]">
        
        {/* Left: Mobile Menu Toggle + Title / Breadcrumb / Estructura Switcher */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          {/* Mobile hamburger button - Oculto para Promotor */}
          {currentUser?.level !== 'promotor' && (
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-black/[0.05] lg:hidden transition-colors shrink-0"
              title="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Boton para colapsar/expandir barra lateral en Desktop */}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-black/[0.05] hidden lg:flex items-center justify-center transition-colors shrink-0 cursor-pointer"
              title={isSidebarCollapsed ? "Expandir menú lateral" : "Colapsar menú lateral"}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-5 h-5" />
              ) : (
                <PanelLeftClose className="w-5 h-5" />
              )}
            </button>
          )}

          {/* Section Breadcrumb & Title */}
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2 truncate">
                {activeNav === 'escritorio' && (
                  <>
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    <span>Escritorio</span>
                  </>
                )}

                {activeNav === 'mesa-de-ayuda' && (
                  <>
                    <LifeBuoy className="w-5 h-5 text-indigo-600" />
                    <span>Mesa de Ayuda & Tickets</span>
                  </>
                )}

                {activeNav === 'mis-secciones' && (
                  <>
                    <MapPin className="w-5 h-5 text-emerald-600" />
                    <span>Mis Secciones</span>
                  </>
                )}

                {activeNav === 'estructura' && (
                  <>
                    <Network className="w-5 h-5 text-sky-600" />
                    <span>Estructura Territorial</span>
                  </>
                )}

                {activeNav === 'secciones' && (
                  <>
                    <MapPin className="w-5 h-5 text-rose-500" />
                    <span>Catálogo de Secciones & Cartografía</span>
                  </>
                )}

                {activeNav === 'promotores' && (
                  <>
                    <Users className="w-5 h-5 text-sky-600" />
                    <span>Gestión de Promotores Territoriales</span>
                  </>
                )}

                {activeNav === 'crear-promotor' && (
                  <>
                    <UserPlus className="w-5 h-5 text-emerald-600" />
                    <span>Alta de Nuevo Promotor Territorial</span>
                  </>
                )}

                {activeNav === 'editar-promotor' && (
                  <>
                    <Edit3 className="w-5 h-5 text-amber-600" />
                    <span>Edición de Promotor Territorial</span>
                  </>
                )}

                {activeNav === 'capturar-promovido' && (
                  <>
                    <UserPlus className="w-5 h-5 text-emerald-600" />
                    <span>Capturar Promovido</span>
                  </>
                )}

                {activeNav === 'ver-promovido' && (
                  <>
                    <Users className="w-5 h-5 text-sky-600" />
                    <span>Expediente</span>
                  </>
                )}

                {activeNav === 'editar-promovido' && (
                  <>
                    <Edit3 className="w-5 h-5 text-indigo-600" />
                    <span>Expediente</span>
                  </>
                )}

                {activeNav === 'usuarios' && (
                  <>
                    <Users className="w-5 h-5 text-[#9d2449]" />
                    <span>Usuarios</span>
                  </>
                )}

                {(activeNav === 'crear-usuario' || activeNav === 'crear-coordinador-territorial') && (
                  <>
                    <UserPlus className="w-5 h-5 text-[#9d2449]" />
                    <span>Usuarios &gt; Nuevo Coordinador de Promoción al Voto</span>
                  </>
                )}

                {activeNav === 'detalle-usuario' && (
                  <>
                    <Users className="w-5 h-5 text-[#9d2449]" />
                    <span>Usuarios › Detalle de Usuario</span>
                  </>
                )}

                {activeNav === 'editar-usuario' && (
                  <>
                    <Edit3 className="w-5 h-5 text-[#9d2449]" />
                    <span>Usuarios › Editar Usuario</span>
                  </>
                )}

                {activeNav === 'configuracion' && (
                  <>
                    <Settings className="w-5 h-5 text-[#9d2449]" />
                    <span>Configuración</span>
                  </>
                )}

                {activeNav === 'acerca-de' && (
                  <>
                    <HelpCircle className="w-5 h-5 text-[#9d2449]" />
                    <span>Acerca de</span>
                  </>
                )}
              </h1>
            </div>

          {/* En Estructura: Toggle entre Organigrama y Lista (Apple Segmented Control - Oculto para Coordinador de Campaña) */}
          {activeNav === 'estructura' && !isCampana && currentUser?.level !== 'territorial' && currentUser?.level !== 'promotor' && (
            <div className="hidden md:flex items-center ml-4 apple-segmented">
              <button
                type="button"
                onClick={() => onStructureModeChange('organigrama')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  structureMode === 'organigrama'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                <span>Organigrama</span>
              </button>

              <button
                type="button"
                onClick={() => onStructureModeChange('lista')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  structureMode === 'lista'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TableProperties className="w-3.5 h-3.5" />
                <span>Lista (Directorio)</span>
              </button>
            </div>
          )}

          {/* Focused Node Indicator */}
          {focusLeaderName && (
            <div className="hidden lg:flex items-center gap-2 ml-3 px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 shadow-2xs">
              <Compass className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Rama: <strong>{focusLeaderName}</strong></span>
              <button
                type="button"
                onClick={onClearFocus}
                className="text-amber-600 hover:text-amber-900 p-0.5 rounded hover:bg-amber-100 transition-colors"
                title="Mostrar toda la estructura visible"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Right: Search/Filters (en Estructura) + User Session Switcher (siempre en la esquina superior derecha) */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {activeNav === 'estructura' && !isCampana && (
            <div className="hidden lg:flex items-center gap-2">
              {/* Search Input */}
              <div className="relative min-w-[170px] sm:min-w-[210px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, cargo..."
                  value={filters.searchQuery}
                  onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8.5 pr-8 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
                />
                {filters.searchQuery && (
                  <button
                    type="button"
                    onClick={() => onFilterChange({ ...filters, searchQuery: '' })}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Dropdown */}
              <select
                value={filters.statusFilter}
                onChange={(e) => onFilterChange({ ...filters, statusFilter: e.target.value })}
                className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Estatus: Todos</option>
                <option value="completado">Completado</option>
                <option value="en_progreso">En Progreso</option>
                <option value="critico">Crítico</option>
                <option value="vacante">Vacante</option>
              </select>

              {/* Organigrama Zoom / Expand Controls */}
              {structureMode === 'organigrama' && (
                <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={onExpandAll}
                    className="p-1 text-slate-600 hover:text-indigo-600 rounded hover:bg-white transition-colors"
                    title="Expandir todas las ramas"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={onCollapseAll}
                    className="p-1 text-slate-600 hover:text-indigo-600 rounded hover:bg-white transition-colors"
                    title="Colapsar estructura"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Omnibox Search Button (oculto para Promotor, Campaña y Superadmin) */}
          {onOpenGlobalSearch && currentUser?.level !== 'promotor' && !isCampana && !isAdmin && (
            <button
              type="button"
              onClick={onOpenGlobalSearch}
              className="flex items-center gap-2 px-3 py-1.5 bg-black/[0.04] hover:bg-black/[0.07] text-slate-700 hover:text-slate-900 rounded-full text-xs border border-black/[0.06] transition-[background-color,border-color] duration-140 shadow-2xs group cursor-pointer"
              title="Búsqueda Universal en todo el sistema (Ctrl + K)"
            >
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
              <span className="hidden sm:inline font-medium">Buscar...</span>
              <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-sans font-semibold bg-white/80 border border-black/[0.08] rounded-md text-slate-500 shadow-2xs">
                ⌘K
              </kbd>
            </button>
          )}

          {/* User Session Switcher - Top Bar Esquina Superior Derecha */}
          {currentUser && onSelectUser && (
            <div className="border-l border-slate-200 pl-2">
              <UserSessionSwitcher
                currentUser={currentUser}
                onSelectUser={onSelectUser}
                visibleCount={visibleCount ?? 0}
                onLogout={onLogout}
                accounts={accounts}
                onOpenCreateUser={onOpenCreateUser}
                onOpenProfile={() => onNavChange?.('configuracion')}
                impersonatingAdminUser={impersonatingAdminUser}
                onExitImpersonation={onExitImpersonation}
              />
            </div>
          )}
        </div>

      </div>

      {/* Mobile Toggle Bar for Estructura */}
      {activeNav === 'estructura' && (
        <div className="flex md:hidden items-center justify-between mt-2 pt-2 border-t border-slate-100">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs w-full">
            <button
              type="button"
              onClick={() => onStructureModeChange('organigrama')}
              className={`flex-1 py-1.5 text-center rounded-md font-semibold transition-all ${
                structureMode === 'organigrama' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              Organigrama
            </button>
            <button
              type="button"
              onClick={() => onStructureModeChange('lista')}
              className={`flex-1 py-1.5 text-center rounded-md font-semibold transition-all ${
                structureMode === 'lista' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              Lista
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
