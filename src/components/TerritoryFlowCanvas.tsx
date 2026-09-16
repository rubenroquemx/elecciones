import React, { useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant,
} from '@xyflow/react';
import type { Node } from '@xyflow/react';
import type { TerritorialLeader } from '../types/territory';
import { TerritorialNodeCard } from './TerritorialNodeCard';
import { getLayoutedElements } from '../utils/layout';
import { LEVEL_CONFIG } from '../data/mockTerritoryData';
import { Maximize2, Minimize2, RefreshCw, Layers } from 'lucide-react';

interface TerritoryFlowCanvasProps {
  leaders: TerritorialLeader[];
  collapsedIds: Set<string>;
  selectedLeader: TerritorialLeader | null;
  onToggleCollapse: (id: string) => void;
  onSelectLeader: (leader: TerritorialLeader) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

const nodeTypes = {
  territorialNode: TerritorialNodeCard,
};

const FlowInner: React.FC<TerritoryFlowCanvasProps> = ({
  leaders,
  collapsedIds,
  selectedLeader,
  onToggleCollapse,
  onSelectLeader,
  onExpandAll,
  onCollapseAll,
}) => {
  const { fitView } = useReactFlow();

  // Compute layout with Dagre
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    return getLayoutedElements(leaders, collapsedIds, selectedLeader?.id || null);
  }, [leaders, collapsedIds, selectedLeader?.id]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  // Sync state when layout recalculates
  useEffect(() => {
    // Inject event handlers into node data
    const nodesWithHandlers = layoutedNodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        onToggleCollapse,
        onSelectNode: onSelectLeader,
      },
    }));

    setNodes(nodesWithHandlers);
    setEdges(layoutedEdges);

    // Smoothly re-center view on update
    const timeout = setTimeout(() => {
      fitView({ padding: 0.2, duration: 400 });
    }, 50);

    return () => clearTimeout(timeout);
  }, [layoutedNodes, layoutedEdges, onToggleCollapse, onSelectLeader, setNodes, setEdges, fitView]);

  return (
    <div className="relative w-full h-full bg-slate-100/60">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.15}
        maxZoom={1.6}
        defaultEdgeOptions={{ type: 'smoothstep' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="#cbd5e1" />
        <Controls 
          showInteractive={false} 
          className="!bg-white !border !border-slate-200 !text-slate-700 !rounded-xl !shadow-md !overflow-hidden" 
        />
        <MiniMap
          nodeStrokeWidth={3}
          nodeColor={(node: Node) => {
            const l = (node.data as any)?.leader as TerritorialLeader;
            if (l.level === 'distrital') return '#6366f1';
            if (l.level === 'territorial') return '#06b6d4';
            if (l.level === 'seccional') return '#f59e0b';
            if (l.level === 'promotor') return '#10b981';
            if (l.level === 'promovido') return '#64748b';
            return '#64748b';
          }}
          className="!bg-white !border !border-slate-200 !rounded-xl !shadow-lg"
          maskColor="rgba(241, 245, 249, 0.75)"
        />
      </ReactFlow>

      {/* Floating Canvas Controls (Top Right) */}
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-white/95 backdrop-blur border border-slate-200 p-1.5 rounded-xl shadow-md z-10">
        <button
          type="button"
          onClick={onExpandAll}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          title="Expandir todas las ramas de la pirámide"
        >
          <Maximize2 className="w-3.5 h-3.5 text-sky-600" />
          <span>Expandir Todo</span>
        </button>

        <div className="w-px h-4 bg-slate-200" />

        <button
          type="button"
          onClick={onCollapseAll}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          title="Colapsar hacia los niveles superiores"
        >
          <Minimize2 className="w-3.5 h-3.5 text-amber-600" />
          <span>Colapsar Subniveles</span>
        </button>

        <div className="w-px h-4 bg-slate-200" />

        <button
          type="button"
          onClick={() => fitView({ padding: 0.2, duration: 400 })}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          title="Centrar y ajustar pantalla"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Floating Level Legend (Bottom Left) */}
      <div className="absolute bottom-4 left-4 hidden md:flex flex-col gap-1.5 bg-white/95 backdrop-blur border border-slate-200 px-3.5 py-2.5 rounded-xl shadow-md z-10 text-[11px] pointer-events-auto">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-semibold text-slate-600 text-[10px] uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-3 h-3 text-sky-600" /> Niveles Territoriales
          </span>
          <span className="text-[10px] text-slate-500">
            Total: <strong className="text-slate-800">{leaders.length}</strong>
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5">
          {Object.entries(LEVEL_CONFIG).map(([key, cfg]) => {
            const count = leaders.filter(l => l.level === key).length;
            return (
              <div key={key} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${cfg.border.replace('border-', 'bg-')}`} />
                <span className="text-slate-700 truncate">
                  {cfg.label.replace('Coordinación ', '')}
                </span>
                <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-100 px-1 rounded">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const TerritoryFlowCanvas: React.FC<TerritoryFlowCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <FlowInner {...props} />
    </ReactFlowProvider>
  );
};
