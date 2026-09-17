import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Layers, Satellite, Maximize2 } from 'lucide-react';
import { SectionMapModal } from './SectionMapModal';

interface SectionMapThumbnailProps {
  polygon: [number, number][]; // [[lon, lat], ...]
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  center: [number, number]; // [lon, lat]
  sectionNumber: string;
  municipio: string;
  className?: string;
  height?: number;
}

export const SectionMapThumbnail: React.FC<SectionMapThumbnailProps> = ({
  polygon,
  center,
  sectionNumber,
  municipio,
  className = '',
  height = 175,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');
  const [mapReady, setMapReady] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [centerLon, centerLat] = center;

  // Initialize Leaflet Map with direct OpenStreetMap Tiles
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy existing instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    try {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: false,
        doubleClickZoom: true,
        touchZoom: true,
      });

      // OpenStreetMap API Standard Tiles
      const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      const satUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

      const tileUrl = mapType === 'satellite' ? satUrl : osmUrl;
      const subdomains = mapType === 'satellite' ? ['server'] : ['a', 'b', 'c'];

      L.tileLayer(tileUrl, {
        maxZoom: 19,
        subdomains,
      }).addTo(map);

      // Convert GeoJSON [lon, lat] to Leaflet [lat, lon]
      if (polygon && polygon.length >= 3) {
        const latLngs: L.LatLngExpression[] = polygon.map(([lon, lat]) => [lat, lon]);

        const poly = L.polygon(latLngs, {
          color: mapType === 'satellite' ? '#38bdf8' : '#2563eb',
          weight: 2.5,
          fillColor: mapType === 'satellite' ? '#0284c7' : '#3b82f6',
          fillOpacity: mapType === 'satellite' ? 0.4 : 0.3,
          lineJoin: 'round',
        }).addTo(map);

        // Fit map view tightly to the section polygon
        map.fitBounds(poly.getBounds(), {
          padding: [15, 15],
          maxZoom: 17,
        });

        // Center Casilla Marker
        L.circleMarker([centerLat, centerLon], {
          radius: 5,
          fillColor: '#ef4444',
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 1,
        }).addTo(map);
      } else {
        map.setView([centerLat, centerLon], 15);
      }

      mapInstanceRef.current = map;
      setMapReady(true);

      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 150);

      return () => {
        clearTimeout(timer);
        map.remove();
        mapInstanceRef.current = null;
      };
    } catch (err) {
      console.warn('Leaflet initialization error:', err);
    }
  }, [polygon, centerLat, centerLon, sectionNumber, municipio, mapType]);

  // Toggle map layer (OpenStreetMap vs Satellite)
  const toggleMapLayer = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMapType(prev => (prev === 'streets' ? 'satellite' : 'streets'));
  };

  // Safe SVG fallback path if map tiles are offline or still rendering
  const svgPath = useMemo(() => {
    if (!polygon || polygon.length < 3) return '';
    const lons = polygon.map(p => p[0]);
    const lats = polygon.map(p => p[1]);
    const minX = Math.min(...lons);
    const maxX = Math.max(...lons);
    const minY = Math.min(...lats);
    const maxY = Math.max(...lats);

    const spanX = maxX - minX || 0.001;
    const spanY = maxY - minY || 0.001;
    const w = 260;
    const h = height;
    const pad = 12;

    const scale = Math.min((w - pad * 2) / spanX, (h - pad * 2) / spanY);
    const ox = pad + (w - pad * 2 - spanX * scale) / 2;
    const oy = pad + (h - pad * 2 - spanY * scale) / 2;

    const pts = polygon.map(([lon, lat]) => {
      const x = ox + (lon - minX) * scale;
      const y = h - (oy + (lat - minY) * scale);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return `M ${pts.join(' L ')} Z`;
  }, [polygon, height]);

  return (
    <>
      <div 
        onClick={() => setIsModalOpen(true)}
        className={`relative overflow-hidden rounded-xl border border-slate-200 shadow-xs group cursor-pointer ${className}`}
        style={{ height: `${height}px` }}
        title="Haga clic para ver el mapa interactivo OpenStreetMap en esta página"
      >
        {/* Leaflet Map Canvas */}
        <div 
          ref={mapContainerRef} 
          className="w-full h-full z-0 bg-slate-100" 
        />

        {/* Instant SVG shape overlay if Leaflet is loading */}
        {!mapReady && svgPath && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-1 bg-slate-50"
            viewBox={`0 0 260 ${height}`}
          >
            <path
              d={svgPath}
              fill="#3b82f6"
              fillOpacity="0.25"
              stroke="#2563eb"
              strokeWidth="2.5"
            />
          </svg>
        )}

        {/* Top Left: Section Tag */}
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-white/95 backdrop-blur-xs border border-slate-200 px-2.5 py-1 rounded-lg shadow-sm">
          <MapPin className="w-3.5 h-3.5 text-rose-500" />
          <span className="text-xs font-black text-slate-900 tracking-tight">
            SEC {sectionNumber}
          </span>
        </div>

        {/* Top Right: Layer Switcher & In-Page Modal Opener */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
          <button
            type="button"
            onClick={toggleMapLayer}
            className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg border shadow-xs transition-colors ${
              mapType === 'satellite'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white/95 hover:bg-white text-slate-700 border-slate-200'
            }`}
            title="Alternar entre mapa de calles y satelital"
          >
            {mapType === 'satellite' ? (
              <>
                <Satellite className="w-3 h-3 text-amber-300" />
                <span>Satélite</span>
              </>
            ) : (
              <>
                <Layers className="w-3 h-3 text-indigo-600" />
                <span>OSM</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsModalOpen(true);
            }}
            title="Desplegar mapa OpenStreetMap completo en esta página"
            className="p-1.5 bg-white/95 hover:bg-white text-slate-700 hover:text-indigo-600 rounded-lg border border-slate-200 shadow-xs transition-colors flex items-center gap-1"
          >
            <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
          </button>
        </div>

        {/* Bottom Floating Bar with Coordinates & Municipality */}
        <div className="absolute bottom-2 inset-x-2 z-10 flex items-center justify-between text-[10px] pointer-events-none">
          <span className="bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-md border border-slate-200/80 font-mono font-semibold text-slate-600 shadow-2xs">
            {centerLat.toFixed(3)}°N, {centerLon.toFixed(3)}°W
          </span>
          <span className="bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-md border border-slate-200/80 font-bold text-slate-700 truncate max-w-[120px] shadow-2xs">
            {municipio}
          </span>
        </div>
      </div>

      {/* Visor interactivo en la misma página */}
      <SectionMapModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sectionNumber={sectionNumber}
        municipio={municipio}
        polygon={polygon}
        center={center}
      />
    </>
  );
};
