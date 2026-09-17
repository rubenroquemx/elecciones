import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ElectoralSection, SectionStructure } from '../types/sections';
import {
  Search,
  Layers,
  Satellite,
  Crosshair,
  MapPin,
  Users,
  Target,
  AlertTriangle,
  ArrowUpRight,
  PlusCircle,
} from 'lucide-react';

interface FullSectionsMapViewProps {
  sections: ElectoralSection[];
  onOpenAddStructure: (sectionId: string) => void;
  onSelectStructureToViewTree: (structure: SectionStructure, section: ElectoralSection) => void;
  onEditSection: (section: ElectoralSection) => void;
}

export const FullSectionsMapView: React.FC<FullSectionsMapViewProps> = ({
  sections,
  onOpenAddStructure,
  onSelectStructureToViewTree,
  onEditSection,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polygonLayersGroupRef = useRef<L.FeatureGroup | null>(null);

  const [selectedSection, setSelectedSection] = useState<ElectoralSection | null>(() => sections[0] || null);
  const [mapLayer, setMapLayer] = useState<'osm' | 'sat'>('osm');
  const [mapSearch, setMapSearch] = useState('');
  const [filterMunicipality, setFilterMunicipality] = useState<string>('TODOS');
  const [filterStatus, setFilterStatus] = useState<'all' | 'assigned' | 'vacant'>('all');

  // Municipality list
  const municipalitiesList = useMemo(() => {
    const set = new Set(sections.map((s) => s.municipio));
    return ['TODOS', ...Array.from(set).sort()];
  }, [sections]);

  // Filtered sections to display on the map
  const activeSections = useMemo(() => {
    return sections.filter((s) => {
      if (filterMunicipality !== 'TODOS' && s.municipio !== filterMunicipality) return false;
      if (filterStatus === 'assigned' && s.structures.length === 0) return false;
      if (filterStatus === 'vacant' && s.structures.length > 0) return false;
      if (mapSearch.trim()) {
        const q = mapSearch.trim().toLowerCase();
        return (
          s.sectionNumber.includes(q) ||
          s.municipio.toLowerCase().includes(q) ||
          s.distritoLocal.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [sections, filterMunicipality, filterStatus, mapSearch]);

  // Initialize and update the OpenStreetMap map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy existing instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    try {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      });

      // OpenStreetMap Tiles API
      const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      const satUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

      const tileUrl = mapLayer === 'sat' ? satUrl : osmUrl;
      const subdomains = mapLayer === 'sat' ? ['server'] : ['a', 'b', 'c'];

      L.tileLayer(tileUrl, {
        maxZoom: 19,
        subdomains,
      }).addTo(map);

      // OSM Attribution
      L.control
        .attribution({
          position: 'bottomright',
          prefix: '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a>',
        })
        .addTo(map);

      // Create a feature group for all section polygons
      const fg = L.featureGroup().addTo(map);
      polygonLayersGroupRef.current = fg;

      // Limit rendering to first 120 sections for smooth GPU interaction if nationwide, or all if filtered
      const renderPool = activeSections.slice(0, 150);

      renderPool.forEach((sec) => {
        if (!sec.polygon || sec.polygon.length < 3) return;

        const isSelected = selectedSection?.id === sec.id;
        const hasStructure = sec.structures.length > 0;

        const color = isSelected
          ? '#7c3aed'
          : hasStructure
          ? '#10b981'
          : '#0284c7';

        const latLngs: L.LatLngExpression[] = sec.polygon.map(([lon, lat]) => [lat, lon]);

        const poly = L.polygon(latLngs, {
          color,
          weight: isSelected ? 4 : 2,
          fillColor: color,
          fillOpacity: isSelected ? 0.45 : hasStructure ? 0.35 : 0.2,
          lineJoin: 'round',
        });

        // Tooltip on hover
        poly.bindTooltip(
          `<strong>Sección ${sec.sectionNumber}</strong> - ${sec.municipio}<br/>Lista Nominal: ${sec.nominalList.toLocaleString()}`,
          { direction: 'top', sticky: true }
        );

        // Click handler to select and highlight
        poly.on('click', () => {
          setSelectedSection(sec);
          map.fitBounds(poly.getBounds(), { padding: [40, 40], maxZoom: 16 });
        });

        fg.addLayer(poly);
      });

      // Fit map bounds
      if (fg.getLayers().length > 0) {
        map.fitBounds(fg.getBounds(), { padding: [25, 25], maxZoom: 15 });
      } else {
        map.setView([17.989, -92.928], 11); // Villahermosa
      }

      mapInstanceRef.current = map;

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
    }
  }, [activeSections, mapLayer, selectedSection?.id]);

  // Recenter / fit all visible sections
  const handleFitAll = () => {
    if (mapInstanceRef.current && polygonLayersGroupRef.current) {
      if (polygonLayersGroupRef.current.getLayers().length > 0) {
        mapInstanceRef.current.fitBounds(polygonLayersGroupRef.current.getBounds(), {
          padding: [25, 25],
        });
      }
    }
  };

  // Zoom controls
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  // Focus selected section on map
  const handleFocusSelected = () => {
    if (selectedSection && mapInstanceRef.current && selectedSection.polygon.length >= 3) {
      const latLngs: L.LatLngExpression[] = selectedSection.polygon.map(([lon, lat]) => [lat, lon]);
      const bounds = L.latLngBounds(latLngs);
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[750px] bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      
      {/* Top Controls Bar */}
      <div className="p-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-600/80 border border-indigo-400/30">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>Visor Cartográfico OpenStreetMap</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.2 rounded-full font-semibold">
                Desplegado en Página
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {activeSections.length} secciones en el visor • Haga clic en cualquier polígono para inspeccionar
            </p>
          </div>
        </div>

        {/* Filters & Tools */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={mapSearch}
              onChange={(e) => setMapSearch(e.target.value)}
              placeholder="Buscar sección (ej. 0234)..."
              className="bg-slate-800 text-white placeholder-slate-400 pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 w-44 sm:w-52"
            />
          </div>

          {/* Municipality Selector */}
          <select
            value={filterMunicipality}
            onChange={(e) => setFilterMunicipality(e.target.value)}
            className="bg-slate-800 text-white px-2.5 py-1.5 text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {municipalitiesList.map((m) => (
              <option key={m} value={m}>
                {m === 'TODOS' ? 'Todos los municipios' : m}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="bg-slate-800 text-white px-2.5 py-1.5 text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">Todas las secciones</option>
            <option value="assigned">Con Estructura</option>
            <option value="vacant">Vacantes</option>
          </select>

          {/* Layer switcher */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setMapLayer('osm')}
              className={`px-2 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
                mapLayer === 'osm' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>OSM</span>
            </button>
            <button
              type="button"
              onClick={() => setMapLayer('sat')}
              className={`px-2 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
                mapLayer === 'sat' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Satellite className="w-3 h-3" />
              <span>Satélite</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Map View & Inspection Side Panel */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Map Container */}
        <div className="flex-1 h-[60%] md:h-full relative bg-slate-100">
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Floating Controls */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 shadow-md">
            <button
              type="button"
              onClick={handleZoomIn}
              className="w-8 h-8 bg-white hover:bg-slate-50 text-slate-800 rounded-lg border border-slate-200 flex items-center justify-center font-bold text-base shadow-xs"
              title="Acercar (+)"
            >
              +
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="w-8 h-8 bg-white hover:bg-slate-50 text-slate-800 rounded-lg border border-slate-200 flex items-center justify-center font-bold text-base shadow-xs"
              title="Alejar (-)"
            >
              -
            </button>
            <button
              type="button"
              onClick={handleFitAll}
              className="w-8 h-8 bg-white hover:bg-slate-50 text-indigo-600 rounded-lg border border-slate-200 flex items-center justify-center shadow-xs"
              title="Ajustar todas las secciones visibles"
            >
              <Crosshair className="w-4 h-4" />
            </button>
          </div>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-xs border border-slate-200 p-2.5 rounded-xl text-[11px] shadow-sm flex items-center gap-3">
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block border border-white"></span>
              Con Estructura
            </span>
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <span className="w-3 h-3 rounded-full bg-sky-500 inline-block border border-white"></span>
              Vacante
            </span>
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <span className="w-3 h-3 rounded-full bg-purple-600 inline-block border border-white"></span>
              Seleccionada
            </span>
          </div>
        </div>

        {/* Side Panel: Selected Section Inspection */}
        {selectedSection ? (
          <div className="w-full md:w-80 lg:w-96 bg-slate-50 border-t md:border-t-0 md:border-l border-slate-200 p-4 sm:p-5 overflow-y-auto space-y-4 shrink-0">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-black text-slate-900">
                    Sección {selectedSection.sectionNumber}
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                    {selectedSection.tipo}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedSection.municipio} • {selectedSection.distritoLocal}
                </p>
              </div>

              <button
                type="button"
                onClick={handleFocusSelected}
                className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg border border-indigo-200 transition-colors shadow-2xs"
                title="Enfocar esta sección en el mapa"
              >
                <Crosshair className="w-4 h-4" />
              </button>
            </div>

            {/* Nominal List Metric */}
            <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-indigo-600" /> Lista Nominal Oficial
              </span>
              <div className="text-xl font-black text-slate-900 font-mono">
                {selectedSection.nominalList.toLocaleString()}
                <span className="text-xs text-slate-500 font-sans font-normal ml-1">electores</span>
              </div>
            </div>

            {/* Structures in Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-rose-500" /> Estructura Territorial ({selectedSection.structures.length})
                </span>
                <button
                  type="button"
                  onClick={() => onOpenAddStructure(selectedSection.id)}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Asignar</span>
                </button>
              </div>

              {selectedSection.structures.length === 0 ? (
                <div className="bg-rose-50/70 border border-rose-200 p-3 rounded-xl text-center">
                  <AlertTriangle className="w-5 h-5 text-rose-500 mx-auto mb-1" />
                  <span className="text-xs font-bold text-rose-800 block">Sección Vacante</span>
                  <span className="text-[11px] text-rose-600">No cuenta con coordinador seccional asignado.</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {selectedSection.structures.map((st) => (
                    <div
                      key={st.id}
                      className="bg-white border border-slate-200 p-3 rounded-xl shadow-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {st.name}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {st.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 font-medium">
                        Líder: <strong>{st.leaderName}</strong>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                        <span>Meta: {st.metaGoal} | Logro: {st.currentCount}</span>
                        <button
                          type="button"
                          onClick={() => onSelectStructureToViewTree(st, selectedSection)}
                          className="text-sky-600 font-bold hover:underline flex items-center gap-0.5"
                        >
                          Ver en Árbol <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 border-t border-slate-200 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onEditSection(selectedSection)}
                className="flex-1 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition-colors shadow-2xs text-center"
              >
                Editar Sección
              </button>
              <button
                type="button"
                onClick={() => onOpenAddStructure(selectedSection.id)}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs text-center"
              >
                + Asignar Líder
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full md:w-80 lg:w-96 bg-slate-50 border-t md:border-t-0 md:border-l border-slate-200 p-6 flex flex-col items-center justify-center text-center text-slate-500 text-xs">
            <MapPin className="w-8 h-8 text-slate-300 mb-2" />
            <span className="font-bold text-slate-700">Ninguna sección seleccionada</span>
            <span className="text-[11px] mt-1">Haga clic en un polígono del mapa para ver sus detalles</span>
          </div>
        )}
      </div>
    </div>
  );
};
