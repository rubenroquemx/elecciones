import React, { useState, useMemo } from 'react';
import {
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { SectionMapModal } from './SectionMapModal';

interface SectionMapThumbnailProps {
  sectionNumber: string;
  municipio?: string;
  center?: [number, number];
  polygon?: [number, number][];
  bbox?: [number, number, number, number];
  distritoLocal?: string;
  tipo?: any;
  nominalList?: number;
  className?: string;
  height?: number;
  onViewDetail?: () => void;
}

export const SectionMapThumbnail: React.FC<SectionMapThumbnailProps> = ({
  sectionNumber,
  municipio = '',
  center = [-92.93, 17.98],
  polygon,
  className = '',
  height = 175,
  onViewDetail,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Safe SVG path from polygon
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
    const pad = 14;

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
        onClick={() => { if (onViewDetail) { onViewDetail(); } else { setIsModalOpen(true); } }}
        className={`relative overflow-hidden rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-900 to-slate-950 shadow-xs group cursor-pointer hover:border-slate-400 transition-all ${className}`}
        style={{ height: `${height}px` }}
        title="Haga clic para ver el mapa interactivo en pantalla completa"
      >
        {/* Subtle grid pattern background */}
        <div 
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: 'radial-gradient(circle, #38bdf8 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
        />

        {/* Vector SVG shape */}
        {svgPath ? (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none transition-transform duration-300 group-hover:scale-105"
            viewBox={`0 0 260 ${height}`}
          >
            <path
              d={svgPath}
              fill="#0284c7"
              fillOpacity="0.28"
              stroke="#38bdf8"
              strokeWidth="2"
            />
          </svg>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs">
            Cartografía disponible
          </div>
        )}

        {/* Top Left: Section Tag */}
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-xs border border-slate-700/80 px-2.5 py-1 rounded-lg shadow-sm">
          <MapPin className="w-3.5 h-3.5 text-rose-400" />
          <span className="text-xs font-black text-white tracking-tight">
            SEC {sectionNumber}
          </span>
        </div>

        {/* Top Right: Open Modal button */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onViewDetail) onViewDetail();
              else setIsModalOpen(false);
            }}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg border border-slate-700/80 bg-slate-900/90 hover:bg-slate-800 text-slate-200 shadow-xs transition-colors cursor-pointer"
            title="Ver mapa completo"
          >
            <ExternalLink className="w-3 h-3 text-sky-400" />
            <span>Mapa</span>
          </button>
        </div>

        {/* Bottom Bar: Municipio info */}
        {municipio && (
          <div className="absolute bottom-1.5 left-2 right-2 z-10 flex items-center justify-between text-[10px] font-medium text-slate-400 pointer-events-none">
            <span className="truncate">{municipio}</span>
            <span className="text-sky-400/90 text-[9px] font-mono group-hover:underline">Ver detalle →</span>
          </div>
        )}
      </div>

      {/* Interactive Leaflet Modal only mounted on-demand when requested */}
      {isModalOpen && (
        <SectionMapModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          sectionNumber={sectionNumber}
          municipio={municipio}
          center={center}
          polygon={polygon}
        />
      )}
    </>
  );
};
