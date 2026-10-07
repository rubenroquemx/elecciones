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
  ShieldCheck,
  Layers
} from 'lucide-react';

const OfficialWhatsAppIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.886 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

interface JefeCampanaDashboardProps {
  currentUser: UserAccount;
  allLeaders: TerritorialLeader[];
  sections?: ElectoralSection[];
  onSelectLeader?: (leader: TerritorialLeader) => void;
  onNavigateView?: (view: any) => void;
}

export const JefeCampanaDashboard: React.FC<JefeCampanaDashboardProps> = ({
  currentUser,
  allLeaders,
  sections: _sections = [],
  onSelectLeader,
  onNavigateView: _onNavigateView,
}) => {
  // Conteo de cada nivel
  const distritales = allLeaders.filter(l => l.level === 'distrital');
  const coordinadoresZona = allLeaders.filter(l => l.level === 'zona');
  const responsablesZona = allLeaders.filter(l => l.level === 'responsable_zona');
  const responsablesSeccion = allLeaders.filter(l => l.level === 'territorial' || l.level === 'seccional');
  const promotores = allLeaders.filter(l => l.level === 'promotor');
  const promovidos = allLeaders.filter(l => l.level === 'promovido');

  // Metas globales estimadas
  const metaPromovidosGlobal = 150000;
  const progresoPct = Math.min(100, Math.round((promovidos.length / metaPromovidosGlobal) * 100));

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6 font-sans text-slate-800">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* Encabezado Principal */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Nivel 1 • Conducción Estratégica
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {currentUser.territoryName}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {currentUser.name}
            </h1>
            <p className="text-xs text-slate-500">
              Tablero General de Campaña • Monitoreo en tiempo real de todos los distritos, zonas y secciones
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avance Electoral</span>
              <span className="text-lg font-black text-emerald-600 font-mono">{progresoPct}%</span>
            </div>
          </div>
        </div>

        {/* 6 KPIs de Niveles de la Campaña */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* 1. Coordinadores Distritales */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Distritales</span>
              <Building2 className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{distritales.length}</div>
            <div className="text-[10px] text-slate-400 mt-1">Coordinadores Distritales</div>
          </div>

          {/* 2. Coordinadores de Zona */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Coord. Zona</span>
              <Layers className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{coordinadoresZona.length}</div>
            <div className="text-[10px] text-slate-400 mt-1">Sectores Regionales</div>
          </div>

          {/* 3. Responsables de Zona */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Resp. Zona</span>
              <MapPin className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{responsablesZona.length}</div>
            <div className="text-[10px] text-slate-400 mt-1">Supervisores Tácticos</div>
          </div>

          {/* 4. Responsables de Sección */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Resp. Sección</span>
              <ShieldCheck className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{responsablesSeccion.length}</div>
            <div className="text-[10px] text-slate-400 mt-1">Responsables Seccionales</div>
          </div>

          {/* 5. Promotores Territoriales */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Promotores</span>
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{promotores.length}</div>
            <div className="text-[10px] text-slate-400 mt-1">Fuerza en Calle</div>
          </div>

          {/* 6. Promovidos (Voto Duro Registrado) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Promovidos</span>
              <UserCheck className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-emerald-600 font-mono">{promovidos.length}</div>
            <div className="text-[10px] text-slate-400 mt-1">Meta: {metaPromovidosGlobal.toLocaleString()}</div>
          </div>
        </div>

        {/* Tabla de Coordinadores Distritales */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Coordinación por Distritos Electorales</h2>
              <p className="text-xs text-slate-500">Desempeño y estructura territorial en cada distrito</p>
            </div>
            <span className="text-xs font-bold text-slate-400 font-mono">
              {distritales.length} Distritos Registrados
            </span>
          </div>

          {distritales.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">Sin coordinadores distritales registrados aún</p>
              <p className="text-xs text-slate-400 mt-1">Los distritos asignados aparecerán aquí conforme se den de alta en la estructura.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold tracking-wider bg-slate-50/60">
                    <th className="py-3 px-4">Distrito & Coordinador</th>
                    <th className="py-3 px-4">Zonas</th>
                    <th className="py-3 px-4">Resp. Sección</th>
                    <th className="py-3 px-4">Promotores</th>
                    <th className="py-3 px-4">Promovidos</th>
                    <th className="py-3 px-4 text-center">Contacto</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {distritales.map(dist => {
                    const cleanPhone = (dist.phone || '').replace(/\D/g, '');
                    return (
                      <tr 
                        key={dist.id}
                        onClick={() => onSelectLeader?.(dist)}
                        className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {dist.name}
                          </div>
                          <div className="text-[11px] text-slate-500">{dist.territoryName}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                          {dist.directTeamCount || allLeaders.filter(l => l.parentId === dist.id).length}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {dist.totalTeamCount || 0}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {allLeaders.filter(l => l.level === 'promotor' && (l.parentId === dist.id || dist.assignedSections?.includes(l.electoralSection || ''))).length}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-emerald-600">
                            {(dist.currentCount || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            {cleanPhone && (
                              <>
                                <a
                                  href={`tel:${cleanPhone}`}
                                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                  title={`Llamar a ${dist.name}`}
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                                <a
                                  href={`https://wa.me/52${cleanPhone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-[#25D366] hover:bg-emerald-50 rounded-lg transition-colors"
                                  title="Enviar WhatsApp"
                                >
                                  <OfficialWhatsAppIcon className="w-4 h-4" />
                                </a>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="text-[11px] font-bold text-indigo-600 group-hover:underline flex items-center justify-end gap-1">
                            Ver detalles <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </td>
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
