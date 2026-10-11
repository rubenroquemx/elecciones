import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Plus,
  Building2,
  AlertTriangle,
  Pencil,
  Trash2,
  X,
  Search,
  Check,
  Sparkles,
  KeyRound,
  Copy,
  UserPlus,
  RefreshCw,
  MousePointerClick,
  LogIn
} from 'lucide-react';
import type { UserAccount } from '../types/auth';
import type { TerritorialLeader, TerritorialZone } from '../types/territory';
import tabascoCatalog from '../data/tabascoCatalog.json';
import { fetchStateGeoJson } from '../services/geoService';
import { createGoogleTileLayer } from '../utils/mapTiles';

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

const generateSecurePassword = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let res = '';
  for (let i = 0; i < 10; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
};

const suggestZoneUsername = (fullName: string): string => {
  const clean = fullName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `zona_${parts[0]}.${parts[1]}`;
  if (parts[0]) return `zona_${parts[0]}`;
  return '';
};

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
  accounts?: UserAccount[];
  onSaveLeader?: (leader: TerritorialLeader) => void;
  onDeleteLeader?: (leaderId: string, isCitizen?: boolean) => void;
  onSaveCoordinatorAccount?: (leader: TerritorialLeader, account: UserAccount) => Promise<void> | void;
  onNavigate?: (nav: any) => void;
  onImpersonate?: (account: UserAccount) => void;
}

const CampanaZonesManagementPageInner: React.FC<CampanaZonesManagementPageProps> = ({
  currentUser,
  allLeaders,
  accounts = [],
  onSaveLeader,
  onDeleteLeader,
  onSaveCoordinatorAccount,
  onImpersonate,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
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

  // Cuenta de acceso del Coordinador de Zona
  const [coordinatorEmail, setCoordinatorEmail] = useState('');
  const [coordinatorUsername, setCoordinatorUsername] = useState('');
  const [coordinatorPassword, setCoordinatorPassword] = useState('');
  const [isSavingZone, setIsSavingZone] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ name: string; username: string; password?: string; zoneName: string } | null>(null);
  const editorPanelRef = useRef<HTMLDivElement>(null);

  const editorSelectionSet = useMemo(() => new Set(selectedSectionsInModal), [selectedSectionsInModal]);

  const existingCoordinatorAccount = useMemo(() => {
    if (!editingZoneId) return undefined;
    return (accounts || []).find(a => a.leaderId === editingZoneId);
  }, [accounts, editingZoneId]);

  const usernameError = useMemo(() => {
    const clean = coordinatorUsername.trim().toLowerCase();
    if (!clean || existingCoordinatorAccount) return null;
    const taken = (accounts || []).some(a => (a.username || '').toLowerCase() === clean);
    return taken ? `El usuario "${clean}" ya está ocupado. Elige otro.` : null;
  }, [coordinatorUsername, accounts, existingCoordinatorAccount]);

  const handleCoordinatorNameChange = (val: string) => {
    const prevSuggestion = suggestZoneUsername(coordinatorName);
    setCoordinatorName(val);
    if (!existingCoordinatorAccount && (!coordinatorUsername || coordinatorUsername === prevSuggestion)) {
      setCoordinatorUsername(suggestZoneUsername(val));
    }
  };

  // 1. Ámbito de secciones disponibles para este CPV
  const scopedSections = useMemo(() => {
    const list = Array.isArray(typedCatalog) ? typedCatalog : [];
    if (!currentUser) return list;

    // Si el usuario tiene secciones explícitas asignadas
    if (currentUser.assignedSections && currentUser.assignedSections.length > 0) {
      const set = new Set(currentUser.assignedSections.map(s => String(s).padStart(4, '0')));
      const filtered = list.filter(s => set.has(String(s.section).padStart(4, '0')));
      if (filtered.length > 0) return filtered;
    }

    // Match Distrito Federal explícito o en territoryName
    const fedNum = (currentUser as any).federalDistrict || (() => {
      const match = `${currentUser.territoryName || ''} ${currentUser.accountRoleLabel || ''}`.match(/distrito\s+federal\s*0*(\d+)/i);
      return match ? Number(match[1]) : undefined;
    })();
    if (fedNum) {
      const byFed = list.filter(s => Number(s.federalDistrict) === Number(fedNum));
      if (byFed.length > 0) return byFed;
    }

    // Match Distrito Local explícito o en territoryName
    const locNum = (currentUser as any).localDistrict || (() => {
      const match = `${currentUser.territoryName || ''} ${currentUser.accountRoleLabel || ''}`.match(/distrito\s+local\s*0*(\d+)/i);
      return match ? Number(match[1]) : undefined;
    })();
    if (locNum) {
      const byLoc = list.filter(s => Number(s.localDistrict) === Number(locNum));
      if (byLoc.length > 0) return byLoc;
    }

    // Si el CPV está asignado a un municipio por nombre
    const muniName = (currentUser as any).municipioName || currentUser.territoryName;
    if (muniName) {
      const cleanMuni = String(muniName).toUpperCase().replace(/^MUNICIPIO DE\s+/i, '').trim();
      const byMuni = list.filter(s => (s.municipalityName || '').toUpperCase().includes(cleanMuni));
      if (byMuni.length > 0) return byMuni;
    }

    // Default Tabasco completo (1,191 secciones)
    return list;
  }, [currentUser]);

  const scopedSectionNumbers = useMemo(() => {
    return new Set((scopedSections || []).map(s => String(s?.section || '').padStart(4, '0')));
  }, [scopedSections]);

  const catalogBySection = useMemo(() => {
    const map = new Map<string, CatalogSectionItem>();
    (scopedSections || []).forEach(s => {
      if (s?.section) {
        map.set(String(s.section).padStart(4, '0'), s);
      }
    });
    return map;
  }, [scopedSections]);

  // Agrupaciones disponibles en el ámbito del CPV
  const availableMunicipalities = useMemo(() => {
    const map = new Map<string, { name: string; sections: string[]; nominalTotal: number }>();
    (scopedSections || []).forEach(s => {
      if (!s) return;
      const mName = s.municipalityName || 'MUNICIPIO';
      const secStr = String(s.section || '').padStart(4, '0');
      const existing = map.get(mName) || { name: mName, sections: [], nominalTotal: 0 };
      existing.sections.push(secStr);
      existing.nominalTotal += Number(s.nominalTotal) || 0;
      map.set(mName, existing);
    });
    return Array.from(map.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [scopedSections]);

  const availableLocalDistricts = useMemo(() => {
    const map = new Map<number, { district: number; sections: string[]; nominalTotal: number }>();
    (scopedSections || []).forEach(s => {
      if (!s) return;
      const dNum = Number(s.localDistrict) || 0;
      const secStr = String(s.section || '').padStart(4, '0');
      const existing = map.get(dNum) || { district: dNum, sections: [], nominalTotal: 0 };
      existing.sections.push(secStr);
      existing.nominalTotal += Number(s.nominalTotal) || 0;
      map.set(dNum, existing);
    });
    return Array.from(map.values()).sort((a, b) => (a.district || 0) - (b.district || 0));
  }, [scopedSections]);

  const availableFederalDistricts = useMemo(() => {
    const map = new Map<number, { district: number; sections: string[]; nominalTotal: number; head: string }>();
    (scopedSections || []).forEach(s => {
      if (!s) return;
      const fNum = Number(s.federalDistrict) || 0;
      const head = s.districtHead || '';
      const secStr = String(s.section || '').padStart(4, '0');
      const existing = map.get(fNum) || { district: fNum, sections: [], nominalTotal: 0, head };
      existing.sections.push(secStr);
      existing.nominalTotal += Number(s.nominalTotal) || 0;
      map.set(fNum, existing);
    });
    return Array.from(map.values()).sort((a, b) => (a.district || 0) - (b.district || 0));
  }, [scopedSections]);

  const userZoneStorageKey = `territorial_zones_${currentUser?.id || currentUser?.leaderId || 'cpv'}`;

  // 2. Cargar Zonas registradas desde líderes con level === 'zona' o 'distrital' o storage
  const [zones, setZones] = useState<TerritorialZone[]>(() => {
    try {
      const saved = localStorage.getItem(userZoneStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    // Derivar de líderes existentes con nivel zona dependientes del CPV
    const existingZonaLeaders = (allLeaders || []).filter(
      l => (l.level === 'zona' || l.level === 'distrital' || l.level === 'responsable_zona') &&
           (l.parentId === currentUser?.leaderId || l.parentId === currentUser?.id || !l.parentId)
    );

    if (existingZonaLeaders.length > 0) {
      return existingZonaLeaders.map((l, idx) => ({
        id: l.id,
        name: l.territoryName || l.name,
        code: l.code || `ZONA-${String(idx + 1).padStart(2, '0')}`,
        color: l.avatarBg || ZONE_COLOR_PALETTE[idx % ZONE_COLOR_PALETTE.length].hex,
        sections: (l.assignedSections || []).map(s => String(s).padStart(4, '0')),
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
      localStorage.setItem(userZoneStorageKey, JSON.stringify(newZones));
    } catch {}
  }, [userZoneStorageKey]);

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

  // Abrir editor en línea para crear
  const handleOpenCreateModal = (preselectedSections?: string[]) => {
    const nextIndex = zones.length + 1;
    const defaultColor = ZONE_COLOR_PALETTE[(nextIndex - 1) % ZONE_COLOR_PALETTE.length].hex;
    setEditingZoneId(null);
    setZoneName(`Zona ${String(nextIndex).padStart(2, '0')}`);
    setZoneCode(`ZONA-${String(nextIndex).padStart(2, '0')}`);
    setZoneColor(defaultColor);
    setCreationMode(preselectedSections && preselectedSections.length > 0 ? 'manual' : 'municipios');
    setSelectedSectionsInModal((preselectedSections || []).map(s => String(s).padStart(4, '0')));
    setCoordinatorName('');
    setCoordinatorPhone('');
    setCoordinatorEmail('');
    setCoordinatorUsername('');
    setCoordinatorPassword(generateSecurePassword());
    setZoneMetaGoal((preselectedSections?.length || 10) * 50);
    setSectionSearchQuery('');
    setIsModalOpen(true);
  };

  // Abrir editor en línea para editar
  const handleOpenEditModal = (zone: TerritorialZone) => {
    const acc = (accounts || []).find(a => a.leaderId === zone.id || (zone.coordinatorAccountId && a.id === zone.coordinatorAccountId));
    setEditingZoneId(zone.id);
    setZoneName(zone.name);
    setZoneCode(zone.code);
    setZoneColor(zone.color);
    setCreationMode(zone.creationMode || 'manual');
    setSelectedSectionsInModal(zone.sections.map(s => String(s).padStart(4, '0')));
    const isPlaceholderName = (zone.coordinatorName || '').startsWith('Coordinador ');
    setCoordinatorName(acc?.name || (isPlaceholderName ? '' : zone.coordinatorName || ''));
    setCoordinatorPhone(acc?.phone || zone.coordinatorPhone || '');
    setCoordinatorEmail(acc?.email || zone.coordinatorEmail || '');
    setCoordinatorUsername(acc?.username || zone.coordinatorUsername || '');
    setCoordinatorPassword(acc ? '' : generateSecurePassword());
    setZoneMetaGoal(zone.metaGoal || zone.sections.length * 50);
    setSectionSearchQuery('');
    setIsModalOpen(true);
  };

  // Guardar Zona + Coordinador + Cuenta de acceso
  const handleSaveZone = async () => {
    if (!zoneName.trim()) {
      alert('Por favor asigna un nombre a la zona.');
      return;
    }
    if (selectedSectionsInModal.length === 0) {
      alert('Por favor selecciona al menos una sección electoral para esta zona.');
      return;
    }
    if (!coordinatorName.trim()) {
      alert('Asigna el Coordinador de Zona: ingresa su nombre completo.');
      return;
    }
    const cleanUser = (existingCoordinatorAccount?.username || coordinatorUsername).trim().toLowerCase();
    if (!cleanUser) {
      alert('Ingresa el nombre de usuario para la cuenta del Coordinador de Zona.');
      return;
    }
    if (usernameError) {
      alert(usernameError);
      return;
    }
    if (!existingCoordinatorAccount && !coordinatorPassword.trim()) {
      alert('Ingresa una contraseña para la cuenta o genera una segura.');
      return;
    }

    setIsSavingZone(true);
    try {
      const nowIso = new Date().toISOString();
      const zoneId = editingZoneId || `zona-${Date.now()}`;
      const cleanSections = Array.from(new Set(selectedSectionsInModal.map(s => String(s).padStart(4, '0'))));
      const accountId = existingCoordinatorAccount?.id || `usr-zona-${Date.now()}`;
      const parentLeaderId = currentUser.leaderId || currentUser.id;

      const updatedZone: TerritorialZone = {
        id: zoneId,
        name: zoneName.trim(),
        code: zoneCode.trim() || `ZONA-${zones.length + 1}`,
        color: zoneColor,
        sections: cleanSections,
        creationMode,
        coordinatorId: zoneId,
        coordinatorName: coordinatorName.trim(),
        coordinatorPhone: coordinatorPhone.trim() || undefined,
        coordinatorEmail: coordinatorEmail.trim() || undefined,
        coordinatorUsername: cleanUser,
        coordinatorAccountId: accountId,
        metaGoal: Number(zoneMetaGoal) || cleanSections.length * 50,
        updatedAt: nowIso,
        createdAt: editingZoneId ? (zones.find(z => z.id === editingZoneId)?.createdAt || nowIso) : nowIso,
      };

      // Remover las secciones asignadas a esta zona de cualquier otra zona previa (sin solapamientos)
      const newSectionsSet = new Set(cleanSections);
      const cleanedOtherZones = zones
        .filter(z => z.id !== zoneId)
        .map(z => ({
          ...z,
          sections: z.sections.filter(s => !newSectionsSet.has(String(s).padStart(4, '0'))),
        }))
        .filter(z => z.sections.length > 0);

      persistZones([...cleanedOtherZones, updatedZone]);

      // Líder de Nivel Zona en el árbol jerárquico
      const leaderPayload: TerritorialLeader = {
        id: zoneId,
        name: coordinatorName.trim(),
        role: 'Coordinador de Zona',
        level: 'zona',
        levelIndex: 1,
        parentId: parentLeaderId,
        territoryName: zoneName.trim(),
        code: zoneCode.trim(),
        phone: coordinatorPhone.trim() || undefined,
        email: coordinatorEmail.trim() || undefined,
        username: cleanUser,
        hasAccount: true,
        assignedSections: cleanSections,
        metaGoal: Number(zoneMetaGoal) || cleanSections.length * 50,
        currentCount: 0,
        status: 'en_progreso',
        validationStatus: 'validado',
        avatarBg: zoneColor,
        createdAt: updatedZone.createdAt,
        updatedAt: nowIso,
      };

      // Cuenta de acceso del Coordinador de Zona
      const accountPayload: UserAccount = {
        ...(existingCoordinatorAccount || {}),
        id: accountId,
        username: cleanUser,
        name: coordinatorName.trim(),
        email: coordinatorEmail.trim() || existingCoordinatorAccount?.email || `${cleanUser}@elecciones.legislab.app`,
        phone: coordinatorPhone.trim() || undefined,
        leaderId: zoneId,
        level: 'zona',
        territoryName: zoneName.trim(),
        assignedSections: cleanSections,
        avatarBg: 'bg-[#9d2449]',
        accountRoleLabel: 'Coordinador de Zona',
        assignedBy: currentUser.id,
        createdAt: existingCoordinatorAccount?.createdAt || nowIso,
        campaignName: currentUser.campaignName,
        candidateName: currentUser.candidateName,
        partyName: currentUser.partyName,
        electionType: currentUser.electionType,
        stateId: currentUser.stateId,
      };
      if (coordinatorPassword.trim()) {
        accountPayload.password = coordinatorPassword.trim();
      }

      if (onSaveCoordinatorAccount) {
        await onSaveCoordinatorAccount(leaderPayload, accountPayload);
      } else if (onSaveLeader) {
        onSaveLeader(leaderPayload);
      }

      if (!existingCoordinatorAccount || coordinatorPassword.trim()) {
        setCreatedCredentials({
          name: coordinatorName.trim(),
          username: cleanUser,
          password: coordinatorPassword.trim() || undefined,
          zoneName: zoneName.trim(),
        });
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error('Error guardando zona / cuenta de coordinador', err);
      alert('Hubo un error al guardar la zona o la cuenta del Coordinador de Zona. Intenta de nuevo.');
    } finally {
      setIsSavingZone(false);
    }
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

  // 1. Inicialización de la instancia de Leaflet Map (una sola vez al montar)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch {}
      mapInstanceRef.current = null;
    }

    if ((mapContainerRef.current as any)._leaflet_id) {
      delete (mapContainerRef.current as any)._leaflet_id;
    }

    try {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        preferCanvas: false,
      });
      map.setView([17.9892, -92.9281], 9);

      // Capa base inicial de Google Maps
      const tile = createGoogleTileLayer(mapLayer);
      tile.addTo(map);
      tile.bringToBack();

      tileLayerRef.current = tile;
      mapInstanceRef.current = map;
    } catch (e) {
      console.error('Error initializing Leaflet map in Zonas', e);
    }

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Capa base de Google Maps (Calles / Satélite Híbrido) al alternar
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      try {
        map.removeLayer(tileLayerRef.current);
      } catch {}
      tileLayerRef.current = null;
    }

    const newTile = createGoogleTileLayer(mapLayer);
    newTile.addTo(map);
    newTile.bringToBack();

    tileLayerRef.current = newTile;
  }, [mapLayer]);

  // 2b. Re-alinear el viewport de Leaflet inmediatamente al abrir o cerrar el editor
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const t1 = setTimeout(() => map.invalidateSize({ pan: false }), 50);
    const t2 = setTimeout(() => map.invalidateSize({ pan: false }), 180);
    const t3 = setTimeout(() => map.invalidateSize({ pan: false }), 360);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isModalOpen]);

  // 2c. ResizeObserver para ajustar el mapa reactivamente ante cualquier cambio de tamaño
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize({ pan: false });
      }
    });

    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // 3. Estilo dinámico de polígonos (lee siempre el estado más reciente vía refs)
  const styleStateRef = useRef({
    sectionToZoneMap,
    selectedZoneFilter,
    mapLayer,
    isEditorOpen: isModalOpen,
    editorSelection: editorSelectionSet,
    editorColor: zoneColor,
    editingZoneId,
  });
  styleStateRef.current = {
    sectionToZoneMap,
    selectedZoneFilter,
    mapLayer,
    isEditorOpen: isModalOpen,
    editorSelection: editorSelectionSet,
    editorColor: zoneColor,
    editingZoneId,
  };

  const actionsRef = useRef({ toggleSectionInModal, handleOpenCreateModal, setSelectedZoneFilter });
  actionsRef.current = { toggleSectionInModal, handleOpenCreateModal, setSelectedZoneFilter };

  const computeSectionStyle = useCallback((feature: any): L.PathOptions => {
    const st = styleStateRef.current;
    const sec = String(feature?.properties?.seccion || '').padStart(4, '0');
    const isSat = st.mapLayer === 'sat';

    // Modo edición: la selección actual se pinta con el color de la zona
    if (st.isEditorOpen) {
      if (st.editorSelection.has(sec)) {
        return {
          color: st.editorColor,
          weight: 2,
          opacity: 1,
          fillColor: st.editorColor,
          fillOpacity: isSat ? 0.45 : 0.38,
        };
      }
      const z = st.sectionToZoneMap.get(sec);
      if (z && z.id !== st.editingZoneId) {
        // Otras zonas: atenuadas para dar contexto
        return {
          color: z.color,
          weight: 0.8,
          opacity: 0.5,
          fillColor: z.color,
          fillOpacity: 0.12,
        };
      }
    } else {
      const zone = st.sectionToZoneMap.get(sec);
      if (zone) {
        const isFilterActive = st.selectedZoneFilter !== 'all';
        const matchesFilter = isFilterActive && zone.id === st.selectedZoneFilter;
        const isDimmed = isFilterActive && !matchesFilter;
        return {
          color: isDimmed ? '#94a3b8' : zone.color,
          weight: matchesFilter ? 2 : 1,
          opacity: isDimmed ? 0.3 : 0.9,
          fillColor: zone.color,
          fillOpacity: isDimmed ? 0.08 : (isSat ? 0.32 : 0.25),
        };
      }
    }

    // Sección sin zona asignada: traslúcido para ver nítidamente las calles y satélite de Google Maps debajo
    return {
      color: '#475569',
      weight: 0.75,
      opacity: 0.7,
      fillColor: '#94a3b8',
      fillOpacity: isSat ? 0.12 : 0.08,
    };
  }, []);

  // 3a. Crear la capa GeoJSON una sola vez por ámbito territorial
  const hasFittedBoundsRef = useRef(false);
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    let isCancelled = false;

    fetchStateGeoJson('tab').then(geoData => {
      if (isCancelled || !mapInstanceRef.current) return;

      if (geoLayerRef.current) {
        try {
          map.removeLayer(geoLayerRef.current);
        } catch {}
        geoLayerRef.current = null;
      }

      if (!geoData || !geoData.features) return;

      try {
        const geoLayer = L.geoJSON(geoData, {
          filter: (feature) => {
            const sec = String(feature.properties?.seccion || '').padStart(4, '0');
            return scopedSectionNumbers.has(sec);
          },
          style: computeSectionStyle as any,
          onEachFeature: (feature, layer) => {
            const p = feature.properties || {};
            const sec = String(p.seccion || '').padStart(4, '0');

            layer.bindTooltip(
              () => {
                const st = styleStateRef.current;
                const cat = catalogBySection.get(sec);
                const inEditor = st.isEditorOpen && st.editorSelection.has(sec);
                const zone = st.sectionToZoneMap.get(sec);
                const zoneLine = inEditor
                  ? `<div class="mt-1 text-[11px] font-bold" style="color:${st.editorColor}">● Zona en edición</div>`
                  : zone
                  ? `<div class="mt-1 text-[11px] font-bold" style="color:${zone.color}">● ${zone.name} (${zone.code})</div>`
                  : `<div class="mt-1 text-[10px] text-slate-500 font-semibold">Sin zona asignada</div>`;
                return `<div class="px-2 py-1 font-sans text-xs">
                  <div class="font-bold text-slate-900">Sección ${p.seccion} <span class="text-[10px] text-slate-500 font-normal">(${p.municipio || ''})</span></div>
                  ${zoneLine}
                  <div class="text-[10px] text-slate-500 mt-0.5">Padrón Nominal: <strong>${cat?.nominalTotal?.toLocaleString() || 'N/D'} electores</strong></div>
                </div>`;
              },
              { sticky: true, direction: 'top', opacity: 0.95 }
            );

            layer.on('mouseover', () => {
              setHoveredSection(sec);
              (layer as L.Path).setStyle({ weight: 2.5, color: '#0f172a' });
              (layer as any).bringToFront?.();
            });

            layer.on('mouseout', () => {
              setHoveredSection(null);
              (layer as L.Path).setStyle(computeSectionStyle(feature));
            });

            layer.on('click', () => {
              const st = styleStateRef.current;
              const actions = actionsRef.current;
              if (st.isEditorOpen) {
                actions.toggleSectionInModal(sec);
                return;
              }
              const zone = st.sectionToZoneMap.get(sec);
              if (zone) {
                actions.setSelectedZoneFilter(prev => (prev === zone.id ? 'all' : zone.id));
              } else {
                actions.handleOpenCreateModal([sec]);
              }
            });
          },
        }).addTo(map);

        geoLayerRef.current = geoLayer;

        if (!hasFittedBoundsRef.current && geoLayer.getLayers().length > 0) {
          try {
            const bounds = geoLayer.getBounds();
            if (bounds && bounds.isValid()) {
              map.fitBounds(bounds, { padding: [25, 25] });
              hasFittedBoundsRef.current = true;
            }
          } catch {}
        }
      } catch (e) {
        console.error('Error rendering GeoJSON in Zonas', e);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [scopedSectionNumbers, catalogBySection, computeSectionStyle]);

  // 3b. Re-estilizar sin recrear la capa cuando cambian zonas / selección / filtros
  useEffect(() => {
    const layer = geoLayerRef.current;
    if (!layer) return;
    layer.eachLayer((l: any) => {
      if (l.feature && l.setStyle) {
        l.setStyle(computeSectionStyle(l.feature));
      }
    });
  }, [sectionToZoneMap, selectedZoneFilter, mapLayer, isModalOpen, editorSelectionSet, zoneColor, editingZoneId, computeSectionStyle]);

  // 3c. Ajustar tamaño del mapa y re-centrar cuando se abre/cierra el editor en línea
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const runResize = () => {
      try {
        map.invalidateSize({ pan: false });
        if (tileLayerRef.current) {
          tileLayerRef.current.bringToBack();
        }
        if (geoLayerRef.current && geoLayerRef.current.getLayers().length > 0) {
          const bounds = geoLayerRef.current.getBounds();
          if (bounds && bounds.isValid()) {
            map.fitBounds(bounds, { padding: [25, 25], maxZoom: 14 });
          }
        }
      } catch {}
    };

    const timers = [
      setTimeout(runResize, 50),
      setTimeout(runResize, 150),
      setTimeout(runResize, 300),
      setTimeout(runResize, 500),
    ];

    if (isModalOpen) {
      setTimeout(() => {
        editorPanelRef.current?.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }
    return () => timers.forEach(clearTimeout);
  }, [isModalOpen]);

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


      {/* 2b. CREDENCIALES DEL COORDINADOR RECIÉN CREADO */}
      {createdCredentials && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4 shrink-0">
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-3">
              <KeyRound className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-emerald-900">
                  Cuenta de acceso creada para {createdCredentials.name} • {createdCredentials.zoneName}
                </h4>
                <p className="text-[11px] text-emerald-800 mt-1 font-mono">
                  Usuario: <strong>{createdCredentials.username}</strong>
                  {createdCredentials.password && (
                    <>
                      {' '}• Contraseña: <strong>{createdCredentials.password}</strong>
                    </>
                  )}
                </p>
                <p className="text-[10px] text-emerald-700 mt-0.5">
                  Comparte estas credenciales con el coordinador. La contraseña no se volverá a mostrar.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const txt = `Acceso Coordinador de Zona (${createdCredentials.zoneName})\nUsuario: ${createdCredentials.username}${createdCredentials.password ? `\nContraseña: ${createdCredentials.password}` : ''}\n${window.location.origin}`;
                  navigator.clipboard?.writeText(txt).catch(() => {});
                }}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-none flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                Copiar
              </button>
              <button
                type="button"
                onClick={() => setCreatedCredentials(null)}
                className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-none cursor-pointer"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. MAPA CARTOGRÁFICO INTERACTIVO DE ZONAS + EDITOR EN LÍNEA */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4 shrink-0">
        <div className={`grid gap-4 ${isModalOpen ? 'grid-cols-1 lg:grid-cols-[440px_minmax(0,1fr)]' : 'grid-cols-1'}`}>
          {isModalOpen && (
            <div
              ref={editorPanelRef}
              className="bg-white border border-slate-200 rounded-none shadow-xs flex flex-col lg:h-[720px] order-2 lg:order-1"
            >
              {/* Cabecera Editor */}
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-none shrink-0" style={{ backgroundColor: zoneColor }} />
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingZoneId ? 'Editar Zona Electoral' : 'Nueva Zona Electoral'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  title="Cerrar editor"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Cuerpo Editor */}
              <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                {/* Datos Básicos */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
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
                      Código
                    </label>
                    <input
                      type="text"
                      value={zoneCode}
                      onChange={e => setZoneCode(e.target.value)}
                      placeholder="ZONA-01"
                      className="w-full bg-white border border-slate-300 px-3 py-2 text-xs rounded-none focus:outline-none focus:ring-1 focus:ring-[#9d2449] font-mono text-slate-900"
                    />
                  </div>
                </div>

                {/* Color */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    Color en Mapa
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {ZONE_COLOR_PALETTE.map(pal => (
                      <button
                        key={pal.id}
                        type="button"
                        onClick={() => setZoneColor(pal.hex)}
                        className={`w-6 h-6 rounded-none transition-all flex items-center justify-center cursor-pointer ${
                          zoneColor === pal.hex ? 'ring-2 ring-slate-900 ring-offset-2 scale-110 shadow-sm' : 'opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: pal.hex }}
                        title={pal.name}
                      >
                        {zoneColor === pal.hex && <Check className="w-3 h-3 text-white stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Coordinador de Zona y Cuenta de Acceso (Visibles al inicio) */}
                <div className="space-y-3 pt-3 border-t border-slate-100 bg-slate-50/70 p-3 border rounded-none">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-[#9d2449]" />
                    <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                      Coordinador de Zona y Cuenta de Acceso
                    </label>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Nombre completo del Coordinador *</label>
                    <input
                      type="text"
                      value={coordinatorName}
                      onChange={e => handleCoordinatorNameChange(e.target.value)}
                      placeholder="Ej. Juan Pérez López"
                      className="w-full bg-white border border-slate-300 px-3 py-2 text-xs rounded-none focus:outline-none focus:ring-1 focus:ring-[#9d2449] text-slate-900 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Usuario de Acceso *</label>
                      <input
                        type="text"
                        value={coordinatorUsername}
                        disabled={Boolean(existingCoordinatorAccount)}
                        onChange={e => setCoordinatorUsername(e.target.value.replace(/\s+/g, '').toLowerCase())}
                        placeholder="zona_nombre.apellido"
                        className={`w-full border px-3 py-2 text-xs rounded-none focus:outline-none focus:ring-1 focus:ring-[#9d2449] font-mono text-slate-900 ${
                          usernameError ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300 bg-white'
                        } disabled:bg-slate-100 disabled:text-slate-500`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        {existingCoordinatorAccount ? 'Nueva contraseña' : 'Contraseña *'}
                      </label>
                      <div className="flex">
                        <input
                          type="text"
                          value={coordinatorPassword}
                          onChange={e => setCoordinatorPassword(e.target.value)}
                          placeholder={existingCoordinatorAccount ? 'Sin cambios' : 'Contraseña'}
                          className="w-full min-w-0 bg-white border border-slate-300 px-2 py-2 text-xs rounded-none focus:outline-none focus:ring-1 focus:ring-[#9d2449] font-mono text-slate-900 font-bold"
                        />
                        <button
                          type="button"
                          onClick={() => setCoordinatorPassword(generateSecurePassword())}
                          className="px-2.5 bg-slate-100 hover:bg-slate-200 border border-l-0 border-slate-300 text-slate-700 rounded-none cursor-pointer"
                          title="Generar nueva contraseña segura"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  {usernameError && <p className="text-[10px] text-rose-600 font-semibold">{usernameError}</p>}
                  {existingCoordinatorAccount && (
                    <p className="text-[10px] text-slate-500">
                      Esta zona ya tiene la cuenta <strong className="font-mono">@{existingCoordinatorAccount.username}</strong>. Deja la contraseña vacía para conservarla.
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Teléfono / WhatsApp</label>
                      <input
                        type="text"
                        value={coordinatorPhone}
                        onChange={e => setCoordinatorPhone(e.target.value)}
                        placeholder="9931234567"
                        className="w-full bg-white border border-slate-300 px-3 py-2 text-xs rounded-none focus:outline-none focus:ring-1 focus:ring-[#9d2449] font-mono text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Correo Electrónico</label>
                      <input
                        type="email"
                        value={coordinatorEmail}
                        onChange={e => setCoordinatorEmail(e.target.value)}
                        placeholder="opcional"
                        className="w-full bg-white border border-slate-300 px-3 py-2 text-xs rounded-none focus:outline-none focus:ring-1 focus:ring-[#9d2449] text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Método */}
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                    Método de Asignación de Secciones
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {([
                      ['municipios', '🏢 Por Municipios'],
                      ['distritos_locales', '🏛️ Por Dto. Local'],
                      ['distritos_federales', '🇲🇽 Por Dto. Federal'],
                      ['manual', '🗺️ Manual en Mapa'],
                    ] as const).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setCreationMode(mode)}
                        className={`p-2 text-[11px] font-bold rounded-none border transition-all text-center cursor-pointer ${
                          creationMode === mode
                            ? 'bg-[#9d2449] text-white border-[#9d2449] shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 border border-slate-200 rounded-none space-y-3">
                  {(creationMode === 'municipios' || creationMode === 'distritos_locales' || creationMode === 'distritos_federales') && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-600">
                        {creationMode === 'municipios' && 'Selecciona los municipios completos que conformarán esta zona:'}
                        {creationMode === 'distritos_locales' && 'Selecciona los distritos locales para incluir todas sus secciones:'}
                        {creationMode === 'distritos_federales' && 'Selecciona los distritos federales completos:'}
                      </p>
                      <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto">
                        {(creationMode === 'municipios'
                          ? availableMunicipalities.map(m => ({ key: m.name, label: m.name, sections: m.sections, nominal: m.nominalTotal }))
                          : creationMode === 'distritos_locales'
                          ? availableLocalDistricts.map(d => ({ key: String(d.district), label: `Distrito Local ${d.district}`, sections: d.sections, nominal: d.nominalTotal }))
                          : availableFederalDistricts.map(d => ({ key: String(d.district), label: `Distrito Federal ${d.district}${d.head ? ` (${d.head})` : ''}`, sections: d.sections, nominal: d.nominalTotal }))
                        ).map(g => {
                          const isAllSelected = g.sections.length > 0 && g.sections.every(s => selectedSectionsInModal.includes(s));
                          const isPartial = !isAllSelected && g.sections.some(s => selectedSectionsInModal.includes(s));
                          return (
                            <div
                              key={g.key}
                              onClick={() => toggleMunicipalityInModal(g.sections)}
                              className={`p-2 border rounded-none flex items-center justify-between cursor-pointer transition-colors ${
                                isAllSelected ? 'bg-white border-[#9d2449] shadow-2xs' : isPartial ? 'bg-white border-amber-300' : 'bg-white/60 border-slate-200 hover:bg-white'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isAllSelected}
                                  onChange={() => {}}
                                  className="accent-[#9d2449] rounded-none"
                                />
                                <span className="font-bold text-xs text-slate-900 truncate">{g.label}</span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-500 shrink-0">
                                {g.sections.length} secc • {g.nominal.toLocaleString()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-slate-500">
                        También puedes ajustar haciendo clic sobre las secciones del mapa.
                      </p>
                    </div>
                  )}

                  {creationMode === 'manual' && (
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 bg-white border border-[#9d2449]/30 p-2 rounded-none">
                        <MousePointerClick className="w-4 h-4 text-[#9d2449] shrink-0 mt-0.5" />
                        <p className="text-[11px] text-slate-700">
                          Haz clic sobre las secciones en el mapa para <strong>agregarlas o quitarlas</strong> de esta zona. También puedes buscarlas aquí.
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-1">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                          <input
                            type="text"
                            value={sectionSearchQuery}
                            onChange={e => setSectionSearchQuery(e.target.value)}
                            placeholder="Buscar sección o municipio..."
                            className="w-full bg-white border border-slate-300 pl-8 pr-3 py-1.5 text-xs rounded-none focus:outline-none focus:ring-1 focus:ring-[#9d2449]"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedSectionsInModal(unassignedSections.map(s => String(s.section).padStart(4, '0')))}
                          className="px-2 py-1.5 text-[10px] bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-none font-semibold cursor-pointer whitespace-nowrap"
                          title="Seleccionar todas las secciones sin zona"
                        >
                          Vacantes
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedSectionsInModal([])}
                          className="px-2 py-1.5 text-[10px] bg-white border border-slate-300 text-rose-600 hover:bg-rose-50 rounded-none font-semibold cursor-pointer"
                        >
                          Limpiar
                        </button>
                      </div>
                      <div className="max-h-44 overflow-y-auto p-2 bg-white border border-slate-200 rounded-none flex flex-wrap gap-1">
                        {scopedSections
                          .filter(s => {
                            if (!sectionSearchQuery.trim()) return true;
                            const q = sectionSearchQuery.trim().toLowerCase();
                            return String(s.section).includes(q) || (s.municipalityName || '').toLowerCase().includes(q);
                          })
                          .map(sec => {
                            const secNorm = String(sec.section).padStart(4, '0');
                            const isSelected = selectedSectionsInModal.includes(secNorm);
                            const assignedToOther = sectionToZoneMap.get(secNorm);
                            const isOtherZone = assignedToOther && assignedToOther.id !== editingZoneId;
                            return (
                              <button
                                key={secNorm}
                                type="button"
                                onClick={() => toggleSectionInModal(secNorm)}
                                className={`px-1.5 py-0.5 text-[11px] font-mono rounded-none border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'text-white font-bold shadow-2xs'
                                    : isOtherZone
                                    ? 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                                }`}
                                style={isSelected ? { backgroundColor: zoneColor, borderColor: zoneColor } : undefined}
                                title={`${sec.municipalityName} (Padrón: ${sec.nominalTotal})${isOtherZone ? ` • Actualmente en ${assignedToOther.name}` : ''}`}
                              >
                                {secNorm}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-800">
                      {selectedSectionsInModal.length} secciones
                    </span>
                    <span className="font-mono text-slate-600">
                      <strong>
                        {selectedSectionsInModal
                          .reduce((acc, s) => acc + (catalogBySection.get(s)?.nominalTotal || 0), 0)
                          .toLocaleString()}
                      </strong>{' '}
                      electores
                    </span>
                  </div>
                </div>
              </div>

              {/* Pie Editor */}
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
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
                  disabled={isSavingZone}
                  className="px-5 py-2 bg-[#9d2449] hover:bg-[#801d3b] disabled:opacity-60 text-white text-xs font-bold rounded-none transition-all shadow-xs cursor-pointer active:scale-98"
                >
                  {isSavingZone ? 'Guardando...' : editingZoneId ? 'Actualizar Zona' : 'Guardar Zona y Crear Cuenta'}
                </button>
              </div>
            </div>
          )}

          <div className="relative bg-white rounded-none border border-slate-200 overflow-hidden shadow-xs order-1 lg:order-2">
            {/* Controles Flotantes Discretos de Capa */}
            <div className="absolute top-3 right-3 z-[500] flex items-center gap-2">
              {selectedZoneFilter !== 'all' && !isModalOpen && (
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
                  Google Calles
                </button>
                <button
                  type="button"
                  onClick={() => setMapLayer('sat')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-none cursor-pointer transition-colors ${
                    mapLayer === 'sat' ? 'bg-[#9d2449] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Google Satélite
                </button>
              </div>
            </div>

            {/* Indicaciones de edición sobre el mapa */}
            {isModalOpen && (
              <div className="absolute top-3 left-3 z-[500] bg-white/95 border border-slate-200 shadow-xs px-3 py-1.5 text-[11px] text-slate-700 rounded-none flex items-center gap-2 pointer-events-none">
                <MousePointerClick className="w-3.5 h-3.5 text-[#9d2449]" />
                <span>Clic en una sección para agregarla o quitarla</span>
              </div>
            )}

            {/* Leyenda */}
            <div className="absolute bottom-3 right-3 z-[500] bg-white/95 border border-slate-200 shadow-xs px-2.5 py-1.5 text-[10px] text-slate-600 rounded-none flex items-center gap-3 pointer-events-none">
              {isModalOpen && (
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 inline-block border" style={{ backgroundColor: zoneColor, borderColor: zoneColor }} />
                  Zona en edición
                </span>
              )}
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 inline-block bg-slate-300 border border-slate-400" />
                Sin zona asignada
              </span>
              <span className="text-[9px] text-slate-400 font-semibold tracking-wide uppercase">Google Maps</span>
            </div>

            {/* Badge informativo de sección en hover */}
            {hoveredSection && (
              <div className="absolute bottom-3 left-3 z-[500] bg-slate-900/90 backdrop-blur-xs text-white px-3 py-1.5 text-xs font-mono rounded-none shadow-lg border border-white/10 pointer-events-none">
                Sección: <strong>{hoveredSection}</strong> • {
                  isModalOpen && editorSelectionSet.has(hoveredSection)
                    ? (zoneName || 'Zona en edición')
                    : sectionToZoneMap.get(hoveredSection)?.name || 'Sin zona'
                }
              </div>
            )}

            <div
              ref={mapContainerRef}
              className={`w-full z-0 ${isModalOpen ? 'h-[50vh] lg:h-[720px]' : 'h-[50vh]'}`}
            />
          </div>
        </div>
      </div>

      {/* 5. LISTADO DE ZONAS DEFINIDAS */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4 space-y-4">
        {/* Barra compacta de Métricas y Acciones */}
        <div className="bg-white border border-slate-200 p-2.5 rounded-none shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs flex-wrap">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <span className="text-slate-400 uppercase text-[10px] tracking-wide">Zonas:</span>
              <span className="font-mono font-bold text-slate-900">{zones.length}</span>
            </div>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <span className="text-slate-400 uppercase text-[10px] tracking-wide">Asignadas:</span>
              <span className="font-mono font-bold text-emerald-700">{assignedSectionsCount}</span>
              <span className="text-[11px] text-slate-500 font-normal">de {scopedSections.length} ({Math.round((assignedSectionsCount / (scopedSections.length || 1)) * 100)}%)</span>
            </div>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <span className="text-slate-400 uppercase text-[10px] tracking-wide">Vacantes:</span>
              <span className={`font-mono font-bold ${unassignedSections.length > 0 ? 'text-amber-600' : 'text-slate-500'}`}>{unassignedSections.length}</span>
            </div>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <span className="text-slate-400 uppercase text-[10px] tracking-wide">Electores:</span>
              <span className="font-mono font-bold text-slate-900">{totalNominalCovered.toLocaleString()}</span>
              <span className="text-[11px] text-slate-500 font-normal">de {totalScopeNominal.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {zones.length === 0 && availableMunicipalities.length > 1 && (
              <button
                type="button"
                onClick={handleAutoPartitionByMunicipalities}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-none text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                title="Crear automáticamente una zona por cada municipio"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Auto-Municipios</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleOpenCreateModal()}
              className="px-3.5 py-1.5 bg-[#9d2449] hover:bg-[#801d3b] text-white rounded-none text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-98"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Zona</span>
            </button>
          </div>
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
                              <span className="text-[11px] text-slate-400 font-mono">
                                {zone.coordinatorUsername ? `@${zone.coordinatorUsername}` : ''}
                                {zone.coordinatorUsername && zone.coordinatorPhone ? ' • ' : ''}
                                {zone.coordinatorPhone || ''}
                              </span>
                              {!zone.coordinatorUsername && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(zone)}
                                  className="block mt-0.5 text-[11px] font-bold text-amber-700 hover:underline cursor-pointer"
                                >
                                  Crear cuenta de acceso
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(zone)}
                              className="px-2 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-none cursor-pointer"
                            >
                              + Asignar coordinador
                            </button>
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

                            {zone.coordinatorUsername && onImpersonate && (currentUser.level === 'admin' || currentUser.isSuperAdmin) && (
                              <button
                                type="button"
                                onClick={() => {
                                  const acc = accounts.find(a => a.username?.toLowerCase() === zone.coordinatorUsername?.toLowerCase() || a.id === zone.id || a.leaderId === zone.id) || {
                                    id: `usr-${zone.id}`,
                                    username: zone.coordinatorUsername || 'coordinador_zona',
                                    name: zone.coordinatorName || zone.name,
                                    email: zone.coordinatorEmail || `${zone.coordinatorUsername || 'coordinador'}@elecciones.legislab.app`,
                                    phone: zone.coordinatorPhone,
                                    leaderId: zone.id,
                                    level: 'zona' as const,
                                    territoryName: zone.name,
                                    accountRoleLabel: 'Coordinador de Zona',
                                    avatarBg: zone.color,
                                    assignedSections: zone.sections,
                                    assignedBy: currentUser.name,
                                  };
                                  onImpersonate(acc);
                                }}
                                className="px-2.5 py-1.5 bg-[#9d2449] hover:bg-[#801d3b] text-white rounded-none text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs active:scale-98"
                                title={`Entrar a la cuenta de ${zone.coordinatorName} (Coordinador de Zona)`}
                              >
                                <LogIn className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Entrar</span>
                              </button>
                            )}

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

    </div>
  );
};

class CampanaZonesErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('CampanaZonesErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-2xl mx-auto my-12 bg-white border border-rose-200 rounded-none shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-rose-700">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <h2 className="text-base font-bold">Ocurrió un detalle al cargar el módulo de Zonas</h2>
          </div>
          <p className="text-xs text-slate-600">
            {this.state.error?.message || 'Error inesperado al inicializar la cartografía o datos de zonas.'}
          </p>
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2 bg-[#9d2449] hover:bg-[#801d3b] text-white text-xs font-bold rounded-none cursor-pointer"
            >
              Recargar Módulo
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const CampanaZonesManagementPage: React.FC<CampanaZonesManagementPageProps> = (props) => (
  <CampanaZonesErrorBoundary>
    <CampanaZonesManagementPageInner {...props} />
  </CampanaZonesErrorBoundary>
);

