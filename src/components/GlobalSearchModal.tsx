import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { ElectoralSection } from '../types/sections';
import type { TerritorialLeader } from '../types/territory';
import { 
  Search, 
  MapPin, 
  User, 
  X, 
  Phone, 
  ArrowRight, 
  AlertCircle
} from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  sections: ElectoralSection[];
  leaders: TerritorialLeader[];
  onSelectSection: (sectionNumber: string) => void;
  onSelectLeader: (leader: TerritorialLeader) => void;
}

interface SearchItem {
  id: string;
  type: 'section' | 'leader';
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  extra?: string;
  sectionObj?: ElectoralSection;
  leaderObj?: TerritorialLeader;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  sections,
  leaders,
  onSelectSection,
  onSelectLeader,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filter items based on query
  const results = useMemo<SearchItem[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Suggest top sections with structure and top leaders by default
      const defaultSections: SearchItem[] = sections
        .filter(s => s.structures.length > 0)
        .slice(0, 4)
        .map(s => ({
          id: `sec-${s.sectionNumber}`,
          type: 'section',
          title: `Sección ${s.sectionNumber}`,
          subtitle: `${s.municipio} • ${s.distritoLocal} • ${s.nominalList.toLocaleString()} electores`,
          badge: `${s.structures.length} ${s.structures.length === 1 ? 'estructura' : 'estructuras'}`,
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          sectionObj: s,
        }));

      const defaultLeaders: SearchItem[] = leaders
        .slice(0, 4)
        .map(l => ({
          id: `leader-${l.id}`,
          type: 'leader',
          title: l.name,
          subtitle: `${l.role} • ${l.territoryName}`,
          badge: l.level.toUpperCase(),
          badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          extra: l.phone,
          leaderObj: l,
        }));

      return [...defaultSections, ...defaultLeaders];
    }

    const items: SearchItem[] = [];

    // 1. Search Sections
    const matchedSections = sections.filter(sec => {
      const secNum = sec.sectionNumber.toLowerCase();
      const muni = sec.municipio.toLowerCase();
      const dist = sec.distritoLocal.toLowerCase();
      const hasStructMatch = sec.structures.some(
        st => st.leaderName.toLowerCase().includes(q) || st.name.toLowerCase().includes(q)
      );

      return (
        secNum.includes(q) ||
        muni.includes(q) ||
        dist.includes(q) ||
        hasStructMatch
      );
    }).slice(0, 8);

    matchedSections.forEach(s => {
      items.push({
        id: `sec-${s.sectionNumber}`,
        type: 'section',
        title: `Sección Electoral ${s.sectionNumber}`,
        subtitle: `${s.municipio} • ${s.distritoLocal} • ${s.nominalList.toLocaleString()} Lista Nominal`,
        badge: s.structures.length > 0 ? `${s.structures.length} estructuras` : 'Sin estructura',
        badgeColor: s.structures.length > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200',
        sectionObj: s,
      });
    });

    // 2. Search Leaders
    const matchedLeaders = leaders.filter(l => {
      const name = l.name.toLowerCase();
      const role = l.role.toLowerCase();
      const terr = l.territoryName.toLowerCase();
      const phone = (l.phone || '').replace(/\D/g, '');
      const cleanQ = q.replace(/\D/g, '');
      const electorKey = (l.electorKey || '').toLowerCase();
      const curp = (l.curp || '').toLowerCase();
      const sec = (l.electoralSection || '').toLowerCase();

      return (
        name.includes(q) ||
        role.includes(q) ||
        terr.includes(q) ||
        electorKey.includes(q) ||
        curp.includes(q) ||
        sec.includes(q) ||
        (cleanQ.length >= 4 && phone.includes(cleanQ))
      );
    }).slice(0, 8);

    matchedLeaders.forEach(l => {
      items.push({
        id: `leader-${l.id}`,
        type: 'leader',
        title: l.name,
        subtitle: `${l.role} • ${l.territoryName}`,
        badge: l.level.toUpperCase(),
        badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        extra: l.phone,
        leaderObj: l,
      });
    });

    return items;
  }, [query, sections, leaders]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelectItem(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleSelectItem = (item: SearchItem) => {
    if (item.type === 'section' && item.sectionObj) {
      onSelectSection(item.sectionObj.sectionNumber);
    } else if (item.type === 'leader' && item.leaderObj) {
      onSelectLeader(item.leaderObj);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
          <Search className="w-5 h-5 text-indigo-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Buscar por sección (ej. 0416), nombre, INE, municipio o teléfono..."
            className="w-full bg-transparent text-sm sm:text-base text-slate-800 placeholder-slate-400 focus:outline-none font-medium"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[11px] font-mono bg-white border border-slate-200 rounded text-slate-500 shadow-2xs">
            ESC
          </kbd>
        </div>

        {/* Categories / Results */}
        <div 
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-slate-50"
        >
          {results.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">
                No se encontraron resultados para &quot;{query}&quot;
              </p>
              <p className="text-xs text-slate-400">
                Verifique el número de sección o el nombre del integrante territorial.
              </p>
            </div>
          ) : (
            results.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`px-4 py-3 rounded-xl cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                    isSelected 
                      ? 'bg-indigo-50/80 border border-indigo-200/60 shadow-xs' 
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      item.type === 'section'
                        ? 'bg-sky-100 text-sky-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {item.type === 'section' ? (
                        <MapPin className="w-4 h-4" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${item.badgeColor || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.extra && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                        <Phone className="w-3 h-3" />
                        {item.extra}
                      </span>
                    )}
                    <ArrowRight className={`w-4 h-4 transition-transform ${
                      isSelected ? 'text-indigo-600 translate-x-1' : 'text-slate-300'
                    }`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">↓</kbd>
              Navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">↵</kbd>
              Seleccionar
            </span>
          </div>
          <span className="font-medium text-slate-500">
            {results.length} coincidencias encontradas
          </span>
        </div>
      </div>
    </div>
  );
};
