import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, LocateFixed, MapPin } from 'lucide-react';
import type { UserAccount } from '../types/auth';
import type { ElectoralSection } from '../types/sections';
import { CARTOGRAPHY_BY_SECTION } from '../data/mockSectionsData';

interface PromoterSectionsMapViewProps {
  currentUser: UserAccount;
  allSections?: ElectoralSection[];
  assignedSections?: string[];
}

export const PromoterSectionsMapView: React.FC<PromoterSectionsMapViewProps> = ({
  currentUser,
  allSections = [],
  assignedSections: explicitSections,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');

  // Resolver las secciones asignadas para este promotor
  const activeSectionsList = useMemo(() => {
    const list: string[] = [];

    if (explicitSections && explicitSections.length > 0) {
      explicitSections.forEach(s => {
        const norm = s.padStart(4, '0');
        if (!list.includes(norm)) list.push(norm);
      });
    } else if (currentUser?.assignedSections && currentUser.assignedSections.length > 0) {
      currentUser.assignedSections.forEach(s => {
        const norm = s.padStart(4, '0');
        if (!list.includes(norm)) list.push(norm);
      });
    } else {
      const match = currentUser?.territoryName?.match(/\b\d{3,4}\b/g);
      if (match && match.length > 0) {
        match.forEach(s => {
          const norm = s.padStart(4, '0');
          if (!list.includes(norm)) list.push(norm);
        });
      }
    }

    if (list.length === 0) {
      return ['0416', '0417'];
    }
    return list;
  }, [explicitSections, currentUser]);

  // Obtener los datos cartográficos de las secciones asignadas
  const sectionFeatures = useMemo(() => {
    return activeSectionsList.map(secNum => {
      const carto = CARTOGRAPHY_BY_SECTION.get(secNum);
      const fromProp = allSections.find(s => s.sectionNumber === secNum);
      return {
        sectionNumber: secNum,
        polygon: carto?.polygon || fromProp?.polygon || [],
        center: carto?.center || fromProp?.center || [-92.93824, 17.96174],
        bbox: carto?.bbox || fromProp?.bbox,
        municipio: carto?.municipio || fromProp?.municipio || 'Centro',
        tipo: carto?.tipo || fromProp?.tipo || 'Urbana',
      };
    });
  }, [activeSectionsList, allSections]);

  // Inicializar mapa de pantalla completa
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    try {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        touchZoom: true,
      });

      // Capas de mosaicos
      const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      const satUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

      const tileUrl = mapType === 'satellite' ? satUrl : osmUrl;
      const subdomains = mapType === 'satellite' ? ['server'] : ['a', 'b', 'c'];

      L.tileLayer(tileUrl, {
        maxZoom: 19,
        subdomains,
      }).addTo(map);

      // Colores vivos para diferenciar secciones si son varias
      const colors = [
        { stroke: '#821838', fill: '#9d2449', badge: 'bg-emerald-600' },
        { stroke: '#2563eb', fill: '#3b82f6', badge: 'bg-blue-600' },
        { stroke: '#7c3aed', fill: '#8b5cf6', badge: 'bg-purple-600' },
        { stroke: '#d97706', fill: '#f59e0b', badge: 'bg-amber-600' },
      ];

      const allLatLngs: L.LatLngExpression[] = [];

      sectionFeatures.forEach((feat, index) => {
        const color = colors[index % colors.length];

        if (feat.polygon && feat.polygon.length >= 3) {
          const latLngs: L.LatLngExpression[] = feat.polygon.map(([lon, lat]) => [lat, lon]);
          allLatLngs.push(...latLngs);

          const poly = L.polygon(latLngs, {
            color: mapType === 'satellite' ? '#38bdf8' : color.stroke,
            weight: 3.5,
            fillColor: mapType === 'satellite' ? '#0284c7' : color.fill,
            fillOpacity: mapType === 'satellite' ? 0.35 : 0.28,
            dashArray: undefined,
          }).addTo(map);

          // Etiqueta flotante con el número de sección
          poly.bindTooltip(
            `<div class="font-bold text-xs">Sección ${feat.sectionNumber}</div><div class="text-[10px] text-slate-500">${feat.municipio}</div>`,
            { sticky: true, direction: 'top' }
          );

          // Pin o badge centralizado en el polígono
          if (feat.center && feat.center.length === 2) {
            const [cLon, cLat] = feat.center;
            const badgeIcon = L.divIcon({
              className: 'custom-section-badge',
              html: `
                <div style="
                  transform: translate(-50%, -50%);
                  background: ${color.stroke};
                  color: white;
                  font-weight: 800;
                  font-size: 11px;
                  padding: 3px 8px;
                  border-radius: 9999px;
                  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);
                  border: 2px solid white;
                  white-space: nowrap;
                  text-align: center;
                  letter-spacing: 0.025em;
                ">
                  Secc. ${feat.sectionNumber}
                </div>
              `,
              iconSize: [0, 0],
            });

            L.marker([cLat, cLon], { icon: badgeIcon, interactive: false }).addTo(map);
          }
        }
      });

      // Ajustar la vista automáticamente para encuadrar todos los polígonos
      if (allLatLngs.length > 0) {
        const bounds = L.latLngBounds(allLatLngs);
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 17,
          animate: false,
        });
      } else {
        map.setView([17.96174, -92.93824], 15);
      }

      mapInstanceRef.current = map;
    } catch (e) {
      console.error('Error al inicializar mapa de mis secciones:', e);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [sectionFeatures, mapType]);

  const handleCenterBounds = () => {
    if (!mapInstanceRef.current) return;
    const allLatLngs: L.LatLngExpression[] = [];
    sectionFeatures.forEach(f => {
      if (f.polygon && f.polygon.length >= 3) {
        f.polygon.forEach(([lon, lat]) => allLatLngs.push([lat, lon]));
      }
    });
    if (allLatLngs.length > 0) {
      mapInstanceRef.current.fitBounds(L.latLngBounds(allLatLngs), {
        padding: [50, 50],
        maxZoom: 17,
        animate: true,
      });
    }
  };

  return (
    <div className="relative w-full h-full flex-1 overflow-hidden bg-slate-900 select-none">
      {/* Contenedor del Mapa en Pantalla Completa */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Indicador Minimalista Flotante Superior (Solo información de la demarcación) */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur-md text-white px-3.5 py-2 rounded-xl shadow-lg border border-white/10 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-black tracking-tight text-white flex items-center gap-1.5">
              <span>{activeSectionsList.length === 1 ? 'Sección Asignada' : 'Secciones Asignadas'}</span>
              <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
                {activeSectionsList.join(', ')}
              </span>
            </div>
            <p className="text-[10px] text-slate-300 font-medium">
              {currentUser.territoryName || 'Demarcación Territorial'}
            </p>
          </div>
        </div>
      </div>

      {/* Controles Flotantes Discretos en Esquina Superior Derecha */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setMapType(prev => (prev === 'streets' ? 'satellite' : 'streets'))}
          className="bg-white/90 hover:bg-white text-slate-800 backdrop-blur-md p-2 rounded-xl shadow-md border border-slate-200 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95"
          title={mapType === 'streets' ? 'Cambiar a vista satelital' : 'Cambiar a vista de calles'}
        >
          <Layers className="w-4 h-4 text-slate-700" />
          <span className="hidden sm:inline text-[11px]">
            {mapType === 'streets' ? 'Satélite' : 'Mapa'}
          </span>
        </button>

        <button
          type="button"
          onClick={handleCenterBounds}
          className="bg-white/90 hover:bg-white text-slate-800 backdrop-blur-md p-2 rounded-xl shadow-md border border-slate-200 transition-all cursor-pointer active:scale-95"
          title="Centrar en mis secciones"
        >
          <LocateFixed className="w-4 h-4 text-emerald-600" />
        </button>
      </div>
    </div>
  );
};
