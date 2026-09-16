import React from 'react';
import { 
  X, 
  MapPin, 
  Phone, 
  Mail, 
  MessageSquare, 
  Users, 
  Target, 
  ChevronRight, 
  Edit3, 
  Compass, 
  Layers
} from 'lucide-react';
import type { TerritorialLeader } from '../types/territory';
import { LEVEL_CONFIG } from '../data/mockTerritoryData';
import { getAncestorsPath } from '../utils/hierarchy';

interface NodeDetailDrawerProps {
  leader: TerritorialLeader | null;
  allLeaders: TerritorialLeader[];
  onClose: () => void;
  onSelectLeader: (leader: TerritorialLeader) => void;
  onFocusSubtree: (leaderId: string) => void;
  onEditLeader: (leader: TerritorialLeader) => void;
  isFocused: boolean;
}

export const NodeDetailDrawer: React.FC<NodeDetailDrawerProps> = ({
  leader,
  allLeaders,
  onClose,
  onSelectLeader,
  onFocusSubtree,
  onEditLeader,
  isFocused,
}) => {
  if (!leader) return null;

  const levelStyle = LEVEL_CONFIG[leader.level] || LEVEL_CONFIG.promotor;
  const ancestors = getAncestorsPath(leader.id, allLeaders);
  const directChildren = allLeaders.filter(l => l.parentId === leader.id);

  const aggregatedGoal = leader.aggregatedGoal || leader.metaGoal;
  const aggregatedCount = leader.aggregatedCount || leader.currentCount;
  const percentage = aggregatedGoal > 0 ? Math.min(100, Math.round((aggregatedCount / aggregatedGoal) * 100)) : 0;
  const directPercentage = leader.metaGoal > 0 ? Math.min(100, Math.round((leader.currentCount / leader.metaGoal) * 100)) : 0;

  // Format clean phone number for whatsapp
  const cleanPhone = leader.phone?.replace(/[^0-9]/g, '') || '';

  return (
    <aside className="fixed inset-y-0 right-0 w-full sm:w-[460px] bg-white border-l border-slate-200 shadow-2xl z-30 flex flex-col transition-all duration-300">
      {/* Header with Chain of Command Breadcrumbs */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-600" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Expediente Territorial
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onFocusSubtree(leader.id)}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border font-medium transition-colors ${
              isFocused
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs'
            }`}
            title="Aislar esta rama jerárquica en el organigrama"
          >
            <Compass className="w-3.5 h-3.5 text-amber-600" />
            <span>{isFocused ? 'Enfocado' : 'Enfocar Rama'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Breadcrumb Path (Cadena de Mando) */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 overflow-x-auto text-[11px] flex items-center gap-1.5 text-slate-500 shrink-0">
        <span className="font-semibold text-slate-400">Mando:</span>
        {ancestors.map((anc, idx) => (
          <React.Fragment key={anc.id}>
            <button
              type="button"
              onClick={() => onSelectLeader(anc)}
              className={`hover:underline truncate max-w-[100px] ${
                anc.id === leader.id ? 'text-sky-600 font-bold' : 'hover:text-slate-800'
              }`}
            >
              {anc.name.split(' ')[0]} {anc.name.split(' ')[1] || ''}
            </button>
            {idx < ancestors.length - 1 && <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Profile Card */}
        <div className="flex items-start gap-3.5">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg text-white shadow-md shrink-0 ${leader.avatarBg || 'bg-indigo-600'}`}>
            {leader.name
              .split(' ')
              .filter(p => !['lic.', 'mtra.', 'mtro.', 'ing.', 'dr.', 'dra.'].includes(p.toLowerCase()))
              .slice(0, 2)
              .map(w => w[0])
              .join('')
              .toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <span className={`inline-block text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border mb-1 ${levelStyle.bgLight} ${levelStyle.color}`}>
              {levelStyle.label}
            </span>
            <h2 className="text-base font-bold text-slate-900 leading-snug">
              {leader.name}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {leader.role}
            </p>
          </div>
        </div>

        {/* Territory Location & Clave */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              Jurisdicción Asignada
            </span>
            {leader.code && (
              <span className="text-[11px] font-mono text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded">
                {leader.code}
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-slate-800">
            {leader.territoryName}
          </p>
        </div>

        {/* Direct Contact Buttons */}
        <div className="grid grid-cols-3 gap-2">
          {leader.phone ? (
            <a
              href={`tel:${leader.phone}`}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 shadow-xs transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-sky-600" />
              <span>Llamar</span>
            </a>
          ) : (
            <div className="flex items-center justify-center gap-1 py-2 px-3 bg-slate-100 text-slate-400 text-xs rounded-lg border border-slate-200">
              <Phone className="w-3.5 h-3.5" /> Sin tel
            </div>
          )}

          {cleanPhone ? (
            <a
              href={`https://wa.me/${cleanPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-medium rounded-lg border border-emerald-200 shadow-xs transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>WhatsApp</span>
            </a>
          ) : (
            <div className="flex items-center justify-center gap-1 py-2 px-3 bg-slate-100 text-slate-400 text-xs rounded-lg border border-slate-200">
              <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
            </div>
          )}

          {leader.email ? (
            <a
              href={`mailto:${leader.email}`}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 shadow-xs transition-colors"
            >
              <Mail className="w-3.5 h-3.5 text-indigo-600" />
              <span>Email</span>
            </a>
          ) : (
            <div className="flex items-center justify-center gap-1 py-2 px-3 bg-slate-100 text-slate-400 text-xs rounded-lg border border-slate-200">
              <Mail className="w-3.5 h-3.5" /> Sin email
            </div>
          )}
        </div>

        {/* Progress & Goals Breakdown */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-sky-600" />
            Métricas de Rendimiento
          </h4>

          {/* Aggregated (Entire Subtree) */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-700 font-medium">Meta Red Descendente</span>
              <span className="font-bold text-sky-600">{percentage}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  percentage >= 100 ? 'bg-emerald-500' : percentage < 30 ? 'bg-rose-500' : 'bg-sky-500'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>Logrado: <strong className="text-slate-900">{aggregatedCount.toLocaleString()}</strong></span>
              <span>Meta: <strong className="text-slate-600">{aggregatedGoal.toLocaleString()}</strong></span>
            </div>
          </div>

          {/* Direct (This Leader alone) */}
          <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Aportación Directa Personal</span>
              <span className="font-semibold text-slate-800">{directPercentage}%</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Directo: <strong className="text-slate-900">{leader.currentCount.toLocaleString()}</strong></span>
              <span>Meta personal: <strong className="text-slate-600">{leader.metaGoal.toLocaleString()}</strong></span>
            </div>
          </div>

          {/* Team Structure Counts */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
              <span className="text-slate-500 text-[11px] block">Subordinados Directos</span>
              <span className="text-xl font-bold text-slate-900 mt-0.5 block">
                {leader.directTeamCount ?? 0}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
              <span className="text-slate-500 text-[11px] block">Total en Toda la Red</span>
              <span className="text-xl font-bold text-sky-600 mt-0.5 block">
                {leader.totalTeamCount ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Direct Team Members List */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-sky-600" />
              Equipo Directo ({directChildren.length})
            </h4>
          </div>

          {directChildren.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
              Este líder no tiene subordinados asignados actualmente.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {directChildren.map((child) => {
                const childLevel = LEVEL_CONFIG[child.level] || LEVEL_CONFIG.promotor;
                return (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => onSelectLeader(child)}
                    className="w-full text-left p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors flex items-center justify-between group"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-800 group-hover:text-sky-600 truncate">
                          {child.name}
                        </span>
                        <span className={`text-[10px] px-1.5 rounded border ${childLevel.bgLight} ${childLevel.color}`}>
                          {child.level}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {child.territoryName}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Observations / Notes */}
        {leader.notes && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Observaciones de Campo
            </h4>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
              {leader.notes}
            </div>
          </div>
        )}
      </div>

      {/* Drawer Footer Actions */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/90 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onEditLeader(leader)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 shadow-xs transition-colors"
        >
          <Edit3 className="w-3.5 h-3.5 text-sky-600" />
          <span>Editar Datos o Metas</span>
        </button>
      </div>
    </aside>
  );
};
