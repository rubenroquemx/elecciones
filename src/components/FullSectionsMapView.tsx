import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ElectoralSection, SectionStructure } from '../types/sections';
import {
  Search,
  Layers,
  Crosshair,
  MapPin,
  ArrowUpRight,
  PlusCircle,
  Loader2,
} from 'lucide-react';

interface FullSectionsMapViewProps {
  sections: ElectoralSection[];
  onOpenAddStructure: (sectionId: string) => void;
  onSelectStructureToViewTree: (structure: SectionStructure, section: ElectoralSection) => void;
  onEditSection: (section: ElectoralSection) => void;
  stateAbbr?: string;
  onViewSectionDetail?: (sectionNumber: string) => void;
}

export const FullSectionsMapView: React.FC<FullSectionsMapViewProps> = ({
  sections,
  onOpenAddStructure,
  onEditSection,
  stateAbbr = 'tab',
  onViewSectionDetail,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polygonLayersGroupRef = useRef<L.FeatureGroup | null>(null);
  const geojsonLayerRef = useRef<L.GeoJSON | null>(null);

  const [selectedSection, setSelectedSection] = useState<ElectoralSection | null>(() => sections[0] || null);
  const [mapLayer, setMapLayer] = useState<'streets' | 'sat'>('streets');
  const [filterMunicipality, setFilterMunicipality] = useState<string>('TODOS');
  const [filterStatus, setFilterStatus] = useState<'all' | 'vacant' | 'in_progress' | 'covered'>('all');
  const [mapSearch, setMapSearch] = useState('');
  const [isLoadingGeo, setIsLoadingGeo] = useState(false);
  const [totalRendered, setTotalRendered] = useState(0);

  // Quick lookup of structures and metadata from sections prop
  const sectionsMap = useMemo(() => {
    const map = new Map<string, ElectoralSection>();
    sections.forEach((s) => {
      map.set(s.sectionNumber.padStart(4, '0'), s);
    });
    return map;
  }, [sections]);

  // Municipality list from sections
  const municipalitiesList = useMemo(() => {
    const set = new Set(sections.map((s) => s.municipio));
    return ['TODOS', ...Array.from(set).sort()];
  }, [sections]);

  // Tactical status statistics for heatmap & filter bar
  const statusStats = useMemo(() => {
    let vacant = 0;
    let inProgress = 0;
    let covered = 0;

    sections.forEach((s) => {
      const structs = s.structures.length;
      if (structs === 0) {
        vacant++;
      } else {
        const nominal = s.nominalList || 1400;
        const metaVictoria = Math.round(nominal * 0.50 * 0.51);
        const logro = s.structures
          .filter(st => st.type === 'promocion' || st.type === 'general' || st.type === 'sectorial')
          .reduce((sum, st) => sum + (st.currentCount || 0), 0);
        if (logro >= metaVictoria || logro >= Math.round(metaVictoria * 0.5)) {
          covered++;
        } else {
          inProgress++;
        }
      }
    });

    return { vacant, inProgress, covered, total: sections.length };
  }, [sections]);

  // Initialize and update the OpenStreetMap map
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
        preferCanvas: true,
      });

      const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      const satUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

      const tileUrl = mapLayer === 'sat' ? satUrl : osmUrl;
      const subdomains = mapLayer === 'sat' ? ['server'] : ['a', 'b', 'c'];

      L.tileLayer(tileUrl, {
        maxZoom: 19,
        subdomains,
      }).addTo(map);

      L.control
        .attribution({
          position: 'bottomright',
          prefix: '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a>',
        })
        .addTo(map);

      mapInstanceRef.current = map;

      // Load official full GeoJSON for the state
      setIsLoadingGeo(true);
      const jsonPath = `/geo/secciones/${stateAbbr.toLowerCase()}.json`;

      fetch(jsonPath)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json();
        })
        .then((geoData) => {
          let count = 0;
          const fg = L.featureGroup().addTo(map);
          polygonLayersGroupRef.current = fg;

          // Process and render polygons with Tactical Traffic Light Heatmap
          const geoLayer = L.geoJSON(geoData, {
            filter: (feature) => {
              const props = feature.properties;
              const secNum = String(props.seccion).padStart(4, '0');
              const secData = sectionsMap.get(secNum);

              const muni = secData?.municipio || props.municipio || '';
              if (filterMunicipality !== 'TODOS' && muni.toLowerCase() !== filterMunicipality.toLowerCase()) {
                return false;
              }

              const isVacant = !secData || secData.structures.length === 0;
              const nominal = secData?.nominalList || 1400;
              const metaVictoria = Math.round(nominal * 0.50 * 0.51);
              const logro = secData?.structures
                .filter(st => st.type === 'promocion' || st.type === 'general' || st.type === 'sectorial')
                .reduce((sum, st) => sum + (st.currentCount || 0), 0) || 0;
              const isCovered = !isVacant && (logro >= metaVictoria || logro >= Math.round(metaVictoria * 0.5));
              const isInProgress = !isVacant && !isCovered;

              if (filterStatus === 'vacant' && !isVacant) return false;
              if (filterStatus === 'in_progress' && !isInProgress) return false;
              if (filterStatus === 'covered' && !isCovered) return false;

              if (mapSearch.trim()) {
                const q = mapSearch.trim().toLowerCase();
                const matchSec = secNum.includes(q);
                const matchMuni = muni.toLowerCase().includes(q);
                if (!matchSec && !matchMuni) return false;
              }

              count++;
              return true;
            },
            style: (feature) => {
              const secNum = String(feature?.properties.seccion).padStart(4, '0');
              const isSelected = selectedSection?.sectionNumber === secNum;
              const secData = sectionsMap.get(secNum);
              const isVacant = !secData || secData.structures.length === 0;
              const nominal = secData?.nominalList || 1400;
              const metaVictoria = Math.round(nominal * 0.50 * 0.51);
              const logro = secData?.structures
                .filter(st => st.type === 'promocion' || st.type === 'general' || st.type === 'sectorial')
                .reduce((sum, st) => sum + (st.currentCount || 0), 0) || 0;
              const isCovered = !isVacant && (logro >= metaVictoria || logro >= Math.round(metaVictoria * 0.5));

              let color = '#ef4444'; // Red (Vacante)
              let fillOpacity = 0.32;

              if (!isVacant) {
                if (isCovered) {
                  color = '#10b981'; // Green (Cubierta)
                  fillOpacity = 0.52;
                } else {
                  color = '#f59e0b'; // Amber (En Conformación)
                  fillOpacity = 0.45;
                }
              }

              if (isSelected) {
                return {
                  color: '#4f46e5',
                  weight: 3.5,
                  fillColor: '#6366f1',
                  fillOpacity: 0.75,
                  lineJoin: 'round',
                };
              }

              return {
                color: isSelected ? '#3730a3' : color,
                weight: 1.5,
                fillColor: color,
                fillOpacity,
                lineJoin: 'round',
              };
            },
            onEachFeature: (feature, fLayer) => {
              const props = feature.properties;
              const secNum = String(props.seccion).padStart(4, '0');
              const secData = sectionsMap.get(secNum);
              const muni = secData?.municipio || props.municipio || '';
              const nominal = secData?.nominalList || 0;
              const isVacant = !secData || secData.structures.length === 0;
              const coordinator = secData?.structures[0]?.leaderName || 'Sin asignar';
              const statusBadge = isVacant ? '🔴 Vacante' : '🟡 En Avance';

              fLayer.bindTooltip(
                `<div style="font-family: inherit; font-size: 11px; padding: 2px;">
                  <div style="font-weight: 800; color: #0f172a; display: flex; justify-content: space-between; gap: 8px;">
                    <span>Sección ${secNum}</span>
                    <span>${statusBadge}</span>
                  </div>
                  <div style="color: #64748b; font-size: 10px; margin-top: 2px;">${muni} • ${nominal > 0 ? `Lista: ${nominal.toLocaleString()}` : ''}</div>
                  <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #334155;">
                    <strong>Coordinación:</strong> ${coordinator}
                  </div>
                </div>`,
                { direction: 'top', sticky: true }
              );

              fLayer.on('click', () => {
                if (secData) {
                  setSelectedSection(secData);
                } else {
                  setSelectedSection({
                    id: `sec-${secNum}`,
                    sectionNumber: secNum,
                    municipio: muni,
                    municipioId: String(props.municipio_id || ''),
                    distritoLocal: `Distrito ${props.distrito_l || 1}`,
                    tipo: (props.tipo === 2 || props.tipo === 1) ? 'Urbana' : props.tipo === 4 ? 'Rural' : 'Mixta',
                    nominalList: 1400,
                    targetGoal: 700,
                    center: props.centroide || [-92.93, 17.98],
                    bbox: [0, 0, 0, 0],
                    polygon: [],
                    structures: [],
                  });
                }
                if ((fLayer as any).getBounds && (fLayer as any).getBounds().isValid()) {
                  map.fitBounds((fLayer as any).getBounds(), { padding: [40, 40], maxZoom: 16 });
                }
              });
            },
          }).addTo(map);

          geojsonLayerRef.current = geoLayer;
          setTotalRendered(count);

          if (geoData.bbox && filterMunicipality === 'TODOS' && !mapSearch.trim()) {
            const [minLng, minLat, maxLng, maxLat] = geoData.bbox;
            map.fitBounds([[minLat, minLng], [maxLat, maxLng]], { padding: [25, 25] });
          } else if (geoLayer.getBounds().isValid()) {
            map.fitBounds(geoLayer.getBounds(), { padding: [25, 25] });
          }

          setIsLoadingGeo(false);
        })
        .catch(() => {
          // Fallback: render all sections from prop without artificial slice!
          const fg = L.featureGroup().addTo(map);
          polygonLayersGroupRef.current = fg;
          let count = 0;

          sections.forEach((sec) => {
            if (!sec.polygon || sec.polygon.length < 3) return;

            if (filterMunicipality !== 'TODOS' && sec.municipio !== filterMunicipality) return;
            const hasStructure = sec.structures.length > 0;
            const metaVictoria = Math.round(sec.nominalList * 0.50 * 0.51);
            const logro = sec.structures
              .filter(s => s.type === 'promocion' || s.type === 'general')
              .reduce((sum, s) => sum + s.currentCount, 0);
            const isCovered = !hasStructure ? false : (logro >= metaVictoria || logro >= Math.round(metaVictoria * 0.5));
            const isInProgress = hasStructure && !isCovered;

            if (filterStatus === 'vacant' && hasStructure) return;
            if (filterStatus === 'covered' && !isCovered) return;
            if (filterStatus === 'in_progress' && !isInProgress) return;

            if (mapSearch.trim()) {
              const q = mapSearch.trim().toLowerCase();
              if (!sec.sectionNumber.includes(q) && !sec.municipio.toLowerCase().includes(q)) return;
            }

            count++;
            const isSelected = selectedSection?.id === sec.id;
            const color = isSelected ? '#f59e0b' : hasStructure ? '#10b981' : '#0284c7';
            const latLngs: L.LatLngExpression[] = sec.polygon.map(([lon, lat]) => [lat, lon]);

            const poly = L.polygon(latLngs, {
              color,
              weight: isSelected ? 3 : 1.2,
              fillColor: color,
              fillOpacity: isSelected ? 0.6 : hasStructure ? 0.4 : 0.25,
            });

            poly.bindTooltip(
              `<strong>Sección ${sec.sectionNumber}</strong> - ${sec.municipio}<br/>Lista Nominal: ${sec.nominalList.toLocaleString()}`,
              { direction: 'top', sticky: true }
            );

            poly.on('click', () => {
              setSelectedSection(sec);
              map.fitBounds(poly.getBounds(), { padding: [40, 40], maxZoom: 16 });
            });

            fg.addLayer(poly);
          });

          setTotalRendered(count);
          if (fg.getLayers().length > 0) {
            map.fitBounds(fg.getBounds(), { padding: [25, 25] });
          }
          setIsLoadingGeo(false);
        });

      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 150);

      return () => {
        clearTimeout(timer);
        map.remove();
        mapInstanceRef.current = null;
      };
    } catch (err) {
      console.warn('Leaflet error in FullSectionsMapView:', err);
      setIsLoadingGeo(false);
    }
  }, [stateAbbr, mapLayer, filterMunicipality, filterStatus, mapSearch, selectedSection?.sectionNumber]);

  // Recenter / fit all visible sections
  const handleFitAll = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (geojsonLayerRef.current && geojsonLayerRef.current.getBounds().isValid()) {
      map.fitBounds(geojsonLayerRef.current.getBounds(), { padding: [25, 25] });
    } else if (polygonLayersGroupRef.current && polygonLayersGroupRef.current.getLayers().length > 0) {
      map.fitBounds(polygonLayersGroupRef.current.getBounds(), { padding: [25, 25] });
    }
  };

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[750px] relative">
      {/* Top Controls Bar */}
      <div className="p-3 sm:p-4 bg-slate-900 border-b border-slate-800 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-400/30">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm sm:text-base text-white tracking-wide">
                Visor Cartográfico Oficial INE ({stateAbbr.toUpperCase()})
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                {totalRendered.toLocaleString()} secciones desplegadas
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Despliegue de polígonos vectoriales oficiales sin recortes ni límites
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar sección o municipio..."
              value={mapSearch}
              onChange={(e) => setMapSearch(e.target.value)}
              className="pl-8 pr-2.5 py-1 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 w-36 sm:w-48"
            />
          </div>

          <select
            value={filterMunicipality}
            onChange={(e) => setFilterMunicipality(e.target.value)}
            className="px-2.5 py-1 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
          >
            {municipalitiesList.map((m) => (
              <option key={m} value={m}>
                {m === 'TODOS' ? 'Todos los Municipios' : m}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-2.5 py-1 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer font-semibold"
          >
            <option value="all">Todas ({statusStats.total})</option>
            <option value="vacant">🔴 Vacantes ({statusStats.vacant})</option>
            <option value="in_progress">🟡 En Avance ({statusStats.inProgress})</option>
            <option value="covered">🟢 Cubiertas ({statusStats.covered})</option>
          </select>

          {/* Layer switcher */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              type="button"
              onClick={() => setMapLayer('streets')}
              className={`px-2 py-1 text-[11px] font-semibold rounded transition-colors ${
                mapLayer === 'streets' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Calles
            </button>
            <button
              type="button"
              onClick={() => setMapLayer('sat')}
              className={`px-2 py-1 text-[11px] font-semibold rounded transition-colors ${
                mapLayer === 'sat' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Satélite
            </button>
          </div>

          <button
            type="button"
            onClick={handleFitAll}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors cursor-pointer"
            title="Ajustar a todas las secciones"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Map Body */}
      <div className="flex-1 relative">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Loading Spinner */}
        {isLoadingGeo && (
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs flex flex-col items-center justify-center z-10 text-white">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-2" />
            <p className="text-xs font-bold">Cargando la totalidad de secciones del estado...</p>
          </div>
        )}

        {/* Floating Tactical Legend */}
        <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-md p-3.5 rounded-xl shadow-xl border border-slate-700/80 z-10 text-xs space-y-2 pointer-events-auto text-white">
          <span className="font-extrabold text-slate-200 block text-[10px] uppercase tracking-wider">
            Semáforo Táctico Electoral 2027
          </span>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-xs" />
              <span className="text-slate-200">Meta Cubierta / Avanzada ({statusStats.covered})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 shadow-xs" />
              <span className="text-slate-200">En Avance / Conformación ({statusStats.inProgress})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 shadow-xs" />
              <span className="text-slate-200">Vacante / Sin Estructura ({statusStats.vacant})</span>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
              <span className="w-3 h-3 rounded-sm bg-indigo-600 border border-indigo-400" />
              <span className="text-indigo-300 font-semibold">Sección Seleccionada</span>
            </div>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="absolute right-4 bottom-4 flex flex-col gap-1.5 z-10">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-8 h-8 bg-white hover:bg-slate-100 text-slate-700 rounded-lg shadow-md border border-slate-200 flex items-center justify-center font-bold text-base transition-colors"
          >
            +
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-8 h-8 bg-white hover:bg-slate-100 text-slate-700 rounded-lg shadow-md border border-slate-200 flex items-center justify-center font-bold text-base transition-colors"
          >
            -
          </button>
        </div>

        {/* Bottom Drawer Preview for Selected Section */}
        {selectedSection && (
          <div className="absolute bottom-4 left-4 right-16 sm:right-auto sm:max-w-md bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-4 shadow-xl z-10 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {selectedSection.tipo || 'Sección Electoral'}
                </span>
                <h4 className="text-base font-black text-slate-900 mt-1">
                  Sección {selectedSection.sectionNumber}
                </h4>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  {selectedSection.municipio} • {selectedSection.distritoLocal}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSection(null)}
                className="text-slate-400 hover:text-slate-600 p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
              <div>
                <span className="text-slate-400 block text-[10px]">Lista Nominal:</span>
                <strong className="text-slate-900 font-mono text-sm">
                  {selectedSection.nominalList.toLocaleString()}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Meta 2027 (51% del 50%):</span>
                <strong className="text-emerald-700 font-mono text-sm">
                  {Math.round(selectedSection.nominalList * 0.50 * 0.51).toLocaleString()} votos
                </strong>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              {onViewSectionDetail ? (
                <button
                  type="button"
                  onClick={() => onViewSectionDetail(selectedSection.sectionNumber)}
                  className="flex-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>Ver Ficha Completa</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onEditSection(selectedSection)}
                  className="flex-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <span>Editar</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onOpenAddStructure(selectedSection.id)}
                className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors flex items-center justify-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
                <span>+ Estructura</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
