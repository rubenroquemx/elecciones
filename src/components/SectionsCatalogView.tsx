import React, { useState, useMemo, useEffect } from 'react';
import type { ElectoralSection, SectionStructure } from '../types/sections';
import { SectionCard } from './SectionCard';
import { FullSectionsMapView } from './FullSectionsMapView';
import { CreateSectionModal } from './CreateSectionModal';
import { AddStructureToSectionModal } from './AddStructureToSectionModal';
import { 
  MapPin, 
  Search, 
  PlusCircle, 
  Layers, 
  Users, 
  Target, 
  ChevronLeft, 
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface SectionsCatalogViewProps {
  sections: ElectoralSection[];
  onSaveSection: (section: ElectoralSection) => void;
  onAddStructureToSection: (sectionId: string, structure: SectionStructure) => void;
  onSelectStructureToViewTree: (structure: SectionStructure, section: ElectoralSection) => void;
  onDeleteSection?: (sectionId: string) => void;
  onViewSectionDetail?: (sectionNumber: string) => void;
}

export const SectionsCatalogView: React.FC<SectionsCatalogViewProps> = ({
  sections,
  onSaveSection,
  onAddStructureToSection,
  onSelectStructureToViewTree,
  onDeleteSection,
  onViewSectionDetail,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMunicipio, setSelectedMunicipio] = useState<string>('TODOS');
  const [selectedTipo, setSelectedTipo] = useState<string>('TODOS');
  const [onlyWithStructures, setOnlyWithStructures] = useState<boolean>(false);
  const [displayMode, setDisplayMode] = useState<'cards' | 'map'>('cards');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12; // 12 cards per page for optimal performance and map fluidity

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<ElectoralSection | null>(null);

  const [isAddStructureModalOpen, setIsAddStructureModalOpen] = useState(false);
  const [targetSectionForStructure, setTargetSectionForStructure] = useState<ElectoralSection | null>(null);

  // Available municipalities in current registered sections
  const municipiosList = useMemo(() => {
    const set = new Set(sections.map(s => s.municipio));
    return ['TODOS', ...Array.from(set).sort()];
  }, [sections]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedMunicipio, selectedTipo, onlyWithStructures]);

  // Filtered sections
  const filteredSections = useMemo(() => {
    return sections.filter(sec => {
      const matchSearch = 
        sec.sectionNumber.includes(searchTerm.trim()) ||
        sec.municipio.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sec.distritoLocal.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sec.structures.some(s => s.leaderName.toLowerCase().includes(searchTerm.toLowerCase()) || s.name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchMuni = selectedMunicipio === 'TODOS' || sec.municipio === selectedMunicipio;
      const matchTipo = selectedTipo === 'TODOS' || sec.tipo === selectedTipo;
      const matchStructs = !onlyWithStructures || sec.structures.length > 0;

      return matchSearch && matchMuni && matchTipo && matchStructs;
    });
  }, [sections, searchTerm, selectedMunicipio, selectedTipo, onlyWithStructures]);

  // Paginated slice
  const totalPages = Math.ceil(filteredSections.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedSections = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredSections.slice(start, start + pageSize);
  }, [filteredSections, safePage, pageSize]);

  // Aggregate statistics
  const sectionsWithStructuresCount = useMemo(() => sections.filter(s => s.structures.length > 0).length, [sections]);
  const totalNominal = useMemo(() => sections.reduce((sum, s) => sum + s.nominalList, 0), [sections]);
  const totalStructures = useMemo(() => sections.reduce((sum, s) => sum + s.structures.length, 0), [sections]);
  const totalPromoted = useMemo(() => {
    return sections.reduce((sum, sec) => {
      return sum + sec.structures.reduce((stSum, s) => stSum + s.currentCount, 0);
    }, 0);
  }, [sections]);

  const handleOpenAddStructure = (sectionId: string) => {
    const sec = sections.find(s => s.id === sectionId);
    if (sec) {
      setTargetSectionForStructure(sec);
      setIsAddStructureModalOpen(true);
    }
  };

  const handleSaveStructure = (structure: SectionStructure) => {
    if (targetSectionForStructure) {
      onAddStructureToSection(targetSectionForStructure.id, structure);
    }
  };

  return (
    <div className="flex-1 overflow-auto p-6 bg-slate-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Secciones Electorales & Cartografía INE
              </h1>
              <span className="text-[11px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-full">
                1,144 Secciones de Tabasco
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Catálogo cartográfico completo con polígonos perimetrales oficiales del INE para los 17 municipios de Tabasco
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Modo de Vista: Tarjetas vs Mapa OSM */}
            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setDisplayMode('cards')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  displayMode === 'cards'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Tarjetas</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('map')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  displayMode === 'map'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Mapa OpenStreetMap</span>
              </button>
            </div>

            {/* Action button */}
            <button
              type="button"
              onClick={() => {
                setEditingSection(null);
                setIsCreateModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all self-start sm:self-auto hover:shadow"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nueva Sección o Estructura</span>
            </button>
          </div>
        </div>

        {/* Global Overview KPI Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs">
            <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-sky-600" /> Total Cartografía INE
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-bold text-slate-900">{sections.length.toLocaleString()}</span>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">100% Estado</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs">
            <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" /> Secciones con Estructura
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-bold text-indigo-700">{sectionsWithStructuresCount}</span>
              <span className="text-[10px] text-slate-400">({totalStructures} estructuras)</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs">
            <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-600" /> Padrón Estatal Estimado
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-bold text-slate-900">{totalNominal.toLocaleString()}</span>
              <span className="text-[10px] text-slate-400">electores</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs">
            <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-rose-600" /> Avance Reportado
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-bold text-emerald-600">{totalPromoted.toLocaleString()}</span>
              <span className="text-[10px] text-slate-400">contactados</span>
            </div>
          </div>
        </div>

        {displayMode === 'map' ? (
          /* Visor Cartográfico General de Secciones OpenStreetMap dentro de la misma página */
          <FullSectionsMapView
            sections={filteredSections}
            onOpenAddStructure={handleOpenAddStructure}
            onSelectStructureToViewTree={onSelectStructureToViewTree}
            onEditSection={(sec) => {
              setEditingSection(sec);
              setIsCreateModalOpen(true);
            }}
          />
        ) : (
          <>
        {/* Filter & Search Bar */}
        <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search box */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar cualquier sección de Tabasco (ej. 0234, 0480, 0089, 0603)..."
                className="w-full bg-slate-50 text-slate-800 pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-sky-500 focus:bg-white"
              />
            </div>

            {/* Municipality Filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500 whitespace-nowrap">Municipio:</span>
              <select
                value={selectedMunicipio}
                onChange={(e) => setSelectedMunicipio(e.target.value)}
                className="bg-slate-50 text-slate-800 px-2.5 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer w-full sm:w-48"
              >
                {municipiosList.map(m => (
                  <option key={m} value={m}>{m === 'TODOS' ? 'Todos los municipios (17)' : m}</option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500 whitespace-nowrap">Tipo:</span>
              <select
                value={selectedTipo}
                onChange={(e) => setSelectedTipo(e.target.value)}
                className="bg-slate-50 text-slate-800 px-2.5 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer w-full sm:w-36"
              >
                <option value="TODOS">Todos los tipos</option>
                <option value="Urbana">Urbana</option>
                <option value="Rural">Rural</option>
                <option value="Mixta">Mixta</option>
              </select>
            </div>
          </div>

          {/* Quick Scope Filter & Pagination Navigation Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
            {/* Quick scope tabs */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOnlyWithStructures(false)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  !onlyWithStructures
                    ? 'bg-sky-600 text-white font-bold shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
                }`}
              >
                Ver Todas las 1,144 Secciones
              </button>
              <button
                type="button"
                onClick={() => setOnlyWithStructures(true)}
                className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  onlyWithStructures
                    ? 'bg-sky-600 text-white font-bold shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Solo con Estructuras ({sectionsWithStructuresCount})</span>
              </button>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-slate-500 font-medium">
                Mostrando <strong>{paginatedSections.length}</strong> de <strong>{filteredSections.length}</strong> • Pág. {safePage} de {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="p-1 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 rounded-md border border-slate-200 shadow-2xs"
                  title="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="p-1 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 rounded-md border border-slate-200 shadow-2xs"
                  title="Página siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section Cards Grid */}
        {filteredSections.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
            <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No se encontraron secciones electorales</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              No hay registros que coincidan con los filtros aplicados.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedMunicipio('TODOS');
                setSelectedTipo('TODOS');
                setOnlyWithStructures(false);
              }}
              className="mt-4 px-4 py-2 text-xs font-semibold text-sky-600 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors"
            >
              Limpiar filtros de búsqueda
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedSections.map(section => (
              <SectionCard
                key={section.id}
                section={section}
                onAddStructure={handleOpenAddStructure}
                onSelectStructureToViewTree={onSelectStructureToViewTree}
                onEditSection={(sec) => {
                  setEditingSection(sec);
                  setIsCreateModalOpen(true);
                }}
                onDeleteSection={onDeleteSection}
                onViewSectionDetail={onViewSectionDetail}
              />
            ))}
          </div>
        )}

        {/* Bottom Pagination for convenience */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-xl shadow-xs text-xs">
            <span className="text-slate-500">
              Página <strong>{safePage}</strong> de <strong>{totalPages}</strong> ({filteredSections.length} secciones en total)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 rounded-lg border border-slate-200 shadow-2xs font-semibold"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Anterior
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 rounded-lg border border-slate-200 shadow-2xs font-semibold"
              >
                Siguiente <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
          </>
        )}
      </div>

      {/* Modals */}
      <CreateSectionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={onSaveSection}
        editingSection={editingSection}
      />

      <AddStructureToSectionModal
        isOpen={isAddStructureModalOpen}
        sectionNumber={targetSectionForStructure?.sectionNumber || ''}
        onClose={() => setIsAddStructureModalOpen(false)}
        onSave={handleSaveStructure}
      />
    </div>
  );
};
