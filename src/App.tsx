import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { TerritorialLeader, FilterOptions } from './types/territory';
import type { ElectoralSection, SectionStructure } from './types/sections';
import type { UserAccount } from './types/auth';
import { INITIAL_TERRITORY_DATA } from './data/mockTerritoryData';
import { INITIAL_SECTIONS } from './data/mockSectionsData';
import { MOCK_ACCOUNTS } from './data/mockAuthData';
import { 
  calculateHierarchyAggregates, 
  getHierarchyStats, 
  filterNodes, 
  exportToCSV,
  getVisibleSubtree
} from './utils/hierarchy';
import { Header } from './components/Header';
import { TerritoryFlowCanvas } from './components/TerritoryFlowCanvas';
import { DirectoryTableView } from './components/DirectoryTableView';
import { StatsDashboardView } from './components/StatsDashboardView';
import { NodeDetailDrawer } from './components/NodeDetailDrawer';
import { EditLeaderModal } from './components/EditLeaderModal';
import { LevelSummaryBar } from './components/LevelSummaryBar';
import { SectionsCatalogView } from './components/SectionsCatalogView';
import { ExecutiveKpiDesktop } from './components/ExecutiveKpiDesktop';
import { LoginPage } from './components/LoginPage';

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
        setSectionsData(data);
      }
    });
  }, []);

  // Authenticated user via Google (persisted in localStorage)
  const [authenticatedUser, setAuthenticatedUser] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem('territorial_auth_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading saved auth user', e);
    }
    return null;
  });

  // Active user account for RBAC visibility and creation rules
  const [currentUser, setCurrentUser] = useState<UserAccount>(() => {
    return authenticatedUser || MOCK_ACCOUNTS[0];
  });

  const handleLoginSuccess = useCallback((user: UserAccount) => {
    try {
      localStorage.setItem('territorial_auth_user', JSON.stringify(user));
    } catch (e) {
      console.error('Error saving auth user', e);
    }
    setAuthenticatedUser(user);
    setCurrentUser(user);
  }, []);

  const handleLogout = useCallback(() => {
    try {
      localStorage.removeItem('territorial_auth_user');
    } catch (e) {
      console.error('Error removing auth user', e);
    }
    setAuthenticatedUser(null);
  }, []);

  // Registered Electoral Sections with multi-structures
  const [sectionsData, setSectionsData] = useState<ElectoralSection[]>(INITIAL_SECTIONS);

  // Collapsed branches state
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => {
    const set = new Set<string>();
    INITIAL_TERRITORY_DATA.filter(l => l.level === 'seccional').forEach(l => set.add(l.id));
    return set;
  });

  // Selected leader for drawer inspection
  const [selectedLeaderId, setSelectedLeaderId] = useState<string | null>('dist-loc-04');

  // Active view: KPIs Desktop / Flow / Table / Stats / Sections
  const [currentView, setCurrentView] = useState<'kpis' | 'flow' | 'table' | 'stats' | 'sections'>('kpis');


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

  // Reset selected leader if current selection falls outside visible subtree
  useEffect(() => {
    if (visibleLeaders.length > 0) {
      if (!selectedLeaderId || !visibleLeaders.some(l => l.id === selectedLeaderId)) {
        setSelectedLeaderId(visibleLeaders[0].id);
      }
    } else {
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
    // Collapse all nodes that have children except root
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
      // Async persist to PostgreSQL
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
      // Async persist to PostgreSQL
      deleteLeaderApi(id).catch(e => console.warn('Delete API error:', e));
    }
  }, [selectedLeaderId, filters.focusNodeId]);

  // Sections handlers
  const handleSaveSection = useCallback((savedSection: ElectoralSection) => {
    setSectionsData(prev => {
      const exists = prev.some(s => s.id === savedSection.id);
      if (exists) {
        return prev.map(s => (s.id === savedSection.id ? savedSection : s));
      }
      return [savedSection, ...prev];
    });
    // Async persist to PostgreSQL
    saveSectionApi(savedSection).catch(e => console.warn('Save Section API error:', e));
  }, []);

  const handleAddStructureToSection = useCallback((sectionId: string, newStructure: SectionStructure) => {
    setSectionsData(prev => {
      return prev.map(sec => {
        if (sec.id === sectionId) {
          return {
            ...sec,
            structures: [...sec.structures, newStructure]
          };
        }
        return sec;
      });
    });
    // Async persist to PostgreSQL
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

    setCurrentView('flow');
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

  if (!authenticatedUser) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        allLeaders={allComputedLeaders}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Top Header & Search Navigation */}
      <Header
        currentView={currentView}
        onViewChange={setCurrentView}
        filters={filters}
        onFilterChange={setFilters}
        onOpenAddModal={handleOpenAddModal}
        onExportData={handleExportData}
        onImportData={handleImportData}
        focusLeaderName={focusedLeader ? `${focusedLeader.name} (${focusedLeader.territoryName})` : undefined}
        onClearFocus={() => setFilters(f => ({ ...f, focusNodeId: null }))}
        sectionsCount={sectionsData.length}
        currentUser={currentUser}
        onSelectUser={setCurrentUser}
        visibleCount={visibleLeaders.length}
        onLogout={handleLogout}
      />

      {/* Panel de Conteo y Filtro Rápido por Nivel Territorial (solo en Organigrama y Directorio) */}
      {(currentView === 'flow' || currentView === 'table') && (
        <LevelSummaryBar
          levelCounts={stats.levelCounts}
          totalCount={stats.totalPeople}
          currentFilter={filters.levelFilter}
          onSelectLevel={(level) => setFilters(f => ({ ...f, levelFilter: level }))}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden flex">
        {currentView === 'kpis' && (
          <ExecutiveKpiDesktop
            currentUser={currentUser}
            stats={stats}
            visibleLeaders={visibleLeaders}
            sections={sectionsData}
            onSelectLeader={handleSelectLeader}
            onNavigateView={setCurrentView}
            onOpenAddModal={handleOpenAddModal}
          />
        )}

        {currentView === 'flow' && (
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

        {currentView === 'table' && (
          <DirectoryTableView
            leaders={filteredLeaders}
            allLeaders={visibleLeaders}
            onSelectLeader={handleSelectLeader}
            onFocusSubtree={handleFocusSubtree}
            onEditLeader={handleOpenEditModal}
            onDeleteLeader={handleDeleteLeader}
          />
        )}

        {currentView === 'stats' && (
          <StatsDashboardView
            stats={stats}
            leaders={visibleLeaders}
            onSelectLeader={handleSelectLeader}
          />
        )}

        {currentView === 'sections' && (
          <SectionsCatalogView
            sections={sectionsData}
            onSaveSection={handleSaveSection}
            onAddStructureToSection={handleAddStructureToSection}
            onSelectStructureToViewTree={handleSelectStructureToViewTree}
          />
        )}

        {/* Slide-out Leader Inspector Drawer */}
        {(currentView === 'flow' || currentView === 'table') && (
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


      {/* Add / Edit Leader Modal */}
      <EditLeaderModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveLeader}
        editingLeader={editingLeader}
        allLeaders={visibleLeaders}
        currentUser={currentUser}
      />
    </div>
  );
}

export default App;
