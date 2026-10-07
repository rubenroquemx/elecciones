import React from 'react';
import type { TerritorialLeader } from '../../types/territory';
import type { UserAccount } from '../../types/auth';
import type { ElectoralSection } from '../../types/sections';
import { 
  MapPin, 
  Users, 
  UserCheck, 
  Phone, 
  ChevronRight,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

const OfficialWhatsAppIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.886 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

interface ResponsableZonaDashboardProps {
  currentUser: UserAccount;
  allLeaders: TerritorialLeader[];
  sections?: ElectoralSection[];
  onSelectLeader?: (leader: TerritorialLeader) => void;
  onOpenCreateUser?: () => void;
}

export const ResponsableZonaDashboard: React.FC<ResponsableZonaDashboardProps> = ({
  currentUser,
  allLeaders,
  sections: _sections = [],
  onSelectLeader,
  onOpenCreateUser,
}) => {
  // Responsables de Sección subordinados
  const responsablesSeccion = allLeaders.filter(
    l => (l.level === 'territorial' || l.level === 'seccional') && (
      l.parentId === currentUser.leaderId || l.territoryName?.includes(currentUser.territoryName)
    )
  );

  // Promotores de sus secciones
  const promotores = allLeaders.filter(
    l => l.level === 'promotor' && responsablesSeccion.some(rs => rs.id === l.parentId)
  );

  // Promovidos
  const promovidos = allLeaders.filter(
    l => l.level === 'promovido' && promotores.some(p => p.id === l.parentId)
  );

  const assignedSections = currentUser.assignedSections || ['0285', '0366'];
  const coveredCount = responsablesSeccion.length;
  const vacantCount = Math.max(0, assignedSections.length - coveredCount);
  const metaResponsableZona = 3500;
  const progresoPct = Math.min(100, Math.round((promovidos.length / metaResponsableZona) * 100));

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6 font-sans text-slate-800">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Nivel 4 • Responsable de Zona
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {currentUser.territoryName}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {currentUser.name}
            </h1>
            <p className="text-xs text-slate-500">
              Coordinación operativa directa de Responsables de Sección en la microrregión
            </p>
          </div>

          <div className="bg-amber-50/60 border border-amber-100 rounded-xl px-4 py-2.5 text-right">
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Avance Táctico</span>
            <span className="text-lg font-black text-amber-700 font-mono">{progresoPct}%</span>
          </div>
        </div>

        {/* 4 KPIs Clave */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Secciones</span>
              <MapPin className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{assignedSections.length}</div>
            <div className="text-[10px] text-slate-400 mt-1">Secciones Asignadas</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Resp. Sección</span>
              <ShieldCheck className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{responsablesSeccion.length}</div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-1">{vacantCount === 0 ? '100% Cubiertas' : `${vacantCount} vacantes`}</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Promotores</span>
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{promotores.length}</div>
            <div className="text-[10px] text-slate-400 mt-1">En Territorio</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Promovidos</span>
              <UserCheck className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-emerald-600 font-mono">{promovidos.length}</div>
            <div className="text-[10px] text-slate-400 mt-1">Meta: {metaResponsableZona.toLocaleString()}</div>
          </div>
        </div>

        {/* Alerta de Vacancia si faltan secciones */}
        {vacantCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-900">Secciones sin Responsable de Sección asignado ({vacantCount})</p>
                <p className="text-[11px] text-amber-700">Se requiere dar de alta líderes seccionales para garantizar la cobertura territorial.</p>
              </div>
            </div>
            {onOpenCreateUser && (
              <button
                type="button"
                onClick={onOpenCreateUser}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs"
              >
                Asignar Responsable
              </button>
            )}
          </div>
        )}

        {/* Directorio de Responsables de Sección */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Responsables de Sección a su Cargo</h2>
              <p className="text-xs text-slate-500">Líderes responsables de cada casilla y sección electoral</p>
            </div>
            <span className="text-xs font-bold text-slate-400 font-mono">
              {responsablesSeccion.length} Responsables Activos
            </span>
          </div>

          {responsablesSeccion.length === 0 ? (
            <div className="p-10 text-center">
              <ShieldCheck className="w-9 h-9 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">No hay Responsables de Sección asignados aún</p>
              <p className="text-[11px] text-slate-400 mt-1">Registra a los coordinadores de sección para comenzar la conformación de casillas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold tracking-wider bg-slate-50/60">
                    <th className="py-3 px-4">Responsable de Sección</th>
                    <th className="py-3 px-4">Sección(es)</th>
                    <th className="py-3 px-4">Promotores</th>
                    <th className="py-3 px-4">Promovidos</th>
                    <th className="py-3 px-4 text-center">Contacto</th>
                    <th className="py-3 px-4 text-right">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {responsablesSeccion.map(rs => {
                    const cleanPhone = (rs.phone || '').replace(/\D/g, '');
                    return (
                      <tr key={rs.id} onClick={() => onSelectLeader?.(rs)} className="hover:bg-sky-50/30 transition-colors cursor-pointer">
                        <td className="py-3 px-4 font-bold text-slate-900">{rs.name}</td>
                        <td className="py-3 px-4 text-slate-600 font-mono">{rs.territoryName}</td>
                        <td className="py-3 px-4 font-mono font-semibold">{rs.directTeamCount || allLeaders.filter(l => l.parentId === rs.id).length}</td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-600">{rs.currentCount || 0}</td>
                        <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            {cleanPhone && (
                              <>
                                <a href={`tel:${cleanPhone}`} className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg">
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                                <a href={`https://wa.me/52${cleanPhone}`} target="_blank" rel="noopener noreferrer" className="p-1.5 text-[#25D366]">
                                  <OfficialWhatsAppIcon className="w-4 h-4" />
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
