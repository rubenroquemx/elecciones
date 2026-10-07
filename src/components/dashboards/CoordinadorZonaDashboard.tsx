import React from 'react';
import type { TerritorialLeader } from '../../types/territory';
import type { UserAccount } from '../../types/auth';
import type { ElectoralSection } from '../../types/sections';
import { 
  Building2, 
  MapPin, 
  Users, 
  UserCheck, 
  Phone, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { WhatsAppIcon } from '../icons/WhatsAppIcon';

interface CoordinadorZonaDashboardProps {
  currentUser: UserAccount;
  allLeaders: TerritorialLeader[];
  sections?: ElectoralSection[];
  onSelectLeader?: (leader: TerritorialLeader) => void;
}

export const CoordinadorZonaDashboard: React.FC<CoordinadorZonaDashboardProps> = ({
  currentUser,
  allLeaders,
  sections: _sections = [],
  onSelectLeader,
}) => {
  // Responsables de Zona a su cargo
  const responsablesZona = allLeaders.filter(
    l => l.level === 'responsable_zona' && (l.parentId === currentUser.leaderId || l.territoryName?.includes(currentUser.territoryName))
  );

  // Responsables de Sección dependientes
  const responsablesSeccion = allLeaders.filter(
    l => (l.level === 'territorial' || l.level === 'seccional') && (
      responsablesZona.some(rz => rz.id === l.parentId) || l.parentId === currentUser.leaderId
    )
  );

  // Promotores y promovidos de la zona
  const promotores = allLeaders.filter(
    l => l.level === 'promotor' && responsablesSeccion.some(rs => rs.id === l.parentId)
  );
  const promovidos = allLeaders.filter(
    l => l.level === 'promovido' && promotores.some(p => p.id === l.parentId)
  );

  const assignedSections = currentUser.assignedSections || [];
  const metaZona = responsablesZona.reduce((acc, s) => acc + (s.metaGoal || 0), 0);
  const progresoPct = metaZona > 0 ? Math.min(100, Math.round((promovidos.length / metaZona) * 100)) : 0;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6 font-sans text-slate-800">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Nivel 3 • Coordinación de Zona
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {currentUser.territoryName}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {currentUser.name}
            </h1>
            <p className="text-xs text-slate-500">
              Despliegue y supervisión de Responsables de Zona y cobertura seccional del sector
            </p>
          </div>

          <div className="bg-purple-50/60 border border-purple-100 rounded-xl px-4 py-2.5 text-right">
            <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wider block">Avance de Zona</span>
            {metaZona > 0 ? (
              <span className="text-lg font-black text-purple-700 font-mono">{progresoPct}%</span>
            ) : (
              <span className="text-xs font-semibold text-slate-400">Meta no definida</span>
            )}
          </div>
        </div>

        {/* 5 KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Secciones</span>
              <MapPin className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{assignedSections.length}</div>
            <div className="text-[10px] text-slate-400 mt-1">Secciones del Sector</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Resp. Zona</span>
              <Building2 className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{responsablesZona.length}</div>
            <div className="text-[10px] text-slate-400 mt-1">Subordinados Directos</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Resp. Sección</span>
              <ShieldCheck className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{responsablesSeccion.length}</div>
            <div className="text-[10px] text-slate-400 mt-1">Líderes de Sección</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Promotores</span>
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{promotores.length}</div>
            <div className="text-[10px] text-slate-400 mt-1">Promotores en Zona</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Promovidos</span>
              <UserCheck className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-emerald-600 font-mono">{promovidos.length}</div>
            <div className="text-[10px] text-slate-400 mt-1">
              {metaZona > 0 ? `Meta: ${metaZona.toLocaleString()}` : 'Meta no definida'}
            </div>
          </div>
        </div>

        {/* Directorio de Responsables de Zona */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Responsables de Zona a su Cargo</h2>
              <p className="text-xs text-slate-500">Supervisores territoriales asignados a esta zona</p>
            </div>
            <span className="text-xs font-bold text-slate-400 font-mono">
              {responsablesZona.length} Responsables
            </span>
          </div>

          {responsablesZona.length === 0 ? (
            <div className="p-10 text-center">
              <Building2 className="w-9 h-9 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">No hay Responsables de Zona registrados aún</p>
              <p className="text-[11px] text-slate-400 mt-1">Al incorporar líderes de este nivel, sus avances aparecerán en esta tabla.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold tracking-wider bg-slate-50/60">
                    <th className="py-3 px-4">Responsable</th>
                    <th className="py-3 px-4">Microrregión</th>
                    <th className="py-3 px-4">Resp. Sección</th>
                    <th className="py-3 px-4">Promovidos</th>
                    <th className="py-3 px-4 text-center">Contacto</th>
                    <th className="py-3 px-4 text-right">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {responsablesZona.map(rz => {
                    const cleanPhone = (rz.phone || '').replace(/\D/g, '');
                    return (
                      <tr key={rz.id} onClick={() => onSelectLeader?.(rz)} className="hover:bg-amber-50/30 transition-colors cursor-pointer">
                        <td className="py-3 px-4 font-bold text-slate-900">{rz.name}</td>
                        <td className="py-3 px-4 text-slate-600">{rz.territoryName}</td>
                        <td className="py-3 px-4 font-mono font-semibold">{rz.directTeamCount || allLeaders.filter(l => l.parentId === rz.id).length}</td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-600">{rz.currentCount || 0}</td>
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
                        <td className="py-3 px-4 text-right font-bold text-purple-600">Ver <ChevronRight className="w-3.5 h-3.5 inline" /></td>
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
