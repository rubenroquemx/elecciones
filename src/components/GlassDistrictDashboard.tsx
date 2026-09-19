import React, { useState, useMemo } from 'react';
import type { TerritorialLeader, HierarchyStats } from '../types/territory';
import type { UserAccount } from '../types/auth';
import type { ElectoralSection } from '../types/sections';
import { StateVectorMap } from './StateVectorMap';
import { getStateById, DEFAULT_STATE } from '../data/statesData';
import tabascoCatalog from '../data/tabascoCatalog.json';
import {
  Target,
  Users,
  Vote,
  MapPin,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Search,
  Phone,
  UserPlus,
  Layers,
  Building,
} from 'lucide-react';

interface GlassDistrictDashboardProps {
  currentUser: UserAccount;
  onSwitchUser: (account: UserAccount) => void;
  stats: HierarchyStats;
  visibleLeaders: TerritorialLeader[];
  sections: ElectoralSection[];
  onSelectLeader?: (leader: TerritorialLeader) => void;
  onOpenAddModal: () => void;
  onViewSectionDetail?: (sectionNumber: string) => void;
  onNavigateTab: (tab: 'escritorio' | 'cartografia' | 'organigrama' | 'directorio') => void;
}

export const GlassDistrictDashboard: React.FC<GlassDistrictDashboardProps> = ({
  currentUser,
  stats,
  visibleLeaders,
  onOpenAddModal,
  onViewSectionDetail,
  onNavigateTab,
}) => {
  const [sectionSearch, setSectionSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'cubierta' | 'pendiente'>('todos');

  // Detect whether current coordinator is Federal or Local
  const isFederal = currentUser.accountRoleLabel?.toLowerCase().includes('federal') ||
                    currentUser.territoryName?.toLowerCase().includes('federal');

  // Dynamically extract the district number from territoryName or accountRoleLabel (e.g. "Distrito Local 06")
  const districtNumber = useMemo(() => {
    const text = `${currentUser.territoryName} ${currentUser.accountRoleLabel}`;
    const match = text.match(/\b(?:distrito|dto)?\s*(?:local|federal)?\s*0*(\d+)\b/i);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (parsed > 0) return parsed;
    }
    return isFederal ? 4 : 9;
  }, [currentUser.territoryName, currentUser.accountRoleLabel, isFederal]);

  const districtTypeLabel = isFederal
    ? `Distrito Federal 0${districtNumber}`
    : `Distrito Local 0${districtNumber}`;

  // Filter Tabasco catalog sections that belong to this district
  const districtSections = useMemo(() => {
    return tabascoCatalog.filter((s) => {
      if (isFederal) {
        return s.federalDistrict === districtNumber;
      }
      return s.localDistrict === districtNumber;
    });
  }, [isFederal, districtNumber]);

  const districtCabecera = useMemo(() => {
    if (districtSections.length > 0) {
      return `${districtSections[0].districtHead} (${districtSections[0].municipalityName}, Tabasco)`;
    }
    return 'Villahermosa (Centro, Tabasco)';
  }, [districtSections]);

  // Nominal Total for this district
  const districtNominalTotal = useMemo(() => {
    return districtSections.reduce((acc, curr) => acc + (curr.nominalTotal || 0), 0);
  }, [districtSections]);

  // Projected 2027 Victory Goal (50% turnout, 51% of voters = 25.5% of nominal total)
  const districtVictoryGoal = useMemo(() => {
    return Math.round(districtNominalTotal * 0.5 * 0.51);
  }, [districtNominalTotal]);

  // Projected Casillas count (roughly ~750 voters per casilla in INE rules)
  const projectedCasillas = useMemo(() => {
    return districtSections.reduce((acc, curr) => {
      const voters = curr.nominalTotal || 0;
      return acc + Math.max(1, Math.ceil(voters / 750));
    }, 0);
  }, [districtSections]);

  // Subordinate seccionales in hierarchical structure
  const seccionalesInStructure = useMemo(() => {
    return visibleLeaders.filter((l) => l.level === 'seccional');
  }, [visibleLeaders]);

  const coveredSectionsCount = seccionalesInStructure.length;
  const coveragePercentage = districtSections.length > 0
    ? Math.min(100, Math.round((coveredSectionsCount / districtSections.length) * 100))
    : 0;

  const validatedCount = useMemo(() => {
    return visibleLeaders.filter((l) => l.validationStatus === 'validado').length;
  }, [visibleLeaders]);

  // Filtered district sections for the interactive table
  const displayedSections = useMemo(() => {
    return districtSections.filter((sec) => {
      const matchSearch =
        sec.section.includes(sectionSearch) ||
        sec.sectionType.toLowerCase().includes(sectionSearch.toLowerCase()) ||
        sec.districtHead.toLowerCase().includes(sectionSearch.toLowerCase());

      const isCovered = seccionalesInStructure.some(
        (l) => l.territoryName.includes(sec.section) || (l.code && l.code.includes(sec.section))
      );

      if (filterStatus === 'cubierta') return matchSearch && isCovered;
      if (filterStatus === 'pendiente') return matchSearch && !isCovered;
      return matchSearch;
    });
  }, [districtSections, sectionSearch, filterStatus, seccionalesInStructure]);

  const stateData = getStateById(27) || DEFAULT_STATE;

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 pb-28 space-y-6 text-slate-100 select-none">
      {/* DISTRICT COORDINATOR HERO BANNER (Glassmorphism) */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden border border-white/15">
        {/* Ambient neon flare */}
        <div className="absolute -top-16 -right-16 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start gap-4 relative z-10">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 border border-white/30 flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-xl shadow-indigo-600/30 shrink-0">
            {currentUser.name ? currentUser.name[0] : 'C'}
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5" />
                <span>{districtTypeLabel}</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Coordinador Acreditado INE</span>
              </span>
            </div>

            <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight">
              {currentUser.name}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 flex flex-wrap items-center gap-2">
              <span>Cabecera Distrital: <strong className="text-white">{districtCabecera}</strong></span>
              <span>•</span>
              <span>{districtSections.length} Secciones Electorales</span>
              <span>•</span>
              <span>{projectedCasillas} Casillas Proyectadas</span>
            </p>
          </div>
        </div>

        {/* Action Buttons for District Coordinator */}
        <div className="flex flex-wrap items-center gap-2.5 relative z-10 shrink-0">
          <button
            type="button"
            onClick={onOpenAddModal}
            className="px-4 py-2.5 rounded-xl glass-button-primary text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Asignar Responsable de Sección</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('organigrama')}
            className="px-4 py-2.5 rounded-xl glass-button text-xs font-bold flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white"
          >
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Ver Red de Distrito</span>
          </button>
        </div>
      </div>

      {/* 4 CORE DISTRICT OPERATIONAL KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: META VICTORIA DISTRITAL */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden border-indigo-500/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Meta Distrital 2027
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-white">
              {districtVictoryGoal.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-300">
              Votos meta para asegurar el distrito (51% de participación)
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Padrón del Distrito:</span>
            <span className="font-bold text-indigo-300">{districtNominalTotal.toLocaleString()} nominal</span>
          </div>
        </div>

        {/* KPI 2: COBERTURA DE CASILLAS */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden border-sky-500/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
              Casillas por Cubrir
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300">
              <Vote className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-white">
              {projectedCasillas.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-300">
              Casillas estimadas (Básicas, Contiguas y Extraordinarias)
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Representantes requeridos:</span>
            <span className="font-bold text-sky-300">{(projectedCasillas * 2).toLocaleString()} (Prop + Supl)</span>
          </div>
        </div>

        {/* KPI 3: SECCIONES ELECTORALES ASIGNADAS */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden border-emerald-500/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Secciones Electorales
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-white">
              {districtSections.length}
            </div>
            <p className="text-[11px] text-slate-300">
              Secciones oficiales dentro del {districtTypeLabel}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Cobertura actual:</span>
            <span className="font-bold text-emerald-300">{coveragePercentage}% ({coveredSectionsCount} asignadas)</span>
          </div>
        </div>

        {/* KPI 4: EQUIPO TERRITORIAL DISTRITAL */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden border-purple-500/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
              Equipo en Distrito
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-white">
              {stats.totalPeople.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-300">
              Liderazgos y representantes en la red del distrito
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Validación INE:</span>
            <span className="font-bold text-purple-300">{validatedCount} acreditados</span>
          </div>
        </div>
      </div>

      {/* MAPA VECTORIAL DEL DISTRITO */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 space-y-4 border border-white/15">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">
                Cartografía Electoral del {districtTypeLabel}
              </h2>
              <p className="text-xs text-slate-400">
                Polígonos vectoriales oficiales de las {districtSections.length} secciones distritales
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300 px-3 py-1 rounded-xl bg-white/10">
              Municipio: Centro (Villahermosa)
            </span>
          </div>
        </div>

        <StateVectorMap
          state={stateData}
          districtType={isFederal ? 'federal' : 'local'}
          districtNumber={districtNumber}
          districtLabel={districtTypeLabel}
          highlightSectionNumbers={districtSections.map((s) => s.section)}
          onSelectSection={(secNum) => onViewSectionDetail?.(secNum)}
          heightClass="h-[460px] sm:h-[520px]"
        />
      </div>

      {/* CATÁLOGO OPERATIVO DE SECCIONES DEL DISTRITO */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 space-y-4 border border-white/15">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <span>Secciones Electorales del {districtTypeLabel}</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                {displayedSections.length} de {districtSections.length}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Control de casillas, lista nominal y responsables seccionales asignados
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar sección (ej. 0284)..."
                value={sectionSearch}
                onChange={(e) => setSectionSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs glass-input rounded-xl text-white placeholder-slate-400 w-44 sm:w-56"
              />
            </div>

            <div className="flex items-center glass-card rounded-xl p-0.5 border border-white/10">
              <button
                type="button"
                onClick={() => setFilterStatus('todos')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                  filterStatus === 'todos' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Todas ({districtSections.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('cubierta')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                  filterStatus === 'cubierta' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Cubiertas ({coveredSectionsCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('pendiente')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                  filterStatus === 'pendiente' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Pendientes ({Math.max(0, districtSections.length - coveredSectionsCount)})
              </button>
            </div>
          </div>
        </div>

        {/* Sections Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[460px] overflow-y-auto pr-1">
          {displayedSections.map((sec) => {
            const matchingLeader = seccionalesInStructure.find(
              (l) => l.territoryName.includes(sec.section) || (l.code && l.code.includes(sec.section))
            );
            const isCovered = Boolean(matchingLeader);
            const estCasillas = Math.max(1, Math.ceil((sec.nominalTotal || 0) / 750));

            return (
              <div
                key={sec.section}
                className="glass-card rounded-2xl p-4 space-y-3 hover:border-indigo-400/50 transition-all cursor-pointer group"
                onClick={() => onViewSectionDetail?.(sec.section)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-400/30 flex items-center justify-center text-xs font-black text-indigo-300">
                      {sec.section}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                        Sección {sec.section}
                      </h4>
                      <span className="text-[10px] text-slate-400 block">
                        {sec.sectionType} • {sec.districtHead}
                      </span>
                    </div>
                  </div>

                  {isCovered ? (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>Asignada</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/15 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>Sin Asignar</span>
                    </span>
                  )}
                </div>

                <div className="pt-2 border-t border-white/10 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Padrón Nominal:</span>
                    <strong className="text-white">{sec.nominalTotal.toLocaleString()} electores</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Casillas Estimadas:</span>
                    <strong className="text-sky-300 font-bold">{estCasillas} ({estCasillas === 1 ? 'Básica' : 'Básica + Contiguas'})</strong>
                  </div>
                </div>

                {/* Assigned Leader or Empty Slot */}
                <div className="pt-2 border-t border-white/10">
                  {matchingLeader ? (
                    <div className="flex items-center justify-between text-[11px]">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Responsable Seccional:</span>
                        <span className="font-bold text-white truncate block max-w-[140px]">
                          {matchingLeader.name}
                        </span>
                      </div>
                      {matchingLeader.phone && (
                        <a
                          href={`tel:${matchingLeader.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/40 border border-indigo-400/30 transition-colors"
                          title="Llamar al responsable"
                        >
                          <Phone className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Pendiente de designar RC</span>
                      <span className="text-indigo-400 font-semibold group-hover:underline">
                        + Asignar
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
