import React, { useState } from 'react';
import type { 
  TerritorialLeader 
} from '../types/territory';
import { LEVEL_CONFIG } from '../data/mockTerritoryData';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ExternalLink, 
  Compass, 
  Edit3, 
  Trash2,
  Phone,
  MapPin,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface DirectoryTableViewProps {
  leaders: TerritorialLeader[];
  allLeaders: TerritorialLeader[];
  onSelectLeader: (leader: TerritorialLeader) => void;
  onFocusSubtree: (id: string) => void;
  onEditLeader: (leader: TerritorialLeader) => void;
  onDeleteLeader: (id: string) => void;
}

export const DirectoryTableView: React.FC<DirectoryTableViewProps> = ({
  leaders,
  allLeaders,
  onSelectLeader,
  onFocusSubtree,
  onEditLeader,
  onDeleteLeader,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 35;
  const totalPages = Math.ceil(leaders.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedLeaders = leaders.slice((safePage - 1) * pageSize, safePage * pageSize);

  const leaderMap = new Map(allLeaders.map(l => [l.id, l]));

  return (
    <div className="flex-1 overflow-auto p-6 bg-slate-50">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Table summary header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Directorio Territorial de Estructura</h2>
            <p className="text-xs text-slate-500">
              Mostrando {leaders.length} de {allLeaders.length} registros • Página {safePage} de {totalPages}
            </p>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 rounded-lg border border-slate-200 shadow-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Anterior
              </button>
              <span className="text-slate-600 font-medium px-1">
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 rounded-lg border border-slate-200 shadow-xs"
              >
                Siguiente <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Table container */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="py-3 px-4">Responsable</th>
                  <th className="py-3 px-4">Nivel & Cargo</th>
                  <th className="py-3 px-4">Jurisdicción / Sección</th>
                  <th className="py-3 px-4">Líder Superior</th>
                  <th className="py-3 px-4 text-center">Equipo Red</th>
                  <th className="py-3 px-4">Meta & Avance</th>
                  <th className="py-3 px-4">Estatus</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {leaders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No se encontraron integrantes que coincidan con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  paginatedLeaders.map((leader) => {
                    const levelStyle = LEVEL_CONFIG[leader.level] || LEVEL_CONFIG.promotor;
                    const parent = leader.parentId ? leaderMap.get(leader.parentId) : null;
                    const aggGoal = leader.aggregatedGoal || leader.metaGoal;
                    const aggCount = leader.aggregatedCount || leader.currentCount;
                    const percentage = aggGoal > 0 ? Math.min(100, Math.round((aggCount / aggGoal) * 100)) : 0;

                    return (
                      <tr 
                        key={leader.id}
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                        onClick={() => onSelectLeader(leader)}
                      >
                        {/* Name and avatar */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0 ${leader.avatarBg || 'bg-indigo-600'}`}>
                              {leader.name.split(' ').filter(p => !p.includes('.')).slice(0, 2).map(w => w[0]).join('')}
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-900 group-hover:text-sky-600 transition-colors block truncate">
                                {leader.name}
                              </span>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                {leader.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    {leader.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Level & Role */}
                        <td className="py-3 px-4">
                          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${levelStyle.bgLight} ${levelStyle.color}`}>
                            {levelStyle.label.replace('Coordinación ', '')}
                          </span>
                          <span className="block text-[11px] text-slate-500 mt-0.5 truncate">
                            {leader.role}
                          </span>
                        </td>

                        {/* Territory */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 font-medium text-slate-800">
                            <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                            <span className="truncate max-w-[180px]">{leader.territoryName}</span>
                          </div>
                          {leader.code && (
                            <span className="text-[10px] text-sky-700 font-mono bg-sky-50 px-1 py-0.5 rounded border border-sky-100">
                              {leader.code}
                            </span>
                          )}
                        </td>

                        {/* Parent Superior */}
                        <td className="py-3 px-4">
                          {parent ? (
                            <div>
                              <span className="text-slate-700 font-medium truncate block max-w-[140px]">
                                {parent.name}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {parent.role}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Cúspide estatal</span>
                          )}
                        </td>

                        {/* Team count */}
                        <td className="py-3 px-4 text-center">
                          <span className="font-semibold text-slate-800">
                            {leader.directTeamCount ?? 0}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            ({leader.totalTeamCount ?? 0} total)
                          </span>
                        </td>

                        {/* Goals and progress */}
                        <td className="py-3 px-4 min-w-[150px]">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="font-semibold text-slate-700">{aggCount.toLocaleString()}</span>
                            <span className="text-slate-400">/ {aggGoal.toLocaleString()}</span>
                            <span className="font-bold text-sky-600 ml-1">{percentage}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${percentage >= 100 ? 'bg-emerald-500' : percentage < 30 ? 'bg-rose-500' : 'bg-sky-500'}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </td>

                        {/* Status badge */}
                        <td className="py-3 px-4">
                          {leader.status === 'completado' && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Logrado
                            </span>
                          )}
                          {leader.status === 'en_progreso' && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" /> En avance
                            </span>
                          )}
                          {leader.status === 'critico' && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertCircle className="w-3 h-3 text-rose-600" /> Rezago
                            </span>
                          )}
                          {leader.status === 'vacante' && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              Vacante
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => onSelectLeader(leader)}
                              className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Ver detalles"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onFocusSubtree(leader.id)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Aislar rama"
                            >
                              <Compass className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onEditLeader(leader)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {leader.parentId !== null && (
                              <button
                                type="button"
                                onClick={() => onDeleteLeader(leader.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Eliminar nodo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
