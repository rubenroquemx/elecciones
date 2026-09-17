import React, { useState, useMemo } from 'react';
import type { TerritorialLeader, HierarchyStats } from '../types/territory';
import type { UserAccount } from '../types/auth';
import type { ElectoralSection } from '../types/sections';
import nationalStatesSummary from '../data/nationalStatesSummary.json';
import { SectionMapModal } from './SectionMapModal';
import tabascoCatalog from '../data/tabascoCatalog.json';
import {
  Users,
  Target,
  AlertTriangle,
  CheckCircle2,
  Layers,
  MapPin,
  Award,
  Filter,
  Search,
  ArrowUpRight,
  UserPlus,
  Building2,
  Vote,
} from 'lucide-react';

interface ExecutiveKpiDesktopProps {
  currentUser: UserAccount;
  stats: HierarchyStats;
  visibleLeaders: TerritorialLeader[];
  sections?: ElectoralSection[];
  onSelectLeader: (leader: TerritorialLeader) => void;
  onNavigateView: (view: 'flow' | 'table' | 'stats' | 'sections') => void;
  onOpenAddModal: () => void;
  onViewSectionDetail?: (sectionNumber: string) => void;
}

export const ExecutiveKpiDesktop: React.FC<ExecutiveKpiDesktopProps> = ({
  currentUser,
  stats,
  visibleLeaders,
  onSelectLeader,

  onNavigateView,
  onOpenAddModal,
  onViewSectionDetail,
}) => {
  // Filtros de navegación geográfica para nivel Nacional / Estatal
  const [selectedStateId, setSelectedStateId] = useState<number>(27); // 27 = Tabasco por defecto
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [sectionSearch, setSectionSearch] = useState<string>('');
  const [inspectMapSection, setInspectMapSection] = useState<any | null>(null);

  // Información del estado seleccionado del catálogo oficial INE
  const currentStateInfo = useMemo(() => {
    return nationalStatesSummary.find(s => s.stateId === selectedStateId) || nationalStatesSummary[26];
  }, [selectedStateId]);

  // Secciones oficiales del catálogo para el estado seleccionado
  const stateCatalogSections = useMemo(() => {
    if (selectedStateId === 27) {
      return tabascoCatalog;
    }
    return [];
  }, [selectedStateId]);

  // Lista de municipios únicos del catálogo
  const municipalitiesList = useMemo(() => {
    if (stateCatalogSections.length > 0) {
      const set = new Set<string>();
      stateCatalogSections.forEach(s => set.add(s.municipalityName));
      return Array.from(set).sort();
    }
    return [];
  }, [stateCatalogSections]);

  // Distritos locales únicos del catálogo
  const localDistrictsList = useMemo(() => {
    if (stateCatalogSections.length > 0) {
      const set = new Set<number>();
      stateCatalogSections.forEach(s => {
        if (s.localDistrict > 0) set.add(s.localDistrict);
      });
      return Array.from(set).sort((a, b) => a - b);
    }
    return [];
  }, [stateCatalogSections]);

  // Secciones filtradas del catálogo
  const filteredCatalogSections = useMemo(() => {
    return stateCatalogSections.filter(sec => {
      if (selectedMunicipality !== 'all' && sec.municipalityName !== selectedMunicipality) return false;
      if (selectedDistrict !== 'all' && String(sec.localDistrict) !== selectedDistrict) return false;
      if (sectionSearch.trim()) {
        const query = sectionSearch.trim();
        return sec.section.includes(query) || sec.municipalityName.toLowerCase().includes(query.toLowerCase());
      }
      return true;
    });
  }, [stateCatalogSections, selectedMunicipality, selectedDistrict, sectionSearch]);

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

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* 1. BANNER INSTITUCIONAL & ÁMBITO DE RESPONSABILIDAD */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  {userLevelLabel}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Aislamiento RBAC Activo
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Escritorio Ejecutivo de Operación Territorial
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Demarcación asignada: <strong className="text-white">{currentUser.territoryName}</strong></span>
              </p>
            </div>

            {/* Selector de Estado Nacional para Superadmin */}
            {currentUser.level === 'admin' && (
              <div className="bg-white/10 backdrop-blur border border-white/15 p-3 rounded-xl flex flex-col gap-1.5 min-w-[260px]">
                <label className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  Estado de la República:
                </label>
                <select
                  value={selectedStateId}
                  onChange={(e) => {
                    setSelectedStateId(Number(e.target.value));
                    setSelectedMunicipality('all');
                    setSelectedDistrict('all');
                  }}
                  className="bg-slate-900/90 text-white text-xs font-semibold rounded-lg px-3 py-2 border border-indigo-400/40 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {nationalStatesSummary.map(st => (
                    <option key={st.stateId} value={st.stateId} className="bg-slate-900 text-white">
                      {st.stateId === 27 ? '★ ' : ''}{st.stateId}. {st.stateName} ({st.nominalTotal.toLocaleString()} votantes)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              🔒 <strong>Regla de Aislamiento Estricto:</strong> Solo visualiza métricas de su propia demarcación y estructura subordinada. Estructuras vecinas no son accesibles.
            </span>
            <span className="hidden sm:inline font-mono text-indigo-300 text-[10px]">
              Corte INE DERFE 2025
            </span>
          </div>
        </div>

        {/* 2. FILA DE 4 TARJETAS MÉTRICAS CLAVE (TOP KPIS) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Tarjeta 1: Meta de Captación vs Avance */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avance de Meta</span>
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">
                  {stats.totalAchieved.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500">
                  / {stats.totalGoal.toLocaleString()}
                </span>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Cumplimiento</span>
                  <span className="font-black text-indigo-600">{stats.overallPercentage}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, stats.overallPercentage)}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
              Registros directos reportados
            </div>
          </div>

          {/* Tarjeta 2: Universo de Lista Nominal Oficial */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lista Nominal Oficial</span>
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                <Vote className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-purple-950">
                  {activeNominalMetrics.total.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500">electores</span>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 font-medium">Mujeres: {womenPct}%</span>
                  <span className="text-slate-600 font-medium">Hombres: {menPct}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full flex overflow-hidden">
                  <div className="bg-pink-500 h-full" style={{ width: `${womenPct}%` }} title={`Mujeres: ${activeNominalMetrics.women.toLocaleString()}`} />
                  <div className="bg-sky-500 h-full" style={{ width: `${menPct}%` }} title={`Hombres: ${activeNominalMetrics.men.toLocaleString()}`} />
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Captación: <strong>{nominalCoveragePct}%</strong></span>
              <span>No Binarios: {activeNominalMetrics.nonBinary}</span>
            </div>
          </div>

          {/* Tarjeta 3: Cobertura de Secciones Electorales */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cobertura Seccional</span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-600">
                  {coveredSectionsCount}
                </span>
                <span className="text-xs text-slate-500">
                  / {targetSectionsUniverse} secciones
                </span>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Secciones con líder</span>
                  <span className="font-black text-emerald-600">{sectionCoveragePct}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${sectionCoveragePct}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
              {Math.max(0, targetSectionsUniverse - coveredSectionsCount)} secciones vacantes
            </div>
          </div>

          {/* Tarjeta 4: Fuerza Territorial Desplegada */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fuerza Humana</span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">
                  {stats.totalPeople.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500">en estructura</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-1 text-center">
                <div className="p-1 bg-slate-50 rounded border border-slate-100">
                  <span className="text-[10px] text-slate-400 block">Comités</span>
                  <strong className="text-xs text-slate-800">
                    {(stats.levelCounts.distrital || 0) + (stats.levelCounts.territorial || 0)}
                  </strong>
                </div>
                <div className="p-1 bg-slate-50 rounded border border-slate-100">
                  <span className="text-[10px] text-slate-400 block">Seccionales</span>
                  <strong className="text-xs text-slate-800">
                    {stats.levelCounts.seccional || 0}
                  </strong>
                </div>
                <div className="p-1 bg-slate-50 rounded border border-slate-100">
                  <span className="text-[10px] text-slate-400 block">Promotores</span>
                  <strong className="text-xs text-slate-800">
                    {stats.levelCounts.promotor || 0}
                  </strong>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
              Subordinados en su árbol
            </div>
          </div>

        </div>

        {/* 3. FILTROS Y BÚSQUEDA DEL CATÁLOGO ELECTORAL */}
        {(currentUser.level === 'admin' || currentUser.level === 'estatal' || currentUser.level === 'distrital') && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Filter className="w-4 h-4 text-indigo-600" />
                  Navegación Territorial y Búsqueda de Secciones Oficiales
                </h2>
                <p className="text-xs text-slate-500">
                  Filtre por municipio, distrito o número de sección electoral oficial (4 dígitos)
                </p>
              </div>

              {/* Botón Acción Rápida */}
              <button
                type="button"
                onClick={onOpenAddModal}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>Registrar en Estructura</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Filtro Municipio */}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Municipio:</label>
                <select
                  value={selectedMunicipality}
                  onChange={(e) => setSelectedMunicipality(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
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
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">Todos los Distritos ({localDistrictsList.length})</option>
                  {localDistrictsList.map(d => (
                    <option key={d} value={String(d)}>Distrito Local {d}</option>
                  ))}
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

        {/* 4. TABLA DE SECCIONES CON LISTA NOMINAL (INE) & COBERTURA */}
        {stateCatalogSections.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Catálogo Oficial de Secciones Electorales & Metas ({filteredCatalogSections.length} secciones)
                </h3>
                <p className="text-xs text-slate-500">
                  Corte DERFE con desglose exacto por sexo (Hombres, Mujeres, No Binarios)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigateView('flow')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <span>Ver en Organigrama</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3 font-bold text-slate-700">Sección</th>
                    <th className="py-2.5 px-3 font-bold text-slate-700">Municipio</th>
                    <th className="py-2.5 px-3 font-bold text-slate-700">Dto. Local</th>
                    <th className="py-2.5 px-3 font-bold text-slate-700">Dto. Fed.</th>
                    <th className="py-2.5 px-3 font-bold text-slate-700">Tipo</th>
                    <th className="py-2.5 px-3 font-bold text-slate-700 text-right">Hombres</th>
                    <th className="py-2.5 px-3 font-bold text-slate-700 text-right">Mujeres</th>
                    <th className="py-2.5 px-3 font-bold text-slate-700 text-right">Lista Nominal</th>
                    <th className="py-2.5 px-3 font-bold text-slate-700 text-center">Estatus Operativo</th>
                    <th className="py-2.5 px-3 font-bold text-slate-700 text-center">Mapa OSM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCatalogSections.slice(0, 100).map((sec) => {
                    const assignedLeader = visibleLeaders.find(l => 
                      l.level === 'seccional' && (
                        l.territoryName.includes(sec.section) ||
                        (l.code && l.code.includes(sec.section))
                      )
                    );

                    return (
                      <tr key={sec.section} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 font-mono font-bold text-indigo-700">
                          {sec.section}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-800">
                          {sec.municipalityName}
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          Distrito {sec.localDistrict}
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          Dto. {sec.federalDistrict} ({sec.districtHead.slice(0, 15)})
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            sec.sectionType.includes('URBANO')
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : sec.sectionType.includes('RURAL')
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {sec.sectionType}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">
                          {sec.nominalMen.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">
                          {sec.nominalWomen.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {sec.nominalTotal.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {assignedLeader ? (
                            <button
                              type="button"
                              onClick={() => onSelectLeader(assignedLeader)}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{assignedLeader.name.split(' ')[0]}</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Vacante</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (onViewSectionDetail) {
                                onViewSectionDetail(sec.section);
                              } else {
                                setInspectMapSection({
                                  sectionNumber: sec.section,
                                  municipio: sec.municipalityName,
                                  distritoLocal: `Distrito ${sec.localDistrict}`,
                                  distritoFederal: `Dto. ${sec.federalDistrict} (${sec.districtHead})`,
                                  tipo: sec.sectionType,
                                  nominalTotal: sec.nominalTotal,
                                  nominalMen: sec.nominalMen,
                                  nominalWomen: sec.nominalWomen,
                                  nominalNonBinary: sec.nominalNonBinary,
                                  assignedLeader: assignedLeader?.name,
                                });
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors shadow-2xs cursor-pointer"
                            title="Desplegar mapa OpenStreetMap en esta página"
                          >
                            <MapPin className="w-3 h-3 text-indigo-600" />
                            <span>Ver Mapa</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredCatalogSections.length > 100 && (
                <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
                  Mostrando las primeras 100 secciones de {filteredCatalogSections.length}. Use el buscador para afinar resultados.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. FOCOS ROJOS & TOP RENDIMIENTO DE SU ÁMBITO */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Focos Rojos */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Puntos de Atención Prioritaria en su Estructura
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Nodos de su subestructura con avance menor al 30% o en riesgo operativo
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {stats.criticalNodes.length > 0 ? (
                stats.criticalNodes.slice(0, 6).map((leader) => {
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
                        className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors shrink-0"
                      >
                        Inspeccionar
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
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900">
                Líderes con Mayor Desempeño Territorial
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Integrantes con mayor porcentaje de captación dentro de su demarcación
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {stats.topPerformers.slice(0, 6).map((leader, i) => {
                const pct = leader.metaGoal > 0 ? Math.round((leader.currentCount / leader.metaGoal) * 100) : 0;
                return (
                  <div
                    key={leader.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between hover:bg-slate-100/80 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                      <span className="w-5 text-center font-black text-xs text-amber-600 shrink-0">
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
                      <span className="text-[10px] text-slate-400">
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
