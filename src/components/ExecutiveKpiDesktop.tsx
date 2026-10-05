import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { TerritorialLeader, HierarchyStats } from '../types/territory';
import type { UserAccount } from '../types/auth';
import type { ElectoralSection } from '../types/sections';
import { SectionMapModal } from './SectionMapModal';
import { StateVectorMap } from './StateVectorMap';
import { SectionCard } from './SectionCard';
import { CARTOGRAPHY_BY_SECTION } from '../data/mockSectionsData';
import { getStateById, DEFAULT_STATE } from '../data/statesData';
import { INITIAL_TERRITORY_DATA } from '../data/mockTerritoryData';
import tabascoCatalog from '../data/tabascoCatalog.json';
import {
  Users,
  Target,
  AlertTriangle,
  Layers,
  MapPin,
  Award,
  Search,
  Vote,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Smartphone,
  Flame,
  ArrowRight,
  UserPlus,
  Plus,
  Phone,
  Clock,
  Trash2,
} from 'lucide-react';
import { INECameraScannerModal } from './INECameraScannerModal';
import type { ExtractedINEData } from '../utils/ineScanner';

interface ExecutiveKpiDesktopProps {
  currentUser: UserAccount;
  stats: HierarchyStats;
  visibleLeaders: TerritorialLeader[];
  sections?: ElectoralSection[];
  onSelectLeader: (leader: TerritorialLeader) => void;
  onNavigateView: (view: 'flow' | 'table' | 'stats' | 'sections' | 'capturar-promovido') => void;
  onOpenAddModal: () => void;
  onOpenQuickCapture?: (initialData?: ExtractedINEData) => void;
  onOpenCreateUser?: () => void;
  onViewSectionDetail?: (sectionNumber: string) => void;
  onViewCitizen?: (citizenId: string) => void;
  onEditCitizen?: (citizenId: string) => void;
  onDeleteCitizen?: (citizenId: string) => void;
  activeStateId?: number;
  onStateChange?: (stateId: number) => void;
}

export const ExecutiveKpiDesktop: React.FC<ExecutiveKpiDesktopProps> = ({
  currentUser,
  stats,
  visibleLeaders,
  sections = [],
  onSelectLeader,
  onNavigateView,
  onOpenAddModal,
  onOpenQuickCapture,
  onOpenCreateUser,
  onViewSectionDetail,
  onViewCitizen,
  onEditCitizen: _onEditCitizen,
  onDeleteCitizen,
  activeStateId,
}) => {
  // Filtros de navegación geográfica y estado activo
  const selectedStateId = activeStateId ?? 27;
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [sectionSearch, setSectionSearch] = useState<string>('');
  const [structureFilter, setStructureFilter] = useState<'all' | 'with_structure' | 'without_structure'>('all');
  const [sortBy, setSortBy] = useState<
    | 'section_asc'
    | 'section_desc'
    | 'nominal_desc'
    | 'nominal_asc'
    | 'progress_desc'
    | 'progress_asc'
    | 'structures_first'
    | 'no_structures_first'
  >('section_asc');
  const [inspectMapSection, setInspectMapSection] = useState<any | null>(null);
  const [cardsPage, setCardsPage] = useState<number>(1);
  const cardsPageSize = 30;

  // Información del estado seleccionado del catálogo oficial INE
  const currentStateInfo = useMemo(() => {
    return getStateById(selectedStateId) || DEFAULT_STATE;
  }, [selectedStateId]);

  // Secciones prioritarias vacantes (con mayor lista nominal sin estructura asignada)
  const topPriorityVacantSections = useMemo(() => {
    return sections
      .filter(s => !s.structures || s.structures.length === 0)
      .sort((a, b) => (b.nominalList || 0) - (a.nominalList || 0))
      .slice(0, 4);
  }, [sections]);


  // Secciones oficiales del catálogo para el estado seleccionado
  const stateCatalogSections = useMemo(() => {
    if (selectedStateId === 27) {
      return tabascoCatalog;
    }
    return [];
  }, [selectedStateId]);

  // Flags por nivel del sistema en 4 niveles
  const isSuperAdmin = currentUser.level === 'admin' || currentUser.isSuperAdmin;
  const isCampana = currentUser.level === 'campana' || currentUser.level === 'estatal' || currentUser.level === 'distrital';
  const isTerritorial = currentUser.level === 'territorial' || currentUser.level === 'seccional';
  const isPromotor = currentUser.level === 'promotor';

  const [promotorSearch, setPromotorSearch] = useState<string>('');
  const [isIneScannerOpen, setIsIneScannerOpen] = useState(false);

  const promovidosList = useMemo(() => {
    return visibleLeaders.filter(l => l.level === 'promovido');
  }, [visibleLeaders]);

  const filteredPromovidos = useMemo(() => {
    const q = promotorSearch.trim().toLowerCase();
    if (!q) return promovidosList;
    return promovidosList.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.electorKey && p.electorKey.toLowerCase().includes(q)) ||
      (p.curp && p.curp.toLowerCase().includes(q)) ||
      (p.phone && p.phone.includes(q)) ||
      (p.colonia && p.colonia.toLowerCase().includes(q))
    );
  }, [promovidosList, promotorSearch]);

  const assignedPromotores = useMemo(() => {
    return visibleLeaders.filter(l => l.level === 'promotor');
  }, [visibleLeaders]);

  // Detect district if currentUser is distrital / campana
  const isFederal = currentUser.accountRoleLabel?.toLowerCase().includes('federal') ||
                    currentUser.territoryName?.toLowerCase().includes('federal');

  const userDistrictNumber = useMemo(() => {
    if (isSuperAdmin || isTerritorial || isPromotor) return undefined;
    const text = `${currentUser.territoryName} ${currentUser.accountRoleLabel}`;
    const match = text.match(/\b(?:distrito|dto)?\s*(?:local|federal)?\s*0*(\d+)\b/i);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (parsed > 0) return parsed;
    }
    return 6;
  }, [currentUser, isSuperAdmin, isTerritorial, isPromotor]);

  const userDistrictLabel = useMemo(() => {
    if (isTerritorial) {
      return `Zona Territorial Tamulté (Secciones 0416 y 0417)`;
    }
    if (userDistrictNumber) {
      return isFederal ? `Distrito Federal 0${userDistrictNumber}` : `Distrito Local 0${userDistrictNumber}`;
    }
    return undefined;
  }, [isTerritorial, userDistrictNumber, isFederal]);

  const userDistrictSections = useMemo(() => {
    if (isTerritorial) {
      return stateCatalogSections.filter((s) => ['0416', '0417'].includes(s.section));
    }
    if (!userDistrictNumber) return [];
    return stateCatalogSections.filter((s) => {
      if (isFederal) return s.federalDistrict === userDistrictNumber;
      return s.localDistrict === userDistrictNumber;
    });
  }, [stateCatalogSections, userDistrictNumber, isFederal, isTerritorial]);

  const userDistrictSectionNumbers = useMemo(() => {
    if (isTerritorial) {
      return ['0416', '0417'];
    }
    return userDistrictSections.map((s) => s.section);
  }, [isTerritorial, userDistrictSections]);

  // Base list of sections scoped to district, assigned sections, or state
  const baseCatalogSections = useMemo(() => {
    if (isPromotor) {
      return [];
    }
    if (isTerritorial) {
      return stateCatalogSections.filter((s) => ['0416', '0417'].includes(s.section));
    }
    if (userDistrictNumber && userDistrictSections.length > 0) {
      return userDistrictSections;
    }
    return stateCatalogSections;
  }, [isPromotor, isTerritorial, userDistrictNumber, userDistrictSections, stateCatalogSections]);

  // Lista de municipios únicos del catálogo scoped
  const municipalitiesList = useMemo(() => {
    if (baseCatalogSections.length > 0) {
      const set = new Set<string>();
      baseCatalogSections.forEach(s => set.add(s.municipalityName));
      return Array.from(set).sort();
    }
    return [];
  }, [baseCatalogSections]);

  // Distritos locales únicos del catálogo scoped
  const localDistrictsList = useMemo(() => {
    if (baseCatalogSections.length > 0) {
      const set = new Set<number>();
      baseCatalogSections.forEach(s => {
        if (s.localDistrict > 0) set.add(s.localDistrict);
      });
      return Array.from(set).sort((a, b) => a - b);
    }
    return [];
  }, [baseCatalogSections]);

  // Secciones filtradas del catálogo
  const filteredCatalogSections = useMemo(() => {
    return baseCatalogSections.filter(sec => {
      if (selectedMunicipality !== 'all' && sec.municipalityName !== selectedMunicipality) return false;
      if (selectedDistrict !== 'all' && String(sec.localDistrict) !== selectedDistrict) return false;
      if (sectionSearch.trim()) {
        const query = sectionSearch.trim();
        return sec.section.includes(query) || sec.municipalityName.toLowerCase().includes(query.toLowerCase());
      }
      return true;
    });
  }, [baseCatalogSections, selectedMunicipality, selectedDistrict, sectionSearch]);

  // Mapa de ElectoralSections provistas por props
  const electoralSectionsMap = useMemo(() => {
    const map = new Map<string, ElectoralSection>();
    (sections || []).forEach(sec => {
      map.set(sec.sectionNumber, sec);
      map.set(sec.sectionNumber.padStart(4, '0'), sec);
      map.set(sec.sectionNumber.replace(/^0+/, ''), sec);
    });
    return map;
  }, [sections]);

  // Lista unificada de ElectoralSections para la vista de tarjetas
  const displaySections = useMemo((): ElectoralSection[] => {
    return filteredCatalogSections.map(sec => {
      const paddedSec = sec.section.padStart(4, '0');
      const existing = electoralSectionsMap.get(paddedSec) || electoralSectionsMap.get(sec.section);
      if (existing) return existing;

      const carto = CARTOGRAPHY_BY_SECTION.get(paddedSec) || CARTOGRAPHY_BY_SECTION.get(sec.section);
      return {
        id: `sec-${paddedSec}`,
        sectionNumber: paddedSec,
        municipio: sec.municipalityName,
        municipioId: String(sec.municipalityId),
        distritoLocal: `Distrito ${sec.localDistrict}`,
        tipo: sec.sectionType.includes('RURAL')
          ? 'Rural'
          : sec.sectionType.includes('MIXTO')
          ? 'Mixta'
          : 'Urbana',
        nominalList: sec.nominalTotal && sec.nominalTotal > 0 ? sec.nominalTotal : 1400,
        nominalMen: sec.nominalMen,
        nominalWomen: sec.nominalWomen,
        nominalNonBinary: sec.nominalNonBinary,
        targetGoal: Math.round((sec.nominalTotal && sec.nominalTotal > 0 ? sec.nominalTotal : 1400) * 0.45),
        center: carto?.center || [-92.93, 17.98],
        bbox: carto?.bbox || [-92.96, 17.96, -92.90, 18.00],
        polygon: carto?.polygon || [],
        structures: [],
      };
    });
  }, [filteredCatalogSections, electoralSectionsMap]);

  // Cálculo rápido de avance para ordenamiento
  const getSectionProgress = useCallback((sec: ElectoralSection): number => {
    if (sec.structures && sec.structures.length > 0) {
      const main = sec.structures[0];
      if (main.metaGoal > 0) {
        return Math.min(100, Math.round((main.currentCount / main.metaGoal) * 100));
      }
    } else if (sec.targetGoal > 0) {
      const totalProm = (sec.structures || [])
        .filter(s => s.type === 'promocion' || s.type === 'general')
        .reduce((sum, s) => sum + s.currentCount, 0);
      return Math.min(100, Math.round((totalProm / sec.targetGoal) * 100));
    }
    return 0;
  }, []);

  // Lista unificada procesada según filtros operativos y ordenamiento solicitado
  const processedDisplaySections = useMemo((): ElectoralSection[] => {
    let result = [...displaySections];

    // 1. Filtrado por presencia de estructuras operativas
    if (structureFilter === 'with_structure') {
      result = result.filter(sec => sec.structures && sec.structures.length > 0);
    } else if (structureFilter === 'without_structure') {
      result = result.filter(sec => !sec.structures || sec.structures.length === 0);
    }

    // 2. Ordenamiento solicitado
    result.sort((a, b) => {
      const progA = getSectionProgress(a);
      const progB = getSectionProgress(b);
      const structCountA = a.structures?.length || 0;
      const structCountB = b.structures?.length || 0;

      switch (sortBy) {
        case 'nominal_desc':
          return (b.nominalList || 0) - (a.nominalList || 0);
        case 'nominal_asc':
          return (a.nominalList || 0) - (b.nominalList || 0);
        case 'progress_desc':
          return progB - progA || (b.nominalList || 0) - (a.nominalList || 0);
        case 'progress_asc':
          return progA - progB || (a.nominalList || 0) - (b.nominalList || 0);
        case 'structures_first':
          return structCountB - structCountA || progB - progA;
        case 'no_structures_first':
          return structCountA - structCountB || progA - progB;
        case 'section_desc':
          return b.sectionNumber.localeCompare(a.sectionNumber, undefined, { numeric: true });
        case 'section_asc':
        default:
          return a.sectionNumber.localeCompare(b.sectionNumber, undefined, { numeric: true });
      }
    });

    return result;
  }, [displaySections, structureFilter, sortBy, getSectionProgress]);

  const totalCardsPages = Math.ceil(processedDisplaySections.length / cardsPageSize) || 1;
  const safeCardsPage = Math.min(cardsPage, totalCardsPages);
  const paginatedDisplaySections = useMemo(() => {
    const start = (safeCardsPage - 1) * cardsPageSize;
    return processedDisplaySections.slice(start, start + cardsPageSize);
  }, [processedDisplaySections, safeCardsPage, cardsPageSize]);

  // Mapa de porcentaje de avance por sección electoral para el semáforo del mapa vectorial
  const sectionProgressMap = useMemo(() => {
    const map: Record<string, number> = {};

    const allSecs = [...displaySections, ...(sections || [])];
    allSecs.forEach(sec => {
      const cleanSec = sec.sectionNumber.replace(/^0+/, '');
      const paddedSec = sec.sectionNumber.padStart(4, '0');
      if (map[cleanSec] !== undefined) return;

      let pct = 0;
      if (sec.structures && sec.structures.length > 0) {
        const main = sec.structures[0];
        if (main.metaGoal > 0) {
          pct = Math.min(100, Math.round((main.currentCount / main.metaGoal) * 100));
        }
      } else if (sec.targetGoal > 0) {
        const totalProm = (sec.structures || [])
          .filter(s => s.type === 'promocion' || s.type === 'general')
          .reduce((sum, s) => sum + s.currentCount, 0);
        pct = Math.min(100, Math.round((totalProm / sec.targetGoal) * 100));
      }
      map[cleanSec] = pct;
      map[paddedSec] = pct;
    });

    return map;
  }, [displaySections, sections]);

  useEffect(() => {
    setCardsPage(1);
  }, [sectionSearch, selectedMunicipality, selectedDistrict, structureFilter, sortBy]);

  // Totales de Lista Nominal filtrada según selección
  const activeNominalMetrics = useMemo(() => {
    if (isPromotor) {
      const secMatch = stateCatalogSections.find(s => s.section === '0416');
      if (secMatch) {
        return {
          total: secMatch.nominalTotal,
          men: secMatch.nominalMen,
          women: secMatch.nominalWomen,
          nonBinary: secMatch.nominalNonBinary,
          sectionCount: 1,
        };
      }
      return { total: 2450, men: 1180, women: 1270, nonBinary: 0, sectionCount: 1 };
    }

    if (isTerritorial) {
      const assigned = ['0416', '0417'];
      const matches = stateCatalogSections.filter(s => assigned.includes(s.section));
      if (matches.length > 0) {
        return {
          total: matches.reduce((acc, s) => acc + s.nominalTotal, 0),
          men: matches.reduce((acc, s) => acc + s.nominalMen, 0),
          women: matches.reduce((acc, s) => acc + s.nominalWomen, 0),
          nonBinary: matches.reduce((acc, s) => acc + s.nominalNonBinary, 0),
          sectionCount: matches.length,
        };
      }
    }

    if (filteredCatalogSections.length > 0) {
      const total = filteredCatalogSections.reduce((acc, s) => acc + s.nominalTotal, 0);
      const men = filteredCatalogSections.reduce((acc, s) => acc + s.nominalMen, 0);
      const women = filteredCatalogSections.reduce((acc, s) => acc + s.nominalWomen, 0);
      const nonBinary = filteredCatalogSections.reduce((acc, s) => acc + s.nominalNonBinary, 0);
      return {
        total,
        men,
        women,
        nonBinary,
        sectionCount: filteredCatalogSections.length,
      };
    }

    return {
      total: currentStateInfo?.nominalTotal || 0,
      men: currentStateInfo?.nominalMen || 0,
      women: currentStateInfo?.nominalWomen || 0,
      nonBinary: currentStateInfo?.nominalNonBinary || 0,
      sectionCount: currentStateInfo?.totalSections || 0,
    };
  }, [isPromotor, isTerritorial, stateCatalogSections, filteredCatalogSections, currentStateInfo]);

  // Cálculos de avance sobre Lista Nominal
  const nominalCoveragePct = activeNominalMetrics.total > 0
    ? ((stats.totalAchieved / activeNominalMetrics.total) * 100).toFixed(2)
    : '0.00';

  const womenPct = activeNominalMetrics.total > 0
    ? Math.round((activeNominalMetrics.women / activeNominalMetrics.total) * 100)
    : 52;
  const menPct = activeNominalMetrics.total > 0
    ? Math.round((activeNominalMetrics.men / activeNominalMetrics.total) * 100)
    : 48;

  // Meta electoral scoped a la demarcación del usuario
  const victoryNominalTotal = isPromotor
    ? 150
    : isTerritorial
    ? (activeNominalMetrics.total > 0 ? activeNominalMetrics.total : 4500)
    : (userDistrictNumber && activeNominalMetrics.total > 0)
    ? activeNominalMetrics.total
    : currentStateInfo.nominalTotal;

  const victoryExpectedTurnout = isPromotor
    ? 150
    : Math.round(victoryNominalTotal * 0.50);

  const victoryGoalVotes = isPromotor
    ? 150
    : Math.round(victoryExpectedTurnout * 0.51);

  // Porcentaje y color dinámico de la meta de victoria (de rojo a verde según avance)
  const victoryProgressPct = victoryGoalVotes > 0
    ? Math.min(100, Math.round((stats.totalAchieved / victoryGoalVotes) * 100))
    : 0;

  const victoryProgressColor = useMemo(() => {
    if (victoryProgressPct < 25) {
      return {
        bar: 'from-red-600 via-rose-500 to-red-500',
        text: 'text-rose-400',
        glow: 'bg-rose-500/20 text-rose-300 border-rose-500/30 group-hover:bg-rose-500/30 group-hover:border-rose-400/60',
      };
    }
    if (victoryProgressPct < 50) {
      return {
        bar: 'from-rose-500 via-amber-500 to-amber-400',
        text: 'text-amber-400',
        glow: 'bg-amber-500/20 text-amber-300 border-amber-500/30 group-hover:bg-amber-500/30 group-hover:border-amber-400/60',
      };
    }
    if (victoryProgressPct < 75) {
      return {
        bar: 'from-amber-400 via-lime-400 to-emerald-400',
        text: 'text-lime-400',
        glow: 'bg-lime-500/20 text-lime-300 border-lime-500/30 group-hover:bg-lime-500/30 group-hover:border-lime-400/60',
      };
    }
    return {
      bar: 'from-emerald-400 to-green-400',
      text: 'text-emerald-400',
      glow: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 group-hover:bg-emerald-500/30 group-hover:border-emerald-400/60',
    };
  }, [victoryProgressPct]);

  // Secciones con líder asignado dentro del árbol visible
  const coveredSectionsCount = useMemo(() => {
    const sectionCodes = new Set<string>();
    visibleLeaders.forEach(l => {
      if (l.level === 'seccional') {
        const match = l.territoryName.match(/\d{3,4}/);
        if (match) sectionCodes.add(match[0].padStart(4, '0'));
      }
    });
    return sectionCodes.size;
  }, [visibleLeaders]);

  const targetSectionsUniverse = activeNominalMetrics.sectionCount || 1191;
  const sectionCoveragePct = Math.min(100, Math.round((coveredSectionsCount / Math.max(1, targetSectionsUniverse)) * 100));

  const userLevelLabel = currentUser.level === 'admin'
    ? 'Super Administrador (Acceso Total)'
    : currentUser.level === 'campana' || currentUser.level === 'estatal' || currentUser.level === 'distrital'
    ? 'Coordinador de Campaña'
    : currentUser.level === 'territorial' || currentUser.level === 'seccional'
    ? 'Coordinador Territorial'
    : 'Promotor Territorial';

  // Instancia o superior que asignó al usuario actual
  const assignedByLabel = useMemo(() => {
    if (currentUser.assignedBy) return currentUser.assignedBy;
    if (currentUser.leaderId) {
      const leaderNode = INITIAL_TERRITORY_DATA.find(l => l.id === currentUser.leaderId);
      if (leaderNode && leaderNode.parentId) {
        const parent = INITIAL_TERRITORY_DATA.find(l => l.id === leaderNode.parentId);
        if (parent) return parent.name;
      }
    }
    return currentUser.level === 'admin'
      ? 'Comité Ejecutivo Nacional'
      : 'Dirección General de Operación';
  }, [currentUser]);

  // Cálculos específicos y vinculación estricta de metas para Promotor Territorial
  const promotorNode = useMemo(() => {
    if (!isPromotor) return null;
    return (
      visibleLeaders.find(l => l.id === currentUser.leaderId) ||
      visibleLeaders.find(l => l.level === 'promotor') ||
      visibleLeaders[0] ||
      null
    );
  }, [isPromotor, visibleLeaders, currentUser.leaderId]);

  const promotorSection = useMemo(() => {
    if (!isPromotor) return '0416';
    return (
      promotorNode?.electoralSection ||
      promotorNode?.assignedSections?.[0] ||
      currentUser.territoryName.match(/\d{3,4}/)?.[0] ||
      '0416'
    );
  }, [isPromotor, promotorNode, currentUser.territoryName]);

  // Meta fijada por el Coordinador Territorial (en alta o edición)
  const promotorAssignedGoal = promotorNode?.metaGoal || 150;

  // Promovidos reales capturados vinculados
  const promotorAchievedCount = promovidosList.length;

  // Promovidos faltantes para la meta
  const promotorRemaining = Math.max(0, promotorAssignedGoal - promotorAchievedCount);

  // Porcentaje de avance de captación
  const promotorProgressPct = promotorAssignedGoal > 0
    ? Math.min(100, Math.round((promotorAchievedCount / promotorAssignedGoal) * 100))
    : 0;

  // Validación de credenciales INE
  const validIneCount = useMemo(() => {
    return promovidosList.filter(p => Boolean(p.electorKey && p.electorKey.trim().length > 5)).length;
  }, [promovidosList]);

  const validInePct = promovidosList.length > 0
    ? Math.round((validIneCount / promovidosList.length) * 100)
    : 100;

  return (
    <div className={`flex-1 bg-[#f5f5f7] ${
      isPromotor 
        ? 'p-0 space-y-0 overflow-visible md:overflow-y-auto pb-24 md:pb-0' 
        : 'overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6'
    }`}>
      <div className={`${isPromotor ? 'w-full space-y-0' : 'max-w-[1600px] mx-auto space-y-6'}`}>

        {/* 1. BLOQUE DE ENCABEZADO Y MÉTRICAS OPERATIVAS */}
        {isPromotor ? (
          /* BLOQUE COMPACTO Y ELEGANTE PARA PROMOTOR TERRITORIAL (ÁNGULOS RECTOS Y SIN MÁRGENES) */
          <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 rounded-none p-5 sm:p-6 text-white shadow-none relative overflow-hidden border-b border-slate-800">
            <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-80 h-80 bg-emerald-500/10 rounded-none blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
              {/* Identificación del Promotor (Nombre y sección sin etiquetas redundantes) */}
              <div className="space-y-1.5 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white apple-title-1">
                  {currentUser.name}
                </h1>

                <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>
                    Sección <strong className="text-white font-bold">{promotorSection}</strong>
                    {promotorNode?.colonia ? ` • ${promotorNode.colonia}` : ''}
                  </span>
                </p>
              </div>

              {/* Métrica de Meta y Avance Unificada (Sin duplicidades, ángulos rectos) */}
              <div className="w-full md:w-96 shrink-0 bg-white/[0.04] border border-white/10 rounded-none p-3.5 sm:p-4 backdrop-blur-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                    Captación de Promovidos
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-400/25 px-2 py-0.5 rounded-none">
                    ✓ {validInePct}% INE ({validIneCount}/{promotorAchievedCount})
                  </span>
                </div>

                <div className="mt-2 flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1.5 font-mono">
                    <span className="text-2xl sm:text-3xl font-black text-white">
                      {promotorAchievedCount}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">
                      / {promotorAssignedGoal} meta
                    </span>
                  </div>
                  <span className="text-sm font-black font-mono text-emerald-400">
                    {promotorProgressPct}%
                  </span>
                </div>

                {/* Barra de avance dinámica */}
                <div className="w-full bg-white/10 h-2 rounded-none overflow-hidden mt-2 p-[1px]">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-none transition-all duration-700 ease-out"
                    style={{ width: `${Math.max(promotorProgressPct === 0 ? 2 : promotorProgressPct, 2)}%` }}
                  />
                </div>

                <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between font-mono">
                  <span>Registros confirmados</span>
                  <span>Faltan {promotorRemaining} promovidos</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* BLOQUE EJECUTIVO INTEGRADO PARA ADMINISTRADOR Y COORDINADORES */
          <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 rounded-[22px] p-5 sm:p-6 text-white shadow-xl relative overflow-hidden border border-white/10">
            <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute left-1/3 bottom-0 translate-y-12 w-72 h-72 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

            {/* Fila Superior: Identificación del Coordinador + Widget Avance de Meta */}
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-white/10">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                    {userLevelLabel}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Asignó: <strong className="text-emerald-100 font-semibold">{assignedByLabel}</strong></span>
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white apple-title-1">
                  {currentUser.name}
                </h1>

                <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-400 shrink-0 animate-subtle-float" />
                  <span>Demarcación asignada: <strong className="text-white font-semibold">{currentUser.territoryName}</strong></span>
                </p>
              </div>

              {/* Widget de Avance de Meta Victoria Integrado */}
              <div className="group w-full lg:w-96 shrink-0 lg:pl-8 lg:border-l lg:border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-200 block">
                      Avance de Meta Victoria 2027
                    </span>
                    <span className="text-[10px] text-slate-400">
                      51% de Votación Esperada ({victoryExpectedTurnout.toLocaleString()})
                    </span>
                  </div>
                  <div className={`p-1.5 rounded-lg border transition-all duration-300 animate-subtle-float ${victoryProgressColor.glow}`}>
                    <Target className="w-4 h-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" />
                  </div>
                </div>

                <div className="mt-1.5">
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                        {stats.totalAchieved.toLocaleString()}
                      </span>
                      <span className="text-xs text-indigo-200 font-mono">
                        / {victoryGoalVotes.toLocaleString()} votos
                      </span>
                    </div>
                    <span className={`text-sm font-black font-mono transition-colors duration-500 ${victoryProgressColor.text}`}>
                      {victoryProgressPct}%
                    </span>
                  </div>

                  <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden mt-2 p-[1px]">
                    <div
                      className={`bg-gradient-to-r ${victoryProgressColor.bar} h-full rounded-full transition-all duration-700 ease-out`}
                      style={{ width: `${Math.max(victoryProgressPct, victoryProgressPct === 0 ? 3 : victoryProgressPct)}%` }}
                    />
                  </div>

                  <div className="mt-1.5 text-[11px] text-slate-300 flex items-center justify-between">
                    <span>Registros logrados</span>
                    <span className="text-slate-400 font-mono text-[10px]">
                      Faltan {(Math.max(0, victoryGoalVotes - stats.totalAchieved)).toLocaleString()} para ganar
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fila Inferior: Métricas Operativas Clave para Coordinadores */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 pt-5 divide-y md:divide-y-0 md:divide-x divide-white/10">

              {/* 1. Lista Nominal */}
              <div className="group flex flex-col justify-between pt-4 md:pt-0 md:pr-6 lg:pr-8">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-200">Lista Nominal</span>
                  <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 group-hover:bg-indigo-500/35 group-hover:border-indigo-400/60 transition-[background-color,border-color] duration-160 [transition-timing-function:var(--ease-out)] animate-subtle-float">
                    <Vote className="w-4 h-4 transition-transform duration-200 [transition-timing-function:var(--ease-out)] group-hover:scale-110 group-hover:rotate-6" />
                  </div>
                </div>
                <div className="mt-1">
                  <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                    {activeNominalMetrics.total.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">electores registrados</div>
                  <div className="mt-2.5 space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-300">
                      <span>Mujeres {womenPct}%</span>
                      <span>Hombres {menPct}%</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full flex overflow-hidden">
                      <div className="bg-pink-400 h-full" style={{ width: `${womenPct}%` }} title={`Mujeres: ${activeNominalMetrics.women.toLocaleString()}`} />
                      <div className="bg-sky-400 h-full" style={{ width: `${menPct}%` }} title={`Hombres: ${activeNominalMetrics.men.toLocaleString()}`} />
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Captación: <strong className="text-indigo-300 font-mono">{nominalCoveragePct}%</strong></span>
                    <span>No Binarios: {activeNominalMetrics.nonBinary}</span>
                  </div>
                </div>
              </div>

              {/* 2. Cobertura Seccional */}
              <div className="group flex flex-col justify-between pt-4 md:pt-0 md:px-6 lg:px-8">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">Cobertura Seccional</span>
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 group-hover:bg-emerald-500/35 group-hover:border-emerald-400/60 transition-[background-color,border-color] duration-160 [transition-timing-function:var(--ease-out)] animate-subtle-float">
                    <Layers className="w-4 h-4 transition-transform duration-200 [transition-timing-function:var(--ease-out)] group-hover:scale-110 group-hover:rotate-6" />
                  </div>
                </div>
                <div className="mt-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
                      {coveredSectionsCount}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      / {targetSectionsUniverse}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{sectionCoveragePct}% secciones cubiertas</div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2.5">
                    <div
                      className="bg-emerald-400 h-full rounded-full transition-[width] duration-300 [transition-timing-function:var(--ease-out)]"
                      style={{ width: `${sectionCoveragePct}%` }}
                    />
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400">
                    {Math.max(0, targetSectionsUniverse - coveredSectionsCount)} secciones vacantes
                  </div>
                </div>
              </div>

              {/* 3. Fuerza Humana */}
              <div className="group flex flex-col justify-between pt-4 md:pt-0 md:pl-6 lg:pl-8">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sky-200">Fuerza Humana</span>
                  <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-400/30 group-hover:bg-sky-500/35 group-hover:border-sky-400/60 transition-[background-color,border-color] duration-160 [transition-timing-function:var(--ease-out)] animate-subtle-float">
                    <Users className="w-4 h-4 transition-transform duration-200 [transition-timing-function:var(--ease-out)] group-hover:scale-110 group-hover:rotate-6" />
                  </div>
                </div>
                <div className="mt-1">
                  <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                    {stats.totalPeople.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">en estructura territorial</div>
                  <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-center text-[10px]">
                    <div className="bg-white/5 hover:bg-white/10 transition-colors rounded-lg py-1">
                      <span className="text-slate-400 block text-[9px]">Comités</span>
                      <strong className="text-white font-mono text-xs">{(stats.levelCounts.distrital || 0) + (stats.levelCounts.territorial || 0)}</strong>
                    </div>
                    <div className="bg-white/5 hover:bg-white/10 transition-colors rounded-lg py-1">
                      <span className="text-slate-400 block text-[9px]">Secc.</span>
                      <strong className="text-white font-mono text-xs">{stats.levelCounts.seccional || 0}</strong>
                    </div>
                    <div className="bg-white/5 hover:bg-white/10 transition-colors rounded-lg py-1">
                      <span className="text-slate-400 block text-[9px]">Prom.</span>
                      <strong className="text-white font-mono text-xs">{stats.levelCounts.promotor || 0}</strong>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* VISTA ESPECÍFICA DEL PROMOTOR TERRITORIAL: LISTA DE PROMOVIDOS + BOTÓN FLOTANTE (+) */}
        {isPromotor && (
          <div className="space-y-0">
            {/* Listado / Directorio de Promovidos (Esquinas Rectas y Sin Márgenes) */}
            <div className="bg-white border-b border-slate-200 rounded-none overflow-hidden shadow-none">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, clave de elector, curp..."
                    value={promotorSearch}
                    onChange={(e) => setPromotorSearch(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-none pl-9 pr-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {filteredPromovidos.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                    <p className="text-sm font-semibold">No se encontraron promovidos registrados.</p>
                    <p className="text-xs text-slate-400 mt-1">Usa el botón flotante (+) para registrar a un ciudadano.</p>
                  </div>
                ) : (
                  filteredPromovidos.map((promovido) => {
                    const isModified = Boolean(promovido.updatedAt && promovido.updatedAt !== promovido.createdAt);
                    const dateLabel = isModified ? 'Modificado:' : 'Registrado:';
                    const rawDate = promovido.updatedAt || promovido.createdAt || '2026-10-03T12:00:00Z';
                    let formattedDate = rawDate;
                    try {
                      formattedDate = new Date(rawDate).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                    } catch {
                      formattedDate = rawDate;
                    }

                    return (
                      <div 
                        key={promovido.id} 
                        onClick={() => onViewCitizen?.(promovido.id)}
                        className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4 cursor-pointer group"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                              {promovido.name}
                            </h4>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-none bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                              Clave: {promovido.electorKey || 'N/A'}
                            </span>
                            {promovido.validationStatus === 'sin_validacion' ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-none bg-amber-50 text-amber-800 border border-amber-300">
                                ⚠ Sin Validación
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-none bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ✓ Validado
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              {dateLabel} {formattedDate}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {promovido.phone && (
                            <a
                              href={`tel:${promovido.phone.replace(/\D/g, '')}`}
                              onClick={(e) => e.stopPropagation()}
                              className="w-8 h-8 bg-emerald-600 hover:bg-emerald-500 text-white rounded-none flex items-center justify-center transition-all shadow-none cursor-pointer"
                              title="Llamar directamente al promovido"
                              aria-label="Llamar"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          )}

                          {promovido.phone && (
                            <a
                              href={`https://wa.me/52${promovido.phone.replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(promovido.name)},%20te%20saluda%20${encodeURIComponent(currentUser.name)}%20de%20Estrategia%20Territorial`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="w-8 h-8 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-none flex items-center justify-center transition-all cursor-pointer"
                              title="Enviar WhatsApp al promovido"
                              aria-label="WhatsApp"
                            >
                              <Smartphone className="w-4 h-4 text-emerald-600" />
                            </a>
                          )}

                          {onDeleteCitizen && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`¿Estás seguro de eliminar a ${promovido.name} de tus promovidos registrados?`)) {
                                  onDeleteCitizen(promovido.id);
                                }
                              }}
                              className="w-8 h-8 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-300 rounded-none flex items-center justify-center transition-all cursor-pointer"
                              title="Eliminar promovido"
                              aria-label="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Botón flotante (+) en la esquina inferior derecha para capturar promovido en página limpia */}
            <button
              type="button"
              onClick={() => onNavigateView('capturar-promovido')}
              className="fixed bottom-20 right-5 sm:bottom-6 sm:right-6 z-30 w-14 h-14 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-2xl flex items-center justify-center rounded-none border border-emerald-400/40 hover:shadow-emerald-600/30 transition-all cursor-pointer group"
              title="Capturar Nuevo Promovido"
              aria-label="Capturar Nuevo Promovido"
            >
              <Plus className="w-8 h-8 transition-transform group-hover:rotate-90 duration-200" />
            </button>
          </div>
        )}

        {/* CENTRO DE ACCIÓN INMEDIATA Y PRIORIDADES CRÍTICAS 2027 (No visible para Promotor) */}
        {!isPromotor && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-200">
                  <Flame className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    Centro de Acción Territorial e Inmediata
                    <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full border border-rose-200">
                      Prioridades 2027
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Focos prioritarios de cobertura territorial y herramientas de movilización rápida en campo
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                {onOpenCreateUser && !isPromotor && (
                  <button
                    type="button"
                    onClick={onOpenCreateUser}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 text-indigo-400" />
                    <span>Alta Manual de Usuario</span>
                  </button>
                )}

                {onOpenQuickCapture && (
                  <button
                    type="button"
                    onClick={() => onOpenQuickCapture()}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4 text-emerald-100" />
                    <span>Captura Rápida de Campo</span>
                    <span className="bg-emerald-700/60 text-emerald-100 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">1-Click WA</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {topPriorityVacantSections.length === 0 ? (
                <div className="sm:col-span-2 lg:col-span-4 p-6 text-center bg-emerald-50/50 rounded-xl border border-emerald-200/60">
                  <p className="text-xs font-bold text-emerald-800">
                    🎉 ¡Excelente cobertura! No hay secciones vacantes registradas en esta demarcación.
                  </p>
                </div>
              ) : (
                topPriorityVacantSections.map((sec, idx) => {
                  const metaMinima = Math.round(sec.nominalList * 0.50 * 0.51);
                  return (
                    <div
                      key={sec.id || sec.sectionNumber}
                      className="bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-300 rounded-xl p-4 transition-all duration-200 shadow-2xs hover:shadow-xs flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <span className="font-mono text-sm font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            Sección {sec.sectionNumber}
                          </span>
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                            🔴 Vacante #{idx + 1}
                          </span>
                        </div>

                        <div className="text-xs font-semibold text-slate-700 truncate" title={sec.municipio}>
                          {sec.municipio}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {sec.distritoLocal || 'Distrito Local'}
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">Lista Nominal</span>
                            <span className="font-mono font-bold text-slate-800">
                              {sec.nominalList.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">Meta 2027 (51%)</span>
                            <span className="font-mono font-bold text-emerald-700">
                              {metaMinima.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onViewSectionDetail?.(sec.sectionNumber)}
                          className="flex-1 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-lg text-xs font-bold transition-colors text-center flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>Ver Ficha y Cartografía</span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* MAPA VECTORIAL OFICIAL INE: No visible para Promotor */}
        {!isPromotor && (
          <StateVectorMap
            state={currentStateInfo}
            districtType={isFederal ? 'federal' : 'local'}
            districtNumber={userDistrictNumber}
            districtLabel={userDistrictLabel}
            highlightSectionNumbers={userDistrictSectionNumbers}
            sectionProgressMap={sectionProgressMap}
            onSelectSection={(secNum) => {
              if (onViewSectionDetail) {
                onViewSectionDetail(secNum);
              }
            }}
          />
        )}

        {/* PANEL DEL COORDINADOR TERRITORIAL: PROMOTORES Y REFERIDOS */}
        {isTerritorial && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-50 text-sky-600 rounded-xl border border-sky-200">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    Directorio de Promotores Territoriales y Referidos
                    <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full border border-sky-200">
                      Zona Tamulté (0416 - 0417)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Crea y supervisa las cuentas de Promotores Territoriales asignados a tus secciones.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenAddModal}
                className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
              >
                <UserPlus className="w-4 h-4 text-sky-100" />
                <span>Crear Cuenta de Promotor Territorial</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignedPromotores.map(prom => {
                const promKids = visibleLeaders.filter(l => l.parentId === prom.id);
                return (
                  <div key={prom.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold ${prom.avatarBg || 'bg-emerald-600'}`}>
                          {prom.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{prom.name}</h4>
                          <span className="text-[10px] text-slate-500">{prom.role} • {prom.territoryName}</span>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {promKids.length} / {prom.metaGoal} promovidos
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Ciudadanos Referidos por {prom.name.split(' ')[0]}:
                      </span>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {promKids.map(k => (
                          <div key={k.id} className="text-xs p-2 bg-white border border-slate-200/80 rounded-lg flex items-center justify-between">
                            <span className="font-semibold text-slate-800 truncate">{k.name}</span>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">{k.electorKey || 'INE'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. FILTROS Y BÚSQUEDA DEL CATÁLOGO ELECTORAL */}
        {!isPromotor && (isSuperAdmin || isCampana) && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {/* Filtro Municipio */}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Municipio:</label>
                <select
                  value={selectedMunicipality}
                  onChange={(e) => setSelectedMunicipality(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">Todos los Municipios ({municipalitiesList.length})</option>
                  {municipalitiesList.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Filtro Distrito Local */}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Distrito Local:</label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">Todos los Distritos ({localDistrictsList.length})</option>
                  {localDistrictsList.map(d => (
                    <option key={d} value={String(d)}>Distrito Local {d}</option>
                  ))}
                </select>
              </div>

              {/* Filtro Estructura Operativa */}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Estructura Operativa:</label>
                <select
                  value={structureFilter}
                  onChange={(e) => setStructureFilter(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">Todas las Secciones</option>
                  <option value="with_structure">✓ Con Estructura Operativa</option>
                  <option value="without_structure">⚠ Sin Estructura (Pendientes)</option>
                </select>
              </div>

              {/* Filtro de Ordenamiento */}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mb-1">
                  <ArrowUpDown className="w-3 h-3 text-indigo-600" />
                  <span>Ordenar Secciones por:</span>
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="section_asc">Número de Sección (Ascendente)</option>
                  <option value="section_desc">Número de Sección (Descendente)</option>
                  <option value="nominal_desc">Mayor Lista Nominal (↓)</option>
                  <option value="nominal_asc">Menor Lista Nominal (↑)</option>
                  <option value="progress_desc">Mayor % de Avance (↓)</option>
                  <option value="progress_asc">Menor % de Avance (↑)</option>
                  <option value="structures_first">Con estructura primero</option>
                  <option value="no_structures_first">Sin estructura primero</option>
                </select>
              </div>

              {/* Búsqueda por número de sección */}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Buscar Sección Electoral:</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Ej. 0484, 0387 o nombre..."
                    value={sectionSearch}
                    onChange={(e) => setSectionSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. LAYOUT PRINCIPAL: SECCIONES ELECTORALES (3 COLUMNAS) + SIDEBAR DE OPERACIÓN */}
        {!isPromotor && stateCatalogSections.length > 0 && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            {/* Columna Principal: 3 Columnas de Tarjetas de Secciones Electorales */}
            <div className="xl:col-span-9 space-y-5">
              {processedDisplaySections.length === 0 ? (
                <div className="p-12 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl">
                  <p className="text-sm font-semibold">No se encontraron secciones con los filtros seleccionados.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedDisplaySections.map((sec) => (
                      <SectionCard
                        key={sec.id || sec.sectionNumber}
                        section={sec}
                        onAddStructure={() => onOpenAddModal()}
                        onSelectStructureToViewTree={() => onNavigateView('flow')}
                        onEditSection={() => onOpenAddModal()}
                        onViewSectionDetail={onViewSectionDetail}
                      />
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  {totalCardsPages > 1 && (
                    <div className="flex items-center justify-between pt-2 text-xs">
                      <span className="text-slate-500 font-medium">
                        Página <strong>{safeCardsPage}</strong> de <strong>{totalCardsPages}</strong> ({processedDisplaySections.length} secciones)
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={safeCardsPage <= 1}
                          onClick={() => setCardsPage((p) => Math.max(1, p - 1))}
                          className="px-3.5 py-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 rounded-xl border border-slate-200 font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span>Anterior</span>
                        </button>
                        <button
                          type="button"
                          disabled={safeCardsPage >= totalCardsPages}
                          onClick={() => setCardsPage((p) => Math.min(totalCardsPages, p + 1))}
                          className="px-3.5 py-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 rounded-xl border border-slate-200 font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <span>Siguiente</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Sidebar Lateral: Puntos de Atención Prioritaria & Líderes con Mayor Desempeño */}
            <div className="xl:col-span-3 space-y-5 xl:sticky xl:top-6">
              {/* Focos Rojos / Puntos de Atención Prioritaria */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Puntos de Atención Prioritaria
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Nodos de su subestructura con avance menor al 30% o en riesgo
                </p>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {stats.criticalNodes.length > 0 ? (
                    stats.criticalNodes.slice(0, 8).map((leader) => {
                      const pct = leader.metaGoal > 0 ? Math.round((leader.currentCount / leader.metaGoal) * 100) : 0;
                      return (
                        <div
                          key={leader.id}
                          className="p-3 rounded-xl border border-rose-100 bg-rose-50/50 flex items-center justify-between hover:bg-rose-50 transition-colors"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-rose-950 truncate">
                                {leader.name}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-semibold">
                                {pct}%
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 block truncate">
                              {leader.role} • {leader.territoryName}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onSelectLeader(leader)}
                            className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer"
                          >
                            Ver
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      No hay focos rojos en su demarcación. La estructura opera al día.
                    </div>
                  )}
                </div>
              </div>

              {/* Líderes con Mayor Cumplimiento */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4 text-amber-500 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Mayor Desempeño Territorial
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Integrantes con mayor captación en su demarcación
                </p>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {stats.topPerformers.slice(0, 8).map((leader, i) => {
                    const pct = leader.metaGoal > 0 ? Math.round((leader.currentCount / leader.metaGoal) * 100) : 0;
                    return (
                      <div
                        key={leader.id}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between hover:bg-slate-100/80 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                          <span className="w-4 text-center font-black text-xs text-amber-600 shrink-0">
                            #{i + 1}
                          </span>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-900 block truncate">
                              {leader.name}
                            </span>
                            <span className="text-[11px] text-slate-500 block truncate">
                              {leader.role} • {leader.territoryName}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-emerald-600 block">
                            {pct}%
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {leader.currentCount} / {leader.metaGoal}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
      {/* Visor de Mapa OpenStreetMap integrado en la misma página */}
      {inspectMapSection && (
        <SectionMapModal
          isOpen={Boolean(inspectMapSection)}
          onClose={() => setInspectMapSection(null)}
          sectionNumber={inspectMapSection.sectionNumber}
          municipio={inspectMapSection.municipio}
          distritoLocal={inspectMapSection.distritoLocal}
          distritoFederal={inspectMapSection.distritoFederal}
          tipo={inspectMapSection.tipo}
          nominalTotal={inspectMapSection.nominalTotal}
          nominalMen={inspectMapSection.nominalMen}
          nominalWomen={inspectMapSection.nominalWomen}
          nominalNonBinary={inspectMapSection.nominalNonBinary}
          assignedLeader={inspectMapSection.assignedLeader}
        />
      )}

      {/* Modal de Escáner INE con Cámara para Promotor */}
      <INECameraScannerModal
        isOpen={isIneScannerOpen}
        onClose={() => setIsIneScannerOpen(false)}
        onDataExtracted={(data) => {
          setIsIneScannerOpen(false);
          onOpenQuickCapture?.(data);
        }}
      />
    </div>
  );
};
