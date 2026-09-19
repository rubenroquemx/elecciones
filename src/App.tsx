import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { TerritorialLeader, FilterOptions } from './types/territory';
import type { ElectoralSection, SectionStructure } from './types/sections';
import type { UserAccount } from './types/auth';
import { INITIAL_TERRITORY_DATA } from './data/mockTerritoryData';
import { INITIAL_SECTIONS, CATALOG_BY_SECTION } from './data/mockSectionsData';
import { MOCK_ACCOUNTS } from './data/mockAuthData';
import { 
  calculateHierarchyAggregates, 
  getHierarchyStats, 
  filterNodes, 
  exportToCSV,
  getVisibleSubtree
} from './utils/hierarchy';
import { Sidebar, type MainNavSection, type StructureMode } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { TerritoryFlowCanvas } from './components/TerritoryFlowCanvas';
import { DirectoryTableView } from './components/DirectoryTableView';
import { NodeDetailDrawer } from './components/NodeDetailDrawer';
import { EditLeaderModal } from './components/EditLeaderModal';
import { LevelSummaryBar } from './components/LevelSummaryBar';
import { SectionsCatalogView } from './components/SectionsCatalogView';
import { ExecutiveKpiDesktop } from './components/ExecutiveKpiDesktop';
import { SectionDetailPage } from './components/SectionDetailPage';
import { getStateById, DEFAULT_STATE_ID, DEFAULT_STATE } from './data/statesData';
import {
  fetchLeadersApi,
  saveLeaderApi,
  deleteLeaderApi,
  fetchSectionsApi,
  saveSectionApi,
  addStructureApi,
} from './services/api';

export function App() {
  // Master raw and computed territorial dataset
  const [leadersData, setLeadersData] = useState<TerritorialLeader[]>(() => {
    return calculateHierarchyAggregates(INITIAL_TERRITORY_DATA);
  });

  // Load latest data from PostgreSQL API on mount
  useEffect(() => {
    fetchLeadersApi().then((data) => {
      if (data && data.length > 0) {
        setLeadersData(calculateHierarchyAggregates(data));
      }
    });

    fetchSectionsApi().then((data) => {
      if (data && data.length > 0) {
        setSectionsData(prev => {
          const apiMap = new Map(data.map(s => [s.sectionNumber, s]));
          return prev.map(current => {
            const apiSec = apiMap.get(current.sectionNumber);
            if (!apiSec) return current;
            const existingIds = new Set((current.structures || []).map(st => st.id));
            const newFromApi = (apiSec.structures || []).filter(st => !existingIds.has(st.id));
            return {
              ...apiSec,
              ...current,
              structures: [...(current.structures || []), ...newFromApi],
            };
          });
        });
      }
    });
  }, []);

  // Ensure root URL without /state slugs
  useEffect(() => {
    if (window.location.pathname !== '/' && window.location.pathname !== '') {
      window.history.replaceState(null, '', '/');
    }
  }, []);

  // Authenticated user (defaulting to Carlos Eduardo Mendoza Ruiz - Coordinador Distrital Federal 04)
  const [currentUser, setCurrentUser] = useState<UserAccount>(() => {
    try {
      const saved = localStorage.getItem('territorial_auth_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id !== 'usr-coord-loc-09' && parsed.username !== 'alejandra.morales.loc09') {
          return parsed;
        } else {
          localStorage.removeItem('territorial_auth_user');
        }
      }
    } catch (e) {
      console.error('Error loading saved auth user', e);
    }
    return MOCK_ACCOUNTS[0];
  });

  const handleSelectUser = useCallback((user: UserAccount) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('territorial_auth_user', JSON.stringify(user));
    } catch (e) {
      console.error('Error saving user in localStorage', e);
    }
  }, []);

  const handleLogout = useCallback(() => {
    try {
      localStorage.removeItem('territorial_auth_user');
    } catch (e) {
      console.error('Error removing auth user', e);
    }
    // Switch to default coordinator
    setCurrentUser(MOCK_ACCOUNTS[0]);
  }, []);

  // Registered Electoral Sections with multi-structures
  const [sectionsData, setSectionsData] = useState<ElectoralSection[]>(() => {
    try {
      const saved = localStorage.getItem('territorial_user_sections');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map(parsed.map((s: ElectoralSection) => [s.sectionNumber, s]));
          return INITIAL_SECTIONS.map(s => {
            const userSec = map.get(s.sectionNumber);
            if (!userSec) return s;

            // Preserve initial registered structures from base dataset
            const savedStructures = userSec.structures || [];
            const savedIds = new Set(savedStructures.map((st: SectionStructure) => st.id));
            const missingBase = (s.structures || []).filter(st => !savedIds.has(st.id));
            const finalStructures = [...savedStructures, ...missingBase];

            return {
              ...s,
              ...userSec,
              structures: finalStructures.length > 0 ? finalStructures : (s.structures || []),
            };
          });
        }
      }
    } catch (e) {
      console.warn('Error reading saved sections', e);
    }
    return INITIAL_SECTIONS;
  });

  // Strict information access scoping for sections (RBAC):
  // When Carlos Eduardo (distrital) is active, only sections in his assigned district are accessible!
  const scopedSections = useMemo(() => {
    if (currentUser.isSuperAdmin || currentUser.level === 'admin' || currentUser.level === 'estatal') {
      return sectionsData;
    }
    if (currentUser.level === 'distrital') {
      const isFederal = currentUser.accountRoleLabel?.toLowerCase().includes('federal') ||
                        currentUser.territoryName?.toLowerCase().includes('federal');
      const text = `${currentUser.territoryName} ${currentUser.accountRoleLabel}`;
      const match = text.match(/\b(?:distrito|dto)?\s*(?:local|federal)?\s*0*(\d+)\b/i);
      const distNum = match ? parseInt(match[1], 10) : (isFederal ? 4 : 9);

      return sectionsData.filter(sec => {
        const cat = CATALOG_BY_SECTION.get(sec.sectionNumber);
        if (!cat) return true;
        if (isFederal) {
          return cat.federalDistrict === distNum;
        } else {
          return cat.localDistrict === distNum;
        }
      });
    }
    if (currentUser.level === 'seccional') {
      const match = currentUser.territoryName.match(/\d{3,4}/);
      if (match) {
        const targetSec = match[0].padStart(4, '0');
        return sectionsData.filter(s => s.sectionNumber === targetSec);
      }
    }
    return sectionsData;
  }, [currentUser, sectionsData]);

  // Collapsed branches state
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => {
    const set = new Set<string>();
    INITIAL_TERRITORY_DATA.filter(l => l.level === 'seccional').forEach(l => set.add(l.id));
    return set;
  });

  // Selected leader for drawer inspection
  const [selectedLeaderId, setSelectedLeaderId] = useState<string | null>(null);
  const [detailSectionNumber, setDetailSectionNumber] = useState<string | null>(null);

  // Active State ID
  const [activeStateId, setActiveStateId] = useState<number>(DEFAULT_STATE_ID);

  const activeStateData = useMemo(() => {
    return getStateById(activeStateId) || DEFAULT_STATE;
  }, [activeStateId]);

  const handleStateChange = useCallback((stateId: number) => {
    setActiveStateId(stateId);
  }, []);

  // Active navigation: 'escritorio' | 'estructura' | 'secciones'
  const [activeNav, setActiveNav] = useState<MainNavSection>('escritorio');
  const handleNavChange = useCallback((nav: MainNavSection) => {
    setActiveNav(nav);
    setDetailSectionNumber(null);
  }, []);
  const [structureMode, setStructureMode] = useState<StructureMode>('organigrama');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Filters state
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    levelFilter: 'all',
    statusFilter: 'all',
    validationFilter: 'all',
    focusNodeId: null,
  });

  // Edit / Add modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLeader, setEditingLeader] = useState<TerritorialLeader | null>(null);

  // 1. Re-calculate global aggregates across the master dataset
  const allComputedLeaders = useMemo(() => {
    return calculateHierarchyAggregates(leadersData);
  }, [leadersData]);

  // 2. Strict hierarchical visibility (RBAC):
  // User can ONLY see themselves and what is below them in their descending subtree!
  const visibleLeaders = useMemo(() => {
    return getVisibleSubtree(currentUser.leaderId, allComputedLeaders);
  }, [currentUser.leaderId, allComputedLeaders]);

  // Deselect selected leader ONLY if it was set and is no longer in the visible subtree
  useEffect(() => {
    if (selectedLeaderId !== null && !visibleLeaders.some(l => l.id === selectedLeaderId)) {
      setSelectedLeaderId(null);
    }
  }, [visibleLeaders, selectedLeaderId]);

  // 3. Filtered leaders for the directory table and flow canvas
  const filteredLeaders = useMemo(() => {
    return filterNodes(visibleLeaders, filters);
  }, [visibleLeaders, filters]);

  // 4. Overall statistics scoped strictly to the visible subtree
  const stats = useMemo(() => {
    return getHierarchyStats(visibleLeaders);
  }, [visibleLeaders]);

  // Currently selected leader object
  const selectedLeader = useMemo(() => {
    return visibleLeaders.find(l => l.id === selectedLeaderId) || null;
  }, [visibleLeaders, selectedLeaderId]);

  // Focused leader object (if focus mode active)
  const focusedLeader = useMemo(() => {
    return visibleLeaders.find(l => l.id === filters.focusNodeId) || null;
  }, [visibleLeaders, filters.focusNodeId]);

  // Handlers
  const handleToggleCollapse = useCallback((id: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    setCollapsedIds(new Set());
  }, []);

  const handleCollapseAll = useCallback(() => {
    const withKids = visibleLeaders.filter(l => (l.directTeamCount ?? 0) > 0 && l.parentId !== null);
    setCollapsedIds(new Set(withKids.map(l => l.id)));
  }, [visibleLeaders]);

  const handleSelectLeader = useCallback((leader: TerritorialLeader) => {
    setSelectedLeaderId(leader.id);
  }, []);

  const handleFocusSubtree = useCallback((leaderId: string) => {
    setFilters(prev => ({
      ...prev,
      focusNodeId: prev.focusNodeId === leaderId ? null : leaderId,
    }));
  }, []);

  const handleOpenAddModal = useCallback(() => {
    setEditingLeader(null);
    setIsEditModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback((leader: TerritorialLeader) => {
    setEditingLeader(leader);
    setIsEditModalOpen(true);
  }, []);

  const handleSaveLeader = useCallback((savedLeader: TerritorialLeader) => {
    setLeadersData(prev => {
      const exists = prev.some(l => l.id === savedLeader.id);
      let updated: TerritorialLeader[];
      if (exists) {
        updated = prev.map(l => (l.id === savedLeader.id ? savedLeader : l));
      } else {
        updated = [...prev, savedLeader];
      }
      saveLeaderApi(savedLeader, exists).catch(e => console.warn('Sync API error:', e));
      return calculateHierarchyAggregates(updated);
    });
    setSelectedLeaderId(savedLeader.id);
  }, []);

  const handleDeleteLeader = useCallback((id: string) => {
    if (window.confirm('¿Seguro que deseas eliminar este nodo de la estructura?')) {
      setLeadersData(prev => {
        const target = prev.find(l => l.id === id);
        const newParentId = target?.parentId || null;
        const updated = prev
          .filter(l => l.id !== id)
          .map(l => (l.parentId === id ? { ...l, parentId: newParentId } : l));
        return calculateHierarchyAggregates(updated);
      });
      if (selectedLeaderId === id) {
        setSelectedLeaderId(null);
      }
      if (filters.focusNodeId === id) {
        setFilters(f => ({ ...f, focusNodeId: null }));
      }
      deleteLeaderApi(id).catch(e => console.warn('Delete API error:', e));
    }
  }, [selectedLeaderId, filters.focusNodeId]);

  // Sections handlers
  const handleSaveSection = useCallback((savedSection: ElectoralSection) => {
    setSectionsData(prev => {
      const exists = prev.some(s => s.id === savedSection.id);
      const updated = exists
        ? prev.map(s => (s.id === savedSection.id ? savedSection : s))
        : [savedSection, ...prev];
      try {
        const custom = updated.filter(s => s.structures.length > 0 || (s.notes && s.notes.trim().length > 0));
        localStorage.setItem('territorial_user_sections', JSON.stringify(custom));
      } catch (e) {
        console.warn('Error saving sections to localStorage', e);
      }
      return updated;
    });
    saveSectionApi(savedSection).catch(e => console.warn('Save Section API error:', e));
  }, []);

  const handleAddStructureToSection = useCallback((sectionId: string, newStructure: SectionStructure) => {
    setSectionsData(prev => {
      const updated = prev.map(sec => {
        if (sec.id === sectionId) {
          return {
            ...sec,
            structures: [...sec.structures, newStructure]
          };
        }
        return sec;
      });
      try {
        const custom = updated.filter(s => s.structures.length > 0 || (s.notes && s.notes.trim().length > 0));
        localStorage.setItem('territorial_user_sections', JSON.stringify(custom));
      } catch (e) {
        console.warn('Error saving sections to localStorage', e);
      }
      return updated;
    });
    addStructureApi(sectionId, newStructure).catch(e => console.warn('Add Structure API error:', e));
  }, []);

  const handleSelectStructureToViewTree = useCallback((structure: SectionStructure, section: ElectoralSection) => {
    const matchingLeader = visibleLeaders.find(l => 
      (structure.rootLeaderId && l.id === structure.rootLeaderId) ||
      l.territoryName.includes(section.sectionNumber) ||
      (l.code && l.code.includes(section.sectionNumber)) ||
      l.name.toLowerCase().includes(structure.leaderName.toLowerCase())
    );

    if (matchingLeader) {
      setSelectedLeaderId(matchingLeader.id);
      setFilters(f => ({ ...f, focusNodeId: matchingLeader.id }));
    } else {
      setFilters(f => ({ ...f, searchQuery: section.sectionNumber }));
    }

    setActiveNav('estructura');
    setStructureMode('organigrama');
    setCollapsedIds(new Set());
  }, [visibleLeaders]);

  // Export to CSV scoped to visible subtree
  const handleExportData = useCallback(() => {
    const csvContent = exportToCSV(visibleLeaders);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `estructura_territorial_${currentUser.username}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [visibleLeaders, currentUser.username]);

  // Import JSON structure
  const handleImportData = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name && parsed[0].level) {
          setLeadersData(calculateHierarchyAggregates(parsed));
          alert(`Estructura importada exitosamente con ${parsed.length} integrantes.`);
        } else {
          alert('El archivo no contiene un formato de estructura territorial válido.');
        }
      } catch (err) {
        alert('Error al leer el archivo JSON: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  return (
    <div className="flex h-screen w-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Sidebar Lateral Izquierdo Tradicional */}
      <Sidebar
        activeNav={activeNav}
        onNavChange={handleNavChange}
        structureMode={structureMode}
        onStructureModeChange={setStructureMode}
        currentUser={currentUser}
        visibleCount={visibleLeaders.length}
        sectionsCount={scopedSections.length}
        onOpenAddModal={handleOpenAddModal}
        onExportData={handleExportData}
        onImportData={handleImportData}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        activeStateName={activeStateData.commonName}
        activeStateAbbr={activeStateData.abbr}
      />

      {/* Área Principal Derecha */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header con Breadcrumbs, Switcher de Estructura, Búsqueda y Switcher de Usuario en esquina superior derecha */}
        <TopHeader
          activeNav={activeNav}
          structureMode={structureMode}
          onStructureModeChange={setStructureMode}
          filters={filters}
          onFilterChange={setFilters}
          focusLeaderName={focusedLeader ? `${focusedLeader.name} (${focusedLeader.territoryName})` : undefined}
          onClearFocus={() => setFilters(f => ({ ...f, focusNodeId: null }))}
          onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
          activeStateName={activeStateData.commonName}
          activeStateAbbr={activeStateData.abbr}
          currentUser={currentUser}
          onSelectUser={handleSelectUser}
          visibleCount={visibleLeaders.length}
          onLogout={handleLogout}
        />

        {/* Barra de niveles solo activa en vista Estructura */}
        {activeNav === 'estructura' && (
          <LevelSummaryBar
            levelCounts={stats.levelCounts}
            totalCount={stats.totalPeople}
            currentFilter={filters.levelFilter}
            onSelectLevel={(level) => setFilters(f => ({ ...f, levelFilter: level }))}
          />
        )}

        {/* Contenido Dinámico */}
        <main className="flex-1 relative overflow-hidden flex">
          {/* Vista de Página Completa de Detalle de Sección */}
          {detailSectionNumber ? (
            <SectionDetailPage
              sectionNumber={detailSectionNumber}
              allSections={scopedSections}
              visibleLeaders={visibleLeaders}
              onBack={() => setDetailSectionNumber(null)}
              onAddStructure={handleAddStructureToSection}
            />
          ) : (
            <>
              {/* 1. ESCRITORIO (Tablero de KPIs Oficiales) */}
              {activeNav === 'escritorio' && (
                <ExecutiveKpiDesktop
                  currentUser={currentUser}
                  stats={stats}
                  visibleLeaders={visibleLeaders}
                  sections={scopedSections}
                  activeStateId={activeStateId}
                  onStateChange={handleStateChange}
                  onSelectLeader={handleSelectLeader}
                  onNavigateView={(view) => {
                    if (view === 'flow') {
                      setActiveNav('estructura');
                      setStructureMode('organigrama');
                    } else if (view === 'table') {
                      setActiveNav('estructura');
                      setStructureMode('lista');
                    } else if (view === 'sections') {
                      setActiveNav('secciones');
                    }
                  }}
                  onOpenAddModal={handleOpenAddModal}
                  onViewSectionDetail={(secNum) => {
                    const padded = secNum.padStart(4, '0');
                    const inScope = scopedSections.some(s => s.sectionNumber === secNum || s.sectionNumber === padded);
                    if (inScope) {
                      setDetailSectionNumber(secNum);
                    }
                  }}
                />
              )}

              {/* 2. ESTRUCTURA - MODO ORGANIGRAMA */}
              {activeNav === 'estructura' && structureMode === 'organigrama' && (
                <TerritoryFlowCanvas
                  leaders={filteredLeaders}
                  collapsedIds={collapsedIds}
                  selectedLeader={selectedLeader}
                  onToggleCollapse={handleToggleCollapse}
                  onSelectLeader={handleSelectLeader}
                  onExpandAll={handleExpandAll}
                  onCollapseAll={handleCollapseAll}
                />
              )}

              {/* 2. ESTRUCTURA - MODO LISTA (DIRECTORIO) */}
              {activeNav === 'estructura' && structureMode === 'lista' && (
                <DirectoryTableView
                  leaders={filteredLeaders}
                  allLeaders={visibleLeaders}
                  onSelectLeader={handleSelectLeader}
                  onFocusSubtree={handleFocusSubtree}
                  onEditLeader={handleOpenEditModal}
                  onDeleteLeader={handleDeleteLeader}
                />
              )}

              {/* 3. SECCIONES & MAPAS */}
              {activeNav === 'secciones' && (
                <SectionsCatalogView
                  sections={scopedSections}
                  allLeaders={visibleLeaders}
                  stateAbbr={activeStateData.abbr}
                  onSaveSection={handleSaveSection}
                  onAddStructureToSection={handleAddStructureToSection}
                  onSelectStructureToViewTree={handleSelectStructureToViewTree}
                  onViewSectionDetail={(secNum) => setDetailSectionNumber(secNum)}
                />
              )}
            </>
          )}

          {/* Expediente Territorial Lateral (Drawer) */}
          {selectedLeader && (
            <NodeDetailDrawer
              leader={selectedLeader}
              allLeaders={visibleLeaders}
              onClose={() => setSelectedLeaderId(null)}
              onSelectLeader={handleSelectLeader}
              onFocusSubtree={handleFocusSubtree}
              onEditLeader={handleOpenEditModal}
              isFocused={filters.focusNodeId === selectedLeader?.id}
            />
          )}
        </main>
      </div>

      {/* Modal de Crear / Editar Líder */}
      <EditLeaderModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveLeader}
        editingLeader={editingLeader}
        allLeaders={visibleLeaders}
        currentUser={currentUser}
        availableSections={scopedSections}
      />
    </div>
  );
}

export default App;
