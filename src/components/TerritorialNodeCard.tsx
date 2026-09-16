import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { TerritorialLeader } from '../types/territory';
import { LEVEL_CONFIG } from '../data/mockTerritoryData';
import { 
  Users, 
  MapPin, 
  ChevronDown, 
  ChevronRight, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  ExternalLink
} from 'lucide-react';

interface TerritorialNodeProps {
  data: {
    leader: TerritorialLeader;
    hasChildren: boolean;
    isCollapsed: boolean;
    isSelected: boolean;
    descendantCount: number;
    onToggleCollapse?: (id: string) => void;
    onSelectNode?: (leader: TerritorialLeader) => void;
  };
}

export const TerritorialNodeCard: React.FC<TerritorialNodeProps> = memo(({ data }) => {
  const { leader, hasChildren, isCollapsed, isSelected, descendantCount, onToggleCollapse, onSelectNode } = data;
  const levelStyle = LEVEL_CONFIG[leader.level] || LEVEL_CONFIG.promotor;

  const aggregatedGoal = leader.aggregatedGoal || leader.metaGoal;
  const aggregatedCount = leader.aggregatedCount || leader.currentCount;
  const percentage = aggregatedGoal > 0 ? Math.min(100, Math.round((aggregatedCount / aggregatedGoal) * 100)) : 0;

  // Status badges in light mode
  const statusBadge = {
    completado: { text: 'Meta lograda', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    en_progreso: { text: 'En avance', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
    critico: { text: 'Rezago', bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: AlertCircle },
    vacante: { text: 'Vacante', bg: 'bg-slate-100 text-slate-600 border-slate-200', icon: AlertCircle },
  }[leader.status] || { text: 'Activo', bg: 'bg-slate-100 text-slate-600 border-slate-200', icon: Clock };

  const StatusIcon = statusBadge.icon;

  // Avatar initials
  const initials = leader.name
    .split(' ')
    .filter(part => !['lic.', 'mtra.', 'mtro.', 'ing.', 'dr.', 'dra.'].includes(part.toLowerCase()))
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  return (
    <div
      onClick={() => onSelectNode && onSelectNode(leader)}
      className={`relative w-[300px] rounded-xl border transition-all duration-200 cursor-pointer shadow-md group select-none ${
        isSelected 
          ? 'bg-white border-sky-500 ring-2 ring-sky-400/50 shadow-xl shadow-sky-100' 
          : 'bg-white hover:bg-slate-50/80 border-slate-200 hover:border-slate-300 shadow-slate-200/60'
      }`}
    >
      {/* React Flow Top Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-sky-600 border-2 border-white !rounded-full transition-transform hover:scale-125 shadow-xs"
      />

      {/* Top Banner with Level and Status */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-100 bg-slate-50/90 rounded-t-xl">
        <span className={`text-[11px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full border ${levelStyle.bgLight} ${levelStyle.color}`}>
          {levelStyle.label.replace('Coordinación ', '')}
        </span>
        <div className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${statusBadge.bg}`}>
          <StatusIcon className="w-3 h-3" />
          <span>{statusBadge.text}</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-3.5 space-y-2.5">
        {/* Leader Info */}
        <div className="flex items-start gap-2.5">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white shadow-sm shrink-0 ${leader.avatarBg || 'bg-indigo-600'}`}>
            {initials || 'TR'}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-slate-900 truncate leading-tight group-hover:text-sky-600 transition-colors">
              {leader.name}
            </h4>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {leader.role}
            </p>
          </div>
        </div>

        {/* Territory Location */}
        <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-200">
          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          <span className="truncate font-medium">{leader.territoryName}</span>
          {leader.code && (
            <span className="ml-auto text-[10px] text-slate-500 font-mono bg-white border border-slate-200 px-1 rounded">
              {leader.code}
            </span>
          )}
        </div>

        {/* Progress Bar & Aggregated Metrics */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-sky-600" />
              Meta red ({percentage}%)
            </span>
            <span className="font-semibold text-slate-700">
              {aggregatedCount.toLocaleString()} / {aggregatedGoal.toLocaleString()}
            </span>
          </div>
          
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                percentage >= 100 
                  ? 'bg-emerald-500' 
                  : percentage < 30 
                    ? 'bg-rose-500' 
                    : 'bg-sky-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Bottom Sub-team stats and Collapse/Expand */}
        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>
              <strong className="text-slate-800">{leader.directTeamCount ?? 0}</strong> directos
              {descendantCount > 0 && (
                <span className="text-slate-400"> ({descendantCount} en red)</span>
              )}
            </span>
          </div>

          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectNode && onSelectNode(leader);
            }}
            className="text-[11px] font-semibold text-sky-600 hover:text-sky-800 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Ver expediente completo"
          >
            Detalles <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Collapse/Expand Toggle Button at Bottom Handle */}
      {hasChildren && (
        <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleCollapse) onToggleCollapse(leader.id);
            }}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md border transition-all ${
              isCollapsed
                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300 ring-2 ring-amber-200/60'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-2xs'
            }`}
            title={isCollapsed ? `Expandir ${descendantCount} nodos dependientes` : 'Colapsar sub-pirámide'}
          >
            {isCollapsed ? (
              <>
                <ChevronRight className="w-3 h-3" />
                <span>+{descendantCount}</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                <span>Contraer</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* React Flow Bottom Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-sky-600 border-2 border-white !rounded-full transition-transform hover:scale-125 shadow-xs"
      />
    </div>
  );
});

TerritorialNodeCard.displayName = 'TerritorialNodeCard';
