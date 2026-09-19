import { useMemo } from 'react';
import type { TerritorialLeader, HierarchyStats } from '../types/territory';
import type { UserAccount } from '../types/auth';
import type { ElectoralSection } from '../types/sections';
import { StateVectorMap } from './StateVectorMap';
import { MEXICAN_STATES, getStateById, DEFAULT_STATE, type StateData } from '../data/statesData';
import tabascoCatalog from '../data/tabascoCatalog.json';
import {
  Target,
  Users,
  Vote,
  MapPin,
  Building2,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

interface GlassExecutiveDashboardProps {
  currentUser?: UserAccount;
  stats: HierarchyStats;
  visibleLeaders: TerritorialLeader[];
  sections?: ElectoralSection[];
  activeStateId: number;
  onStateChange: (stateId: number) => void;
  onSelectLeader?: (leader: TerritorialLeader) => void;
  onNavigateTab: (tab: 'escritorio' | 'cartografia' | 'organigrama' | 'directorio') => void;
  onViewSectionDetail?: (sectionNumber: string) => void;
}

export const GlassExecutiveDashboard: React.FC<GlassExecutiveDashboardProps> = ({
  stats,
  visibleLeaders,
  activeStateId,
  onStateChange,
  onNavigateTab,
  onViewSectionDetail,
}) => {
  const stateData: StateData = useMemo(() => {
    return getStateById(activeStateId) || DEFAULT_STATE;
  }, [activeStateId]);

  // Sections from catalog for Tabasco or placeholder counts
  const catalogSections = useMemo(() => {
    if (activeStateId === 27) return tabascoCatalog;
    return [];
  }, [activeStateId]);

  // Unique municipalities in catalog
  const municipalities = useMemo(() => {
    if (catalogSections.length > 0) {
      const set = new Set<string>();
      catalogSections.forEach((s) => set.add(s.municipalityName));
      return Array.from(set).sort();
    }
    return [];
  }, [catalogSections]);

  // Section coverage calculation
  const coveredSectionsCount = useMemo(() => {
    const coveredSet = new Set<string>();
    visibleLeaders.forEach((l) => {
      if (l.level === 'seccional' && l.territoryName) {
        coveredSet.add(l.territoryName);
      }
    });
    return coveredSet.size;
  }, [visibleLeaders]);

  const coveragePct = Math.min(
    100,
    Math.round((coveredSectionsCount / Math.max(1, stateData.totalSections)) * 100)
  );

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 pb-28 space-y-6 text-slate-100 select-none">
      {/* State Header Banner in Frosted Glass */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-black uppercase tracking-wider">
              {stateData.abbr} • INE Oficial 2025
            </span>
            <span className="px-3 py-1 rounded-xl bg-white/10 text-slate-300 border border-white/10 text-xs font-semibold">
              Capital: {stateData.capital}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
            <span>{stateData.name}</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Estructura operativa territorial y proyección de victoria electoral 2027 para los{' '}
            <strong className="text-white">{stateData.totalMunicipalities} municipios</strong> y{' '}
            <strong className="text-white">{stateData.totalSections.toLocaleString()} secciones electorales</strong>.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <button
            type="button"
            onClick={() => onNavigateTab('cartografia')}
            className="px-4 py-2.5 rounded-xl glass-button-primary text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <MapPin className="w-4 h-4" />
            <span>Ver Mapa Completo</span>
          </button>
        </div>
      </div>

      {/* 32 Mexican States Fast Navigation Carousel */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-semibold">
          <span>Navegar por las 32 Entidades Federativas:</span>
          <span className="text-[11px] text-indigo-400">Total: 73,268 Secciones Nacionales</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {MEXICAN_STATES.map((st) => {
            const isSelected = st.stateId === activeStateId;
            return (
              <button
                key={st.stateId}
                type="button"
                onClick={() => onStateChange(st.stateId)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600/80 text-white border border-indigo-400/60 shadow-lg shadow-indigo-600/30 scale-105'
                    : 'glass-card text-slate-300 hover:text-white hover:border-white/20'
                }`}
              >
                <span className="uppercase text-[10px] text-indigo-300 font-extrabold">
                  {st.abbr}
                </span>
                <span>{st.commonName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4 CORE GLASS KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: META VICTORIA 2027 */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden border-indigo-500/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Meta Victoria 2027
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-white">
              {stateData.victoryGoalVotes.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-300">
              Votos meta (<strong>51%</strong> de participación estimada al 50%)
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Participación proyectada:</span>
            <span className="font-bold text-indigo-300">50.0% nominal</span>
          </div>
        </div>

        {/* KPI 2: LISTA NOMINAL OFICIAL */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden border-sky-500/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
              Lista Nominal INE
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300">
              <Vote className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-white">
              {stateData.nominalTotal.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-300">
              Ciudadanos con credencial para votar vigente
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Mujeres: {stateData.nominalWomen.toLocaleString()}</span>
            <span className="font-bold text-sky-300">Hombres: {stateData.nominalMen.toLocaleString()}</span>
          </div>
        </div>

        {/* KPI 3: COBERTURA SECCIONAL */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden border-emerald-500/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Secciones Electorales
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-white">
              {stateData.totalSections.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-300">
              Cartografía INE vectorizada en GeoJSON WGS84
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Cobertura Estructura:</span>
            <span className="font-bold text-emerald-300">{coveragePct}% ({coveredSectionsCount} sec)</span>
          </div>
        </div>

        {/* KPI 4: ESTRUCTURA TERRITORIAL REGISTRADA */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden border-purple-500/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
              Estructura Activa
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
              Liderazgos en red jerárquica RBAC
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Meta Seccional:</span>
            <span className="font-bold text-purple-300">{stats.levelCounts.seccional || 0} seccionales</span>
          </div>
        </div>
      </div>

      {/* INTERACTIVE VECTOR MAP SECTION IN GLASS FRAME */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">
                Mapa Vectorial Seccional: {stateData.name}
              </h2>
              <p className="text-xs text-slate-400">
                Límites territoriales de las {stateData.totalSections.toLocaleString()} secciones del INE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateTab('organigrama')}
              className="px-3.5 py-1.5 rounded-xl glass-button text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <span>Ver Organigrama de Red</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" />
            </button>
          </div>
        </div>

        {/* Vector Map Canvas */}
        <StateVectorMap
          state={stateData}
          onSelectSection={(secNum) => {
            if (onViewSectionDetail) {
              onViewSectionDetail(secNum);
            }
          }}
          heightClass="h-[480px] sm:h-[540px]"
        />
      </div>

      {/* TABASCO / STATE MUNICIPALITY BREAKDOWN */}
      {municipalities.length > 0 && (
        <div className="glass-panel rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Desglose de Municipios ({municipalities.length})
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Total Secciones: {catalogSections.length}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {municipalities.map((mun) => {
              const munSections = catalogSections.filter((s) => s.municipalityName === mun);
              const totalNominalMun = munSections.reduce((acc, curr) => acc + (curr.nominalTotal || 0), 0);
              return (
                <div
                  key={mun}
                  className="glass-card rounded-xl p-3 space-y-1 cursor-default hover:border-indigo-400/40"
                >
                  <span className="text-xs font-bold text-white truncate block">{mun}</span>
                  <div className="text-[11px] text-slate-400 flex justify-between">
                    <span>{munSections.length} secciones</span>
                    <span className="text-indigo-300 font-semibold">{totalNominalMun.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
