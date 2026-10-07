import type { TerritorialLeader, HierarchyStats, TerritorialLevel, FilterOptions } from '../types/territory';

export const ORDERED_LEVELS: TerritorialLevel[] = [
  'campana',          // Nivel 1: Jefe de campaña
  'distrital',        // Nivel 2: Coordinador Distrital
  'zona',             // Nivel 3: Coordinador de Zona
  'responsable_zona', // Nivel 4: Responsable de Zona
  'territorial',      // Nivel 5: Responsable de sección (anterior Coordinador Territorial)
  'promotor',         // Nivel 6: Promotor Territorial
  'promovido',        // Nivel 7: Ciudadano Promovido
];

/**
 * Returns the child level automatically based on a parent leader's level
 */
export function getChildLevel(parentLevel: TerritorialLevel | null | undefined): TerritorialLevel {
  if (!parentLevel) return 'campana';
  const idx = ORDERED_LEVELS.indexOf(parentLevel);
  if (idx === -1 || idx >= ORDERED_LEVELS.length - 1) return 'promovido';
  return ORDERED_LEVELS[idx + 1];
}

/**
 * Returns what type of node/account a creator of given level is allowed to create:
 * - Super admin: 'campana' (Jefe de campaña)
 * - Jefe de campaña: 'distrital' (Coordinador Distrital)
 * - Coordinador Distrital: 'zona' (Coordinador de Zona)
 * - Coordinador de Zona: 'responsable_zona' (Responsable de Zona)
 * - Responsable de Zona: 'territorial' (Responsable de Sección)
 * - Responsable de Sección: 'promotor' (Promotor Territorial)
 * - Promotor Territorial: 'promovido' (Captura promovidos)
 */
export function getAllowedChildLevel(creatorLevel: TerritorialLevel | 'admin'): TerritorialLevel | null {
  switch (creatorLevel) {
    case 'admin': return 'campana';
    case 'campana': return 'distrital';
    case 'distrital': return 'zona';
    case 'zona': return 'responsable_zona';
    case 'responsable_zona': return 'territorial';
    case 'territorial': return 'promotor';
    case 'promotor': return 'promovido';
    // Legacy aliases
    case 'estatal': return 'distrital';
    case 'seccional': return 'promotor';
    default: return null;
  }
}

/**
 * Returns all levels that a creator of given level is allowed to create:
 * Strictly cascading: each role can ONLY create its immediate inferior level.
 */
export function getAllowedLevelsForCreator(creatorLevel: TerritorialLevel | 'admin'): TerritorialLevel[] {
  const child = getAllowedChildLevel(creatorLevel);
  return child ? [child] : [];
}



/**
 * Checks if a role can create system user accounts:
 * - Admin, Jefe de campaña, Coordinador Distrital, Coordinador de Zona, Responsable de Zona, Responsable de Sección.
 * Promotor territorial captures citizen records, does not manage login accounts.
 */
export function canCreateAccounts(level: TerritorialLevel | 'admin'): boolean {
  return level === 'admin' || 
    level === 'campana' || 
    level === 'distrital' || 
    level === 'zona' || 
    level === 'responsable_zona' || 
    level === 'territorial' || 
    level === 'estatal' || 
    level === 'seccional';
}

/**
 * Returns the default operational role for a given territorial level
 */
export function getDefaultRoleForLevel(level: TerritorialLevel): string {
  switch (level) {
    case 'campana': return 'Jefe de Campaña';
    case 'distrital': return 'Coordinador Distrital';
    case 'zona': return 'Coordinador de Zona';
    case 'responsable_zona': return 'Responsable de Zona';
    case 'territorial': return 'Responsable de Sección';
    case 'promotor': return 'Promotor Territorial';
    case 'promovido': return 'Ciudadano Promovido';
    case 'estatal': return 'Jefe de Campaña';
    case 'seccional': return 'Responsable de Sección';
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
  if (!rootNode) {
    return [];
  }

  const childrenMap = new Map<string, string[]>();
  for (const node of nodes) {
    if (node.parentId) {
      const list = childrenMap.get(node.parentId) || [];
      list.push(node.id);
      childrenMap.set(node.parentId, list);
    }
  }

  const visibleList: TerritorialLeader[] = [rootNode];
  const addedIds = new Set<string>([rootNode.id]);

  function collectDescendants(parentId: string) {
    const kids = childrenMap.get(parentId) || [];
    for (const kidId of kids) {
      if (addedIds.has(kidId)) continue;
      const kid = nodeMap.get(kidId);
      if (kid) {
        visibleList.push(kid);
        addedIds.add(kid.id);
        collectDescendants(kidId);
      }
    }
  }

  collectDescendants(rootId);

  // Resiliencia para promotores territoriales (ej. Ruben Roque):
  // Si existen promovidos registrados en su sección electoral o capturados en campo que hayan
  // quedado con parentId nulo por sincronización de base de datos, incluirlos en su expediente.
  if (rootNode.level === 'promotor') {
    const assignedSec = rootNode.electoralSection || (rootNode.assignedSections && rootNode.assignedSections[0]) || '0416';
    for (const node of nodes) {
      if (
        node.level === 'promovido' &&
        !addedIds.has(node.id) &&
        (node.parentId === rootId ||
         (node.electoralSection === assignedSec && (!node.parentId || node.parentId === 'null')))
      ) {
        visibleList.push({
          ...node,
          parentId: rootId,
        });
        addedIds.add(node.id);
      }
    }
  }

  return visibleList;
}

/**
 * Returns overall global statistics across the territorial hierarchy
 */
export function getHierarchyStats(nodes: TerritorialLeader[]): HierarchyStats {
  const levelCounts: Record<TerritorialLevel, number> = {
    campana: 0,
    distrital: 0,
    zona: 0,
    responsable_zona: 0,
    territorial: 0,
    promotor: 0,
    promovido: 0,
    estatal: 0,
    seccional: 0,
  };


  const statusCounts: Record<string, number> = {
    completado: 0,
    en_progreso: 0,
    critico: 0,
    vacante: 0,
  };

  const parentIds = new Set(nodes.map(n => n.parentId).filter(Boolean));

  let totalGoal = 0;
  let totalAchieved = 0;

  for (const node of nodes) {
    if (levelCounts[node.level] !== undefined) {
      levelCounts[node.level]++;
    }
    if (statusCounts[node.status] !== undefined) {
      statusCounts[node.status]++;
    }
    // Only sum the leaf/individual direct counts to avoid double counting parent aggregates
    const hasChildren = parentIds.has(node.id);
    if (!hasChildren) {
      totalAchieved += node.currentCount;
      totalGoal += node.metaGoal;
    }
  }

  // If the root node has a specific defined goal that encapsulates the sub-tree
  const rootNode = nodes.find(n => !n.parentId || !nodes.some(m => m.id === n.parentId));
  if (rootNode && rootNode.metaGoal > totalGoal) {
    totalGoal = rootNode.metaGoal;
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
