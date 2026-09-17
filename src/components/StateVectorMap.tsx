import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Layers,
  Search,
  Crosshair,
  MapPin,
  Loader2,
  Expand,
  Minimize2,
  ExternalLink,
} from 'lucide-react';
import type { StateData } from '../data/statesData';

interface StateVectorMapProps {
  state: StateData;
  onSelectSection?: (sectionNumber: string) => void;
  heightClass?: string;
}

interface GeoFeatureProperties {
  seccion: string;
  municipio_id: number;
  municipio: string;
  distrito_f: number;
  distrito_l: number;
  tipo: number;
  centroide: [number, number];
}

export const StateVectorMap: React.FC<StateVectorMapProps> = ({
  state,
  onSelectSection,
  heightClass = 'h-[520px]',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const geojsonLayerRef = useRef<L.GeoJSON | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const highlightLayerRef = useRef<L.Layer | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadedCount, setLoadedCount] = useState<number>(0);
  const [activeLayerType, setActiveLayerType] = useState<'osm' | 'sat'>('osm');
  const [searchSection, setSearchSection] = useState<string>('');
  const [selectedSecData, setSelectedSecData] = useState<GeoFeatureProperties | null>(null);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [state.lat, state.lng],
      zoom: state.zoom,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [state.stateId]);

  // Handle Base Tile Layer Switch
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let maxZ = 19;

    if (activeLayerType === 'sat') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      maxZ = 18;
    }

    tileLayerRef.current = L.tileLayer(url, { maxZoom: maxZ }).addTo(map);
  }, [activeLayerType]);

  // Load GeoJSON Polygons for this State
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    setIsLoading(true);
    setLoadError(null);
    setSelectedSecData(null);

    if (geojsonLayerRef.current) {
      map.removeLayer(geojsonLayerRef.current);
      geojsonLayerRef.current = null;
    }

    const jsonUrl = `/geo/secciones/${state.abbr}.json`;

    fetch(jsonUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: no se encontró cartografía para ${state.abbr}`);
        return res.json();
      })
      .then((geoData) => {
        if (!mapInstanceRef.current) return;

        const defaultStyle: L.PathOptions = {
          fillColor: '#4f46e5',
          weight: 1,
          opacity: 0.8,
          color: '#312e81',
          fillOpacity: 0.25,
        };

        const highlightStyle: L.PathOptions = {
          fillColor: '#f59e0b',
          weight: 3,
          color: '#b45309',
          fillOpacity: 0.6,
        };

        const layer = L.geoJSON(geoData, {
          style: defaultStyle,
          onEachFeature: (feature, fLayer) => {
            const props = feature.properties as GeoFeatureProperties;

            fLayer.on({
              mouseover: (e) => {
                const target = e.target;
                if (highlightLayerRef.current !== target) {
                  target.setStyle({
                    fillOpacity: 0.5,
                    weight: 2,
                    color: '#6366f1',
                  });
                }
              },
              mouseout: (e) => {
                const target = e.target;
                if (highlightLayerRef.current !== target) {
                  layer.resetStyle(target);
                }
              },
              click: (e) => {
                if (highlightLayerRef.current) {
                  layer.resetStyle(highlightLayerRef.current as L.Path);
                }
                const target = e.target;
                target.setStyle(highlightStyle);
                highlightLayerRef.current = target;
                setSelectedSecData(props);

                if (props.centroide && props.centroide[0]) {
                  map.panTo(props.centroide);
                }
              },
            });

            fLayer.bindTooltip(
              `<strong>Sección ${props.seccion}</strong><br/><span style="font-size:11px;color:#64748b;">${props.municipio} • D.Loc ${props.distrito_l}</span>`,
              { sticky: true }
            );
          },
        }).addTo(map);

        geojsonLayerRef.current = layer;
        setLoadedCount(geoData.features?.length || 0);

        if (geoData.bbox) {
          const [minLng, minLat, maxLng, maxLat] = geoData.bbox;
          map.fitBounds([
            [minLat, minLng],
            [maxLat, maxLng],
          ], { padding: [20, 20] });
        } else if (layer.getBounds().isValid()) {
          map.fitBounds(layer.getBounds(), { padding: [20, 20] });
        }

        setIsLoading(false);
      })
      .catch((err) => {
        console.warn('Error cargando GeoJSON:', err);
        setLoadError(err.message);
        setIsLoading(false);
      });
  }, [state.abbr, state.lat, state.lng, state.zoom]);

  // Search Section
  const handleSearchSection = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchSection.trim().padStart(4, '0');
    if (!query || !geojsonLayerRef.current) return;

    let found = false;
    geojsonLayerRef.current.eachLayer((l: any) => {
      if (l.feature?.properties?.seccion === query) {
        found = true;
        const props = l.feature.properties as GeoFeatureProperties;
        if (highlightLayerRef.current) {
          geojsonLayerRef.current?.resetStyle(highlightLayerRef.current as L.Path);
        }
        l.setStyle({
          fillColor: '#f59e0b',
          weight: 4,
          color: '#b45309',
          fillOpacity: 0.7,
        });
        highlightLayerRef.current = l;
        setSelectedSecData(props);

        if (l.getBounds && l.getBounds().isValid()) {
          mapInstanceRef.current?.fitBounds(l.getBounds(), { maxZoom: 15 });
        } else if (props.centroide) {
          mapInstanceRef.current?.setView(props.centroide, 15);
        }
      }
    });

    if (!found) {
      alert(`No se encontró la Sección ${query} en ${state.commonName}.`);
    }
  };

  const handleResetView = () => {
    if (geojsonLayerRef.current && geojsonLayerRef.current.getBounds().isValid()) {
      mapInstanceRef.current?.fitBounds(geojsonLayerRef.current.getBounds(), { padding: [20, 20] });
    } else {
      mapInstanceRef.current?.setView([state.lat, state.lng], state.zoom);
    }
  };

  const toggleMaximize = () => {
    setIsMaximized(prev => !prev);
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 200);
  };

  return (
    <div
      className={`relative bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col transition-all duration-300 ${
        isMaximized
          ? 'fixed inset-4 z-50 shadow-2xl rounded-2xl'
          : heightClass
      }`}
    >
      {/* Top Map Control Bar */}
      <div className="bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 z-10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xs sm:text-sm tracking-wide text-white">
                Cartografía Electoral Oficial: {state.name}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 uppercase">
                {state.abbr}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {isLoading ? (
                'Cargando polígonos vectoriales...'
              ) : (
                <span>
                  <strong>{loadedCount.toLocaleString()}</strong> secciones digitalizadas • INE DERFE 2025
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Search Section & Controls */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearchSection} className="flex items-center gap-1.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar sección..."
                value={searchSection}
                onChange={(e) => setSearchSection(e.target.value)}
                className="pl-8 pr-2.5 py-1 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 w-32 sm:w-44"
              />
            </div>
            <button
              type="submit"
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Ir
            </button>
          </form>

          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              type="button"
              onClick={() => setActiveLayerType('osm')}
              className={`px-2 py-1 text-[11px] font-semibold rounded transition-colors ${
                activeLayerType === 'osm' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Calles
            </button>
            <button
              type="button"
              onClick={() => setActiveLayerType('sat')}
              className={`px-2 py-1 text-[11px] font-semibold rounded transition-colors ${
                activeLayerType === 'sat' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Satélite
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetView}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
            title="Centrar Estado Completo"
          >
            <Crosshair className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={toggleMaximize}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
            title={isMaximized ? 'Restaurar tamaño' : 'Pantalla Completa'}
          >
            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Map Body Canvas */}
      <div className="flex-1 relative">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-center z-10 text-white">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-2" />
            <p className="text-xs font-bold">Cargando polígonos oficiales de {state.commonName}...</p>
            <p className="text-[11px] text-slate-300">INE Marco Geoestadístico Seccional 2025</p>
          </div>
        )}

        {/* Error notice if file fails */}
        {loadError && (
          <div className="absolute top-4 left-4 right-4 bg-rose-900/90 text-white p-3 rounded-xl z-10 border border-rose-700 text-xs">
            <p className="font-semibold text-rose-200">Aviso cartográfico: {loadError}</p>
          </div>
        )}

        {/* Selected Section Bottom Overlay Card */}
        {selectedSecData && (
          <div className="absolute bottom-4 left-4 z-10 bg-slate-900/95 backdrop-blur text-white p-4 rounded-xl border border-indigo-500/40 shadow-xl max-w-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                  Sección Seleccionada
                </span>
                <h4 className="text-lg font-black text-white mt-1">
                  Sección {selectedSecData.seccion}
                </h4>
                <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  {selectedSecData.municipio}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSecData(null)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800 text-[11px]">
              <div>
                <span className="text-slate-400">Distrito Local:</span>
                <p className="font-bold text-white">Distrito {selectedSecData.distrito_l}</p>
              </div>
              <div>
                <span className="text-slate-400">Distrito Federal:</span>
                <p className="font-bold text-white">Distrito {selectedSecData.distrito_f}</p>
              </div>
              <div>
                <span className="text-slate-400">Tipo:</span>
                <p className="font-bold text-indigo-300">
                  {selectedSecData.tipo === 1 ? 'Urbana' : selectedSecData.tipo === 2 ? 'Rural' : 'Mixta'}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Coordenadas:</span>
                <p className="font-mono text-[10px] text-slate-300">
                  {selectedSecData.centroide?.[0]?.toFixed(4)}, {selectedSecData.centroide?.[1]?.toFixed(4)}
                </p>
              </div>
            </div>

            {onSelectSection && (
              <button
                type="button"
                onClick={() => onSelectSection(selectedSecData.seccion)}
                className="w-full mt-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Ver Ficha Completa de Sección</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
