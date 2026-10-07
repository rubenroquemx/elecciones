import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { TerritorialLeader } from '../../types/territory';
import type { UserAccount } from '../../types/auth';
import type { ElectoralSection } from '../../types/sections';
import { CARTOGRAPHY_BY_SECTION } from '../../data/mockSectionsData';
import { 
  Building2, 
  MapPin, 
  UserCheck, 
  Layers, 
  Phone, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

const OfficialWhatsAppIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.886 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

interface CoordinadorDistritalDashboardProps {
  currentUser: UserAccount;
  allLeaders: TerritorialLeader[];
  sections?: ElectoralSection[];
  onSelectLeader?: (leader: TerritorialLeader) => void;
}

export const CoordinadorDistritalDashboard: React.FC<CoordinadorDistritalDashboardProps> = ({
  currentUser,
  allLeaders,
  sections: _sections = [],
  onSelectLeader,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Zonas del distrito
  const coordinadoresZona = allLeaders.filter(
    l => l.level === 'zona' && (l.parentId === currentUser.leaderId || l.territoryName?.includes(currentUser.territoryName))
  );

  // Responsables de zona dependientes
  const responsablesZona = allLeaders.filter(
    l => l.level === 'responsable_zona' && (
      coordinadoresZona.some(z => z.id === l.parentId) || l.territoryName?.includes(currentUser.territoryName)
    )
  );

  // Responsables de sección en el distrito
  const responsablesSeccion = allLeaders.filter(
    l => (l.level === 'territorial' || l.level === 'seccional') && (
      responsablesZona.some(rz => rz.id === l.parentId) ||
      coordinadoresZona.some(z => z.id === l.parentId) ||
      l.parentId === currentUser.leaderId
    )
  );

  // Promotores y promovidos
  const promotores = allLeaders.filter(
    l => l.level === 'promotor' && responsablesSeccion.some(rs => rs.id === l.parentId)
  );
  const promovidos = allLeaders.filter(
    l => l.level === 'promovido' && promotores.some(p => p.id === l.parentId)
  );

  // Secciones asignadas al distrito
  const assignedSections = currentUser.assignedSections || ['0285', '0366', '0286', '0287', '0288'];
  const metaDistrital = 35000;
  const progresoPct = Math.min(100, Math.round((promovidos.length / metaDistrital) * 100));

  // Mapa interactivo del distrito
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    const bounds = L.latLngBounds([]);
    let drawn = 0;

    assignedSections.forEach(secNum => {
      const norm = String(secNum).trim().padStart(4, '0');
      const carto = CARTOGRAPHY_BY_SECTION.get(norm);
      if (carto && carto.polygon && carto.polygon.length >= 3) {
        const latLngs: L.LatLngExpression[] = carto.polygon.map(([lon, lat]) => [lat, lon]);
        const poly = L.polygon(latLngs, {
          color: '#4f46e5',
          weight: 1.5,
          fillColor: '#6366f1',
          fillOpacity: 0.35,
        }).addTo(map);

        poly.bindTooltip(`Sección ${carto.sectionNumber} - ${carto.municipio}`, {
          sticky: true,
          direction: 'top',
        });

        bounds.extend(poly.getBounds());
        drawn++;
      }
    });

    if (drawn > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [30, 30] });
    } else {
      map.setView([17.9892, -92.9281], 12);
    }

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [assignedSections]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6 font-sans text-slate-800">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* Encabezado */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Nivel 2 • Coordinación Distrital
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {currentUser.territoryName}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {currentUser.name}
            </h1>
            <p className="text-xs text-slate-500">
              Supervisión de zonas electorales, cobertura y avance de promoción en el distrito
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl px-4 py-2.5 text-right">
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">Meta Distrital</span>
              <div className="flex items-baseline gap-1 justify-end">
                <span className="text-lg font-black text-indigo-700 font-mono">{promovidos.length}</span>
                <span className="text-[11px] text-slate-400">/ {metaDistrital.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5 KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Secciones</span>
              <MapPin className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{assignedSections.length}</div>
            <div className="text-[10px] text-slate-400 mt-1">Secciones en Distrito</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Coord. de Zona</span>
              <Layers className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{coordinadoresZona.length}</div>
            <div className="text-[10px] text-slate-400 mt-1">Zonas Asignadas</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Resp. Zona</span>
              <Building2 className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{responsablesZona.length}</div>
            <div className="text-[10px] text-slate-400 mt-1">Supervisores Activos</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Resp. Sección</span>
              <ShieldCheck className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{responsablesSeccion.length}</div>
            <div className="text-[10px] text-slate-400 mt-1">Secciones con Líder</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Promovidos</span>
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-600 font-mono">{promovidos.length}</div>
            <div className="text-[10px] text-slate-400 mt-1">{progresoPct}% de la Meta</div>
          </div>
        </div>

        {/* Mapa del Distrito Asignado */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-800">
                Cartografía Electoral del Distrito
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              {assignedSections.length} secciones en el perímetro distrital
            </span>
          </div>
          <div ref={mapContainerRef} className="w-full h-80 sm:h-96 z-0" />
        </div>

        {/* Directorio de Coordinadores de Zona */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Coordinadores de Zona a su Cargo</h2>
              <p className="text-xs text-slate-500">Supervisores regionales directos de este distrito</p>
            </div>
            <span className="text-xs font-bold text-slate-400 font-mono">
              {coordinadoresZona.length} Coordinadores
            </span>
          </div>

          {coordinadoresZona.length === 0 ? (
            <div className="p-10 text-center">
              <Layers className="w-9 h-9 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">No hay Coordinadores de Zona dados de alta en este distrito aún</p>
              <p className="text-[11px] text-slate-400 mt-1">Los coordinadores de zona que se integren se mostrarán aquí con su avance.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold tracking-wider bg-slate-50/60">
                    <th className="py-3 px-4">Coordinador</th>
                    <th className="py-3 px-4">Zona Asignada</th>
                    <th className="py-3 px-4">Resp. Zona</th>
                    <th className="py-3 px-4">Promovidos</th>
                    <th className="py-3 px-4 text-center">Contacto</th>
                    <th className="py-3 px-4 text-right">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {coordinadoresZona.map(z => {
                    const cleanPhone = (z.phone || '').replace(/\D/g, '');
                    return (
                      <tr key={z.id} onClick={() => onSelectLeader?.(z)} className="hover:bg-purple-50/30 transition-colors cursor-pointer">
                        <td className="py-3 px-4 font-bold text-slate-900">{z.name}</td>
                        <td className="py-3 px-4 text-slate-600">{z.territoryName}</td>
                        <td className="py-3 px-4 font-mono font-semibold">{z.directTeamCount || allLeaders.filter(l => l.parentId === z.id).length}</td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-600">{z.currentCount || 0}</td>
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
                        <td className="py-3 px-4 text-right font-bold text-indigo-600">Ver <ChevronRight className="w-3.5 h-3.5 inline" /></td>
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
