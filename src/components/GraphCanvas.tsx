import React, { useId, useRef } from "react";
import { Toolbar } from "@/components/Toolbar";
import { GRAPH_STYLE, SELECTION_RING_RADIUS } from "@/constants/graph";
import { GRID_CONFIG } from "@/constants/grid";
import { computeEdgeEndpoints } from "@/lib/edges";
import type { Edge, EdgeId, EditMode, Node, NodeId } from "@/types/graph";

type GraphCanvasProps = {
  nodes: Node[];
  edges: Edge[];
  mode: EditMode;
  onCanvasClick: (x: number, y: number) => void;
  onModeChange: (mode: EditMode) => void;
  onNodeClick: (nodeId: NodeId) => void;
  edgeStartNodeId: NodeId | null;
  onNodePositionChange: (nodeId: NodeId, x: number, y: number) => void;
  onNodeDelete: (nodeId: NodeId) => void;
  onEdgeDelete: (edgeId: EdgeId) => void;
};

export function GraphCanvas({
  nodes,
  edges,
  mode,
  onCanvasClick,
  onModeChange,
  onNodeClick,
  edgeStartNodeId,
  onNodePositionChange,
  onNodeDelete,
  onEdgeDelete,
}: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const draggingNodeIdRef = useRef<NodeId | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const uniqueId = useId().replace(/:/g, "");
  const arrowMarkerId = `${uniqueId}-arrow`;
  const gridPatternId = `${uniqueId}-grid`;

  const handleSvgClick = (
    event: React.MouseEvent<SVGSVGElement, MouseEvent>,
  ) => {
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    onCanvasClick(x, y);
  };

  const handleNodeClick = (
    event: React.MouseEvent<SVGGElement, MouseEvent>,
    nodeId: NodeId,
  ) => {
    event.stopPropagation();
    const isAddingEdge = mode === "add-edge" || mode === "add-directed-edge";
    if (isAddingEdge) {
      onNodeClick(nodeId);
      return;
    }
    if (mode === "delete") {
      onNodeDelete(nodeId);
    }
  };

  const handleEdgeClick = (
    event: React.MouseEvent<SVGLineElement, MouseEvent>,
    edgeId: EdgeId,
  ) => {
    if (mode !== "delete") return;
    event.stopPropagation();
    onEdgeDelete(edgeId);
  };

  const handleNodeMouseDown = (
    event: React.MouseEvent<SVGGElement, MouseEvent>,
    node: Node,
  ) => {
    if (mode !== "idle") return;
    if (event.button !== 0) return; // LMB
    event.stopPropagation();
    event.preventDefault();

    draggingNodeIdRef.current = node.id;

    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;

    dragOffsetRef.current = {
      x: pointerX - node.x,
      y: pointerY - node.y,
    };
  };

  const updateDraggingNodePosition = (clientX: number, clientY: number) => {
    if (mode !== "idle") return;
    const nodeId = draggingNodeIdRef.current;
    const svg = svgRef.current;
    if (!nodeId || !svg) return;

    const rect = svg.getBoundingClientRect();
    const pointerX = clientX - rect.left;
    const pointerY = clientY - rect.top;
    const offset = dragOffsetRef.current ?? { x: 0, y: 0 };

    onNodePositionChange(nodeId, pointerX - offset.x, pointerY - offset.y);
  };

  const stopDragging = () => {
    draggingNodeIdRef.current = null;
    dragOffsetRef.current = null;
  };

  const handleMouseMove = (
    event: React.MouseEvent<SVGSVGElement, MouseEvent>,
  ) => updateDraggingNodePosition(event.clientX, event.clientY);

  const handleMouseUp = () => {
    if (draggingNodeIdRef.current) {
      stopDragging();
    }
  };

  const handleMouseLeave = () => {
    if (draggingNodeIdRef.current) {
      stopDragging();
    }
  };

  return (
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        onClick={handleSvgClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className={`h-full w-full bg-neutral-100 ${mode === "add-node" ? "cursor-crosshair" : "cursor-default"}`}
      >
        <defs>
          <pattern
            id={gridPatternId}
            width={GRID_CONFIG.cellSize}
            height={GRID_CONFIG.cellSize}
            patternUnits="userSpaceOnUse"
          >
            <rect
              width={GRID_CONFIG.cellSize}
              height={GRID_CONFIG.cellSize}
              fill={GRID_CONFIG.backgroundColor}
            />
            <path
              d={`M ${GRID_CONFIG.cellSize} 0 L 0 0 0 ${GRID_CONFIG.cellSize}`}
              fill="none"
              stroke={GRID_CONFIG.lineColor}
              strokeWidth={GRID_CONFIG.lineWidth}
            />
          </pattern>
          <marker
            id={arrowMarkerId}
            markerWidth={GRAPH_STYLE.arrowMarker.width}
            markerHeight={GRAPH_STYLE.arrowMarker.height}
            refX={GRAPH_STYLE.arrowMarker.refX}
            refY={GRAPH_STYLE.arrowMarker.refY}
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d={GRAPH_STYLE.arrowMarker.path} fill="black" />
          </marker>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${gridPatternId})`} />
        {edges.map((edge) => {
          const from = nodes.find((n) => n.id === edge.from);
          const to = nodes.find((n) => n.id === edge.to);
          if (!from || !to) return null;
          const { startX, startY, endX, endY } = computeEdgeEndpoints(
            from,
            to,
            Boolean(edge.isDirected),
          );

          return (
            <line
              key={edge.id}
              x1={startX}
              y1={startY}
              x2={endX}
              y2={endY}
              stroke="black"
              strokeWidth={
                mode === "delete"
                  ? GRAPH_STYLE.edgeStrokeWidth.delete
                  : GRAPH_STYLE.edgeStrokeWidth.default
              }
              className={mode === "delete" ? "cursor-pointer" : ""}
              onClick={(event) => handleEdgeClick(event, edge.id)}
              markerEnd={edge.isDirected ? `url(#${arrowMarkerId})` : undefined}
            />
          );
        })}

        {nodes.map((node) => (
          <g
            key={node.id}
            onClick={(event) => handleNodeClick(event, node.id)}
            onMouseDown={(event) => handleNodeMouseDown(event, node)}
            className={
              mode === "idle"
                ? "cursor-grab active:cursor-grabbing"
                : "cursor-pointer"
            }
          >
            {edgeStartNodeId === node.id ? (
              <circle
                cx={node.x}
                cy={node.y}
                r={SELECTION_RING_RADIUS}
                fill="none"
                stroke="#4f46e5"
                strokeWidth={2}
                className="transition-opacity"
              />
            ) : null}
            <circle
              cx={node.x}
              cy={node.y}
              r={GRAPH_STYLE.nodeRadius}
              fill="white"
              stroke="black"
              strokeWidth={edgeStartNodeId === node.id ? 3 : 1}
            />
            <text
              x={node.x}
              y={node.y}
              textAnchor="middle"
              dy="0.35em"
              fontSize={12}
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
        <Toolbar
          className="pointer-events-auto"
          mode={mode}
          onModeChange={onModeChange}
        />
      </div>
    </div>
  );
}
