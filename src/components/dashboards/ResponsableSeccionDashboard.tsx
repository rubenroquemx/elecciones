import React from 'react';
import type { TerritorialLeader } from '../../types/territory';
import type { UserAccount } from '../../types/auth';
import type { ElectoralSection } from '../../types/sections';
import { 
  MapPin, 
  Users, 
  UserCheck, 
  Target, 
  Phone, 
  ChevronRight,
  UserPlus,
  Plus
} from 'lucide-react';
import { WhatsAppIcon } from '../icons/WhatsAppIcon';

interface ResponsableSeccionDashboardProps {
  currentUser: UserAccount;
  allLeaders: TerritorialLeader[];
  sections?: ElectoralSection[];
  onSelectLeader?: (leader: TerritorialLeader) => void;
  onNavigateView?: (view: any) => void;
}

export const ResponsableSeccionDashboard: React.FC<ResponsableSeccionDashboardProps> = ({
  currentUser,
  allLeaders,
  sections: _sections = [],
  onSelectLeader,
  onNavigateView,
}) => {
  // Promotores asignados a sus secciones
  const promotores = allLeaders.filter(
    l => l.level === 'promotor' && (
      l.parentId === currentUser.leaderId || 
      (currentUser.assignedSections && currentUser.assignedSections.includes(l.electoralSection || ''))
    )
  );

  const promotorIds = new Set(promotores.map(p => p.id));
  const promovidos = allLeaders.filter(
    l => l.level === 'promovido' && (
      promotorIds.has(l.parentId || '') ||
      (currentUser.assignedSections && currentUser.assignedSections.includes(l.electoralSection || ''))
    )
  );

  const assignedSections = currentUser.assignedSections || [];
  const nominalListTotal = _sections
    .filter(s => assignedSections.includes(s.sectionNumber) || assignedSections.includes(s.sectionNumber.padStart(4, '0')))
    .reduce((acc, s) => acc + (s.nominalList || 0), 0);
  const metaSeccion = promotores.reduce((acc, s) => acc + (s.metaGoal || 0), 0);
  const progresoPct = metaSeccion > 0 ? Math.min(100, Math.round((promovidos.length / metaSeccion) * 100)) : 0;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6 font-sans text-slate-800">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Nivel 5 • Responsable de Sección
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {currentUser.territoryName}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {currentUser.name}
            </h1>
            <p className="text-xs text-slate-500">
              Operación directa en casillas electorales, supervisión de promotores y meta seccional
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-sky-50/60 border border-sky-100 rounded-xl px-4 py-2.5 text-right">
              <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider block">Meta Seccional</span>
              <div className="flex items-baseline gap-1 justify-end">
                <span className="text-lg font-black text-sky-700 font-mono">{promovidos.length}</span>
                <span className="text-[11px] text-slate-400">
                  {metaSeccion > 0 ? `/ ${metaSeccion.toLocaleString()}` : '/ Meta no definida'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 5 KPIs Seccionales */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Secciones</span>
              <MapPin className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{assignedSections.length}</div>
            <div className="text-[10px] text-slate-400 mt-1">Bajo Responsabilidad</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Padrón Electoral</span>
              <Users className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {nominalListTotal > 0 ? nominalListTotal.toLocaleString() : '—'}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Lista Nominal Asignada</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Promotores</span>
              <UserPlus className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{promotores.length}</div>
            <div className="text-[10px] text-slate-400 mt-1">Activos en Sección</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Promovidos</span>
              <UserCheck className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-emerald-600 font-mono">{promovidos.length}</div>
            <div className="text-[10px] text-slate-400 mt-1">Contactados con INE</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Cumplimiento</span>
              <Target className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {metaSeccion > 0 ? `${progresoPct}%` : '—'}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {metaSeccion > 0 ? 'Hacia la Meta de Triunfo' : 'Meta no definida'}
            </div>
          </div>
        </div>

        {/* Directorio de Promotores Territoriales */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Promotores Territoriales de la Sección</h2>
              <p className="text-xs text-slate-500">Equipo en calle encargado de la captura de promovidos</p>
            </div>
            {onNavigateView && (
              <button
                type="button"
                onClick={() => onNavigateView('crear-promotor')}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Promotor Territorial</span>
              </button>
            )}
          </div>

          {promotores.length === 0 ? (
            <div className="p-10 text-center">
              <Users className="w-9 h-9 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">Aún no hay promotores registrados en esta sección</p>
              <p className="text-[11px] text-slate-400 mt-1">Registra promotores para que comiencen a capturar ciudadanos en sus manzanas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold tracking-wider bg-slate-50/60">
                    <th className="py-3 px-4">Promotor</th>
                    <th className="py-3 px-4">Sección</th>
                    <th className="py-3 px-4">Promovidos</th>
                    <th className="py-3 px-4">Meta Indiv.</th>
                    <th className="py-3 px-4 text-center">Contacto</th>
                    <th className="py-3 px-4 text-right">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {promotores.map(p => {
                    const cleanPhone = (p.phone || '').replace(/\D/g, '');
                    return (
                      <tr key={p.id} onClick={() => onSelectLeader?.(p)} className="hover:bg-emerald-50/30 transition-colors cursor-pointer">
                        <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                        <td className="py-3 px-4 text-slate-600 font-mono">{p.electoralSection || p.assignedSections?.[0] || '—'}</td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-600">{p.currentCount || 0}</td>
                        <td className="py-3 px-4 font-mono text-slate-500">{p.metaGoal ? p.metaGoal.toLocaleString() : 'No asignada'}</td>
                        <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            {cleanPhone && (
                              <>
                                <a href={`tel:${cleanPhone}`} className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg">
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                                <a href={`https://wa.me/52${cleanPhone}`} target="_blank" rel="noopener noreferrer" className="p-1.5 text-[#25D366]">
                                  <WhatsAppIcon className="w-4 h-4" />
                                </a>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-sky-600">Ver <ChevronRight className="w-3.5 h-3.5 inline" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
