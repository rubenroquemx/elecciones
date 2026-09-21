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
  Compass
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
  activeStateName,
  activeStateAbbr,
  currentUser,
  onSelectUser,
  visibleCount,
  onLogout,
  onOpenGlobalSearch,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 shrink-0 z-20 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        
        {/* Left: Mobile Menu Toggle + Title / Breadcrumb / Estructura Switcher */}
        <div className="flex items-center gap-3">
          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 lg:hidden transition-colors"
            title="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Section Breadcrumb & Title */}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                {activeNav === 'escritorio' && (
                  <>
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    <span>Escritorio de Operación</span>
                    {activeStateName && (
                      <span className="ml-2 px-2 py-0.5 rounded-md text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {activeStateName} ({activeStateAbbr?.toUpperCase()})
                      </span>
                    )}
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
              </h1>
            </div>
            <p className="text-[11px] text-slate-400">
              {activeNav === 'escritorio' && 'Tablero ejecutivo de metas y cobertura oficial'}
              {activeNav === 'estructura' && 'Cadena de mando jerárquica y directorio descendente'}
              {activeNav === 'secciones' && 'Universo de casillas, lista nominal y comités seccionales'}
            </p>
          </div>

          {/* En Estructura: Toggle entre Organigrama y Lista */}
          {activeNav === 'estructura' && (
            <div className="hidden md:flex items-center ml-4 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => onStructureModeChange('organigrama')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  structureMode === 'organigrama'
                    ? 'bg-white text-indigo-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                <span>Organigrama</span>
              </button>

              <button
                type="button"
                onClick={() => onStructureModeChange('lista')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  structureMode === 'lista'
                    ? 'bg-white text-indigo-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
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
        <div className="flex flex-wrap items-center gap-2.5 ml-auto">
          {activeNav === 'estructura' && (
            <div className="flex flex-wrap items-center gap-2">
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

          {/* Omnibox Search Button */}
          {onOpenGlobalSearch && (
            <button
              type="button"
              onClick={onOpenGlobalSearch}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 rounded-xl text-xs border border-slate-200 transition-all shadow-2xs group cursor-pointer"
              title="Búsqueda Universal en todo el sistema (Ctrl + K)"
            >
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
              <span className="hidden sm:inline">Buscar...</span>
              <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-200 rounded text-slate-400 shadow-2xs">
                Ctrl K
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
