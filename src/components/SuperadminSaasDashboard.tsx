import React, { useState, useMemo, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { TerritorialLeader } from '../types/territory';
import type { UserAccount } from '../types/auth';
import { WhatsAppIcon } from './icons/WhatsAppIcon';
import { fetchStateGeoJson } from '../services/geoService';
import { 
  Building2, 
  LogIn, 
  Trash2, 
  Phone, 
  Pencil,
  Flag,
  Award,
  Compass,
  MapPin,
  Shield,
  Layers,
  Users,
  CheckCircle2
} from 'lucide-react';

interface SuperadminSaasDashboardProps {
  currentUser: UserAccount;
  allLeaders: TerritorialLeader[];
  accounts: UserAccount[];
  onImpersonate: (coordinatorAccount: UserAccount) => void;
  onDeleteCoordinator: (leaderId: string) => Promise<void> | void;
  onOpenCreateCoordinatorWizard?: () => void;
  onViewCoordinatorDetails?: (coordinatorId: string) => void;
  onEditCoordinator?: (coordinatorId: string) => void;
}

export const SuperadminSaasDashboard: React.FC<SuperadminSaasDashboardProps> = ({
  allLeaders,
  accounts,
  onImpersonate,
  onDeleteCoordinator,
  onViewCoordinatorDetails,
  onEditCoordinator,
}) => {
  const [mapLayer, setMapLayer] = useState<'streets' | 'sat'>('streets');
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Jefes de Campaña registrados (nivel campana o alias estatal)
  const campanaCoordinators = useMemo(() => {
    return allLeaders.filter(
      l => l.level === 'campana' || l.level === 'estatal'
    );
  }, [allLeaders]);

  // Mapa de cuentas por leaderId
  const accountsByLeaderId = useMemo(() => {
    const map = new Map<string, UserAccount>();
    accounts.forEach(acc => {
      if (acc.leaderId) map.set(acc.leaderId, acc);
    });
    return map;
  }, [accounts]);

  // TOTALES PRINCIPALES GLOBALES (8 NIVELES)
  const totalCampaigns = new Set(campanaCoordinators.map(c => c.territoryName)).size || campanaCoordinators.length;
  const totalCampanaCoordinators = campanaCoordinators.length;
  const totalDistritales = allLeaders.filter(l => l.level === 'distrital').length;
  const totalZona = allLeaders.filter(l => l.level === 'zona').length;
  const totalRespZona = allLeaders.filter(l => l.level === 'responsable_zona').length;
  const totalRespSeccion = allLeaders.filter(l => l.level === 'territorial' || l.level === 'seccional').length;
  const totalPromotoresTerritoriales = allLeaders.filter(l => l.level === 'promotor').length;
  const totalPromovidos = allLeaders.filter(l => l.level === 'promovido').length;

  // Lista de cifras con iconos asignados para integrar en el cuadro azul
  const metricsList = [
    { label: 'Campañas', value: totalCampaigns, icon: Flag, iconColor: 'text-[#e05375]' },
    { label: 'Jefes Campaña', value: totalCampanaCoordinators, icon: Award, iconColor: 'text-amber-400' },
    { label: 'Distritales', value: totalDistritales, icon: Compass, iconColor: 'text-rose-400' },
    { label: 'Coord. Zona', value: totalZona, icon: MapPin, iconColor: 'text-orange-400' },
    { label: 'Resp. Zona', value: totalRespZona, icon: Shield, iconColor: 'text-cyan-400' },
    { label: 'Resp. Secc.', value: totalRespSeccion, icon: Layers, iconColor: 'text-blue-400' },
    { label: 'Promotores', value: totalPromotoresTerritoriales, icon: Users, iconColor: 'text-sky-400' },
    { label: 'Promovidos', value: totalPromovidos, icon: CheckCircle2, iconColor: 'text-emerald-400' },
  ];

  // Cálculo de secciones asignadas en todas las campañas
  const totalAssignedSectionsCount = useMemo(() => {
    const allSecs = new Set<string>();
    campanaCoordinators.forEach(c => {
      (c.assignedSections || []).forEach(s => allSecs.add(String(s).trim()));
    });
    return allSecs.size;
  }, [campanaCoordinators]);

  // Mapa de campañas asignadas en Leaflet con GeoJSON oficial
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false,
      preferCanvas: true,
    });
    mapInstanceRef.current = map;

    const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const satUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    const tileUrl = mapLayer === 'sat' ? satUrl : osmUrl;
    const subdomains = mapLayer === 'sat' ? ['server'] : ['a', 'b', 'c'];

    L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains,
    }).addTo(map);

    // Mapear cada sección al Jefe de Campaña correspondiente
    const sectionToCampaign = new Map<string, TerritorialLeader>();
    const assignedSet = new Set<string>();

    campanaCoordinators.forEach(c => {
      (c.assignedSections || []).forEach(s => {
        const clean = String(s).trim();
        const norm = clean.padStart(4, '0');
        assignedSet.add(clean);
        assignedSet.add(norm);
        sectionToCampaign.set(clean, c);
        sectionToCampaign.set(norm, c);
      });
    });

    const isSat = mapLayer === 'sat';
    let isCancelled = false;

    // Paleta de colores para distinguir campañas si hay varias (con #9d2449 de base)
    const campaignColors = ['#9d2449', '#0284c7', '#059669', '#d97706', '#dc2626'];

    fetchStateGeoJson('tab').then(geoData => {
      if (isCancelled || !mapInstanceRef.current) return;

      if (geoData && geoData.features) {
        const geoLayer = L.geoJSON(geoData, {
          filter: (feature) => {
            const sec = String(feature.properties?.seccion || '').padStart(4, '0');
            return assignedSet.has(sec) || assignedSet.has(String(Number(sec)));
          },
          style: (feature) => {
            const sec = String(feature?.properties?.seccion || '').padStart(4, '0');
            const coord = sectionToCampaign.get(sec) || sectionToCampaign.get(String(Number(sec)));
            const colorIdx = coord ? Math.abs(coord.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % campaignColors.length : 0;
            const chosenColor = campaignColors[colorIdx];

            return {
              color: isSat ? '#38bdf8' : chosenColor,
              weight: 0.8,
              smoothFactor: 1.0,
              opacity: 0.85,
              fillColor: isSat ? '#0284c7' : chosenColor,
              fillOpacity: isSat ? 0.24 : 0.16,
            };
          },
          onEachFeature: (feature, layer) => {
            const p = feature.properties || {};
            const sec = String(p.seccion || '').padStart(4, '0');
            const coord = sectionToCampaign.get(sec) || sectionToCampaign.get(String(Number(sec)));

            layer.bindTooltip(
              `<div class="px-2 py-1 font-sans text-xs">
                <span class="font-bold text-slate-900 block">Sección ${p.seccion} (${p.municipio || ''})</span>
                ${coord ? `<span class="text-[10px] text-[#9d2449] font-semibold block">${coord.name} • ${coord.territoryName}</span>` : ''}
              </div>`,
              { sticky: true, direction: 'top', opacity: 0.95 }
            );

            layer.on('mouseover', () => {
              (layer as L.Path).setStyle({
                weight: 2,
                fillOpacity: 0.48,
                color: '#1e1b4b',
              });
              (layer as any).bringToFront?.();
            });

            layer.on('mouseout', () => {
              geoLayer.resetStyle(layer as any);
            });
          }
        }).addTo(map);

        if (geoLayer.getLayers().length > 0) {
          map.fitBounds(geoLayer.getBounds(), { padding: [30, 30] });
          return;
        }
      }

      // Si no hay secciones o no se cargó el layer, centrar en Tabasco
      map.setView([17.9892, -92.9281], 10);
    });

    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [campanaCoordinators, mapLayer]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col font-sans text-slate-800 pb-24 sm:pb-16">
      {/* 1. Header SaaS con Cifras Integradas en el Cuadro Azul (Sin tarjetas, sin bordes) */}
      <div className="bg-slate-900 text-white border-b border-slate-800 p-5 sm:p-7 shrink-0">
        <div className="max-w-7xl mx-auto space-y-4">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Gestión Central de Campañas
          </h1>

          {/* Cifras Integradas: Sin tarjetas ni bordes. En escritorio centradas, en móvil icono a la izquierda */}
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4 pt-4 border-t border-slate-800/80">
            {metricsList.map((m, idx) => (
              <div 
                key={idx}
                className="flex flex-col items-center justify-center text-center py-1 sm:py-1.5"
              >
                {/* Versión móvil: Icono del lado izquierdo y cifra */}
                <div className="flex sm:hidden items-center justify-center gap-1.5">
                  <m.icon className={`w-4 h-4 ${m.iconColor} shrink-0`} />
                  <span className="text-sm font-black font-mono text-white">
                    {m.value}
                  </span>
                </div>

                {/* Versión escritorio: Concepto y cantidad centradas */}
                <div className="hidden sm:flex flex-col items-center justify-center text-center w-full">
                  <div className="flex items-center justify-center gap-1.5 text-slate-300 mb-1">
                    <m.icon className={`w-3.5 h-3.5 ${m.iconColor} shrink-0`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 truncate">
                      {m.label}
                    </span>
                  </div>
                  <div className="text-xl lg:text-2xl font-black font-mono text-white text-center">
                    {m.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. MAPA DE CAMPAÑAS ASIGNADAS (SIN TÍTULO, SIN BORDER-RADIUS) */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-6 shrink-0">
        <div className="bg-white rounded-none border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 flex-wrap gap-2">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 font-mono">
                {totalAssignedSectionsCount} secciones en {campanaCoordinators.length} {campanaCoordinators.length === 1 ? 'campaña' : 'campañas'}
              </span>
            </div>
            <div className="flex items-center bg-white border border-slate-200 rounded-none p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setMapLayer('streets')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-none cursor-pointer transition-colors ${
                  mapLayer === 'streets'
                    ? 'bg-[#9d2449] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Calles
              </button>
              <button
                type="button"
                onClick={() => setMapLayer('sat')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-none cursor-pointer transition-colors ${
                  mapLayer === 'sat'
                    ? 'bg-[#9d2449] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Satélite
              </button>
            </div>
          </div>
          <div ref={mapContainerRef} className="w-full h-72 sm:h-80 z-0" />
        </div>
      </div>

      {/* 3. LISTA DE JEFES DE CAMPAÑA (SIN BORDER-RADIUS, SIN INICIAL) */}
      <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 pb-24 sm:pb-16 space-y-4 flex-1">
        {campanaCoordinators.length === 0 ? (
          <div className="bg-white rounded-none p-12 text-center border border-slate-200 space-y-3 mb-8">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="text-base font-bold text-slate-700">No hay Jefes de Campaña registrados</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              El Super Administrador gestiona las campañas registrando a sus titulares oficiales.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-none border border-slate-200 overflow-hidden shadow-xs mb-8">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Jefe de Campaña & Demarcación</th>
                    {/* Botones de llamada y whats alineados a la derecha */}
                    <th className="py-3 px-4 text-right pr-6">Contacto Directo</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {campanaCoordinators.map((coord) => {
                    const acc = accountsByLeaderId.get(coord.id) || accounts.find(a => a.username === coord.username);
                    const cleanPhone = (coord.phone || '').replace(/\D/g, '');

                    const targetAccount: UserAccount = acc || {
                      id: `usr-${coord.id}`,
                      username: coord.username || 'usuario',
                      name: coord.name,
                      email: coord.email || `${coord.username}@campana.mx`,
                      leaderId: coord.id,
                      level: 'campana',
                      territoryName: coord.territoryName,
                      accountRoleLabel: 'Jefe de Campaña',
                      avatarBg: 'bg-[#9d2449]',
                      assignedBy: 'Super Administrador (SaaS)',
                    };

                    return (
                      <tr 
                        key={coord.id} 
                        onClick={() => onViewCoordinatorDetails?.(coord.id)}
                        className="hover:bg-slate-50 transition-colors cursor-pointer group"
                      >
                        {/* 1. Jefe de Campaña & Demarcación (SIN INICIAL JUNTO AL NOMBRE) */}
                        <td className="py-3.5 px-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 group-hover:text-[#9d2449] transition-colors">
                                {coord.name}
                              </span>
                              <span className="text-xs text-slate-400 font-mono font-normal">
                                @{acc?.username || coord.username || 'usuario'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="inline-block px-2 py-0.5 rounded-none text-[10px] font-semibold bg-[#9d2449]/10 text-[#9d2449] border border-[#9d2449]/20 truncate max-w-[260px]">
                                {coord.territoryName}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 2. Contacto Directo: BOTONES ALINEADOS A LA DERECHA */}
                        <td className="py-3.5 px-4 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-2 justify-end">
                            {cleanPhone ? (
                              <>
                                <a
                                  href={`tel:${cleanPhone}`}
                                  className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-none transition-all shadow-2xs cursor-pointer active:scale-95"
                                  title={`Llamar a ${coord.name}`}
                                >
                                  <Phone className="w-4 h-4" />
                                </a>
                                <a
                                  href={`https://wa.me/52${cleanPhone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] rounded-none transition-all shadow-2xs cursor-pointer active:scale-95"
                                  title={`Abrir WhatsApp con ${coord.name}`}
                                >
                                  <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                                </a>
                              </>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Sin teléfono</span>
                            )}
                          </div>
                        </td>

                        {/* 3. Acciones: BOTÓN EDITAR ANTES DE ENTRAR A SU CUENTA */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {/* BOTÓN EDITAR */}
                            <button
                              type="button"
                              onClick={() => onEditCoordinator?.(coord.id)}
                              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-none text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              title="Editar datos del jefe de campaña"
                            >
                              <Pencil className="w-3.5 h-3.5 text-slate-500" />
                              <span className="hidden sm:inline">Editar</span>
                            </button>

                            {/* BOTÓN ENTRAR A SU CUENTA (COLOR #9d2449, NO MORADO) */}
                            <button
                              type="button"
                              onClick={() => onImpersonate(targetAccount)}
                              className="px-2.5 py-1.5 bg-[#9d2449] hover:bg-[#801d3b] text-white rounded-none text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer active:scale-98"
                              title="Iniciar sesión en la cuenta del jefe de campaña"
                            >
                              <LogIn className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Entrar</span>
                            </button>

                            {/* Eliminar */}
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`¿Estás seguro de eliminar permanentemente al Jefe de Campaña "${coord.name}"?`)) {
                                  onDeleteCoordinator(coord.id);
                                }
                              }}
                              className="p-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 rounded-none transition-colors cursor-pointer"
                              title="Eliminar Jefe de Campaña"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
