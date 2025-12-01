import React, { useEffect, useId, useRef } from "react";
import { Toolbar } from "@/components/Toolbar";
import { GRAPH_STYLE, SELECTION_RING_RADIUS } from "@/constants/graph";
import { GRID_CONFIG } from "@/constants/grid";
import { snapToGrid } from "@/lib/grid";
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
  onEdgeCurvatureChange: (edgeId: EdgeId, offset: number) => void;
};

type Point = { x: number; y: number };

const evaluateQuadraticPoint = (p0: Point, p1: Point, p2: Point, t: number) => {
  const oneMinusT = 1 - t;
  const x =
    oneMinusT * oneMinusT * p0.x + 2 * oneMinusT * t * p1.x + t * t * p2.x;
  const y =
    oneMinusT * oneMinusT * p0.y + 2 * oneMinusT * t * p1.y + t * t * p2.y;
  return { x, y };
};

const splitQuadratic = (p0: Point, p1: Point, p2: Point, t: number) => {
  const p01 = {
    x: p0.x + (p1.x - p0.x) * t,
    y: p0.y + (p1.y - p0.y) * t,
  };
  const p12 = {
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t,
  };
  const p012 = {
    x: p01.x + (p12.x - p01.x) * t,
    y: p01.y + (p12.y - p01.y) * t,
  };
  return {
    left: { p0, p1: p01, p2: p012 },
    right: { p0: p012, p1: p12, p2 },
  };
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const findTrimParameterFromStart = (
  p0: Point,
  p1: Point,
  p2: Point,
  reference: Point,
  distance: number,
): number => {
  if (distance <= 0) return 0;
  let left = 0;
  let right = 1;
  for (let i = 0; i < 30; i += 1) {
    const mid = (left + right) / 2;
    const point = evaluateQuadraticPoint(p0, p1, p2, mid);
    const currentDistance = Math.hypot(
      point.x - reference.x,
      point.y - reference.y,
    );
    if (currentDistance < distance) {
      left = mid;
    } else {
      right = mid;
    }
  }
  return right;
};

const findTrimParameterFromEnd = (
  p0: Point,
  p1: Point,
  p2: Point,
  reference: Point,
  distance: number,
): number => {
  if (distance <= 0) return 1;
  let left = 0;
  let right = 1;
  for (let i = 0; i < 30; i += 1) {
    const mid = (left + right) / 2;
    const point = evaluateQuadraticPoint(p0, p1, p2, mid);
    const currentDistance = Math.hypot(
      point.x - reference.x,
      point.y - reference.y,
    );
    if (currentDistance < distance) {
      right = mid;
    } else {
      left = mid;
    }
  }
  return left;
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
  onEdgeCurvatureChange,
}: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const draggingNodeIdRef = useRef<NodeId | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const draggingCurvatureRef = useRef<{
    edgeId: EdgeId;
    axisOrigin: { x: number; y: number };
    axisDirection: { x: number; y: number };
  } | null>(null);
  const uniqueId = useId().replace(/:/g, "");
  const arrowMarkerId = `${uniqueId}-arrow`;
  const gridPatternId = `${uniqueId}-grid`;

  useEffect(() => {
    if (mode !== "adjust-curvature" && draggingCurvatureRef.current) {
      draggingCurvatureRef.current = null;
    }
  }, [mode]);

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
    event: React.MouseEvent<SVGPathElement, MouseEvent>,
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

  const stopDraggingNode = () => {
    draggingNodeIdRef.current = null;
    dragOffsetRef.current = null;
  };

  const stopCurvatureDragging = () => {
    draggingCurvatureRef.current = null;
  };

  const updateDraggingEdgeCurvature = (
    clientX: number,
    clientY: number,
  ): void => {
    const dragState = draggingCurvatureRef.current;
    if (!dragState) return;
    if (mode !== "adjust-curvature") {
      stopCurvatureDragging();
      return;
    }
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const pointerX = clientX - rect.left;
    const pointerY = clientY - rect.top;

    const axisDir = dragState.axisDirection;
    const axisOrigin = dragState.axisOrigin;
    const pointerVec = {
      x: pointerX - axisOrigin.x,
      y: pointerY - axisOrigin.y,
    };
    const projection = pointerVec.x * axisDir.x + pointerVec.y * axisDir.y;
    const snappedProjection = snapToGrid(projection);
    onEdgeCurvatureChange(dragState.edgeId, snappedProjection);
  };

  const handleMouseMove = (
    event: React.MouseEvent<SVGSVGElement, MouseEvent>,
  ) => {
    updateDraggingNodePosition(event.clientX, event.clientY);
    updateDraggingEdgeCurvature(event.clientX, event.clientY);
  };

  const handleMouseUp = () => {
    if (draggingNodeIdRef.current) {
      stopDraggingNode();
    }
    if (draggingCurvatureRef.current) {
      stopCurvatureDragging();
    }
  };

  const handleMouseLeave = () => {
    if (draggingNodeIdRef.current) {
      stopDraggingNode();
    }
    if (draggingCurvatureRef.current) {
      stopCurvatureDragging();
    }
  };

  const handleCurvatureHandleMouseDown = (
    event: React.MouseEvent<SVGCircleElement, MouseEvent>,
    edgeId: EdgeId,
    axisOrigin: { x: number; y: number },
    axisDirection: { x: number; y: number },
  ) => {
    if (mode !== "adjust-curvature") return;
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();

    draggingCurvatureRef.current = {
      edgeId,
      axisOrigin,
      axisDirection,
    };
  };

  const isCurvatureMode = mode === "adjust-curvature";

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
          const fromPoint = { x: from.x, y: from.y };
          const toPoint = { x: to.x, y: to.y };
          const baselineDx = toPoint.x - fromPoint.x;
          const baselineDy = toPoint.y - fromPoint.y;
          const baselineLength = Math.hypot(baselineDx, baselineDy);
          if (baselineLength === 0) {
            return null;
          }
          const normalX = -baselineDy / baselineLength;
          const normalY = baselineDx / baselineLength;
          const axisOrigin = {
            x: (fromPoint.x + toPoint.x) / 2,
            y: (fromPoint.y + toPoint.y) / 2,
          };
          const offset = edge.curvatureOffset ?? 0;
          const vertexX = axisOrigin.x + normalX * offset;
          const vertexY = axisOrigin.y + normalY * offset;
          const controlX = 2 * vertexX - axisOrigin.x;
          const controlY = 2 * vertexY - axisOrigin.y;
          const baseCurve = {
            p0: fromPoint,
            p1: { x: controlX, y: controlY },
            p2: toPoint,
          };
          const startTrimDistance = GRAPH_STYLE.nodeRadius;
          const desiredEndTrimDistance = edge.isDirected
            ? GRAPH_STYLE.nodeRadius + GRAPH_STYLE.arrowClearance
            : GRAPH_STYLE.nodeRadius;
          const startDistance = Math.min(
            startTrimDistance,
            Math.max(baselineLength / 2, 0),
          );
          const endDistance = Math.min(
            desiredEndTrimDistance,
            Math.max(baselineLength / 2, 0),
          );
          const tStart = findTrimParameterFromStart(
            baseCurve.p0,
            baseCurve.p1,
            baseCurve.p2,
            fromPoint,
            startDistance,
          );
          const tEnd = findTrimParameterFromEnd(
            baseCurve.p0,
            baseCurve.p1,
            baseCurve.p2,
            toPoint,
            endDistance,
          );
          const safeTStart = clamp(tStart, 0, 1);
          const safeTEnd = clamp(Math.max(tEnd, safeTStart + 0.001), 0, 1);
          const afterStartSplit = splitQuadratic(
            baseCurve.p0,
            baseCurve.p1,
            baseCurve.p2,
            safeTStart,
          ).right;
          const normalizedEndT =
            safeTEnd <= safeTStart
              ? 1
              : clamp((safeTEnd - safeTStart) / (1 - safeTStart), 0, 1);
          const trimmedCurve = splitQuadratic(
            afterStartSplit.p0,
            afterStartSplit.p1,
            afterStartSplit.p2,
            normalizedEndT,
          ).left;
          const startX = trimmedCurve.p0.x;
          const startY = trimmedCurve.p0.y;
          const controlTrimmedX = trimmedCurve.p1.x;
          const controlTrimmedY = trimmedCurve.p1.y;
          const endX = trimmedCurve.p2.x;
          const endY = trimmedCurve.p2.y;
          const pathD = `M ${startX} ${startY} Q ${controlTrimmedX} ${controlTrimmedY} ${endX} ${endY}`;

          return (
            <g key={edge.id}>
              <path
                d={pathD}
                stroke="black"
                fill="none"
                strokeWidth={
                  mode === "delete"
                    ? GRAPH_STYLE.edgeStrokeWidth.delete
                    : GRAPH_STYLE.edgeStrokeWidth.default
                }
                className={mode === "delete" ? "cursor-pointer" : ""}
                onClick={(event) => handleEdgeClick(event, edge.id)}
                markerEnd={
                  edge.isDirected ? `url(#${arrowMarkerId})` : undefined
                }
              />
              {isCurvatureMode ? (
                <>
                  <line
                    x1={axisOrigin.x}
                    y1={axisOrigin.y}
                    x2={vertexX}
                    y2={vertexY}
                    stroke="#a5b4fc"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                  <circle
                    cx={vertexX}
                    cy={vertexY}
                    r={6}
                    fill="white"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    className="cursor-grab active:cursor-grabbing"
                    onMouseDown={(event) =>
                      handleCurvatureHandleMouseDown(
                        event,
                        edge.id,
                        axisOrigin,
                        { x: normalX, y: normalY },
                      )
                    }
                  />
                </>
              ) : null}
            </g>
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
