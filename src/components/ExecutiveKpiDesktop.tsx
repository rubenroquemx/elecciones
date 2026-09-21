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
} from 'lucide-react';

interface ExecutiveKpiDesktopProps {
  currentUser: UserAccount;
  stats: HierarchyStats;
  visibleLeaders: TerritorialLeader[];
  sections?: ElectoralSection[];
  onSelectLeader: (leader: TerritorialLeader) => void;
  onNavigateView: (view: 'flow' | 'table' | 'stats' | 'sections') => void;
  onOpenAddModal: () => void;
  onOpenQuickCapture?: () => void;
  onViewSectionDetail?: (sectionNumber: string) => void;
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
  onViewSectionDetail,
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

  // Detect district if currentUser is distrital
  const isFederal = currentUser.accountRoleLabel?.toLowerCase().includes('federal') ||
                    currentUser.territoryName?.toLowerCase().includes('federal');

  const userDistrictNumber = useMemo(() => {
    if (currentUser.isSuperAdmin || currentUser.level === 'admin' || currentUser.level === 'estatal') return undefined;
    const text = `${currentUser.territoryName} ${currentUser.accountRoleLabel}`;
    const match = text.match(/\b(?:distrito|dto)?\s*(?:local|federal)?\s*0*(\d+)\b/i);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (parsed > 0) return parsed;
    }
    return isFederal ? 4 : 9;
  }, [currentUser, isFederal]);

  const userDistrictLabel = userDistrictNumber
    ? (isFederal ? `Distrito Federal 0${userDistrictNumber}` : `Distrito Local 0${userDistrictNumber}`)
    : undefined;

  const userDistrictSections = useMemo(() => {
    if (!userDistrictNumber) return [];
    return stateCatalogSections.filter((s) => {
      if (isFederal) return s.federalDistrict === userDistrictNumber;
      return s.localDistrict === userDistrictNumber;
    });
  }, [stateCatalogSections, userDistrictNumber, isFederal]);

  const userDistrictSectionNumbers = useMemo(() => {
    return userDistrictSections.map((s) => s.section);
  }, [userDistrictSections]);

  // Base list of sections scoped to district or state
  const baseCatalogSections = useMemo(() => {
    if (userDistrictNumber && userDistrictSections.length > 0) {
      return userDistrictSections;
    }
    return stateCatalogSections;
  }, [userDistrictNumber, userDistrictSections, stateCatalogSections]);

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
    if (currentUser.level === 'seccional') {
      const secMatch = stateCatalogSections.find(s => 
        currentUser.territoryName.includes(s.section) ||
        visibleLeaders[0]?.territoryName.includes(s.section) ||
        visibleLeaders[0]?.code?.includes(s.section)
      );
      if (secMatch) {
        return {
          total: secMatch.nominalTotal,
          men: secMatch.nominalMen,
          women: secMatch.nominalWomen,
          nonBinary: secMatch.nominalNonBinary,
          sectionCount: 1,
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
  }, [currentUser, stateCatalogSections, visibleLeaders, filteredCatalogSections, currentStateInfo]);

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

  // Meta electoral 2027 scoped a la demarcación del usuario
  const victoryNominalTotal = (userDistrictNumber && activeNominalMetrics.total > 0)
    ? activeNominalMetrics.total
    : currentStateInfo.nominalTotal;
  const victoryExpectedTurnout = Math.round(victoryNominalTotal * 0.50);
  const victoryGoalVotes = Math.round(victoryExpectedTurnout * 0.51);

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
    ? 'Superadministrador (Acceso Maestro)'
    : currentUser.level === 'estatal'
    ? 'Coordinación Estatal'
    : currentUser.level === 'distrital'
    ? 'Comité de Organización Distrital'
    : currentUser.level === 'territorial'
    ? 'Comité Territorial (Zona / Ruta)'
    : currentUser.level === 'seccional'
    ? 'Coordinador de Sección'
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

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* 1. BLOQUE EJECUTIVO INTEGRADO: IDENTIFICACIÓN, META 2027 Y MÉTRICAS OPERATIVAS */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 rounded-2xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden border border-slate-800">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 bottom-0 translate-y-12 w-72 h-72 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

          {/* Fila Superior: Identificación del Coordinador + Widget Avance de Meta */}
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-white/10">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  {userLevelLabel}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Asignó: <strong className="text-emerald-100 font-semibold">{assignedByLabel}</strong></span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {currentUser.name}
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-400 shrink-0 animate-subtle-float" />
                <span>Demarcación asignada: <strong className="text-white font-semibold">{currentUser.territoryName}</strong></span>
              </p>
            </div>

            {/* Widget de Avance de Meta Victoria Integrado (Sin contenedor aislado) */}
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

                {/* Barra dinámica de rojo a verde según el avance */}
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

          {/* Fila Inferior: Métricas Operativas Clave Integradas Directamente sin Cajas Aisladas */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 pt-5 divide-y md:divide-y-0 md:divide-x divide-white/10">

            {/* 1. Lista Nominal */}
            <div className="group flex flex-col justify-between pt-4 md:pt-0 md:pr-6 lg:pr-8">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-200">Lista Nominal</span>
                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 group-hover:bg-indigo-500/35 group-hover:border-indigo-400/60 transition-all duration-300 animate-subtle-float">
                  <Vote className="w-4 h-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" />
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
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 group-hover:bg-emerald-500/35 group-hover:border-emerald-400/60 transition-all duration-300 animate-subtle-float">
                  <Layers className="w-4 h-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" />
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
                    className="bg-emerald-400 h-full rounded-full transition-all duration-500"
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
                <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-400/30 group-hover:bg-sky-500/35 group-hover:border-sky-400/60 transition-all duration-300 animate-subtle-float">
                  <Users className="w-4 h-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" />
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

        {/* CENTRO DE ACCIÓN INMEDIATA Y PRIORIDADES CRÍTICAS 2027 */}
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

            {onOpenQuickCapture && (
              <button
                type="button"
                onClick={onOpenQuickCapture}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
              >
                <Smartphone className="w-4 h-4 text-emerald-100" />
                <span>Captura Rápida de Campo</span>
                <span className="bg-emerald-700/60 text-emerald-100 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">1-Click WA</span>
              </button>
            )}
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

        {/* MAPA VECTORIAL OFICIAL INE */}
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

        {/* 3. FILTROS Y BÚSQUEDA DEL CATÁLOGO ELECTORAL */}
        {(currentUser.level === 'admin' || currentUser.level === 'estatal' || currentUser.level === 'distrital') && (
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
        {stateCatalogSections.length > 0 && (
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
    </div>
  );
};
