import React, { useState } from 'react';
import type { TerritorialLeader, FilterOptions, HierarchyStats, TerritorialLevel } from '../types/territory';
import { TerritoryFlowCanvas } from './TerritoryFlowCanvas';
import { DirectoryTableView } from './DirectoryTableView';
import { LEVEL_CONFIG } from '../data/mockTerritoryData';
import {
  Network,
  Table,
  Layers,
} from 'lucide-react';

interface GlassStructureViewProps {
  filteredLeaders: TerritorialLeader[];
  allLeaders: TerritorialLeader[];
  stats: HierarchyStats;
  selectedLeader: TerritorialLeader | null;
  collapsedIds: Set<string>;
  filters: FilterOptions;
  onFilterChange: React.Dispatch<React.SetStateAction<FilterOptions>>;
  onToggleCollapse: (id: string) => void;
  onSelectLeader: (leader: TerritorialLeader) => void;
  onFocusSubtree: (leaderId: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onEditLeader: (leader: TerritorialLeader) => void;
  onDeleteLeader: (id: string) => void;
}

export const GlassStructureView: React.FC<GlassStructureViewProps> = ({
  filteredLeaders,
  allLeaders,
  stats,
  selectedLeader,
  collapsedIds,
  filters,
  onFilterChange,
  onToggleCollapse,
  onSelectLeader,
  onFocusSubtree,
  onExpandAll,
  onCollapseAll,
  onEditLeader,
  onDeleteLeader,
}) => {
  const [viewMode, setViewMode] = useState<'organigrama' | 'directorio'>('organigrama');

  const levelsOrder: TerritorialLevel[] = [
    'distrital',
    'territorial',
    'seccional',
    'promotor',
    'promovido',
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4 sm:p-6 pb-28 space-y-4 select-none">
      {/* Top Glass Control Toolbar */}
      <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <span>Estructura Territorial</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                {stats.totalPeople} Integrantes
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Red jerárquica con control de visibilidad RBAC y trazabilidad territorial
            </p>
          </div>
        </div>

        {/* View Mode Toggle & Canvas Controls */}
        <div className="flex items-center gap-2">
          {viewMode === 'organigrama' && (
            <div className="flex items-center gap-1.5 mr-2">
              <button
                type="button"
                onClick={onExpandAll}
                className="px-2.5 py-1 text-[11px] glass-button rounded-lg text-slate-300 hover:text-white cursor-pointer"
                title="Desplegar todas las ramas"
              >
                Expandir
              </button>
              <button
                type="button"
                onClick={onCollapseAll}
                className="px-2.5 py-1 text-[11px] glass-button rounded-lg text-slate-300 hover:text-white cursor-pointer"
                title="Contraer ramas seccionales"
              >
                Contraer
              </button>
            </div>
          )}

          <div className="flex items-center glass-card rounded-xl p-1 border border-white/10">
            <button
              type="button"
              onClick={() => setViewMode('organigrama')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                viewMode === 'organigrama'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Organigrama</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('directorio')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                viewMode === 'directorio'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Directorio</span>
            </button>
          </div>
        </div>
      </div>

      {/* Level Filter Bar in Glass Style */}
      <div className="glass-panel rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3 overflow-x-auto shrink-0">
        <div className="flex items-center gap-2 shrink-0">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-slate-300 hidden sm:inline">Filtrar por nivel:</span>

          <button
            type="button"
            onClick={() => onFilterChange((prev) => ({ ...prev, levelFilter: 'all' }))}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              filters.levelFilter === 'all'
                ? 'bg-indigo-600 text-white border border-indigo-400/40 shadow-xs'
                : 'glass-card text-slate-400 hover:text-white'
            }`}
          >
            <span>Todos</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-bold">
              {stats.totalPeople}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {levelsOrder.map((lvl) => {
            const config = LEVEL_CONFIG[lvl];
            const count = stats.levelCounts[lvl] || 0;
            const isSelected = filters.levelFilter === lvl;
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => onFilterChange((prev) => ({ ...prev, levelFilter: lvl }))}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white border border-indigo-400/40 shadow-xs'
                    : 'glass-card text-slate-400 hover:text-white'
                }`}
              >
                <span>{config.label}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/10 text-indigo-300 font-bold">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Structure Canvas / Table Container */}
      <div className="flex-1 min-h-0 relative overflow-hidden rounded-2xl glass-panel">
        {viewMode === 'organigrama' ? (
          <TerritoryFlowCanvas
            leaders={filteredLeaders}
            collapsedIds={collapsedIds}
            selectedLeader={selectedLeader}
            onToggleCollapse={onToggleCollapse}
            onSelectLeader={onSelectLeader}
            onExpandAll={onExpandAll}
            onCollapseAll={onCollapseAll}
          />
        ) : (
          <div className="h-full overflow-y-auto">
            <DirectoryTableView
              leaders={filteredLeaders}
              allLeaders={allLeaders}
              onSelectLeader={onSelectLeader}
              onFocusSubtree={onFocusSubtree}
              onEditLeader={onEditLeader}
              onDeleteLeader={onDeleteLeader}
            />
          </div>
        )}
      </div>
    </div>
  );
};
