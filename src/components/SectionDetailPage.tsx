import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ElectoralSection, SectionStructure } from '../types/sections';
import type { TerritorialLeader } from '../types/territory';
import { CARTOGRAPHY_BY_SECTION } from '../data/mockSectionsData';
import tabascoCatalog from '../data/tabascoCatalog.json';
import { AddStructureToSectionModal } from './AddStructureToSectionModal';
import { PrintableSectionReport } from './PrintableSectionReport';
import {
  ArrowLeft,
  MapPin,
  Users,
  Target,
  Trophy,
  Vote,
  Compass,
  Layers,
  Satellite,
  Search,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  Copy,
  Check,
  Crosshair,
  Phone,
  MessageSquare,
  Building2,
  TrendingUp,
  Loader2,
  Sparkles,
  Printer,
} from 'lucide-react';

interface SectionDetailPageProps {
  sectionNumber: string;
  allSections: ElectoralSection[];
  visibleLeaders: TerritorialLeader[];
  onBack: () => void;
  onAddStructure?: (sectionId: string, structure: SectionStructure) => void;
}

export const SectionDetailPage: React.FC<SectionDetailPageProps> = ({
  sectionNumber,
  allSections,
  visibleLeaders,
  onBack,
  onAddStructure,
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
  const [isAddStructureOpen, setIsAddStructureOpen] = useState(false);
  const [isPrintReportOpen, setIsPrintReportOpen] = useState(false);

  // Normalize section number (4 digits)
  const normalizedSec = useMemo(() => {
    return (sectionNumber || '').trim().padStart(4, '0');
  }, [sectionNumber]);

  // Find section in allSections (scoped to jurisdiction)
  const section = useMemo(() => {
    return allSections.find(s => s.sectionNumber === normalizedSec || s.sectionNumber === sectionNumber) || null;
  }, [allSections, normalizedSec, sectionNumber]);

  // Cartography & catalog lookup
  const cartoEntry = useMemo(() => {
    return (
      CARTOGRAPHY_BY_SECTION.get(normalizedSec) ||
      CARTOGRAPHY_BY_SECTION.get(sectionNumber) ||
      null
    );
  }, [normalizedSec, sectionNumber]);

  const catEntry = useMemo(() => {
    return tabascoCatalog.find(
      c => c.section === normalizedSec || c.section === sectionNumber
    );
  }, [normalizedSec, sectionNumber]);

  // Electoral metrics with 100% exact mathematical synchrony
  const nominalTotal = (catEntry?.nominalTotal && catEntry.nominalTotal > 0)
    ? catEntry.nominalTotal
    : (section?.nominalList && section.nominalList > 0 ? section.nominalList : 1400);
  const nominalMen = catEntry?.nominalMen ?? section?.nominalMen ?? Math.round(nominalTotal * 0.48);
  const nominalWomen = catEntry?.nominalWomen ?? section?.nominalWomen ?? Math.round(nominalTotal * 0.52);
  const nominalNonBinary = catEntry?.nominalNonBinary ?? section?.nominalNonBinary ?? 0;

  // --------------------------------------------------------------------------
  // MODELO ELECTORAL 2027
  // 1. Participación esperada 2027: 50% de la Lista Nominal
  // 2. Meta Mínima para Ganar: 51% de la participación esperada
  // --------------------------------------------------------------------------
  const participacionEsperadaPct = 50; // 50%
  const votosEmitidosEsperados = Math.round(nominalTotal * 0.50);

  const metaGanarPctVotos = 51; // 51% de los votos emitidos
  const metaMinimaParaGanar = Math.round(votosEmitidosEsperados * 0.51); // 51% del 50% = ~25.5% del padrón total

  // Logro actual en la sección (simpatizantes / promovidos registrados)
  const logroActual = useMemo(() => {
    if (!section?.structures) return 0;
    return section.structures
      .filter(s => s.type === 'promocion' || s.type === 'general' || s.type === 'sectorial')
      .reduce((sum, s) => sum + (s.currentCount || 0), 0);
  }, [section]);

  const avanceMetaGanarPct = metaMinimaParaGanar > 0
    ? Math.min(100, Math.round((logroActual / metaMinimaParaGanar) * 100))
    : 0;

  const avanceSobrePadronPct = nominalTotal > 0
    ? ((logroActual / nominalTotal) * 100).toFixed(1)
    : '0.0';

  const faltanteParaGanar = Math.max(0, metaMinimaParaGanar - logroActual);
  const metaAlcanzada = logroActual >= metaMinimaParaGanar;

  // Proyección de casillas INE (1 Básica por cada 750 electores + contiguas)
  const casillasProyectadas = Math.max(1, Math.ceil(nominalTotal / 750));

  // Geografía
  const municipio = catEntry?.municipalityName
    ? (catEntry.municipalityName.charAt(0) + catEntry.municipalityName.slice(1).toLowerCase())
    : (section?.municipio || cartoEntry?.municipio || 'Tabasco');

  const distritoLocal = catEntry?.localDistrict
    ? `Distrito Local ${catEntry.localDistrict}`
    : (section?.distritoLocal || cartoEntry?.distritoLocal || 'Distrito 1');

  const distritoFederal = catEntry?.federalDistrict
    ? `Distrito Federal ${catEntry.federalDistrict} (${catEntry.districtHead})`
    : 'Distrito Federal 1';

  const tipo = catEntry?.sectionType
    ? (catEntry.sectionType.includes('RURAL') ? 'Rural' : catEntry.sectionType.includes('MIXTO') ? 'Mixta' : 'Urbana')
    : (section?.tipo || cartoEntry?.tipo || 'Urbana');

  const polygon = section?.polygon || cartoEntry?.polygon || [];
  const center = section?.center || cartoEntry?.center || [-92.93, 17.98];
  const [centerLon, centerLat] = center;

  // Coordinador asignado en la estructura
  const assignedLeader = useMemo(() => {
    return visibleLeaders.find(
      l =>
        l.level === 'seccional' &&
        (l.territoryName.includes(normalizedSec) ||
          l.territoryName.includes(sectionNumber) ||
          (l.code && (l.code.includes(normalizedSec) || l.code.includes(sectionNumber))))
    );
  }, [visibleLeaders, normalizedSec, sectionNumber]);

  // Leaflet Map Initialization directly in page
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
      });

      // Tile layer
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

      // Polygon
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

        // Casilla Marker
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
            <strong style="color: #0f172a; font-size: 13px;">Sección ${normalizedSec}</strong><br/>
            <span>${municipio} • ${distritoLocal}</span><br/>
            <hr style="margin: 4px 0; border: 0; border-top: 1px solid #e2e8f0;"/>
            <span style="color: #0369a1; font-weight: bold;">Lista Nominal: ${nominalTotal.toLocaleString()}</span><br/>
            <span style="color: #15803d; font-weight: bold;">Meta Mínima para Ganar: ${metaMinimaParaGanar.toLocaleString()}</span>
          </div>
        `);
      } else {
        map.setView([centerLat, centerLon], 15);
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
      console.warn('Leaflet error in SectionDetailPage:', err);
    }
  }, [mapLayer, polygon, centerLat, centerLon, normalizedSec, municipio, distritoLocal, nominalTotal, metaMinimaParaGanar]);

  // Recenter
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

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  // Search street with OpenStreetMap Nominatim
  const handleStreetSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!streetQuery.trim() || !mapInstanceRef.current) return;

    setIsSearchingStreet(true);
    setStreetSearchResult(null);

    try {
      const encoded = encodeURIComponent(`${streetQuery.trim()}, ${municipio}, Tabasco, Mexico`);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'es' },
      });
      const data = await res.json();

      if (data && data.length > 0) {
        const item = data[0];
        const sLat = parseFloat(item.lat);
        const sLon = parseFloat(item.lon);

        if (searchMarkerRef.current) searchMarkerRef.current.remove();

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

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(`${centerLat.toFixed(6)}, ${centerLon.toFixed(6)}`);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  if (!section) {
    return (
      <div className="flex-1 overflow-y-auto bg-slate-50 p-6 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-md text-center max-w-md">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Sección Fuera de Jurisdicción</h2>
          <p className="text-xs text-slate-500 mb-6">
            La sección <strong>{sectionNumber}</strong> no pertenece a su demarcación territorial o distrito asignado.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Tablero</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Navigation Bar: Back Button & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </button>
            
            <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>

            {/* Breadcrumb Path */}
            <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-slate-400">Cartografía INE</span>
              <span>/</span>
              <span className="font-medium text-slate-700">{municipio}</span>
              <span>/</span>
              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                Sección {normalizedSec}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPrintReportOpen(true)}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Generar Ficha de Sección y Padrón Imprimible"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Imprimir Ficha</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddStructureOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Asignar Estructura</span>
            </button>
          </div>
        </div>

        {/* Section Identity Header Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="p-2 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-700">
                  <MapPin className="w-5 h-5" />
                </span>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Sección Electoral {normalizedSec}
                </h1>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                  tipo === 'Rural'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : tipo === 'Mixta'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-sky-50 text-sky-700 border-sky-200'
                }`}>
                  {tipo}
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  INE DERFE 2025
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {casillasProyectadas} {casillasProyectadas === 1 ? 'Casilla Proyectada' : 'Casillas Proyectadas'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 flex items-center gap-2 flex-wrap">
                <span><strong>Municipio:</strong> {municipio}</span>
                <span>•</span>
                <span><strong>{distritoLocal}</strong></span>
                <span>•</span>
                <span><strong>{distritoFederal}</strong></span>
              </p>
            </div>

            {/* Asignación de Coordinador Seccional */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl self-start lg:self-auto">
              {assignedLeader ? (
                <>
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                    {assignedLeader.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide block flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Coordinación Seccional Asignada
                    </span>
                    <span className="text-xs font-bold text-slate-900 block">{assignedLeader.name}</span>
                    <span className="text-[11px] text-slate-500">{assignedLeader.phone || 'Sin teléfono'}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wide block">
                      Sección Vacante
                    </span>
                    <span className="text-xs text-slate-600">Requiere designación de coordinador territorial</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* MODELO ELECTORAL 2027: CÁLCULO DEL OBJETIVO MÍNIMO PARA GANAR     */}
        {/* ------------------------------------------------------------------ */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <span>Modelo Electoral 2027: Meta Mínima de Victoria</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Cálculo oficial con <strong>50% de participación esperada</strong> y objetivo de victoria al <strong>51% de los votos emitidos</strong>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-3 py-1 rounded-xl border flex items-center gap-1.5 ${
                metaAlcanzada
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{metaAlcanzada ? 'Meta de Triunfo Alcanzada' : `Faltan ${faltanteParaGanar} promovidos`}</span>
              </span>
            </div>
          </div>

          {/* 4 Tarjetas Métricas del Modelo 2027 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. Lista Nominal Oficial */}
            <div className="bg-slate-50/80 border border-slate-200 p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Lista Nominal Oficial
                </span>
                <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded-full border border-slate-200 text-slate-700">
                  100% Padrón
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {nominalTotal.toLocaleString()}{' '}
                <span className="text-xs font-medium text-slate-500 font-sans">electores</span>
              </div>
              <div className="pt-2 border-t border-slate-200/80 grid grid-cols-3 gap-1 text-[11px] text-center">
                <div className="bg-sky-50 px-1 py-1 rounded border border-sky-100">
                  <span className="text-sky-700 font-semibold block text-[10px]">Hombres</span>
                  <span className="font-mono font-bold text-sky-950">{nominalMen.toLocaleString()}</span>
                </div>
                <div className="bg-purple-50 px-1 py-1 rounded border border-purple-100">
                  <span className="text-purple-700 font-semibold block text-[10px]">Mujeres</span>
                  <span className="font-mono font-bold text-purple-950">{nominalWomen.toLocaleString()}</span>
                </div>
                <div className="bg-slate-100 px-1 py-1 rounded border border-slate-200">
                  <span className="text-slate-600 font-semibold block text-[10px]">No Binario</span>
                  <span className="font-mono font-bold text-slate-800">{nominalNonBinary}</span>
                </div>
              </div>
            </div>

            {/* 2. Participación Esperada 2027 (50%) */}
            <div className="bg-blue-50/50 border border-blue-200 p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-blue-900">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Vote className="w-4 h-4 text-blue-600" />
                  Participación Esperada
                </span>
                <span className="text-[10px] font-bold bg-blue-100 px-2 py-0.5 rounded-full text-blue-800 border border-blue-200">
                  {participacionEsperadaPct}% Proyección
                </span>
              </div>
              <div className="text-2xl font-black text-blue-950 font-mono">
                {votosEmitidosEsperados.toLocaleString()}{' '}
                <span className="text-xs font-medium text-blue-700 font-sans">votos en urnas</span>
              </div>
              <p className="text-[11px] text-blue-700 leading-tight pt-2 border-t border-blue-200">
                Estimación de sufragios emitidos en las urnas para la jornada electoral 2027.
              </p>
            </div>

            {/* 3. Meta Mínima para Ganar (51% de Votos) */}
            <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-amber-950">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-600" />
                  Meta Mínima para Ganar
                </span>
                <span className="text-[10px] font-bold bg-amber-200/80 px-2 py-0.5 rounded-full text-amber-900 font-mono">
                  {metaGanarPctVotos}% de votos
                </span>
              </div>
              <div className="text-2xl font-black text-amber-950 font-mono">
                {metaMinimaParaGanar.toLocaleString()}{' '}
                <span className="text-xs font-medium text-amber-800 font-sans">votos mínimos</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-tight pt-2 border-t border-amber-200">
                Equivale al <strong>25.5% del padrón total</strong> de la sección para garantizar el triunfo.
              </p>
            </div>

            {/* 4. Avance Territorial Logrado */}
            <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-emerald-950">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-emerald-600" />
                  Avance Hacia la Victoria
                </span>
                <span className="text-[10px] font-bold bg-emerald-200 px-2 py-0.5 rounded-full text-emerald-900 font-mono">
                  {avanceMetaGanarPct}% cumplido
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-950 font-mono">
                {logroActual.toLocaleString()}{' '}
                <span className="text-xs font-medium text-emerald-800 font-sans">promovidos</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-tight pt-2 border-t border-emerald-200">
                {metaAlcanzada ? (
                  <span className="font-bold text-emerald-900">¡Meta de triunfo asegurada! (+{logroActual - metaMinimaParaGanar} votos)</span>
                ) : (
                  <span>Faltan <strong>{faltanteParaGanar} promovidos</strong> para asegurar el triunfo.</span>
                )}
              </p>
            </div>

          </div>

          {/* BARRA DE PROGRESO / AVANCE ESTRATÉGICO 2027 */}
          <div className="p-4 sm:p-5 bg-slate-900 text-white rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white tracking-wide">
                  Termómetro de Victoria Electoral 2027
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-300">
                <span>Logrado: <strong className="text-emerald-400 font-mono">{logroActual}</strong></span>
                <span>•</span>
                <span>Meta Victoria: <strong className="text-amber-400 font-mono">{metaMinimaParaGanar} votos</strong></span>
                <span>•</span>
                <span>Padrón: <strong className="text-slate-200 font-mono">{nominalTotal}</strong></span>
              </div>
            </div>

            {/* Barra compuesta con Hitos visuales */}
            <div className="space-y-1.5">
              <div className="relative w-full h-7 bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-inner">
                {/* Relleno de avance actual */}
                <div
                  className="h-full bg-linear-to-r from-indigo-500 via-sky-500 to-emerald-500 rounded-xl transition-all duration-700 flex items-center justify-end pr-2.5 text-[11px] font-black text-white font-mono shadow-sm"
                  style={{ width: `${Math.min(100, Math.max(8, (logroActual / nominalTotal) * 100))}%` }}
                >
                  {avanceSobrePadronPct}%
                </div>

                {/* Marcador Línea: Meta Mínima de Victoria (25.5% del padrón = 51% de 50%) */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10"
                  style={{ left: `${(metaMinimaParaGanar / nominalTotal) * 100}%` }}
                />

                {/* Marcador Línea: Participación Proyectada (50%) */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-blue-400/80 z-10 border-dashed"
                  style={{ left: '50%' }}
                />
              </div>

              {/* Etiquetas inferiores de la barra */}
              <div className="relative text-[10px] text-slate-400 font-semibold h-5">
                <span className="absolute left-0">0 votos</span>
                
                {/* Etiqueta Meta Victoria */}
                <div
                  className="absolute -translate-x-1/2 flex items-center gap-1 text-amber-300 font-bold"
                  style={{ left: `${(metaMinimaParaGanar / nominalTotal) * 100}%` }}
                >
                  <Trophy className="w-3 h-3 text-amber-400" />
                  <span>Meta Victoria ({metaMinimaParaGanar})</span>
                </div>

                {/* Etiqueta 50% Participación */}
                <div
                  className="absolute -translate-x-1/2 hidden sm:flex items-center gap-1 text-blue-300"
                  style={{ left: '50%' }}
                >
                  <span>50% Votación ({votosEmitidosEsperados})</span>
                </div>

                <span className="absolute right-0 text-slate-300">100% Padrón ({nominalTotal})</span>
              </div>
            </div>

            {/* Texto explicativo institucional de la meta */}
            <div className="pt-2 border-t border-slate-800 text-xs text-slate-300 leading-relaxed">
              <strong>Fórmula Electoral Aplicada:</strong> Para la elección 2027, con un pronóstico de participación del <strong>50%</strong> ({votosEmitidosEsperados.toLocaleString()} votantes), la <strong>meta mínima para asegurar el triunfo</strong> en esta casilla es del <strong>51% de los votos</strong>, equivalente a <strong>{metaMinimaParaGanar.toLocaleString()} votos</strong> ({((metaMinimaParaGanar / nominalTotal) * 100).toFixed(1)}% del padrón total). Actualmente se cuenta con <strong>{logroActual} promovidos</strong> ({avanceMetaGanarPct}% de la meta de triunfo).
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* MAPA OPENSTREETMAP DESPLEGADO DIRECTAMENTE EN LA PÁGINA            */}
        {/* ------------------------------------------------------------------ */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs space-y-0">
          <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-indigo-600/80 rounded-xl border border-indigo-400/30">
                <Compass className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Cartografía Georreferenciada OpenStreetMap</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.2 rounded-full font-semibold">
                    Desplegado en Página
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Polígono perimetral oficial INE con {polygon.length} vértices georreferenciados
                </p>
              </div>
            </div>

            {/* Selector de capas OSM */}
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setMapLayer('osm')}
                className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
                  mapLayer === 'osm' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>OSM Calles</span>
              </button>
              <button
                type="button"
                onClick={() => setMapLayer('hot')}
                className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
                  mapLayer === 'hot' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Relieve</span>
              </button>
              <button
                type="button"
                onClick={() => setMapLayer('sat')}
                className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
                  mapLayer === 'sat' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Satellite className="w-3.5 h-3.5" />
                <span>Satélite HD</span>
              </button>
            </div>
          </div>

          {/* Barra de búsqueda de calles con OpenStreetMap Nominatim */}
          <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <form onSubmit={handleStreetSearch} className="flex items-center gap-1.5 flex-1 max-w-lg">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={streetQuery}
                  onChange={(e) => setStreetQuery(e.target.value)}
                  placeholder="Buscar calle, avenida o colonia en esta sección..."
                  className="w-full bg-white text-slate-800 pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={isSearchingStreet}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center gap-1 shadow-xs shrink-0"
              >
                {isSearchingStreet ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>Buscar en OSM</span>
                )}
              </button>
            </form>

            {/* Coordenadas Centroide */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs font-mono text-[11px] text-slate-700">
              <span>{centerLat.toFixed(5)}°N, {centerLon.toFixed(5)}°W</span>
              <button
                type="button"
                onClick={handleCopyCoords}
                className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600 transition-colors"
                title="Copiar coordenadas"
              >
                {copiedCoords ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {streetSearchResult && (
            <div className="px-4 py-1.5 bg-indigo-50 border-b border-indigo-200 text-xs text-indigo-900 font-medium flex items-center justify-between">
              <span>{streetSearchResult}</span>
              <button
                type="button"
                onClick={() => setStreetSearchResult(null)}
                className="text-indigo-600 hover:text-indigo-900 font-bold text-xs"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* Lienzo del Mapa OpenStreetMap en la Página */}
          <div className="relative h-[480px] w-full bg-slate-100">
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Controles Flotantes */}
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
                onClick={handleRecenter}
                className="w-8 h-8 bg-white hover:bg-slate-50 text-indigo-600 rounded-lg border border-slate-200 flex items-center justify-center shadow-xs"
                title="Centrar polígono de la sección"
              >
                <Crosshair className="w-4 h-4" />
              </button>
            </div>

            {/* Badge de fuente OSM */}
            <div className="absolute bottom-2 left-2 z-10 bg-white/90 backdrop-blur-xs border border-slate-200 px-2 py-1 rounded-md text-[10px] font-semibold text-slate-700 shadow-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>OpenStreetMap Engine</span>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* ESTRUCTURA TERRITORIAL & CÉLULAS EN ESTA SECCIÓN                   */}
        {/* ------------------------------------------------------------------ */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Estructura Territorial Asignada ({section?.structures?.length || 0} comités)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Equipos de promoción del voto, defensa jurídica y representantes de casilla en la Sección {normalizedSec}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddStructureOpen(true)}
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Agregar Célula a Sección</span>
            </button>
          </div>

          {(!section?.structures || section.structures.length === 0) ? (
            <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">Sección sin Estructura Registrada</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No hay comités de promoción ni representantes asignados aún a esta sección. Registre la primera estructura para comenzar la captación de la meta de triunfo.
              </p>
              <button
                type="button"
                onClick={() => setIsAddStructureOpen(true)}
                className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Dar de alta la primera estructura</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.structures.map((st) => (
                <div
                  key={st.id}
                  className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs space-y-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                        {st.type === 'promocion'
                          ? 'Promoción del Voto'
                          : st.type === 'defensa_casilla'
                          ? 'Defensa del Voto'
                          : 'Comité Sectorial'}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-0.5">{st.name}</h4>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      st.status === 'completado'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : st.status === 'critico'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-sky-50 text-sky-700 border-sky-200'
                    }`}>
                      {st.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-100">
                    <div>Responsable: <strong className="text-slate-800">{st.leaderName}</strong></div>
                    <div className="text-[11px] text-slate-500">{st.leaderRole}</div>
                  </div>

                  {/* Avance de la célula */}
                  <div className="pt-2 border-t border-slate-100 space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Meta: <strong>{st.metaGoal}</strong></span>
                      <span className="font-bold text-emerald-700">Captados: {st.currentCount}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{ width: `${st.metaGoal > 0 ? Math.min(100, Math.round((st.currentCount / st.metaGoal) * 100)) : 0}%` }}
                      />
                    </div>
                  </div>

                  {st.leaderPhone && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                      <a
                        href={`tel:${st.leaderPhone}`}
                        className="flex-1 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 flex items-center justify-center gap-1 transition-colors text-[11px] font-semibold"
                      >
                        <Phone className="w-3 h-3 text-sky-600" />
                        <span>Llamar</span>
                      </a>
                      <a
                        href={`https://wa.me/${st.leaderPhone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-200 flex items-center justify-center gap-1 transition-colors text-[11px] font-semibold"
                      >
                        <MessageSquare className="w-3 h-3 text-emerald-600" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Modal para agregar estructura o célula a la sección */}
      {section && (
        <AddStructureToSectionModal
          isOpen={isAddStructureOpen}
          sectionNumber={normalizedSec}
          allLeaders={visibleLeaders}
          allSections={allSections}
          onClose={() => setIsAddStructureOpen(false)}
          onSave={(st) => {
            onAddStructure?.(section.id, st);
            setIsAddStructureOpen(false);
          }}
        />
      )}

      {/* Modal para Ficha de Sección y Padrón Imprimible */}
      {isPrintReportOpen && section && (
        <PrintableSectionReport
          section={section}
          leaders={visibleLeaders}
          onClose={() => setIsPrintReportOpen(false)}
        />
      )}
    </div>
  );
};
