import type { 
  TerritorialLeader, 
  HierarchyStats 
} from '../types/territory';
import { LEVEL_CONFIG } from '../data/mockTerritoryData';
import { 
  Users, 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  ChevronRight, 
  Award,
  Layers
} from 'lucide-react';

interface StatsDashboardViewProps {
  stats: HierarchyStats;
  leaders?: TerritorialLeader[];
  onSelectLeader: (leader: TerritorialLeader) => void;
}

export const StatsDashboardView: React.FC<StatsDashboardViewProps> = ({
  stats,
  onSelectLeader,
}) => {
  return (
    <div className="flex-1 overflow-auto p-6 bg-slate-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Title */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Tablero de Control Territorial & Metas
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Análisis de cobertura piramidal, avance acumulado y focos de atención operativa
          </p>
        </div>

        {/* 4 High-Level Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Integrantes */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total en Estructura</span>
              <div className="p-2 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                {stats.totalPeople.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 ml-2">responsables</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              Desplegados en 5 niveles de mando
            </div>
          </div>

          {/* Card 2: Meta Global */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Meta Global Asignada</span>
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                {stats.totalGoal.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 ml-2">personas</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              Objetivo consolidado de captación
            </div>
          </div>

          {/* Card 3: Logrado Acumulado */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Contactos Alcanzados</span>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-emerald-600 tracking-tight">
                {stats.totalAchieved.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 ml-2">
                ({stats.overallPercentage}%)
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              Avance directo reportado en campo
            </div>
          </div>

          {/* Card 4: Focos Rojos */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Puntos de Atención</span>
              <div className="p-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-rose-600 tracking-tight">
                {stats.criticalNodes.length}
              </span>
              <span className="text-xs text-slate-500 ml-2">en rezago</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              Nodos con avance menor al 30%
            </div>
          </div>
        </div>

        {/* Level Breakdown & Status Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Level Breakdown */}
          <div className="lg:col-span-2 bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-4 h-4 text-sky-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Distribución de Personal por Nivel Territorial
              </h3>
            </div>

            <div className="space-y-3">
              {Object.entries(LEVEL_CONFIG).map(([levelKey, config]) => {
                const count = stats.levelCounts[levelKey as keyof typeof stats.levelCounts] || 0;
                const pct = stats.totalPeople > 0 ? Math.round((count / stats.totalPeople) * 100) : 0;

                return (
                  <div key={levelKey} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 font-medium flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${config.border.replace('border-', 'bg-')}`} />
                        {config.label}
                      </span>
                      <span className="text-slate-500">
                        <strong className="text-slate-900">{count}</strong> ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${config.border.replace('border-', 'bg-')}`}
                        style={{ width: `${Math.max(pct, count > 0 ? 5 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Salud y Cumplimiento de Nodos
                </h3>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <div>
                      <span className="text-xs font-semibold text-emerald-900 block">Meta Cumplida (100%+)</span>
                      <span className="text-[11px] text-emerald-700">Operación al día</span>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-emerald-900">
                    {stats.statusCounts['completado'] || 0}
                  </span>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <div>
                      <span className="text-xs font-semibold text-amber-900 block">En Avance Regular</span>
                      <span className="text-[11px] text-amber-700">Despliegue activo</span>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-amber-900">
                    {stats.statusCounts['en_progreso'] || 0}
                  </span>
                </div>

                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <div>
                      <span className="text-xs font-semibold text-rose-900 block">Rezago Crítico</span>
                      <span className="text-[11px] text-rose-700">Requiere relevo o apoyo</span>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-rose-900">
                    {stats.statusCounts['critico'] || 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 text-center">
              Actualizado en tiempo real según reportes directos
            </div>
          </div>
        </div>

        {/* Top Performers and Critical Alert Nodes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Performers */}
          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900">
                Líderes de Mayor Rendimiento
              </h3>
            </div>

            <div className="space-y-2">
              {stats.topPerformers.map((leader, i) => {
                const ratio = leader.metaGoal > 0 ? Math.round((leader.currentCount / leader.metaGoal) * 100) : 0;
                return (
                  <button
                    key={leader.id}
                    type="button"
                    onClick={() => onSelectLeader(leader)}
                    className="w-full text-left p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-lg border border-slate-200 transition-colors flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                      <span className="w-5 text-center font-bold text-xs text-amber-600">
                        #{i + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-slate-900 group-hover:text-sky-600 block truncate">
                          {leader.name}
                        </span>
                        <span className="text-[11px] text-slate-500 truncate block">
                          {leader.role} • {leader.territoryName}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-emerald-600 block">{ratio}%</span>
                      <span className="text-[10px] text-slate-400">
                        {leader.currentCount} / {leader.metaGoal}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Critical Attention Nodes */}
          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <h3 className="text-sm font-bold text-slate-900">
                Focos Rojos & Requieren Intervención
              </h3>
            </div>

            {stats.criticalNodes.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No hay ningún territorio en estado crítico actualmente.
              </div>
            ) : (
              <div className="space-y-2">
                {stats.criticalNodes.map((leader) => {
                  const ratio = leader.metaGoal > 0 ? Math.round((leader.currentCount / leader.metaGoal) * 100) : 0;
                  return (
                    <button
                      key={leader.id}
                      type="button"
                      onClick={() => onSelectLeader(leader)}
                      className="w-full text-left p-2.5 bg-rose-50/40 hover:bg-rose-50/80 rounded-lg border border-rose-200 transition-colors flex items-center justify-between group"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <span className="text-xs font-semibold text-rose-900 group-hover:text-rose-700 block truncate">
                          {leader.name}
                        </span>
                        <span className="text-[11px] text-slate-500 truncate block">
                          {leader.role} • {leader.territoryName}
                        </span>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-2">
                        <div>
                          <span className="text-xs font-bold text-rose-600 block">{ratio}%</span>
                          <span className="text-[10px] text-slate-400">
                            {leader.currentCount} / {leader.metaGoal}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
