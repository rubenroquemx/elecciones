import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  X,
  MapPin,
  Layers,
  Satellite,
  Search,
  Copy,
  Check,
  Crosshair,
  Users,
  Target,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Loader2,
  Minimize2,
  Expand,
} from 'lucide-react';
import { CARTOGRAPHY_BY_SECTION } from '../data/mockSectionsData';
import tabascoCatalog from '../data/tabascoCatalog.json';

interface SectionMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionNumber: string;
  municipio?: string;
  distritoLocal?: string;
  distritoFederal?: string;
  tipo?: string;
  nominalTotal?: number;
  nominalMen?: number;
  nominalWomen?: number;
  nominalNonBinary?: number;
  assignedLeader?: string;
  polygon?: [number, number][];
  center?: [number, number];
}

export const SectionMapModal: React.FC<SectionMapModalProps> = ({
  isOpen,
  onClose,
  sectionNumber,
  municipio: propMunicipio,
  distritoLocal: propDistritoLocal,
  distritoFederal: propDistritoFederal,
  tipo: propTipo,
  nominalTotal: propNominalTotal,
  nominalMen: propNominalMen,
  nominalWomen: propNominalWomen,
  nominalNonBinary: propNominalNonBinary,
  assignedLeader,
  polygon: propPolygon,
  center: propCenter,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polygonLayerRef = useRef<L.Polygon | null>(null);
  const searchMarkerRef = useRef<L.Marker | null>(null);

  const [mapLayer, setMapLayer] = useState<'osm' | 'hot' | 'sat'>('osm');
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [streetQuery, setStreetQuery] = useState('');
  const [isSearchingStreet, setIsSearchingStreet] = useState(false);
  const [streetSearchResult, setStreetSearchResult] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  const toggleMaximize = () => {
    setIsMaximized(prev => !prev);
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 150);
  };

  // Normalize section number (4 digits with leading zeros)
  const normalizedSec = useMemo(() => {
    return (sectionNumber || '').trim().padStart(4, '0');
  }, [sectionNumber]);

  // Lookup cartography and catalog data
  const cartoEntry = useMemo(() => {
    return (
      CARTOGRAPHY_BY_SECTION.get(normalizedSec) ||
      CARTOGRAPHY_BY_SECTION.get(sectionNumber) ||
      null
    );
  }, [normalizedSec, sectionNumber]);

  const catEntry = useMemo(() => {
    return tabascoCatalog.find(
      (c) => c.section === normalizedSec || c.section === sectionNumber
    );
  }, [normalizedSec, sectionNumber]);

  const polygon = propPolygon || cartoEntry?.polygon || [];
  const center = propCenter || cartoEntry?.center || [-92.93, 17.98]; // Default Villahermosa
  const [centerLon, centerLat] = center;

  const municipio = propMunicipio || cartoEntry?.municipio || catEntry?.municipalityName || 'Tabasco';
  const distritoLocal = propDistritoLocal || cartoEntry?.distritoLocal || (catEntry ? `Distrito ${catEntry.localDistrict}` : '');
  const distritoFederal = propDistritoFederal || (catEntry ? `Distrito ${catEntry.federalDistrict} (${catEntry.districtHead})` : '');
  const tipo = catEntry
    ? (catEntry.sectionType?.includes('RURAL') ? 'Rural' : catEntry.sectionType?.includes('MIXTO') ? 'Mixta' : 'Urbana')
    : (propTipo || cartoEntry?.tipo || 'Urbana');

  const nominalTotal = catEntry ? catEntry.nominalTotal : (propNominalTotal ?? 0);
  const nominalMen = catEntry ? catEntry.nominalMen : (propNominalMen ?? 0);
  const nominalWomen = catEntry ? catEntry.nominalWomen : (propNominalWomen ?? 0);
  const nominalNonBinary = catEntry ? catEntry.nominalNonBinary : (propNominalNonBinary ?? 0);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // Remove existing map if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    try {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      });

      // Tile layers with OpenStreetMap API
      let tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      let subdomains = ['a', 'b', 'c'];
      let maxZoom = 19;

      if (mapLayer === 'hot') {
        tileUrl = 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png';
      } else if (mapLayer === 'sat') {
        tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        subdomains = ['server'];
      }

      L.tileLayer(tileUrl, {
        maxZoom,
        subdomains,
      }).addTo(map);

      // Attribution
      L.control
        .attribution({
          position: 'bottomright',
          prefix: '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a>',
        })
        .addTo(map);

      // Polygon perimeter
      if (polygon && polygon.length >= 3) {
        const latLngs: L.LatLngExpression[] = polygon.map(([lon, lat]) => [lat, lon]);

        const poly = L.polygon(latLngs, {
          color: mapLayer === 'sat' ? '#38bdf8' : '#2563eb',
          weight: 3.5,
          fillColor: mapLayer === 'sat' ? '#0284c7' : '#3b82f6',
          fillOpacity: mapLayer === 'sat' ? 0.35 : 0.25,
          lineJoin: 'round',
        }).addTo(map);

        polygonLayerRef.current = poly;

        map.fitBounds(poly.getBounds(), {
          padding: [30, 30],
          maxZoom: 17,
        });

        // Casilla / Section Center Marker
        const marker = L.circleMarker([centerLat, centerLon], {
          radius: 8,
          fillColor: '#ef4444',
          color: '#ffffff',
          weight: 3,
          opacity: 1,
          fillOpacity: 1,
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
            <strong style="color: #0f172a; font-size: 13px;">Sección Electoral ${normalizedSec}</strong><br/>
            <span style="color: #475569;">${municipio} • ${distritoLocal}</span><br/>
            <hr style="margin: 4px 0; border: 0; border-top: 1px solid #e2e8f0;"/>
            <span style="color: #0369a1; font-weight: bold;">Lista Nominal: ${nominalTotal.toLocaleString()}</span>
          </div>
        `);
      } else {
        map.setView([centerLat, centerLon], 15);
      }

      mapInstanceRef.current = map;

      // Invalidate size to ensure container renders perfectly
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 200);

      return () => {
        clearTimeout(timer);
        map.remove();
        mapInstanceRef.current = null;
      };
    } catch (err) {
      console.warn('Error initializing OpenStreetMap modal:', err);
    }
  }, [isOpen, mapLayer, polygon, centerLat, centerLon, normalizedSec, municipio, distritoLocal, nominalTotal]);

  // Recenter to polygon
  const handleRecenter = () => {
    if (mapInstanceRef.current && polygonLayerRef.current) {
      mapInstanceRef.current.fitBounds(polygonLayerRef.current.getBounds(), {
        padding: [30, 30],
        maxZoom: 17,
      });
    } else if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([centerLat, centerLon], 15);
    }
  };

  // Zoom controls
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  // Search street or point of interest using OpenStreetMap Nominatim API
  const handleStreetSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!streetQuery.trim() || !mapInstanceRef.current) return;

    setIsSearchingStreet(true);
    setStreetSearchResult(null);

    try {
      // Query OpenStreetMap Nominatim API with Tabasco bias
      const encoded = encodeURIComponent(`${streetQuery.trim()}, ${municipio}, Tabasco, Mexico`);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'es',
        },
      });
      const data = await res.json();

      if (data && data.length > 0) {
        const item = data[0];
        const sLat = parseFloat(item.lat);
        const sLon = parseFloat(item.lon);

        if (searchMarkerRef.current) {
          searchMarkerRef.current.remove();
        }

        const newMarker = L.marker([sLat, sLon], {
          icon: L.divIcon({
            className: 'custom-osm-pin',
            html: `
              <div style="background-color: #10b981; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); border: 2px solid white;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
          }),
        }).addTo(mapInstanceRef.current);

        newMarker.bindPopup(`<strong>${item.display_name.split(',')[0]}</strong><br/><small>${item.display_name}</small>`).openPopup();
        searchMarkerRef.current = newMarker;

        mapInstanceRef.current.setView([sLat, sLon], 17);
        setStreetSearchResult(`Ubicación encontrada: ${item.display_name.split(',')[0]}`);
      } else {
        setStreetSearchResult('No se encontró la dirección en OpenStreetMap.');
      }
    } catch (err) {
      console.warn('Error querying OpenStreetMap Nominatim:', err);
      setStreetSearchResult('Error al consultar la API de OpenStreetMap.');
    } finally {
      setIsSearchingStreet(false);
    }
  };

  // Copy coordinates
  const handleCopyCoords = () => {
    navigator.clipboard.writeText(`${centerLat.toFixed(6)}, ${centerLon.toFixed(6)}`);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isMaximized ? 'p-0' : 'p-3 sm:p-5'} bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200`}>
      <div className={`bg-white border border-slate-200 ${isMaximized ? 'w-screen h-screen rounded-none' : 'rounded-2xl w-full max-w-5xl h-[92vh] max-h-[820px]'} shadow-2xl flex flex-col overflow-hidden transition-all duration-200`}>
        
        {/* Header Superior */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/80 border border-indigo-400/30 flex items-center justify-center shadow-inner">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight text-white">
                  Sección Electoral {normalizedSec}
                </h2>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  {tipo}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  OpenStreetMap Activo
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {municipio} • {distritoLocal} {distritoFederal ? `• ${distritoFederal}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleMaximize}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title={isMaximized ? "Restaurar tamaño normal" : "Ver en pantalla completa (tamaño completo)"}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4 text-amber-300" /> : <Expand className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Cerrar visor de mapa (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de herramientas y búsqueda OSM */}
        <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          {/* Buscador de calles con API de OpenStreetMap Nominatim */}
          <form onSubmit={handleStreetSearch} className="flex items-center gap-1.5 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={streetQuery}
                onChange={(e) => setStreetQuery(e.target.value)}
                placeholder="Buscar calle, avenida o colonia dentro de la sección..."
                className="w-full bg-white text-slate-800 pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={isSearchingStreet}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors flex items-center gap-1 shadow-xs"
            >
              {isSearchingStreet ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <span>Buscar en OSM</span>
              )}
            </button>
          </form>

          {/* Selector de capas OSM */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setMapLayer('osm')}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
                mapLayer === 'osm'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>OSM Calles</span>
            </button>
            <button
              type="button"
              onClick={() => setMapLayer('hot')}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
                mapLayer === 'hot'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>OSM Relieve</span>
            </button>
            <button
              type="button"
              onClick={() => setMapLayer('sat')}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
                mapLayer === 'sat'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Satellite className="w-3.5 h-3.5" />
              <span>Satélite HD</span>
            </button>
          </div>
        </div>

        {/* Mensaje de resultado de búsqueda si existe */}
        {streetSearchResult && (
          <div className="px-4 py-1.5 bg-indigo-50 border-b border-indigo-200 text-xs text-indigo-900 font-medium flex items-center justify-between">
            <span>{streetSearchResult}</span>
            <button
              type="button"
              onClick={() => setStreetSearchResult(null)}
              className="text-indigo-600 hover:text-indigo-900 font-bold"
            >
              Limpiar
            </button>
          </div>
        )}

        {/* Cuerpo Principal: Mapa + Ficha Técnica Integrada */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          
          {/* Contenedor del Mapa OpenStreetMap */}
          <div className="flex-1 h-[55%] md:h-full relative bg-slate-100">
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Controles flotantes sobre el mapa */}
            <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 shadow-md">
              <button
                type="button"
                onClick={handleZoomIn}
                className="w-8 h-8 bg-white hover:bg-slate-50 text-slate-800 rounded-lg border border-slate-200 flex items-center justify-center font-bold text-base shadow-xs"
                title="Acercar mapa (+)"
              >
                +
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="w-8 h-8 bg-white hover:bg-slate-50 text-slate-800 rounded-lg border border-slate-200 flex items-center justify-center font-bold text-base shadow-xs"
                title="Alejar mapa (-)"
              >
                -
              </button>
              <button
                type="button"
                onClick={handleRecenter}
                className="w-8 h-8 bg-white hover:bg-slate-50 text-indigo-600 rounded-lg border border-slate-200 flex items-center justify-center shadow-xs"
                title="Centrar polígono de la sección"
              >
                <Crosshair className="w-4 h-4" />
              </button>
            </div>

            {/* Badge de fuente OpenStreetMap */}
            <div className="absolute bottom-2 left-2 z-10 bg-white/90 backdrop-blur-xs border border-slate-200/80 px-2 py-1 rounded-md text-[10px] font-medium text-slate-600 shadow-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>OpenStreetMap Engine</span>
            </div>
          </div>

          {/* Panel Lateral de Ficha Técnica dentro de la misma página */}
          <div className="w-full md:w-80 lg:w-96 bg-slate-50 border-t md:border-t-0 md:border-l border-slate-200 p-4 sm:p-5 overflow-y-auto space-y-4 shrink-0">
            
            {/* Tarjeta de Lista Nominal Oficial INE */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  Lista Nominal Oficial (INE)
                </span>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                  Corte 2025
                </span>
              </div>

              <div className="text-2xl font-black text-slate-900 font-mono">
                {nominalTotal.toLocaleString()}{' '}
                <span className="text-xs font-medium text-slate-500 font-sans">electores</span>
              </div>

              {/* Desglose de Sexo */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 text-center">
                <div className="bg-sky-50/70 p-2 rounded-lg border border-sky-100">
                  <span className="text-[10px] text-sky-700 block font-semibold">Hombres</span>
                  <span className="text-xs font-bold text-sky-950 font-mono">
                    {nominalMen.toLocaleString()}
                  </span>
                </div>
                <div className="bg-purple-50/70 p-2 rounded-lg border border-purple-100">
                  <span className="text-[10px] text-purple-700 block font-semibold">Mujeres</span>
                  <span className="text-xs font-bold text-purple-950 font-mono">
                    {nominalWomen.toLocaleString()}
                  </span>
                </div>
                <div className="bg-slate-100 p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-600 block font-semibold">No Binario</span>
                  <span className="text-xs font-bold text-slate-800 font-mono">
                    {nominalNonBinary.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Estatus de Mando y Asignación */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-rose-500" />
                Estatus de Estructura Territorial
              </span>
              {assignedLeader ? (
                <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span>Asignado: {assignedLeader}</span>
                    <span className="block text-[11px] font-normal text-emerald-700">Coordinación Seccional activa</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <div>
                    <span>Vacante en Estructura</span>
                    <span className="block text-[11px] font-normal text-rose-700">Requiere designación de coordinador</span>
                  </div>
                </div>
              )}
            </div>

            {/* Coordenadas Geográficas Oficiales */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-slate-500" />
                Coordenadas Centroide de Casilla
              </span>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-slate-700">
                  {centerLat.toFixed(5)}° N, {centerLon.toFixed(5)}° W
                </span>
                <button
                  type="button"
                  onClick={handleCopyCoords}
                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-md transition-colors border border-transparent hover:border-slate-200"
                  title="Copiar coordenadas"
                >
                  {copiedCoords ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Datos Cartográficos del Polígono */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs text-xs space-y-1.5 text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Puntos del Perímetro:</span>
                <span className="font-bold text-slate-800">{polygon.length} vértices georreferenciados</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Entidad Federativa:</span>
                <span className="font-bold text-slate-800">27 - Tabasco</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Proveedor Cartográfico:</span>
                <span className="font-bold text-indigo-700">OpenStreetMap + INE</span>
              </div>
            </div>

            {/* Botón de cierre en el panel */}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-sm text-center"
            >
              Volver a la Plataforma
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
