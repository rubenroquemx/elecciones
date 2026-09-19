import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Loader2,
  Expand,
  Minimize2,
  ExternalLink,
  Target,
} from 'lucide-react';
import type { StateData } from '../data/statesData';

// Cache GeoJSON data in memory across renders to avoid re-fetching and memory leaks
const geojsonCache = new Map<string, any>();

interface StateVectorMapProps {
  state: StateData;
  onSelectSection?: (sectionNumber: string) => void;
  heightClass?: string;
  districtType?: 'federal' | 'local';
  districtNumber?: number;
  districtLabel?: string;
  highlightSectionNumbers?: string[];
  sectionProgressMap?: Record<string, number>;
}

// Categorización oficial de semáforo solicitada:
// < 33%: Rojo | 34% - 66%: Naranja | 67% - 99%: Amarillo | 100%: Verde
const getSectionProgressColor = (pct: number) => {
  if (pct < 34) {
    return {
      color: '#ef4444',       // Rojo
      fillColor: '#ef4444',
      label: '< 33%',
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    };
  }
  if (pct <= 66) {
    return {
      color: '#f97316',       // Naranja
      fillColor: '#f97316',
      label: '34% - 66%',
      badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    };
  }
  if (pct <= 99) {
    return {
      color: '#eab308',       // Amarillo
      fillColor: '#eab308',
      label: '67% - 99%',
      badgeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    };
  }
  return {
    color: '#22c55e',         // Verde (100% o superior)
    fillColor: '#22c55e',
    label: '100%',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  };
};

interface GeoFeatureProperties {
  seccion: string;
  municipio_id?: number;
  municipio?: string;
  distrito_f?: number;
  distrito_l?: number;
  tipo?: number;
  centroide?: [number, number];
}

export const StateVectorMap: React.FC<StateVectorMapProps> = ({
  state,
  onSelectSection,
  heightClass = 'h-[520px]',
  districtType,
  districtNumber,
  highlightSectionNumbers,
  sectionProgressMap,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const geojsonLayerRef = useRef<L.GeoJSON | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const highlightLayerRef = useRef<L.Layer | null>(null);
  const districtGroupRef = useRef<L.FeatureGroup | null>(null);
  const targetBoundsRef = useRef<L.LatLngBounds | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeLayerType, setActiveLayerType] = useState<'osm' | 'sat'>('osm');
  const [selectedSecData, setSelectedSecData] = useState<GeoFeatureProperties | null>(null);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  const hasDistrictFilter = Boolean(
    (districtNumber !== undefined && districtNumber > 0) ||
    (highlightSectionNumbers && highlightSectionNumbers.length > 0)
  );

  // ResizeObserver on the map container to continuously notify Leaflet of size changes
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    let rafId: number;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const map = mapInstanceRef.current;
        if (map && (map as any)._panes) {
          map.invalidateSize({ pan: false });
        }
      });
    });

    ro.observe(container);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  // Synchronize fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement
      );
      setIsMaximized(isFs);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Multi-stage map re-layout when fullscreen state changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !(map as any)._panes) return;

    const runReLayout = () => {
      if (!map || !(map as any)._panes) return;
      map.invalidateSize();
      if (targetBoundsRef.current && targetBoundsRef.current.isValid()) {
        map.fitBounds(targetBoundsRef.current, { padding: [25, 25], maxZoom: 14 });
      }
    };

    const timers = [
      setTimeout(() => map.invalidateSize(), 50),
      setTimeout(() => map.invalidateSize(), 150),
      setTimeout(runReLayout, 300),
      setTimeout(runReLayout, 500),
    ];

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [isMaximized]);

  // Helper to determine whether a feature belongs to the target district
  const isSectionInDistrict = useCallback(
    (props: GeoFeatureProperties): boolean => {
      if (!props) return false;

      // 1. Check by explicit section number array
      if (highlightSectionNumbers && highlightSectionNumbers.length > 0) {
        const cleanSec = String(props.seccion).replace(/^0+/, '');
        const paddedSec = String(props.seccion).padStart(4, '0');
        const match = highlightSectionNumbers.some((s) => {
          const cleanS = String(s).replace(/^0+/, '');
          const paddedS = String(s).padStart(4, '0');
          return cleanS === cleanSec || paddedS === paddedSec;
        });
        if (match) return true;
      }

      // 2. Check by district type & number
      if (districtNumber && districtNumber > 0) {
        if (districtType === 'federal') {
          return Number(props.distrito_f) === districtNumber;
        }
        if (districtType === 'local') {
          return Number(props.distrito_l) === districtNumber;
        }
      }

      return false;
    },
    [districtType, districtNumber, highlightSectionNumbers]
  );

  // Styling calculator based on district membership, section progress and view mode
  const getFeatureStyle = useCallback(
    (feature: any): L.PathOptions => {
      const props = feature?.properties as GeoFeatureProperties;
      const inDistrict = isSectionInDistrict(props);

      if (hasDistrictFilter) {
        if (inDistrict) {
          const secNum = String(props.seccion);
          const cleanSec = secNum.replace(/^0+/, '');
          const paddedSec = secNum.padStart(4, '0');
          const pct = sectionProgressMap?.[cleanSec] ?? sectionProgressMap?.[paddedSec] ?? 0;
          const { color, fillColor } = getSectionProgressColor(pct);

          return {
            fillColor,
            weight: 2.2,
            opacity: 1,
            color, // Trazo oficial por semáforo de avance
            fillOpacity: 0.55, // Relleno translúcido integrado
          };
        }

        // Outside district sections: subtle decorative background
        return {
          fillColor: '#0a0f1d',
          weight: 0.8,
          opacity: 0.25,
          color: '#334155',
          fillOpacity: 0.08,
        };
      }

      // Default state when no district is filtered
      return {
        fillColor: '#4f46e5',
        weight: 1,
        opacity: 0.8,
        color: '#312e81',
        fillOpacity: 0.25,
      };
    },
    [hasDistrictFilter, isSectionInDistrict, sectionProgressMap]
  );

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
    let isMounted = true;
    const map = mapInstanceRef.current;
    if (!map) return;

    setIsLoading(true);
    setLoadError(null);
    setSelectedSecData(null);

    const loadGeoData = async () => {
      try {
        const jsonUrl = `/geo/secciones/${state.abbr.toLowerCase()}.json`;
        let geoData = geojsonCache.get(jsonUrl);

        if (!geoData) {
          const res = await fetch(jsonUrl);
          if (!res.ok) throw new Error(`Cartografía no disponible para ${state.abbr}`);
          geoData = await res.json();
          if (isMounted) {
            geojsonCache.set(jsonUrl, geoData);
          }
        }

        if (!isMounted || !mapInstanceRef.current || mapInstanceRef.current !== map || !(map as any)._panes) return;

        if (geojsonLayerRef.current) {
          try {
            map.removeLayer(geojsonLayerRef.current);
          } catch {
            // ignore if layer already removed
          }
          geojsonLayerRef.current = null;
        }

        const districtLayers: L.Layer[] = [];

        const layer = L.geoJSON(geoData, {
          style: (feature) => getFeatureStyle(feature),
          onEachFeature: (feature, fLayer) => {
            if (!feature || !feature.properties) return;
            const props = feature.properties as GeoFeatureProperties;
            const inDistrict = isSectionInDistrict(props);

            if (inDistrict) {
              districtLayers.push(fLayer);
            }

            // REGLA ESTRICTA DE JURISDICCIÓN:
            // Si el usuario tiene distrito asignado y la sección no pertenece a su demarcación,
            // no se agregan interacciones (hover, click) ni tooltips.
            if (hasDistrictFilter && !inDistrict) {
              return;
            }

            fLayer.on({
              mouseover: (e) => {
                const target = e.target;
                if (highlightLayerRef.current !== target && typeof target.setStyle === 'function') {
                  target.setStyle({
                    fillOpacity: 0.85,
                    weight: 3.5,
                  });
                }
              },
              mouseout: (e) => {
                const target = e.target;
                if (highlightLayerRef.current !== target && typeof target.setStyle === 'function') {
                  layer.resetStyle(target);
                }
              },
              click: (e) => {
                if (highlightLayerRef.current && typeof (highlightLayerRef.current as any).setStyle === 'function') {
                  layer.resetStyle(highlightLayerRef.current as L.Path);
                }
                const target = e.target;
                if (typeof target.setStyle === 'function') {
                  target.setStyle({
                    fillColor: '#f59e0b',
                    weight: 3.5,
                    color: '#fbbf24',
                    fillOpacity: 0.85,
                  });
                  highlightLayerRef.current = target;
                }
                setSelectedSecData(props);

                if (props.centroide && props.centroide[0]) {
                  map.panTo(props.centroide);
                }
              },
            });
          },
        });

        if (!isMounted || !mapInstanceRef.current || mapInstanceRef.current !== map || !(map as any)._panes) {
          return;
        }

        layer.addTo(map);
        geojsonLayerRef.current = layer;

        // Auto-focus on the district and restrict bounds so user cannot move sections out of view
        if (hasDistrictFilter && districtLayers.length > 0) {
          const group = L.featureGroup(districtLayers);
          districtGroupRef.current = group;
          const bounds = group.getBounds();
          if (bounds && bounds.isValid()) {
            targetBoundsRef.current = bounds;
            map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
            const paddedBounds = bounds.pad(0.35);
            map.setMaxBounds(paddedBounds);
            map.options.maxBoundsViscosity = 0.5;
            const fitZoom = map.getBoundsZoom(bounds);
            map.setMinZoom(Math.max(1, fitZoom - 2));
          }
        } else if (geoData.bbox) {
          const [minLng, minLat, maxLng, maxLat] = geoData.bbox;
          const stateBounds = L.latLngBounds([minLat, minLng], [maxLat, maxLng]);
          targetBoundsRef.current = stateBounds;
          map.fitBounds(stateBounds, { padding: [20, 20] });
          map.setMaxBounds(stateBounds.pad(0.35));
          map.options.maxBoundsViscosity = 0.5;
        } else if (layer.getBounds().isValid()) {
          const layerBounds = layer.getBounds();
          targetBoundsRef.current = layerBounds;
          map.fitBounds(layerBounds, { padding: [20, 20] });
          map.setMaxBounds(layerBounds.pad(0.35));
          map.options.maxBoundsViscosity = 0.5;
        }

        if (isMounted) {
          setIsLoading(false);
        }
      } catch (err: any) {
        if (isMounted && mapInstanceRef.current && (mapInstanceRef.current as any)._panes) {
          console.warn('Error cargando GeoJSON:', err);
          setLoadError(err.message || 'Error al procesar la cartografía');
          setIsLoading(false);
        }
      }
    };

    loadGeoData();

    return () => {
      isMounted = false;
    };
  }, [state.abbr, hasDistrictFilter, isSectionInDistrict, getFeatureStyle]);

  // Focus specifically on the district bounds
  const handleFocusDistrict = () => {
    const map = mapInstanceRef.current;
    if (map && (map as any)._panes) {
      map.invalidateSize();
      if (districtGroupRef.current && districtGroupRef.current.getBounds().isValid()) {
        map.fitBounds(districtGroupRef.current.getBounds(), {
          padding: [30, 30],
          maxZoom: 14,
        });
      } else if (targetBoundsRef.current && targetBoundsRef.current.isValid()) {
        map.fitBounds(targetBoundsRef.current, {
          padding: [25, 25],
          maxZoom: 14,
        });
      }
    }
  };

  // Toggle fullscreen mode reliably
  const toggleMaximize = async () => {
    const elem = wrapperRef.current;
    if (!elem) return;

    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      try {
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if ((elem as any).webkitRequestFullscreen) {
          await (elem as any).webkitRequestFullscreen();
        }
      } catch {
        // Fallback to CSS overlay if fullscreen API is rejected/unsupported
        setIsMaximized(prev => !prev);
      }
    } else {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      } catch {
        setIsMaximized(false);
      }
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={`relative bg-slate-900 border border-slate-200 overflow-hidden shadow-xs flex flex-col ${
        isMaximized
          ? 'fixed inset-0 z-[9999] w-screen h-screen rounded-none'
          : `${heightClass} rounded-2xl`
      }`}
    >
      {/* Map Body Canvas */}
      <div className="flex-1 relative w-full h-full">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Floating Semáforo de Avance Territorial */}
        {hasDistrictFilter && (
          <div className="absolute top-3 left-3 z-[400] bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-white/20 shadow-lg text-[11px] text-white flex items-center gap-3">
            <span className="font-bold text-slate-300">Avance:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-xs ring-1 ring-red-400/40" />
              <span className="text-slate-300 font-medium">&lt; 33%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-xs ring-1 ring-orange-400/40" />
              <span className="text-slate-300 font-medium">34% - 66%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-xs ring-1 ring-yellow-400/40" />
              <span className="text-slate-300 font-medium">67% - 99%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs ring-1 ring-emerald-400/40" />
              <span className="text-slate-300 font-medium">100%</span>
            </div>
          </div>
        )}

        {/* Floating compact map controls */}
        <div className="absolute top-3 right-3 z-[400] flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md p-1 rounded-xl border border-white/20 shadow-lg text-xs">
          {hasDistrictFilter && (
            <button
              type="button"
              onClick={handleFocusDistrict}
              className="px-2.5 py-1 bg-indigo-600/50 hover:bg-indigo-600 text-indigo-200 hover:text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              title="Enfocar en las secciones del distrito"
            >
              <Target className="w-3.5 h-3.5 text-cyan-400" />
              <span>Enfocar</span>
            </button>
          )}

          <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-white/10">
            <button
              type="button"
              onClick={() => setActiveLayerType('osm')}
              className={`px-2 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                activeLayerType === 'osm' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              Calles
            </button>
            <button
              type="button"
              onClick={() => setActiveLayerType('sat')}
              className={`px-2 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                activeLayerType === 'sat' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              Satélite
            </button>
          </div>

          <button
            type="button"
            onClick={toggleMaximize}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-center"
            title={isMaximized ? 'Salir de pantalla completa' : 'Pantalla Completa'}
          >
            {isMaximized ? <Minimize2 className="w-4 h-4 text-amber-400" /> : <Expand className="w-4 h-4" />}
          </button>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 text-white">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-2" />
            <p className="text-xs font-bold">Cargando polígonos oficiales de {state.commonName}...</p>
            <p className="text-[11px] text-slate-400">INE Marco Geoestadístico Seccional 2025</p>
          </div>
        )}

        {/* Error notice if file fails */}
        {loadError && (
          <div className="absolute top-4 left-4 right-4 bg-rose-900/90 text-white p-3 rounded-2xl z-10 border border-rose-700 text-xs">
            <p className="font-semibold text-rose-200">Aviso cartográfico: {loadError}</p>
          </div>
        )}

        {/* Selected Section Bottom Overlay Card - Solo para secciones de la jurisdicción */}
        {selectedSecData && (!hasDistrictFilter || isSectionInDistrict(selectedSecData)) && (() => {
          const selSecNum = String(selectedSecData.seccion);
          const selClean = selSecNum.replace(/^0+/, '');
          const selPadded = selSecNum.padStart(4, '0');
          const selPct = sectionProgressMap?.[selClean] ?? sectionProgressMap?.[selPadded] ?? 0;
          const progressInfo = getSectionProgressColor(selPct);

          return (
            <div className="absolute bottom-4 left-4 z-[400] bg-slate-900/95 backdrop-blur text-white p-4 rounded-xl border border-indigo-500/40 shadow-xl max-w-sm animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                      Sección {selectedSecData.seccion}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${progressInfo.badgeClass}`}>
                      Avance: {selPct}%
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                      ✓ En tu Distrito
                    </span>
                  </div>
                  <h4 className="text-base font-black text-white mt-1.5 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>{selectedSecData.municipio}, Tabasco</span>
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSecData(null)}
                  className="text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/10 text-[11px]">
              <div>
                <span className="text-slate-400">Distrito Federal:</span>
                <p className="font-bold text-white">Distrito {selectedSecData.distrito_f}</p>
              </div>
              <div>
                <span className="text-slate-400">Distrito Local:</span>
                <p className="font-bold text-white">Distrito {selectedSecData.distrito_l}</p>
              </div>
              <div>
                <span className="text-slate-400">Tipo de Sección:</span>
                <p className="font-bold text-indigo-300">
                  {selectedSecData.tipo === 2 || selectedSecData.tipo === 1
                    ? 'Urbana'
                    : selectedSecData.tipo === 4
                    ? 'Rural'
                    : selectedSecData.tipo === 3
                    ? 'Mixta'
                    : 'Urbana'}
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
                className="w-full mt-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                <span>Ver Ficha Completa de Sección</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      })()}
      </div>
    </div>
  );
};
