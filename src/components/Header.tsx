import React from 'react';
import { 
  Network, 
  TableProperties, 
  BarChart3, 
  Plus, 
  Download, 
  Upload, 
  Search, 
  X, 
  Filter, 
  EyeOff,
  MapPin,
  UserCheck
} from 'lucide-react';
import type { TerritorialLevel, FilterOptions } from '../types/territory';
import type { UserAccount } from '../types/auth';
import { UserSessionSwitcher } from './UserSessionSwitcher';

interface HeaderProps {
  currentView: 'flow' | 'table' | 'stats' | 'sections';
  onViewChange: (view: 'flow' | 'table' | 'stats' | 'sections') => void;
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  onOpenAddModal: () => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  focusLeaderName?: string;
  onClearFocus: () => void;
  sectionsCount?: number;
  currentUser: UserAccount;
  onSelectUser: (user: UserAccount) => void;
  visibleCount: number;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  filters,
  onFilterChange,
  onOpenAddModal,
  onExportData,
  onImportData,
  focusLeaderName,
  onClearFocus,
  sectionsCount,
  currentUser,
  onSelectUser,
  visibleCount,
  onLogout,
}) => {
  const getAddButtonLabel = () => {
    switch (currentUser.level) {
      case 'promotor': return 'Registrar Promovido';
      case 'seccional': return 'Crear Promotor';
      case 'territorial': return 'Crear Coord. Sección';
      case 'distrital': return 'Crear Comité Territorial';
      default: return 'Crear Comité Distrital';
    }
  };

  return (
    <header className="bg-white/95 backdrop-blur border-b border-slate-200 px-5 py-3 shrink-0 z-20 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Logo, System Info and Focused Indicator */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 shrink-0">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Estructura Territorial Piramidal
              </h1>
              <span className="text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full">
                Tabasco • 5 Niveles
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Cadena de mando estricta y visibilidad RBAC descendente
            </p>
          </div>

          {/* Focused Node Banner */}
          {focusLeaderName && (
            <div className="hidden md:flex items-center gap-2 ml-4 px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 shadow-2xs">
              <span>Enfoque: <strong>{focusLeaderName}</strong></span>
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

        {/* View Switcher, User Session Switcher and Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* User Session Switcher */}
          <UserSessionSwitcher
            currentUser={currentUser}
            onSelectUser={onSelectUser}
            visibleCount={visibleCount}
            onLogout={onLogout}
          />

          {/* View Mode Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => onViewChange('flow')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'flow'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Organigrama</span>
            </button>

            <button
              type="button"
              onClick={() => onViewChange('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'table'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <TableProperties className="w-3.5 h-3.5" />
              <span>Directorio</span>
            </button>

            <button
              type="button"
              onClick={() => onViewChange('stats')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'stats'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Tablero KPIs</span>
            </button>

            <button
              type="button"
              onClick={() => onViewChange('sections')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'sections'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              <span>Secciones & Mapas</span>
              {sectionsCount !== undefined && (
                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full font-bold">
                  {sectionsCount}
                </span>
              )}
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5">
            <label 
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 shadow-2xs cursor-pointer transition-colors"
              title="Cargar estructura desde archivo JSON"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Importar</span>
              <input 
                type="file" 
                accept=".json,.csv" 
                className="hidden" 
                onChange={onImportData} 
              />
            </label>

            <button
              type="button"
              onClick={onExportData}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 shadow-2xs transition-colors"
              title="Descargar archivo CSV de la estructura visible"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Exportar</span>
            </button>

            <button
              type="button"
              onClick={onOpenAddModal}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors ${
                currentUser.level === 'promotor'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
              title="Dar de alta registro según permisos de tu nivel"
            >
              {currentUser.level === 'promotor' ? (
                <UserCheck className="w-3.5 h-3.5" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>{getAddButtonLabel()}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar Row */}
      <div className="mt-3 flex flex-wrap items-center gap-2.5 pt-2.5 border-t border-slate-200 text-xs">
        {/* Search Field */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre, cargo, sección, territorio..."
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
            className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 pl-9 pr-7 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:bg-white focus:border-sky-500 transition-colors shadow-2xs"
          />
          {filters.searchQuery && (
            <button
              type="button"
              onClick={() => onFilterChange({ ...filters, searchQuery: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Level Filter */}
        <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
          <Filter className="w-3 h-3 text-slate-500" />
          <span className="text-slate-500">Nivel:</span>
          <select
            value={filters.levelFilter}
            onChange={(e) => onFilterChange({ ...filters, levelFilter: e.target.value as TerritorialLevel | 'all' })}
            className="bg-transparent text-slate-800 font-medium focus:outline-none cursor-pointer"
          >
            <option value="all">Todos los niveles</option>
            <option value="distrital">Comité Distrital</option>
            <option value="territorial">Comité Territorial</option>
            <option value="seccional">Coordinador de Sección</option>
            <option value="promotor">Promotor Territorial</option>
            <option value="promovido">Ciudadano Promovido</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-slate-500">Estatus:</span>
          <select
            value={filters.statusFilter}
            onChange={(e) => onFilterChange({ ...filters, statusFilter: e.target.value })}
            className="bg-transparent text-slate-800 font-medium focus:outline-none cursor-pointer"
          >
            <option value="all">Todos los estados</option>
            <option value="completado">Meta lograda</option>
            <option value="en_progreso">En avance</option>
            <option value="critico">Rezago crítico</option>
            <option value="vacante">Vacante</option>
          </select>
        </div>

        {/* Reset Filters */}
        {(filters.searchQuery || filters.levelFilter !== 'all' || filters.statusFilter !== 'all' || filters.focusNodeId) && (
          <button
            type="button"
            onClick={() => {
              onFilterChange({
                searchQuery: '',
                levelFilter: 'all',
                statusFilter: 'all',
                validationFilter: 'all',
                focusNodeId: null,
              });
              onClearFocus();
            }}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs px-2 py-1 hover:bg-slate-100 rounded transition-colors"
          >
            <EyeOff className="w-3 h-3" />
            <span>Limpiar filtros</span>
          </button>
        )}
      </div>
    </header>
  );
};
