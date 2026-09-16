import dagre from '@dagrejs/dagre';
import { MarkerType } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import type { TerritorialLeader } from '../types/territory';

export const NODE_WIDTH = 300;
export const NODE_HEIGHT = 175;

export interface LayoutedElements {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Computes automated hierarchical Dagre layout for React Flow nodes and edges.
 * Respects collapsed state: if a node is collapsed, its descendants are excluded from the canvas.
 */
export function getLayoutedElements(
  leaders: TerritorialLeader[],
  collapsedIds: Set<string>,
  selectedId: string | null
): LayoutedElements {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: 'TB',
    nodesep: 60,
    ranksep: 90,
    align: 'DL',
  });

  // Determine which nodes are hidden due to an ancestor being collapsed
  const hiddenNodeIds = new Set<string>();
  const childrenMap = new Map<string, string[]>();

  for (const leader of leaders) {
    if (leader.parentId) {
      const list = childrenMap.get(leader.parentId) || [];
      list.push(leader.id);
      childrenMap.set(leader.parentId, list);
    }
  }

  function hideDescendants(parentId: string) {
    const kids = childrenMap.get(parentId) || [];
    for (const kid of kids) {
      hiddenNodeIds.add(kid);
      hideDescendants(kid);
    }
  }

  for (const collapsedId of collapsedIds) {
    hideDescendants(collapsedId);
  }

  // Filter out hidden nodes
  const visibleLeaders = leaders.filter(l => !hiddenNodeIds.has(l.id));
  const visibleLeaderIds = new Set(visibleLeaders.map(l => l.id));

  // Add nodes to dagre
  for (const leader of visibleLeaders) {
    dagreGraph.setNode(leader.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  // Add edges to dagre
  const edges: Edge[] = [];
  for (const leader of visibleLeaders) {
    if (leader.parentId && visibleLeaderIds.has(leader.parentId)) {
      dagreGraph.setEdge(leader.parentId, leader.id);
      const isSelected = selectedId === leader.id || selectedId === leader.parentId;
      edges.push({
        id: `edge-${leader.parentId}-${leader.id}`,
        source: leader.parentId,
        target: leader.id,
        type: 'smoothstep',
        animated: isSelected,
        style: {
          stroke: isSelected ? '#0284c7' : '#94a3b8',
          strokeWidth: isSelected ? 2.5 : 1.5,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isSelected ? '#0284c7' : '#94a3b8',
          width: 14,
          height: 14,
        },
      });
    }
  }

  // Run layout
  dagre.layout(dagreGraph);

  // Build React Flow nodes
  const nodes: Node[] = visibleLeaders.map((leader) => {
    const nodeWithPos = dagreGraph.node(leader.id);
    const hasChildren = (leader.directTeamCount ?? 0) > 0;
    const isCollapsed = collapsedIds.has(leader.id);

    return {
      id: leader.id,
      type: 'territorialNode',
      position: {
        // Dagre uses center as (x, y), convert to top-left for React Flow
        x: nodeWithPos.x - NODE_WIDTH / 2,
        y: nodeWithPos.y - NODE_HEIGHT / 2,
      },
      data: {
        leader,
        hasChildren,
        isCollapsed,
        isSelected: selectedId === leader.id,
        descendantCount: leader.totalTeamCount || 0,
      },
    };
  });

  return { nodes, edges };
}
