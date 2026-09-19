import React, { useState, useMemo } from 'react';
import type { ElectoralSection, SectionStructure } from '../types/sections';
import type { UserAccount } from '../types/auth';
import { StateVectorMap } from './StateVectorMap';
import { getStateById, DEFAULT_STATE, type StateData } from '../data/statesData';
import {
  MapPin,
  Search,
  ChevronRight,
} from 'lucide-react';

interface GlassMapViewProps {
  sections: ElectoralSection[];
  activeStateId: number;
  currentUser?: UserAccount | null;
  onSaveSection?: (section: ElectoralSection) => void;
  onAddStructureToSection?: (sectionId: string, structure: SectionStructure) => void;
  onSelectStructureToViewTree?: (structure: SectionStructure, section: ElectoralSection) => void;
  onViewSectionDetail?: (sectionNumber: string) => void;
}

export const GlassMapView: React.FC<GlassMapViewProps> = ({
  sections,
  activeStateId,
  currentUser,
  onViewSectionDetail,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  const activeState: StateData = useMemo(() => {
    return getStateById(activeStateId) || DEFAULT_STATE;
  }, [activeStateId]);

  // Detect district if currentUser is set
  const isFederal = currentUser?.accountRoleLabel?.toLowerCase().includes('federal') ||
                    currentUser?.territoryName?.toLowerCase().includes('federal');

  const districtNumber = useMemo(() => {
    if (!currentUser || currentUser.isSuperAdmin || currentUser.level === 'admin') return undefined;
    const text = `${currentUser.territoryName} ${currentUser.accountRoleLabel}`;
    const match = text.match(/\b(?:distrito|dto)?\s*(?:local|federal)?\s*0*(\d+)\b/i);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (parsed > 0) return parsed;
    }
    return isFederal ? 4 : 9;
  }, [currentUser, isFederal]);

  const districtTypeLabel = districtNumber
    ? (isFederal ? `Distrito Federal 0${districtNumber}` : `Distrito Local 0${districtNumber}`)
    : undefined;

  // Filter sections by search term
  const filteredSections = useMemo(() => {
    return sections.filter((s) => {
      const matchSearch =
        s.sectionNumber.includes(searchTerm) ||
        s.municipio.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [sections, searchTerm]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4 sm:p-6 pb-28 space-y-4 select-none">
      {/* Top Glass Filter & Stats Bar */}
      <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <span>Cartografía INE: {activeState.name}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                {activeState.abbr.toUpperCase()}
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              {activeState.totalSections.toLocaleString()} secciones oficiales • GeoJSON RFC 7946 WGS84
            </p>
          </div>
        </div>

        {/* View Mode Toggle & Search */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar sección o municipio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs glass-input rounded-xl text-white placeholder-slate-400 w-44 sm:w-60"
            />
          </div>

          <div className="flex items-center glass-card rounded-xl p-1 border border-white/10">
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                viewMode === 'map'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Mapa Vectorial
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Fichas ({filteredSections.length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 relative overflow-hidden rounded-2xl glass-panel p-2">
        {viewMode === 'map' ? (
          <StateVectorMap
            state={activeState}
            districtType={isFederal ? 'federal' : 'local'}
            districtNumber={districtNumber}
            districtLabel={districtTypeLabel}
            onSelectSection={(secNum) => {
              if (onViewSectionDetail) {
                onViewSectionDetail(secNum);
              }
            }}
            heightClass="h-full"
          />
        ) : (
          <div className="h-full overflow-y-auto p-4 space-y-3 pr-2">
            {filteredSections.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                <MapPin className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-xs">No se encontraron secciones registradas con ese filtro.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredSections.map((sec) => (
                  <div
                    key={sec.id}
                    className="glass-card rounded-2xl p-4 space-y-3 hover:border-indigo-400/40 cursor-pointer"
                    onClick={() => onViewSectionDetail?.(sec.sectionNumber)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 font-black text-xs flex items-center justify-center border border-indigo-400/30">
                          {sec.sectionNumber}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-white">{sec.municipio}</h4>
                          <span className="text-[10px] text-slate-400">
                            Distrito Local {sec.distritoLocal}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
                      <span>Lista Nominal:</span>
                      <strong className="text-white">{sec.nominalList.toLocaleString()}</strong>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-300">
                      <span>Estructuras registradas:</span>
                      <span className="px-2 py-0.5 rounded-md bg-white/10 text-indigo-300 font-bold text-[10px]">
                        {sec.structures.length} activas
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
