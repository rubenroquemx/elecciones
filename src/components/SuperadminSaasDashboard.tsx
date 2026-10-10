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
  Pencil
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
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const geoLayerRef = useRef<L.GeoJSON | null>(null);

  // Coordinadores de Promoción al Voto (CPV) / Jefes de Campaña registrados
  const campanaCoordinators = useMemo(() => {
    // 1. Filtrar líderes territoriales que correspondan a CPV / campaña / estatal / coordinador raíz
    const leaderMatches = allLeaders.filter(l => {
      const lvl = (l.level || '').toLowerCase();
      const role = (l.role || '').toLowerCase();
      const isCpvLevel = lvl === 'cpv' || lvl === 'campana' || lvl === 'estatal' || lvl === 'coordinador_campana';
      const isCpvRole = (role.includes('coordinador') || role.includes('cpv')) && (!l.parentId || l.parentId === 'null' || l.levelIndex === 0);
      return isCpvLevel || isCpvRole;
    });

    const leaderIds = new Set(leaderMatches.map(l => l.id));
    const leaderUsernames = new Set(leaderMatches.map(l => (l.username || '').toLowerCase()).filter(Boolean));
    const leaderEmails = new Set(leaderMatches.map(l => (l.email || '').toLowerCase()).filter(Boolean));

    // 2. Incluir también cuentas registradas como CPV / Campaña que aún no aparezcan como líder
    const extraFromAccounts: TerritorialLeader[] = [];
    accounts.forEach(acc => {
      if (acc.isSuperAdmin || acc.level === 'admin') return;
      const accLvl = (acc.level || '').toLowerCase();
      const accRole = (acc.accountRoleLabel || '').toLowerCase();
      const isCpvAccount = 
        accLvl === 'cpv' || 
        accLvl === 'campana' || 
        accLvl === 'estatal' || 
        accLvl === 'coordinador_campana' || 
        accRole.includes('coordinador') || 
        accRole.includes('cpv');
      if (!isCpvAccount) return;

      const matchedById = Boolean(acc.leaderId && leaderIds.has(acc.leaderId)) || leaderIds.has(acc.id);
      const matchedByUser = Boolean(acc.username && leaderUsernames.has(acc.username.toLowerCase()));
      const matchedByEmail = Boolean(acc.email && leaderEmails.has(acc.email.toLowerCase()));

      if (!matchedById && !matchedByUser && !matchedByEmail) {
        extraFromAccounts.push({
          id: acc.leaderId || acc.id,
          name: acc.name || acc.username || 'Coordinador',
          role: acc.accountRoleLabel || 'Coordinador de Promoción al Voto (CPV)',
          level: (acc.level as any) || 'cpv',
          levelIndex: 0,
          parentId: null,
          territoryName: acc.territoryName || 'Demarcación Asignada',
          phone: acc.phone,
          email: acc.email,
          username: acc.username,
          hasAccount: true,
          metaGoal: (acc.assignedSections?.length || 1) * 50 || 5000,
          currentCount: 0,
          status: 'en_progreso',
          validationStatus: 'validado',
          assignedSections: acc.assignedSections || [],
          avatarBg: acc.avatarBg || 'bg-[#9d2449]',
          createdAt: acc.createdAt,
        });
      }
    });

    return [...leaderMatches, ...extraFromAccounts];
  }, [allLeaders, accounts]);

  // Firma estable para evitar re-renderizados innecesarios del mapa
  const assignmentSignature = useMemo(() => {
    return campanaCoordinators
      .map(c => `${c.id}:${(c.assignedSections || []).slice().sort().join(',')}`)
      .join('|');
  }, [campanaCoordinators]);

  // Mapa de cuentas por leaderId, id, username y email
  const accountsByLeaderId = useMemo(() => {
    const map = new Map<string, UserAccount>();
    accounts.forEach(acc => {
      if (acc.leaderId) map.set(acc.leaderId, acc);
      if (acc.id) map.set(acc.id, acc);
      if (acc.username) map.set(acc.username.toLowerCase(), acc);
      if (acc.email) map.set(acc.email.toLowerCase(), acc);
    });
    return map;
  }, [accounts]);

  // Cálculo de secciones asignadas en todas las campañas
  const totalAssignedSectionsCount = useMemo(() => {
    const allSecs = new Set<string>();
    campanaCoordinators.forEach(c => {
      (c.assignedSections || []).forEach(s => {
        const str = String(s).trim();
        if (str) allSecs.add(str.padStart(4, '0'));
      });
    });
    return allSecs.size;
  }, [campanaCoordinators]);

  // Inicialización única de Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false,
        preferCanvas: true,
      });
      map.setView([17.9892, -92.9281], 9);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Cambiar capa de satélite / calles de forma limpia sin destruir el mapa
    const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const satUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    const tileUrl = mapLayer === 'sat' ? satUrl : osmUrl;
    const subdomains = mapLayer === 'sat' ? ['server'] : ['a', 'b', 'c'];

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const newTile = L.tileLayer(tileUrl, { maxZoom: 19, subdomains }).addTo(map);
    tileLayerRef.current = newTile;

    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, [mapLayer]);

  // Carga y renderizado de geometrías sólo si cambia la asignación real o la capa
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remover capa previa
    if (geoLayerRef.current) {
      map.removeLayer(geoLayerRef.current);
      geoLayerRef.current = null;
    }

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

    // Si NO hay secciones asignadas, no descargar los 4.5MB de GeoJSON
    if (assignedSet.size === 0) {
      map.setView([17.9892, -92.9281], 9);
      return;
    }

    const isSat = mapLayer === 'sat';
    let isCancelled = false;
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

        geoLayerRef.current = geoLayer;

        if (geoLayer.getLayers().length > 0) {
          map.fitBounds(geoLayer.getBounds(), { padding: [30, 30] });
          return;
        }
      }

      map.setView([17.9892, -92.9281], 9);
    });

    return () => {
      isCancelled = true;
    };
  }, [assignmentSignature, mapLayer]);

  // Cleanup al desmontar el componente
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col font-sans text-slate-800 pb-32 sm:pb-16">
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
      <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 pb-32 sm:pb-16 space-y-4 flex-1">
        {campanaCoordinators.length === 0 ? (
          <div className="bg-white rounded-none p-12 text-center border border-slate-200 space-y-3 mb-8">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="text-base font-bold text-slate-700">No hay Coordinadores de Promoción al Voto registrados</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              El Super Administrador gestiona las coordinaciones registrando a sus titulares oficiales (CPV).
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-none border border-slate-200 overflow-hidden shadow-xs mb-8">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Coord. de Promoción al Voto (CPV) & Demarcación</th>
                    {/* Botones de llamada y whats alineados a la derecha */}
                    <th className="py-3 px-4 text-right pr-6">Contacto Directo</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {campanaCoordinators.map((coord) => {
                    const acc = 
                      accountsByLeaderId.get(coord.id) || 
                      (coord.username ? accountsByLeaderId.get(coord.username.toLowerCase()) : undefined) ||
                      (coord.email ? accountsByLeaderId.get(coord.email.toLowerCase()) : undefined) ||
                      accounts.find(a => a.leaderId === coord.id || (coord.username && a.username === coord.username) || (coord.email && a.email === coord.email));
                    const cleanPhone = (coord.phone || acc?.phone || '').replace(/\D/g, '');

                    const targetAccount: UserAccount = acc || {
                      id: `usr-${coord.id}`,
                      username: coord.username || 'usuario',
                      name: coord.name,
                      email: coord.email || `${coord.username || 'cpv'}@campana.mx`,
                      leaderId: coord.id,
                      level: coord.level || 'cpv',
                      territoryName: coord.territoryName,
                      accountRoleLabel: coord.role || 'Coordinador de Promoción al Voto (CPV)',
                      avatarBg: coord.avatarBg || 'bg-[#9d2449]',
                      assignedBy: 'Super Administrador (SaaS)',
                      assignedSections: coord.assignedSections || [],
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
                                if (window.confirm(`¿Estás seguro de eliminar permanentemente al Coordinador de Promoción al Voto (CPV) "${coord.name}"?`)) {
                                  onDeleteCoordinator(coord.id);
                                }
                              }}
                              className="p-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 rounded-none transition-colors cursor-pointer"
                              title="Eliminar Coordinador de Promoción al Voto (CPV)"
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
