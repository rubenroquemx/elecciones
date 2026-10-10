import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Layers,
  Plus,
  Building2,
  AlertTriangle,
  Pencil,
  Trash2,
  X,
  Search,
  Check,
  Sparkles
} from 'lucide-react';
import type { UserAccount } from '../types/auth';
import type { TerritorialLeader, TerritorialZone } from '../types/territory';
import tabascoCatalog from '../data/tabascoCatalog.json';
import { fetchStateGeoJson } from '../services/geoService';

interface CatalogSectionItem {
  section: string;
  municipalityId: number;
  municipalityName: string;
  federalDistrict: number;
  districtHead?: string;
  localDistrict: number;
  sectionType?: string;
  nominalTotal: number;
}

const typedCatalog = tabascoCatalog as CatalogSectionItem[];

// Paleta de colores distintivos y vibrantes para Zonas
export const ZONE_COLOR_PALETTE = [
  { id: 'guinda', name: 'Guinda Institucional', hex: '#9d2449', bgClass: 'bg-[#9d2449]', textClass: 'text-[#9d2449]' },
  { id: 'azul', name: 'Azul Real', hex: '#0284c7', bgClass: 'bg-sky-600', textClass: 'text-sky-600' },
  { id: 'esmeralda', name: 'Verde Esmeralda', hex: '#10b981', bgClass: 'bg-emerald-600', textClass: 'text-emerald-600' },
  { id: 'ambar', name: 'Ámbar Cálido', hex: '#d97706', bgClass: 'bg-amber-600', textClass: 'text-amber-600' },
  { id: 'violeta', name: 'Púrpura Violeta', hex: '#7c3aed', bgClass: 'bg-violet-600', textClass: 'text-violet-600' },
  { id: 'rosa', name: 'Rosa Magenta', hex: '#db2777', bgClass: 'bg-pink-600', textClass: 'text-pink-600' },
  { id: 'teal', name: 'Teal Marino', hex: '#0d9488', bgClass: 'bg-teal-600', textClass: 'text-teal-600' },
  { id: 'rojo', name: 'Rojo Carmesí', hex: '#dc2626', bgClass: 'bg-red-600', textClass: 'text-red-600' },
  { id: 'indigo', name: 'Índigo Profundo', hex: '#4f46e5', bgClass: 'bg-indigo-600', textClass: 'text-indigo-600' },
];

interface CampanaZonesManagementPageProps {
  currentUser: UserAccount;
  allLeaders: TerritorialLeader[];
  onSaveLeader?: (leader: TerritorialLeader) => void;
  onDeleteLeader?: (leaderId: string, isCitizen?: boolean) => void;
  onNavigate?: (nav: any) => void;
}

export const CampanaZonesManagementPage: React.FC<CampanaZonesManagementPageProps> = ({
  currentUser,
  allLeaders,
  onSaveLeader,
  onDeleteLeader,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const geoLayerRef = useRef<L.GeoJSON | null>(null);

  const [mapLayer, setMapLayer] = useState<'streets' | 'sat'>('streets');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string | 'all'>('all');
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);

  // Form State
  const [zoneName, setZoneName] = useState('');
  const [zoneCode, setZoneCode] = useState('');
  const [zoneColor, setZoneColor] = useState(ZONE_COLOR_PALETTE[0].hex);
  const [creationMode, setCreationMode] = useState<'municipios' | 'distritos_locales' | 'distritos_federales' | 'manual'>('manual');
  const [selectedSectionsInModal, setSelectedSectionsInModal] = useState<string[]>([]);
  const [coordinatorName, setCoordinatorName] = useState('');
  const [coordinatorPhone, setCoordinatorPhone] = useState('');
  const [zoneMetaGoal, setZoneMetaGoal] = useState<number>(0);
  const [sectionSearchQuery, setSectionSearchQuery] = useState('');

  // 1. Ámbito de secciones disponibles para este CPV
  const scopedSections = useMemo(() => {
    // Si el usuario tiene secciones explícitas asignadas
    if (currentUser.assignedSections && currentUser.assignedSections.length > 0) {
      const set = new Set(currentUser.assignedSections.map(s => String(s).padStart(4, '0')));
      return typedCatalog.filter(s => set.has(s.section));
    }
    // Si el CPV está asignado a un municipio por nombre
    const muniName = (currentUser as any).municipioName || currentUser.territoryName;
    if (muniName) {
      const cleanMuni = muniName.toUpperCase().replace(/^MUNICIPIO DE\s+/i, '').trim();
      const byMuni = typedCatalog.filter(s => s.municipalityName.toUpperCase().includes(cleanMuni));
      if (byMuni.length > 0) return byMuni;
    }
    // Si el CPV está asignado a un Distrito Local
    if ((currentUser as any).localDistrict) {
      const byLocal = typedCatalog.filter(s => s.localDistrict === Number((currentUser as any).localDistrict));
      if (byLocal.length > 0) return byLocal;
    }
    // Si el CPV está asignado a un Distrito Federal
    if ((currentUser as any).federalDistrict) {
      const byFed = typedCatalog.filter(s => s.federalDistrict === Number((currentUser as any).federalDistrict));
      if (byFed.length > 0) return byFed;
    }
    // Default Tabasco
    return typedCatalog;
  }, [currentUser]);

  const scopedSectionNumbers = useMemo(() => {
    return new Set(scopedSections.map(s => s.section));
  }, [scopedSections]);

  const catalogBySection = useMemo(() => {
    const map = new Map<string, CatalogSectionItem>();
    scopedSections.forEach(s => map.set(s.section, s));
    return map;
  }, [scopedSections]);

  // Agrupaciones disponibles en el ámbito del CPV
  const availableMunicipalities = useMemo(() => {
    const map = new Map<string, { name: string; sections: string[]; nominalTotal: number }>();
    scopedSections.forEach(s => {
      const existing = map.get(s.municipalityName) || { name: s.municipalityName, sections: [], nominalTotal: 0 };
      existing.sections.push(s.section);
      existing.nominalTotal += s.nominalTotal;
      map.set(s.municipalityName, existing);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [scopedSections]);

  const availableLocalDistricts = useMemo(() => {
    const map = new Map<number, { district: number; sections: string[]; nominalTotal: number }>();
    scopedSections.forEach(s => {
      const existing = map.get(s.localDistrict) || { district: s.localDistrict, sections: [], nominalTotal: 0 };
      existing.sections.push(s.section);
      existing.nominalTotal += s.nominalTotal;
      map.set(s.localDistrict, existing);
    });
    return Array.from(map.values()).sort((a, b) => a.district - b.district);
  }, [scopedSections]);

  const availableFederalDistricts = useMemo(() => {
    const map = new Map<number, { district: number; sections: string[]; nominalTotal: number; head: string }>();
    scopedSections.forEach(s => {
      const existing = map.get(s.federalDistrict) || { district: s.federalDistrict, sections: [], nominalTotal: 0, head: s.districtHead || '' };
      existing.sections.push(s.section);
      existing.nominalTotal += s.nominalTotal;
      map.set(s.federalDistrict, existing);
    });
    return Array.from(map.values()).sort((a, b) => a.district - b.district);
  }, [scopedSections]);

  // 2. Cargar Zonas registradas desde líderes con level === 'zona' o 'distrital' o storage
  const [zones, setZones] = useState<TerritorialZone[]>(() => {
    try {
      const saved = localStorage.getItem(`territorial_zones_${currentUser.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    // Derivar de líderes existentes con nivel zona dependientes del CPV
    const existingZonaLeaders = allLeaders.filter(
      l => (l.level === 'zona' || l.level === 'distrital' || l.level === 'responsable_zona') &&
           (l.parentId === currentUser.leaderId || l.parentId === currentUser.id || !l.parentId)
    );

    if (existingZonaLeaders.length > 0) {
      return existingZonaLeaders.map((l, idx) => ({
        id: l.id,
        name: l.territoryName || l.name,
        code: l.code || `ZONA-${String(idx + 1).padStart(2, '0')}`,
        color: l.avatarBg || ZONE_COLOR_PALETTE[idx % ZONE_COLOR_PALETTE.length].hex,
        sections: l.assignedSections || [],
        coordinatorId: l.id,
        coordinatorName: l.name,
        coordinatorPhone: l.phone,
        metaGoal: l.metaGoal,
        createdAt: l.createdAt,
      }));
    }

    return [];
  });

  // Guardar zonas en localStorage
  const persistZones = useCallback((newZones: TerritorialZone[]) => {
    setZones(newZones);
    try {
      localStorage.setItem(`territorial_zones_${currentUser.id}`, JSON.stringify(newZones));
    } catch {}
  }, [currentUser.id]);

  // Mapeo inverso: sección -> Zona
  const sectionToZoneMap = useMemo(() => {
    const map = new Map<string, TerritorialZone>();
    zones.forEach(z => {
      z.sections.forEach(sec => {
        const norm = String(sec).padStart(4, '0');
        map.set(norm, z);
      });
    });
    return map;
  }, [zones]);

  // Métricas de cobertura
  const assignedSectionsCount = useMemo(() => {
    const set = new Set<string>();
    zones.forEach(z => z.sections.forEach(s => set.add(String(s).padStart(4, '0'))));
    return set.size;
  }, [zones]);

  const unassignedSections = useMemo(() => {
    const assignedSet = new Set<string>();
    zones.forEach(z => z.sections.forEach(s => assignedSet.add(String(s).padStart(4, '0'))));
    return scopedSections.filter(s => !assignedSet.has(s.section));
  }, [scopedSections, zones]);

  const totalNominalCovered = useMemo(() => {
    let total = 0;
    const counted = new Set<string>();
    zones.forEach(z => {
      z.sections.forEach(sec => {
        const norm = String(sec).padStart(4, '0');
        if (!counted.has(norm)) {
          counted.add(norm);
          total += catalogBySection.get(norm)?.nominalTotal || 0;
        }
      });
    });
    return total;
  }, [zones, catalogBySection]);

  const totalScopeNominal = useMemo(() => {
    return scopedSections.reduce((acc, s) => acc + s.nominalTotal, 0);
  }, [scopedSections]);

  // Abrir modal para crear
  const handleOpenCreateModal = (preselectedSections?: string[]) => {
    const nextIndex = zones.length + 1;
    const defaultColor = ZONE_COLOR_PALETTE[(nextIndex - 1) % ZONE_COLOR_PALETTE.length].hex;
    setEditingZoneId(null);
    setZoneName(`Zona ${String(nextIndex).padStart(2, '0')}`);
    setZoneCode(`ZONA-${String(nextIndex).padStart(2, '0')}`);
    setZoneColor(defaultColor);
    setCreationMode(preselectedSections && preselectedSections.length > 0 ? 'manual' : 'municipios');
    setSelectedSectionsInModal(preselectedSections || []);
    setCoordinatorName('');
    setCoordinatorPhone('');
    setZoneMetaGoal((preselectedSections?.length || 10) * 50);
    setSectionSearchQuery('');
    setIsModalOpen(true);
  };

  // Abrir modal para editar
  const handleOpenEditModal = (zone: TerritorialZone) => {
    setEditingZoneId(zone.id);
    setZoneName(zone.name);
    setZoneCode(zone.code);
    setZoneColor(zone.color);
    setCreationMode(zone.creationMode || 'manual');
    setSelectedSectionsInModal([...zone.sections]);
    setCoordinatorName(zone.coordinatorName || '');
    setCoordinatorPhone(zone.coordinatorPhone || '');
    setZoneMetaGoal(zone.metaGoal || zone.sections.length * 50);
    setSectionSearchQuery('');
    setIsModalOpen(true);
  };

  // Guardar Zona
  const handleSaveZone = () => {
    if (!zoneName.trim()) {
      alert('Por favor asigna un nombre a la zona.');
      return;
    }
    if (selectedSectionsInModal.length === 0) {
      alert('Por favor selecciona al menos una sección electoral para esta zona.');
      return;
    }

    const zoneId = editingZoneId || `zona-${Date.now()}`;
    const cleanSections = Array.from(new Set(selectedSectionsInModal.map(s => String(s).padStart(4, '0'))));

    const updatedZone: TerritorialZone = {
      id: zoneId,
      name: zoneName.trim(),
      code: zoneCode.trim() || `ZONA-${zones.length + 1}`,
      color: zoneColor,
      sections: cleanSections,
      creationMode,
      coordinatorName: coordinatorName.trim() || undefined,
      coordinatorPhone: coordinatorPhone.trim() || undefined,
      metaGoal: Number(zoneMetaGoal) || cleanSections.length * 50,
      updatedAt: new Date().toISOString(),
      createdAt: editingZoneId ? (zones.find(z => z.id === editingZoneId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    };

    // Remover las secciones asignadas a esta nueva zona de cualquier otra zona previa (sin solapamientos)
    const newSectionsSet = new Set(cleanSections);
    const cleanedOtherZones = zones
      .filter(z => z.id !== zoneId)
      .map(z => ({
        ...z,
        sections: z.sections.filter(s => !newSectionsSet.has(String(s).padStart(4, '0'))),
      }))
      .filter(z => z.sections.length > 0);

    const finalZones = [...cleanedOtherZones, updatedZone];
    persistZones(finalZones);

    // Sincronizar como líder de Nivel Zona en el árbol jerárquico
    if (onSaveLeader) {
      const leaderPayload: TerritorialLeader = {
        id: zoneId,
        name: coordinatorName.trim() || `Coordinador ${zoneName.trim()}`,
        role: 'Coordinador de Zona',
        level: 'zona',
        levelIndex: 1,
        parentId: currentUser.leaderId || currentUser.id,
        territoryName: zoneName.trim(),
        code: zoneCode.trim(),
        phone: coordinatorPhone.trim() || undefined,
        assignedSections: cleanSections,
        metaGoal: Number(zoneMetaGoal) || cleanSections.length * 50,
        currentCount: 0,
        status: 'en_progreso',
        validationStatus: 'validado',
        avatarBg: zoneColor,
        createdAt: updatedZone.createdAt,
        updatedAt: updatedZone.updatedAt,
      };
      onSaveLeader(leaderPayload);
    }

    setIsModalOpen(false);
  };

  // Eliminar Zona
  const handleDeleteZone = (zoneId: string) => {
    const target = zones.find(z => z.id === zoneId);
    if (!target) return;
    if (window.confirm(`¿Estás seguro de eliminar la "${target.name}"? Sus ${target.sections.length} secciones pasarán a estar vacantes / sin zona.`)) {
      const updated = zones.filter(z => z.id !== zoneId);
      persistZones(updated);
      if (onDeleteLeader) {
        onDeleteLeader(zoneId, false);
      }
    }
  };

  // Auto-partición rápida por Municipios
  const handleAutoPartitionByMunicipalities = () => {
    if (availableMunicipalities.length === 0) return;
    if (!window.confirm(`Se crearán automáticamente ${availableMunicipalities.length} zonas basadas en los municipios asignados. ¿Deseas continuar?`)) return;

    const autoZones: TerritorialZone[] = availableMunicipalities.map((m, idx) => ({
      id: `zona-muni-${m.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now() + idx}`,
      name: `Zona ${String(idx + 1).padStart(2, '0')} - ${m.name}`,
      code: `ZONA-${String(idx + 1).padStart(2, '0')}`,
      color: ZONE_COLOR_PALETTE[idx % ZONE_COLOR_PALETTE.length].hex,
      sections: m.sections,
      creationMode: 'municipios',
      metaGoal: m.sections.length * 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    persistZones(autoZones);
    autoZones.forEach(z => {
      onSaveLeader?.({
        id: z.id,
        name: `Coordinador ${z.name}`,
        role: 'Coordinador de Zona',
        level: 'zona',
        levelIndex: 1,
        parentId: currentUser.leaderId || currentUser.id,
        territoryName: z.name,
        code: z.code,
        assignedSections: z.sections,
        metaGoal: z.metaGoal || z.sections.length * 50,
        currentCount: 0,
        status: 'en_progreso',
        validationStatus: 'validado',
        avatarBg: z.color,
      });
    });
  };

  // Auto-partición rápida por Distritos Locales
  const handleAutoPartitionByLocalDistricts = () => {
    if (availableLocalDistricts.length === 0) return;
    if (!window.confirm(`Se crearán automáticamente ${availableLocalDistricts.length} zonas basadas en los distritos locales asignados. ¿Deseas continuar?`)) return;

    const autoZones: TerritorialZone[] = availableLocalDistricts.map((d, idx) => ({
      id: `zona-dto-local-${d.district}-${Date.now() + idx}`,
      name: `Zona ${String(idx + 1).padStart(2, '0')} - Dto. Local ${d.district}`,
      code: `ZONA-${String(idx + 1).padStart(2, '0')}`,
      color: ZONE_COLOR_PALETTE[idx % ZONE_COLOR_PALETTE.length].hex,
      sections: d.sections,
      creationMode: 'distritos_locales',
      metaGoal: d.sections.length * 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    persistZones(autoZones);
    autoZones.forEach(z => {
      onSaveLeader?.({
        id: z.id,
        name: `Coordinador ${z.name}`,
        role: 'Coordinador de Zona',
        level: 'zona',
        levelIndex: 1,
        parentId: currentUser.leaderId || currentUser.id,
        territoryName: z.name,
        code: z.code,
        assignedSections: z.sections,
        metaGoal: z.metaGoal || z.sections.length * 50,
        currentCount: 0,
        status: 'en_progreso',
        validationStatus: 'validado',
        avatarBg: z.color,
      });
    });
  };

  // Toggle sección en Modal
  const toggleSectionInModal = (secNum: string) => {
    const norm = String(secNum).padStart(4, '0');
    setSelectedSectionsInModal(prev => {
      if (prev.includes(norm)) {
        return prev.filter(s => s !== norm);
      }
      return [...prev, norm];
    });
  };

  // Toggle municipio completo en Modal
  const toggleMunicipalityInModal = (muniSections: string[]) => {
    const allIncluded = muniSections.every(s => selectedSectionsInModal.includes(s));
    if (allIncluded) {
      const muniSet = new Set(muniSections);
      setSelectedSectionsInModal(prev => prev.filter(s => !muniSet.has(s)));
    } else {
      setSelectedSectionsInModal(prev => Array.from(new Set([...prev, ...muniSections])));
    }
  };

  // Inicialización y renderizado del Mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        preferCanvas: true,
      });
      map.setView([17.9892, -92.9281], 9);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Capa base
    const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const satUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    const tileUrl = mapLayer === 'sat' ? satUrl : osmUrl;
    const subdomains = mapLayer === 'sat' ? ['server'] : ['a', 'b', 'c'];

    const tileLayer = L.tileLayer(tileUrl, { maxZoom: 19, subdomains }).addTo(map);

    let isCancelled = false;

    // Cargar GeoJSON de Tabasco
    fetchStateGeoJson('tab').then(geoData => {
      if (isCancelled || !mapInstanceRef.current) return;

      if (geoLayerRef.current) {
        map.removeLayer(geoLayerRef.current);
        geoLayerRef.current = null;
      }

      if (geoData && geoData.features) {
        const geoLayer = L.geoJSON(geoData, {
          filter: (feature) => {
            const sec = String(feature.properties?.seccion || '').padStart(4, '0');
            return scopedSectionNumbers.has(sec);
          },
          style: (feature) => {
            const sec = String(feature?.properties?.seccion || '').padStart(4, '0');
            const zone = sectionToZoneMap.get(sec);
            const isFilterActive = selectedZoneFilter !== 'all';
            const matchesFilter = isFilterActive && zone?.id === selectedZoneFilter;
            const isDimmed = isFilterActive && !matchesFilter;

            if (zone) {
              return {
                color: isDimmed ? '#94a3b8' : zone.color,
                weight: matchesFilter ? 2 : 1,
                opacity: isDimmed ? 0.3 : 0.9,
                fillColor: zone.color,
                fillOpacity: isDimmed ? 0.1 : (mapLayer === 'sat' ? 0.45 : 0.35),
                smoothFactor: 1.0,
              };
            }

            // Sección vacante / sin zona
            return {
              color: '#64748b',
              weight: 0.8,
              dashArray: '3, 3',
              opacity: 0.7,
              fillColor: '#cbd5e1',
              fillOpacity: mapLayer === 'sat' ? 0.2 : 0.12,
              smoothFactor: 1.0,
            };
          },
          onEachFeature: (feature, layer) => {
            const p = feature.properties || {};
            const sec = String(p.seccion || '').padStart(4, '0');
            const zone = sectionToZoneMap.get(sec);
            const cat = catalogBySection.get(sec);

            layer.bindTooltip(
              `<div class="px-2 py-1 font-sans text-xs">
                <div class="font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Sección ${p.seccion}</span>
                  <span class="text-[10px] text-slate-500 font-normal">(${p.municipio || ''})</span>
                </div>
                ${zone ? `
                  <div class="mt-1 flex items-center gap-1 text-[11px] font-bold" style="color: ${zone.color}">
                    <span class="w-2 h-2 rounded-full inline-block" style="background-color: ${zone.color}"></span>
                    <span>${zone.name} (${zone.code})</span>
                  </div>
                ` : `
                  <div class="mt-1 text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                    <span>⚠️ Sin Zona Asignada (Vacante)</span>
                  </div>
                `}
                <div class="text-[10px] text-slate-500 mt-0.5">
                  Padrón Nominal: <strong>${cat?.nominalTotal.toLocaleString() || 'N/D'} electores</strong>
                </div>
              </div>`,
              { sticky: true, direction: 'top', opacity: 0.95 }
            );

            layer.on('mouseover', () => {
              setHoveredSection(sec);
              (layer as L.Path).setStyle({
                weight: 2.5,
                fillOpacity: 0.65,
                color: '#0f172a',
              });
              (layer as any).bringToFront?.();
            });

            layer.on('mouseout', () => {
              setHoveredSection(null);
              geoLayer.resetStyle(layer as any);
            });

            layer.on('click', () => {
              if (isModalOpen && creationMode === 'manual') {
                toggleSectionInModal(sec);
              } else if (zone) {
                setSelectedZoneFilter(prev => prev === zone.id ? 'all' : zone.id);
              } else {
                handleOpenCreateModal([sec]);
              }
            });
          }
        }).addTo(map);

        geoLayerRef.current = geoLayer;

        if (geoLayer.getLayers().length > 0) {
          try {
            const bounds = geoLayer.getBounds();
            if (bounds && bounds.isValid()) {
              map.fitBounds(bounds, { padding: [25, 25] });
            }
          } catch {}
        }
      }
    });

    return () => {
      isCancelled = true;
      if (tileLayer && map) {
        map.removeLayer(tileLayer);
      }
    };
  }, [mapLayer, scopedSectionNumbers, sectionToZoneMap, selectedZoneFilter, isModalOpen, creationMode]);

  // Enfocar mapa en una zona específica
  const handleFocusZoneOnMap = (zone: TerritorialZone) => {
    setSelectedZoneFilter(zone.id);
    if (!mapInstanceRef.current || !geoLayerRef.current) return;

    const zoneSecs = new Set(zone.sections.map(s => String(s).padStart(4, '0')));
    const matchedLayers: L.Layer[] = [];

    geoLayerRef.current.eachLayer((l: any) => {
      const sec = String(l.feature?.properties?.seccion || '').padStart(4, '0');
      if (zoneSecs.has(sec)) {
        matchedLayers.push(l);
      }
    });

    if (matchedLayers.length > 0 && mapInstanceRef.current) {
      try {
        const group = L.featureGroup(matchedLayers);
        const bounds = group.getBounds();
        if (bounds && bounds.isValid()) {
          mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
        }
      } catch {}
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col font-sans text-slate-800 pb-28">
      {/* 1. CABECERA & RESUMEN ESTRATÉGICO DE ZONAS */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-6 shrink-0 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-none border border-slate-200 shadow-2xs">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#9d2449]" />
                <span>Definición y Gestión de Zonas Electorales</span>
              </h1>
              <span className="text-[11px] font-bold bg-[#9d2449]/10 text-[#9d2449] border border-[#9d2449]/20 px-2.5 py-0.5 rounded-none">
                Nivel 2 • Coordinación de Promoción al Voto (CPV)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Divide y organiza estratégicamente tu territorio ({scopedSections.length} secciones en total) en Zonas operativas asignadas a Coordinadores de Zona.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {zones.length === 0 && availableMunicipalities.length > 1 && (
              <button
                type="button"
                onClick={handleAutoPartitionByMunicipalities}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-none text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Crear automáticamente una zona por cada municipio"
              >
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Auto-Zonas por Municipio</span>
              </button>
            )}

            {zones.length === 0 && availableLocalDistricts.length > 1 && (
              <button
                type="button"
                onClick={handleAutoPartitionByLocalDistricts}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-none text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Crear automáticamente una zona por cada distrito local"
              >
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Auto-Zonas por Dto. Local</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleOpenCreateModal()}
              className="px-4 py-2 bg-[#9d2449] hover:bg-[#801d3b] text-white rounded-none text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Zona</span>
            </button>
          </div>
        </div>

        {/* 2. TARJETAS DE MÉTRICAS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-4 border border-slate-200 rounded-none shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">Zonas Definidas</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900 font-mono">{zones.length}</span>
              <span className="text-xs text-slate-500 font-medium">zonas</span>
            </div>
          </div>

          <div className="bg-white p-4 border border-slate-200 rounded-none shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">Secciones Asignadas</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-700 font-mono">{assignedSectionsCount}</span>
              <span className="text-xs text-slate-500 font-medium">de {scopedSections.length} ({Math.round((assignedSectionsCount / (scopedSections.length || 1)) * 100)}%)</span>
            </div>
          </div>

          <div className="bg-white p-4 border border-slate-200 rounded-none shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">Secciones Vacantes</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-black font-mono ${unassignedSections.length > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                {unassignedSections.length}
              </span>
              <span className="text-xs text-slate-500 font-medium">sin zona</span>
            </div>
          </div>

          <div className="bg-white p-4 border border-slate-200 rounded-none shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">Electores en Zonas</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900 font-mono">{totalNominalCovered.toLocaleString()}</span>
              <span className="text-xs text-slate-500 font-medium">de {totalScopeNominal.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAPA CARTOGRÁFICO INTERACTIVO DE ZONAS (SIN BARRA SUPERIOR, FLUIDO) */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4 shrink-0">
        <div className="relative bg-white rounded-none border border-slate-200 overflow-hidden shadow-xs">
          {/* Controles Flotantes Discretos de Capa */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
            {selectedZoneFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedZoneFilter('all')}
                className="px-2.5 py-1 text-[11px] font-bold bg-slate-900 text-white shadow-md rounded-none flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Ver Todas las Zonas</span>
              </button>
            )}

            <div className="flex items-center bg-white/95 backdrop-blur-xs border border-slate-200 rounded-none p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setMapLayer('streets')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-none cursor-pointer transition-colors ${
                  mapLayer === 'streets' ? 'bg-[#9d2449] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Calles
              </button>
              <button
                type="button"
                onClick={() => setMapLayer('sat')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-none cursor-pointer transition-colors ${
                  mapLayer === 'sat' ? 'bg-[#9d2449] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Satélite
              </button>
            </div>
          </div>

          {/* Badge informativo de sección en hover */}
          {hoveredSection && (
            <div className="absolute bottom-3 left-3 z-10 bg-slate-900/90 backdrop-blur-xs text-white px-3 py-1.5 text-xs font-mono rounded-none shadow-lg border border-white/10 pointer-events-none">
              Sección: <strong>{hoveredSection}</strong> • {sectionToZoneMap.get(hoveredSection)?.name || '⚠️ Vacante'}
            </div>
          )}

          <div ref={mapContainerRef} className="w-full h-80 sm:h-96 z-0" />
        </div>
      </div>

      {/* 4. ALERTA DE SECCIONES VACANTES SI EXISTEN */}
      {unassignedSections.length > 0 && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4 shrink-0">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-amber-900">
                  Tienes {unassignedSections.length} secciones electorales sin asignar a ninguna zona
                </h4>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  ({unassignedSections.slice(0, 8).map(s => s.section).join(', ')}{unassignedSections.length > 8 ? ` y ${unassignedSections.length - 8} más...` : ''})
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleOpenCreateModal(unassignedSections.map(s => s.section))}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-none transition-colors shrink-0 cursor-pointer"
            >
              Crear Zona con Secciones Vacantes
            </button>
          </div>
        </div>
      )}

      {/* 5. LISTADO DE ZONAS DEFINIDAS */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Zonas Registradas ({zones.length})
          </h3>
        </div>

        {zones.length === 0 ? (
          <div className="bg-white rounded-none p-12 text-center border border-slate-200 space-y-3">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="text-base font-bold text-slate-700">Aún no has definido zonas en tu territorio</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Comienza creando tu primera zona agrupando secciones por municipio, distrito local, distrito federal o selección directa en el mapa.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleOpenCreateModal()}
                className="px-4 py-2 bg-[#9d2449] hover:bg-[#801d3b] text-white rounded-none text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                + Crear Primera Zona
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-none border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Zona & Código</th>
                    <th className="py-3 px-4">Secciones Asignadas</th>
                    <th className="py-3 px-4">Padrón Electoral</th>
                    <th className="py-3 px-4">Coordinador de Zona</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {zones.map(zone => {
                    const zoneNominal = zone.sections.reduce((acc, sec) => {
                      const norm = String(sec).padStart(4, '0');
                      return acc + (catalogBySection.get(norm)?.nominalTotal || 0);
                    }, 0);

                    return (
                      <tr key={zone.id} className="hover:bg-slate-50 transition-colors">
                        {/* Zona & Código */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <span
                              className="w-3.5 h-3.5 rounded-none shrink-0 shadow-2xs"
                              style={{ backgroundColor: zone.color }}
                            />
                            <div>
                              <span className="font-bold text-slate-900 block">{zone.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{zone.code}</span>
                            </div>
                          </div>
                        </td>

                        {/* Secciones Asignadas */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap max-w-md">
                            <span className="font-bold text-slate-900 font-mono text-xs">
                              {zone.sections.length} secciones
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-[11px] text-slate-500 truncate max-w-xs font-mono">
                              {zone.sections.slice(0, 6).join(', ')}{zone.sections.length > 6 ? ` (+${zone.sections.length - 6})` : ''}
                            </span>
                          </div>
                        </td>

                        {/* Padrón Electoral */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 font-mono">
                            {zoneNominal.toLocaleString()} electores
                          </span>
                        </td>

                        {/* Coordinador de Zona */}
                        <td className="py-3.5 px-4">
                          {zone.coordinatorName ? (
                            <div>
                              <span className="font-bold text-slate-900 block">{zone.coordinatorName}</span>
                              {zone.coordinatorPhone && (
                                <span className="text-[11px] text-slate-400 font-mono">{zone.coordinatorPhone}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Sin asignar</span>
                          )}
                        </td>

                        {/* Acciones */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <button
                              type="button"
                              onClick={() => handleFocusZoneOnMap(zone)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-none text-xs font-semibold transition-colors cursor-pointer"
                              title="Enfocar esta zona en el mapa"
                            >
                              Ver Mapa
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(zone)}
                              className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-none transition-colors cursor-pointer"
                              title="Editar Zona"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteZone(zone.id)}
                              className="p-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 rounded-none transition-colors cursor-pointer"
                              title="Eliminar Zona"
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

      {/* 6. MODAL DE CREACIÓN / EDICIÓN DE ZONA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-none shadow-2xl w-full max-w-3xl overflow-hidden my-8">
            {/* Cabecera Modal */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#9d2449]" />
                <h3 className="font-bold text-slate-900 text-sm">
                  {editingZoneId ? 'Editar Zona Electoral' : 'Crear Nueva Zona Electoral'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cuerpo Modal */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Datos Básicos de la Zona */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Nombre de la Zona *
                  </label>
                  <input
                    type="text"
                    value={zoneName}
                    onChange={e => setZoneName(e.target.value)}
                    placeholder="Ej. Zona 01 - Centro Norte"
                    className="w-full bg-white border border-slate-300 px-3 py-2 text-xs rounded-none focus:outline-none focus:ring-1 focus:ring-[#9d2449] font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Código de Zona
                  </label>
                  <input
                    type="text"
                    value={zoneCode}
                    onChange={e => setZoneCode(e.target.value)}
                    placeholder="Ej. ZONA-01"
                    className="w-full bg-white border border-slate-300 px-3 py-2 text-xs rounded-none focus:outline-none focus:ring-1 focus:ring-[#9d2449] font-mono text-slate-900"
                  />
                </div>
              </div>

              {/* Selector de Color */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Color de Identificación en Mapa
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {ZONE_COLOR_PALETTE.map(pal => (
                    <button
                      key={pal.id}
                      type="button"
                      onClick={() => setZoneColor(pal.hex)}
                      className={`w-7 h-7 rounded-none transition-all flex items-center justify-center cursor-pointer ${
                        zoneColor === pal.hex ? 'ring-2 ring-slate-900 ring-offset-2 scale-110 shadow-sm' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: pal.hex }}
                      title={pal.name}
                    >
                      {zoneColor === pal.hex && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pestañas de Método de Partición */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  Método de Asignación de Secciones:
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreationMode('municipios')}
                    className={`p-2.5 text-xs font-bold rounded-none border transition-all text-center cursor-pointer ${
                      creationMode === 'municipios'
                        ? 'bg-[#9d2449] text-white border-[#9d2449] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🏢 Por Municipios
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreationMode('distritos_locales')}
                    className={`p-2.5 text-xs font-bold rounded-none border transition-all text-center cursor-pointer ${
                      creationMode === 'distritos_locales'
                        ? 'bg-[#9d2449] text-white border-[#9d2449] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🏛️ Por Dto. Local
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreationMode('distritos_federales')}
                    className={`p-2.5 text-xs font-bold rounded-none border transition-all text-center cursor-pointer ${
                      creationMode === 'distritos_federales'
                        ? 'bg-[#9d2449] text-white border-[#9d2449] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🇲🇽 Por Dto. Federal
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreationMode('manual')}
                    className={`p-2.5 text-xs font-bold rounded-none border transition-all text-center cursor-pointer ${
                      creationMode === 'manual'
                        ? 'bg-[#9d2449] text-white border-[#9d2449] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🗺️ Manual / Mapa
                  </button>
                </div>
              </div>

              {/* Contenido según el modo seleccionado */}
              <div className="bg-slate-50 p-4 border border-slate-200 rounded-none space-y-3">
                {/* Modo 1: Por Municipios */}
                {creationMode === 'municipios' && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-600">
                      Selecciona los municipios completos que conformarán esta zona:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {availableMunicipalities.map(m => {
                        const isAllSelected = m.sections.every(s => selectedSectionsInModal.includes(s));
                        return (
                          <div
                            key={m.name}
                            onClick={() => toggleMunicipalityInModal(m.sections)}
                            className={`p-2.5 border rounded-none flex items-center justify-between cursor-pointer transition-colors ${
                              isAllSelected ? 'bg-white border-[#9d2449] shadow-2xs' : 'bg-white/60 border-slate-200 hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isAllSelected}
                                onChange={() => {}}
                                className="accent-[#9d2449] rounded-none"
                              />
                              <span className="font-bold text-xs text-slate-900">{m.name}</span>
                            </div>
                            <span className="text-[11px] font-mono text-slate-500">
                              {m.sections.length} seccs • {m.nominalTotal.toLocaleString()} elec.
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Modo 2: Por Distritos Locales */}
                {creationMode === 'distritos_locales' && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-600">
                      Selecciona los distritos locales para incluir todas sus secciones:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {availableLocalDistricts.map(d => {
                        const isAllSelected = d.sections.every(s => selectedSectionsInModal.includes(s));
                        return (
                          <div
                            key={d.district}
                            onClick={() => toggleMunicipalityInModal(d.sections)}
                            className={`p-2.5 border rounded-none flex items-center justify-between cursor-pointer transition-colors ${
                              isAllSelected ? 'bg-white border-[#9d2449] shadow-2xs' : 'bg-white/60 border-slate-200 hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isAllSelected}
                                onChange={() => {}}
                                className="accent-[#9d2449] rounded-none"
                              />
                              <span className="font-bold text-xs text-slate-900">Distrito Local {d.district}</span>
                            </div>
                            <span className="text-[11px] font-mono text-slate-500">
                              {d.sections.length} seccs • {d.nominalTotal.toLocaleString()} elec.
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Modo 3: Por Distritos Federales */}
                {creationMode === 'distritos_federales' && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-600">
                      Selecciona los distritos federales completos:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {availableFederalDistricts.map(d => {
                        const isAllSelected = d.sections.every(s => selectedSectionsInModal.includes(s));
                        return (
                          <div
                            key={d.district}
                            onClick={() => toggleMunicipalityInModal(d.sections)}
                            className={`p-2.5 border rounded-none flex items-center justify-between cursor-pointer transition-colors ${
                              isAllSelected ? 'bg-white border-[#9d2449] shadow-2xs' : 'bg-white/60 border-slate-200 hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isAllSelected}
                                onChange={() => {}}
                                className="accent-[#9d2449] rounded-none"
                              />
                              <span className="font-bold text-xs text-slate-900">
                                Distrito Federal {d.district} {d.head ? `(${d.head})` : ''}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-slate-500">
                              {d.sections.length} seccs
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Modo 4: Selección Manual / Búsqueda */}
                {creationMode === 'manual' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          value={sectionSearchQuery}
                          onChange={e => setSectionSearchQuery(e.target.value)}
                          placeholder="Buscar sección (ej. 0416) o municipio..."
                          className="w-full bg-white border border-slate-300 pl-8 pr-3 py-1.5 text-xs rounded-none focus:outline-none focus:ring-1 focus:ring-[#9d2449]"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedSectionsInModal(scopedSections.map(s => s.section))}
                          className="px-2 py-1 text-[11px] bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-none font-semibold cursor-pointer"
                        >
                          Seleccionar Todas
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedSectionsInModal([])}
                          className="px-2 py-1 text-[11px] bg-white border border-slate-300 text-rose-600 hover:bg-rose-50 rounded-none font-semibold cursor-pointer"
                        >
                          Limpiar
                        </button>
                      </div>
                    </div>

                    {/* Chips de Secciones Disponibles */}
                    <div className="max-h-40 overflow-y-auto p-2 bg-white border border-slate-200 rounded-none flex flex-wrap gap-1.5">
                      {scopedSections
                        .filter(s => {
                          if (!sectionSearchQuery.trim()) return true;
                          const q = sectionSearchQuery.trim().toLowerCase();
                          return s.section.includes(q) || s.municipalityName.toLowerCase().includes(q);
                        })
                        .map(sec => {
                          const isSelected = selectedSectionsInModal.includes(sec.section);
                          const assignedToOther = sectionToZoneMap.get(sec.section);
                          const isOtherZone = assignedToOther && assignedToOther.id !== editingZoneId;

                          return (
                            <button
                              key={sec.section}
                              type="button"
                              onClick={() => toggleSectionInModal(sec.section)}
                              className={`px-2 py-1 text-xs font-mono rounded-none border transition-all flex items-center gap-1 cursor-pointer ${
                                isSelected
                                  ? 'bg-[#9d2449] text-white border-[#9d2449] font-bold shadow-2xs'
                                  : isOtherZone
                                  ? 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                              }`}
                              title={`${sec.municipalityName} (Padrón: ${sec.nominalTotal})${isOtherZone ? ` • Actualmente en ${assignedToOther.name}` : ''}`}
                            >
                              <span>{sec.section}</span>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Resumen de Selección */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">
                    {selectedSectionsInModal.length} secciones seleccionadas
                  </span>
                  <span className="font-mono text-slate-600">
                    Padrón Total:{' '}
                    <strong>
                      {selectedSectionsInModal
                        .reduce((acc, s) => acc + (catalogBySection.get(s)?.nominalTotal || 0), 0)
                        .toLocaleString()}
                    </strong>{' '}
                    electores
                  </span>
                </div>
              </div>

              {/* Asignación de Coordinador de Zona */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Coordinador de Zona (Titular Opcional)
                  </label>
                  <input
                    type="text"
                    value={coordinatorName}
                    onChange={e => setCoordinatorName(e.target.value)}
                    placeholder="Nombre del Coordinador de Zona"
                    className="w-full bg-white border border-slate-300 px-3 py-2 text-xs rounded-none focus:outline-none focus:ring-1 focus:ring-[#9d2449] text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={coordinatorPhone}
                    onChange={e => setCoordinatorPhone(e.target.value)}
                    placeholder="Ej. 9931234567"
                    className="w-full bg-white border border-slate-300 px-3 py-2 text-xs rounded-none focus:outline-none focus:ring-1 focus:ring-[#9d2449] font-mono text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Pie Modal */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-none transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveZone}
                className="px-5 py-2 bg-[#9d2449] hover:bg-[#801d3b] text-white text-xs font-bold rounded-none transition-all shadow-xs cursor-pointer active:scale-98"
              >
                {editingZoneId ? 'Actualizar Zona' : 'Guardar Zona'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
