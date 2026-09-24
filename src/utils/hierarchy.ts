import type { TerritorialLeader, HierarchyStats, TerritorialLevel, FilterOptions } from '../types/territory';

export const ORDERED_LEVELS: TerritorialLevel[] = [
  'estatal',        // Nivel 0: Coordinación Estatal
  'distrital',      // Nivel 1: Comité de Organización Distrital (local o federal)
  'territorial',    // Nivel 2: Comité de Organización Territorial (Zona / Ruta)
  'seccional',      // Nivel 3: Coordinador de Sección
  'promotor',       // Nivel 4: Promotor Territorial
  'promovido',      // Nivel 5: Promovido (Ciudadano promovido)
];

/**
 * Returns the child level automatically based on a parent leader's level
 */
export function getChildLevel(parentLevel: TerritorialLevel | null | undefined): TerritorialLevel {
  if (!parentLevel) return 'estatal';
  const idx = ORDERED_LEVELS.indexOf(parentLevel);
  if (idx === -1 || idx >= ORDERED_LEVELS.length - 1) return 'promovido';
  return ORDERED_LEVELS[idx + 1];
}

/**
 * Returns what type of node/account a creator of given level is allowed to create (Strict immediate inferior)
 */
export function getAllowedChildLevel(creatorLevel: TerritorialLevel | 'admin'): TerritorialLevel | null {
  switch (creatorLevel) {
    case 'admin': return 'estatal';
    case 'estatal': return 'distrital';
    case 'distrital': return 'territorial';
    case 'territorial': return 'seccional';
    case 'seccional': return 'promotor';
    case 'promotor': return 'promovido';
    default: return null;
  }
}

/**
 * Returns all levels that a creator of given level is allowed to create:
 * - Superadmin ('admin'): Can create ANY level.
 * - Others: Can ONLY create their immediate inferior level.
 */
export function getAllowedLevelsForCreator(creatorLevel: TerritorialLevel | 'admin'): TerritorialLevel[] {
  if (creatorLevel === 'admin') {
    return [...ORDERED_LEVELS];
  }
  const child = getAllowedChildLevel(creatorLevel);
  return child ? [child] : [];
}


/**
 * Checks if a role can create system user accounts
 */
export function canCreateAccounts(level: TerritorialLevel | 'admin'): boolean {
  return level === 'admin' || level === 'estatal' || level === 'distrital' || level === 'territorial' || level === 'seccional';
}

/**
 * Returns the default operational role for a given territorial level
 */
export function getDefaultRoleForLevel(level: TerritorialLevel): string {
  switch (level) {
    case 'estatal': return 'Coordinación Estatal';
    case 'distrital': return 'Comité de Organización Distrital';
    case 'territorial': return 'Comité de Organización Territorial';
    case 'seccional': return 'Coordinador de Sección';
    case 'promotor': return 'Promotor Territorial';
    case 'promovido': return 'Ciudadano Promovido';
    default: return 'Integrante Territorial';
  }
}


/**
 * Computes bottom-up metrics and automatically derives the pyramid level based on the superior leader
 */
export function calculateHierarchyAggregates(nodes: TerritorialLeader[]): TerritorialLeader[] {
  const nodeMap = new Map<string, TerritorialLeader>(nodes.map(n => [n.id, { ...n }]));
  const childrenMap = new Map<string, string[]>();

  // Map children
  for (const node of nodes) {
    if (node.parentId) {
      const existing = childrenMap.get(node.parentId) || [];
      existing.push(node.id);
      childrenMap.set(node.parentId, existing);
    }
  }

  // Helper for recursive bottom-up aggregation and automatic level assignment
  function processNode(id: string, depth: number = 0): { totalTeam: number; aggCount: number; aggGoal: number } {
    const node = nodeMap.get(id);
    if (!node) return { totalTeam: 0, aggCount: 0, aggGoal: 0 };

    // Respetar el nivel declarado del nodo si ya lo tiene, o asignarlo según profundidad
    if (!node.level) {
      node.level = ORDERED_LEVELS[Math.min(depth, ORDERED_LEVELS.length - 1)];
    }
    node.levelIndex = ORDERED_LEVELS.indexOf(node.level) !== -1 ? ORDERED_LEVELS.indexOf(node.level) : depth;

    // Si es promovido, no tiene cuenta de sistema
    if (node.level === 'promovido') {
      node.hasAccount = false;
    } else if (node.hasAccount === undefined) {
      node.hasAccount = true;
    }

    const childIds = childrenMap.get(id) || [];
    node.directTeamCount = childIds.length;

    let totalTeam = childIds.length;
    let aggCount = node.currentCount;
    let aggGoal = node.metaGoal;

    for (const childId of childIds) {
      const childRes = processNode(childId, depth + 1);
      totalTeam += childRes.totalTeam;
      aggCount += childRes.aggCount;
      aggGoal += childRes.aggGoal;
    }

    node.totalTeamCount = totalTeam;
    node.aggregatedCount = aggCount;
    node.aggregatedGoal = aggGoal;

    // Recalcular estatus dinámicamente si aplica
    if (node.metaGoal > 0) {
      const percentage = (aggCount / aggGoal) * 100;
      if (percentage >= 100) {
        node.status = 'completado';
      } else if (percentage < 30) {
        node.status = 'critico';
      } else {
        node.status = 'en_progreso';
      }
    }

    return { totalTeam, aggCount, aggGoal };
  }

  // Identificar raíces (nodos sin parentId o cuyo parentId no existe en el mapa)
  const roots = nodes.filter(n => n.parentId === null || !nodeMap.has(n.parentId));
  for (const root of roots) {
    processNode(root.id, 0);
  }

  return Array.from(nodeMap.values());
}

/**
 * Given a user's node ID, returns ONLY that node and all its recursive descendants.
 * This guarantees strict hierarchical scoping: users can only see what is below them!
 */
export function getVisibleSubtree(rootId: string | null, nodes: TerritorialLeader[]): TerritorialLeader[] {
  if (!rootId) {
    return nodes; // Superadmin / Vista Global
  }

  const nodeMap = new Map<string, TerritorialLeader>(nodes.map(n => [n.id, n]));
  const rootNode = nodeMap.get(rootId);
  if (!rootNode) return [];

  const childrenMap = new Map<string, string[]>();
  for (const node of nodes) {
    if (node.parentId) {
      const list = childrenMap.get(node.parentId) || [];
      list.push(node.id);
      childrenMap.set(node.parentId, list);
    }
  }

  const visibleList: TerritorialLeader[] = [rootNode];

  function collectDescendants(parentId: string) {
    const kids = childrenMap.get(parentId) || [];
    for (const kidId of kids) {
      const kid = nodeMap.get(kidId);
      if (kid) {
        visibleList.push(kid);
        collectDescendants(kidId);
      }
    }
  }

  collectDescendants(rootId);
  return visibleList;
}

/**
 * Returns overall global statistics across the territorial hierarchy
 */
export function getHierarchyStats(nodes: TerritorialLeader[]): HierarchyStats {
  const levelCounts: Record<TerritorialLevel, number> = {
    estatal: 0,
    distrital: 0,
    territorial: 0,
    seccional: 0,
    promotor: 0,
    promovido: 0,
  };


  const statusCounts: Record<string, number> = {
    completado: 0,
    en_progreso: 0,
    critico: 0,
    vacante: 0,
  };

  let totalGoal = 0;
  let totalAchieved = 0;

  for (const node of nodes) {
    if (levelCounts[node.level] !== undefined) {
      levelCounts[node.level]++;
    }
    if (statusCounts[node.status] !== undefined) {
      statusCounts[node.status]++;
    }
    // Only sum the leaf/individual direct counts to avoid double counting
    totalGoal += node.metaGoal;
    totalAchieved += node.currentCount;
  }

  const overallPercentage = totalGoal > 0 ? Math.round((totalAchieved / totalGoal) * 100) : 0;

  // Find top performers (ratio of currentCount / metaGoal)
  const topPerformers = [...nodes]
    .filter(n => n.metaGoal > 0)
    .sort((a, b) => (b.currentCount / b.metaGoal) - (a.currentCount / a.metaGoal))
    .slice(0, 5);

  const criticalNodes = nodes.filter(n => n.status === 'critico');

  return {
    totalPeople: nodes.length,
    totalGoal,
    totalAchieved,
    overallPercentage,
    levelCounts,
    statusCounts,
    topPerformers,
    criticalNodes,
  };
}

/**
 * Returns the chain of command (ancestor path) from the root down to the selected node
 */
export function getAncestorsPath(nodeId: string, nodes: TerritorialLeader[]): TerritorialLeader[] {
  const nodeMap = new Map<string, TerritorialLeader>(nodes.map(n => [n.id, n]));
  const path: TerritorialLeader[] = [];
  let curr = nodeMap.get(nodeId);

  while (curr) {
    path.unshift(curr);
    curr = curr.parentId ? nodeMap.get(curr.parentId) : undefined;
  }

  return path;
}

/**
 * Returns all direct and indirect descendant IDs for a given node
 */
export function getDescendantIds(nodeId: string, nodes: TerritorialLeader[]): Set<string> {
  const childrenMap = new Map<string, string[]>();
  for (const node of nodes) {
    if (node.parentId) {
      const list = childrenMap.get(node.parentId) || [];
      list.push(node.id);
      childrenMap.set(node.parentId, list);
    }
  }

  const result = new Set<string>();
  function collect(id: string) {
    const kids = childrenMap.get(id) || [];
    for (const kid of kids) {
      result.add(kid);
      collect(kid);
    }
  }

  collect(nodeId);
  return result;
}

/**
 * Filter nodes based on user search and dropdown filters
 */
export function filterNodes(nodes: TerritorialLeader[], options: FilterOptions): TerritorialLeader[] {
  let filtered = [...nodes];

  // If focus node is active, only show the node and its ancestors & descendants
  if (options.focusNodeId) {
    const ancestors = new Set(getAncestorsPath(options.focusNodeId, nodes).map(n => n.id));
    const descendants = getDescendantIds(options.focusNodeId, nodes);
    filtered = filtered.filter(n => n.id === options.focusNodeId || ancestors.has(n.id) || descendants.has(n.id));
  }

  // Text search query
  if (options.searchQuery.trim()) {
    const query = options.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(n => 
      n.name.toLowerCase().includes(query) ||
      n.role.toLowerCase().includes(query) ||
      n.territoryName.toLowerCase().includes(query) ||
      (n.code && n.code.toLowerCase().includes(query)) ||
      (n.phone && n.phone.includes(query))
    );
  }

  // Level filter
  if (options.levelFilter !== 'all') {
    filtered = filtered.filter(n => n.level === options.levelFilter);
  }

  // Status filter
  if (options.statusFilter !== 'all') {
    filtered = filtered.filter(n => n.status === options.statusFilter);
  }

  return filtered;
}

/**
 * Export current hierarchy to a clean CSV
 */
export function exportToCSV(nodes: TerritorialLeader[]): string {
  const headers = [
    'ID',
    'Nombre',
    'Cargo',
    'Nivel',
    'Jurisdicción',
    'Clave Oficial',
    'Líder Superior ID',
    'Meta Individual',
    'Avance Directo',
    'Meta Acumulada',
    'Avance Acumulado',
    'Subordinados Directos',
    'Total Red',
    'Estatus',
    'Teléfono',
    'Tiene Cuenta'
  ];

  const rows = nodes.map(n => [
    `"${n.id}"`,
    `"${n.name.replace(/"/g, '""')}"`,
    `"${n.role.replace(/"/g, '""')}"`,
    `"${n.level}"`,
    `"${n.territoryName.replace(/"/g, '""')}"`,
    `"${n.code || ''}"`,
    `"${n.parentId || ''}"`,
    n.metaGoal,
    n.currentCount,
    n.aggregatedGoal || n.metaGoal,
    n.aggregatedCount || n.currentCount,
    n.directTeamCount || 0,
    n.totalTeamCount || 0,
    `"${n.status}"`,
    `"${n.phone || ''}"`,
    n.hasAccount ? 'SÍ' : 'NO'
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
