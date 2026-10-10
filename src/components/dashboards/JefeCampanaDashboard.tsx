import React, { useMemo } from 'react';
import type { TerritorialLeader, TerritorialZone } from '../../types/territory';
import type { UserAccount } from '../../types/auth';
import type { ElectoralSection } from '../../types/sections';
import { 
  MapPin, 
  Users, 
  UserCheck, 
  Phone, 
  ChevronRight,
  ShieldCheck,
  Layers,
  Target,
  Plus,
  Compass
} from 'lucide-react';
import { WhatsAppIcon } from '../icons/WhatsAppIcon';

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
  sections = [],
  onSelectLeader: _onSelectLeader,
  onNavigateView,
}) => {
  // Cargar Zonas registradas (desde leaders con level zona o storage)
  const savedZones: TerritorialZone[] = useMemo(() => {
    try {
      const raw = localStorage.getItem(`territorial_zones_${currentUser.id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    const zonaLeaders = allLeaders.filter(l => l.level === 'zona');
    if (zonaLeaders.length > 0) {
      return zonaLeaders.map((l, idx) => ({
        id: l.id,
        name: l.territoryName || l.name,
        code: l.code || `ZONA-${String(idx + 1).padStart(2, '0')}`,
        color: l.avatarBg || '#9d2449',
        sections: l.assignedSections || [],
        coordinatorName: l.name,
        coordinatorPhone: l.phone,
        metaGoal: l.metaGoal,
        createdAt: l.createdAt,
      }));
    }

    return [];
  }, [currentUser.id, allLeaders]);

  const coordinadoresZona = allLeaders.filter(l => l.level === 'zona');
  const responsablesSeccion = allLeaders.filter(l => l.level === 'territorial' || l.level === 'seccional');
  const promotores = allLeaders.filter(l => l.level === 'promotor');
  const promovidos = allLeaders.filter(l => l.level === 'promovido');

  const totalAssignedSectionsCount = useMemo(() => {
    const set = new Set<string>();
    savedZones.forEach(z => z.sections.forEach(s => set.add(String(s).padStart(4, '0'))));
    responsablesSeccion.forEach(r => (r.assignedSections || []).forEach(s => set.add(String(s).padStart(4, '0'))));
    return set.size;
  }, [savedZones, responsablesSeccion]);

  // Metas globales calculadas dinámicamente
  const metaPromovidosGlobal = useMemo(() => {
    const fromZones = savedZones.reduce((acc, z) => acc + (z.metaGoal || 0), 0);
    if (fromZones > 0) return fromZones;
    const fromLeaders = coordinadoresZona.reduce((acc, s) => acc + (s.metaGoal || 0), 0);
    if (fromLeaders > 0) return fromLeaders;
    return ((currentUser as any).metaGoal || 1500);
  }, [savedZones, coordinadoresZona, currentUser]);

  const progresoPct = metaPromovidosGlobal > 0
    ? Math.min(100, Math.round((promovidos.length / metaPromovidosGlobal) * 100))
    : 0;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6 font-sans text-slate-800">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* Encabezado Principal */}
        <div className="bg-white rounded-none border border-slate-200/80 p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-none uppercase tracking-wider">
                NIVEL 1 • CONDUCCIÓN ESTRATÉGICA
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {currentUser.territoryName || 'Tabasco'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {currentUser.name}
            </h1>
            <p className="text-xs text-slate-500">
              Coordinación General de Promoción al Voto (CPV) • Monitoreo en tiempo real de zonas y territorio
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
            <button
              type="button"
              onClick={() => onNavigateView?.('zonas')}
              className="px-4 py-2.5 bg-[#9d2449] hover:bg-[#801d3b] text-white text-xs font-bold rounded-none shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              <span>Definir / Gestionar Zonas</span>
            </button>

            <div className="bg-slate-50 border border-slate-200 rounded-none px-4 py-2 text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avance Electoral</span>
              <span className="text-lg font-black text-emerald-600 font-mono">{progresoPct}%</span>
            </div>
          </div>
        </div>

        {/* 6 KPIs de Niveles de la Campaña */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* 1. Zonas Electorales */}
          <div 
            onClick={() => onNavigateView?.('zonas')}
            className="bg-white p-4 rounded-none border border-slate-200/80 shadow-xs hover:border-slate-400 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide group-hover:text-[#9d2449]">Zonas</span>
              <Layers className="w-4 h-4 text-[#9d2449]" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{savedZones.length}</div>
            <div className="text-[10px] text-slate-400 mt-1">Zonas Operativas</div>
          </div>

          {/* 2. Responsables de Sección */}
          <div className="bg-white p-4 rounded-none border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Resp. Sección</span>
              <ShieldCheck className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{responsablesSeccion.length}</div>
            <div className="text-[10px] text-slate-400 mt-1">Responsables Seccionales</div>
          </div>

          {/* 3. Promotores Territoriales */}
          <div className="bg-white p-4 rounded-none border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Promotores</span>
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{promotores.length}</div>
            <div className="text-[10px] text-slate-400 mt-1">Fuerza en Calle</div>
          </div>

          {/* 4. Promovidos (Voto Duro Registrado) */}
          <div className="bg-white p-4 rounded-none border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Promovidos</span>
              <UserCheck className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-emerald-600 font-mono">{promovidos.length}</div>
            <div className="text-[10px] text-slate-400 mt-1">
              {metaPromovidosGlobal > 0 ? `Meta: ${metaPromovidosGlobal.toLocaleString()}` : 'Meta no definida'}
            </div>
          </div>

          {/* 5. Secciones Asignadas */}
          <div className="bg-white p-4 rounded-none border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Secciones</span>
              <MapPin className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{totalAssignedSectionsCount || sections.length}</div>
            <div className="text-[10px] text-slate-400 mt-1">Secciones en Territorio</div>
          </div>

          {/* 6. Meta de Campaña */}
          <div className="bg-white p-4 rounded-none border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Meta Global</span>
              <Target className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{metaPromovidosGlobal.toLocaleString()}</div>
            <div className="text-[10px] text-slate-400 mt-1">Votos Objetivo</div>
          </div>
        </div>

        {/* Bloque Principal de Zonas Electorales */}
        <div className="bg-white rounded-none border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Estructura Operativa por Zonas</h2>
              <p className="text-xs text-slate-500">Zonas definidas para la conducción territorial de la campaña</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400 font-mono">
                {savedZones.length} Zonas Registradas
              </span>
              <button
                type="button"
                onClick={() => onNavigateView?.('zonas')}
                className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-none transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Gestionar Zonas</span>
              </button>
            </div>
          </div>

          {savedZones.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-[#9d2449]/10 rounded-full flex items-center justify-center mx-auto text-[#9d2449]">
                <Layers className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <p className="text-base font-bold text-slate-900">Aún no has definido las Zonas para tu campaña</p>
                <p className="text-xs text-slate-500">
                  Subdivide tu territorio asignado por municipios, distritos locales/federales o de forma manual sobre el mapa interactivo.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onNavigateView?.('zonas')}
                  className="px-5 py-2.5 bg-[#9d2449] hover:bg-[#801d3b] text-white text-xs font-bold rounded-none shadow-sm transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <Compass className="w-4 h-4" />
                  <span>Definir Zonas Electorales Ahora</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold tracking-wider bg-slate-50/60">
                    <th className="py-3 px-4">Zona & Código</th>
                    <th className="py-3 px-4">Coordinador</th>
                    <th className="py-3 px-4 text-center">Secciones</th>
                    <th className="py-3 px-4 text-center">Resp. Sección</th>
                    <th className="py-3 px-4 text-center">Promotores</th>
                    <th className="py-3 px-4 text-center">Promovidos</th>
                    <th className="py-3 px-4 text-center">Contacto</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {savedZones.map(zone => {
                    const cleanPhone = (zone.coordinatorPhone || '').replace(/\D/g, '');
                    const zoneSecSet = new Set(zone.sections.map(s => String(s).padStart(4, '0')));
                    const zoneRespSec = responsablesSeccion.filter(r => 
                      (r.assignedSections || []).some(s => zoneSecSet.has(String(s).padStart(4, '0')))
                    ).length;
                    const zonePromotores = promotores.filter(p =>
                      zoneSecSet.has(String(p.electoralSection || '').padStart(4, '0')) ||
                      (p.assignedSections || []).some(s => zoneSecSet.has(String(s).padStart(4, '0')))
                    ).length;
                    const zonePromovidos = promovidos.filter(pm =>
                      zoneSecSet.has(String(pm.electoralSection || '').padStart(4, '0'))
                    ).length;

                    return (
                      <tr 
                        key={zone.id}
                        onClick={() => onNavigateView?.('zonas')}
                        className="hover:bg-slate-50 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <span 
                              className="w-3.5 h-3.5 rounded-none shrink-0" 
                              style={{ backgroundColor: zone.color }} 
                            />
                            <div>
                              <div className="font-bold text-slate-900 group-hover:text-[#9d2449] transition-colors">
                                {zone.name}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">{zone.code}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-slate-700 font-semibold">
                            {zone.coordinatorName || <span className="text-slate-400 italic">Sin asignar</span>}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800">
                          {zone.sections.length}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-slate-600">
                          {zoneRespSec}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-slate-600">
                          {zonePromotores}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-mono font-bold text-emerald-600">
                            {zonePromovidos.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            {cleanPhone && (
                              <>
                                <a
                                  href={`tel:${cleanPhone}`}
                                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-none transition-colors"
                                  title={`Llamar a ${zone.coordinatorName}`}
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                                <a
                                  href={`https://wa.me/52${cleanPhone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-[#25D366] hover:bg-emerald-50 rounded-none transition-colors"
                                  title="Enviar WhatsApp"
                                >
                                  <WhatsAppIcon className="w-4 h-4" />
                                </a>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="text-[11px] font-bold text-[#9d2449] group-hover:underline flex items-center justify-end gap-1">
                            Ver mapa <ChevronRight className="w-3.5 h-3.5" />
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

