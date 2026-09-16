import React from 'react';
import type { TerritorialLevel } from '../types/territory';
import { LEVEL_CONFIG } from '../data/mockTerritoryData';
import { Layers } from 'lucide-react';

interface LevelSummaryBarProps {
  levelCounts: Record<TerritorialLevel, number>;
  totalCount: number;
  currentFilter: TerritorialLevel | 'all';
  onSelectLevel: (level: TerritorialLevel | 'all') => void;
}

export const LevelSummaryBar: React.FC<LevelSummaryBarProps> = ({
  levelCounts,
  totalCount,
  currentFilter,
  onSelectLevel,
}) => {
  const levelsOrder: TerritorialLevel[] = [
    'distrital',
    'territorial',
    'seccional',
    'promotor',
    'promovido',
  ];

  return (
    <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 flex items-center justify-between gap-3 overflow-x-auto select-none shrink-0 shadow-2xs">
      {/* Title & Total badge */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <Layers className="w-4 h-4 text-sky-600" />
          <span className="hidden sm:inline">Niveles Territoriales:</span>
        </div>

        {/* All / Total button */}
        <button
          type="button"
          onClick={() => onSelectLevel('all')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
            currentFilter === 'all'
              ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-2xs'
          }`}
          title="Ver todos los integrantes"
        >
          <span>Todos</span>
          <span className={`px-1.5 py-0.2 text-[11px] rounded-full font-bold ${
            currentFilter === 'all' ? 'bg-sky-700 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {totalCount}
          </span>
        </button>
      </div>

      {/* Horizontal pill list of each level with its count */}
      <div className="flex items-center gap-1.5 shrink-0">
        {levelsOrder.map((levelKey) => {
          const config = LEVEL_CONFIG[levelKey];
          const count = levelCounts[levelKey] || 0;
          const isSelected = currentFilter === levelKey;

          return (
            <button
              key={levelKey}
              type="button"
              onClick={() => onSelectLevel(isSelected ? 'all' : levelKey)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all border ${
                isSelected
                  ? 'ring-2 ring-sky-500 font-bold bg-white text-slate-900 border-sky-300 shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-2xs'
              }`}
              title={`Filtrar por ${config.label}`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${config.border.replace('border-', 'bg-')}`} />
              <span className="truncate max-w-[130px] font-medium text-[11px]">
                {config.label.replace('Coordinación ', '')}
              </span>
              <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold border ${config.bgLight} ${config.color}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
