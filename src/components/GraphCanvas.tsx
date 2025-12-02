import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Toolbar } from "@/components/Toolbar";
import {
  EDGE_WEIGHT_INPUT_PATTERN,
  EDITING_CHAR_PIXEL_WIDTH,
  GRAPH_STYLE,
  HIGHLIGHT_ARROW_TRANSFORM,
  SELECTION_RING_RADIUS,
} from "@/constants/graph";
import { GRID_CONFIG } from "@/constants/grid";
import { buildCurvedEdgeGeometry, buildSelfLoopGeometry } from "@/lib/edges";
import { snapToGrid } from "@/lib/grid";
import { cn } from "@/lib/utils";
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
  onNodeLabelChange: (nodeId: NodeId, label: string) => void;
  onNodeDelete: (nodeId: NodeId) => void;
  onEdgeDelete: (edgeId: EdgeId) => void;
  onEdgeCurvatureChange: (edgeId: EdgeId, offset: number) => void;
  onEdgeWeightChange: (edgeId: EdgeId, weight: number | undefined) => void;
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
  onNodeLabelChange,
  onNodeDelete,
  onEdgeDelete,
  onEdgeCurvatureChange,
  onEdgeWeightChange,
}: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const draggingNodeIdRef = useRef<NodeId | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const draggingCurvatureRef = useRef<{
    edgeId: EdgeId;
    axisOrigin: { x: number; y: number };
    axisDirection: { x: number; y: number };
  } | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<NodeId | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<EdgeId | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<NodeId | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const labelInputRef = useRef<HTMLInputElement | null>(null);
  const [editingEdgeId, setEditingEdgeId] = useState<EdgeId | null>(null);
  const [editingEdgeWeight, setEditingEdgeWeight] = useState("");
  const edgeWeightInputRef = useRef<HTMLInputElement | null>(null);
  const uniqueId = useId().replace(/:/g, "");
  const arrowMarkerId = `${uniqueId}-arrow`;
  const arrowHighlightMarkerId = `${uniqueId}-arrow-highlight`;
  const gridPatternId = `${uniqueId}-grid`;
  const editingNode = editingNodeId
    ? nodes.find((node) => node.id === editingNodeId)
    : null;
  const editingEdge = editingEdgeId
    ? edges.find((edge) => edge.id === editingEdgeId)
    : null;
  const editingInputWidth = useMemo(() => {
    if (!editingNode) return null;
    const minWidth = GRAPH_STYLE.nodeRadius * 2;
    const estimatedWidth =
      editingLabel.length === 0
        ? minWidth
        : editingLabel.length * EDITING_CHAR_PIXEL_WIDTH + 12;
    return Math.max(minWidth, estimatedWidth);
  }, [editingNode, editingLabel]);
  const editingEdgeInputWidth = useMemo(() => {
    if (!editingEdge) return null;
    const minWidth = 40;
    const estimatedWidth =
      editingEdgeWeight.length === 0
        ? minWidth
        : editingEdgeWeight.length * EDITING_CHAR_PIXEL_WIDTH + 12;
    return Math.max(minWidth, estimatedWidth);
  }, [editingEdge, editingEdgeWeight]);

  const clearHoverState = useCallback(() => {
    setHoveredNodeId(null);
    setHoveredEdgeId(null);
  }, []);

  useEffect(() => {
    if (mode !== "adjust-curvature" && draggingCurvatureRef.current) {
      draggingCurvatureRef.current = null;
    }
  }, [mode]);

  useEffect(() => {
    if (!editingNodeId) return;
    const input = labelInputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, [editingNodeId]);

  useEffect(() => {
    if (!editingEdgeId) return;
    const input = edgeWeightInputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, [editingEdgeId]);

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

  const handleNodeMouseEnter = (nodeId: NodeId) => {
    setHoveredNodeId(nodeId);
  };

  const handleNodeMouseLeave = (nodeId: NodeId) => {
    setHoveredNodeId((current) => (current === nodeId ? null : current));
  };

  const handleEdgeClick = (
    event: React.MouseEvent<SVGPathElement, MouseEvent>,
    edgeId: EdgeId,
  ) => {
    if (mode !== "delete") return;
    event.stopPropagation();
    onEdgeDelete(edgeId);
  };

  const handleEdgeMouseEnter = (edgeId: EdgeId) => {
    setHoveredEdgeId(edgeId);
  };

  const handleEdgeMouseLeave = (edgeId: EdgeId) => {
    setHoveredEdgeId((current) => (current === edgeId ? null : current));
  };

  const handleNodeMouseDown = (
    event: React.MouseEvent<SVGGElement, MouseEvent>,
    node: Node,
  ) => {
    if (mode !== "idle") return;
    if (editingNodeId) return;
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
    clearHoverState();
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

  const handleNodeDoubleClick = (
    event: React.MouseEvent<SVGGElement, MouseEvent>,
    node: Node,
  ) => {
    if (mode !== "idle") return;
    event.stopPropagation();
    event.preventDefault();
    setEditingEdgeId(null);
    setEditingEdgeWeight("");
    setEditingNodeId(node.id);
    setEditingLabel(node.label);
  };

  const commitEditingNodeLabel = () => {
    if (!editingNodeId || !editingNode) {
      setEditingNodeId(null);
      setEditingLabel("");
      return;
    }
    const trimmed = editingLabel.trim();
    if (trimmed !== editingNode.label) {
      onNodeLabelChange(editingNodeId, trimmed);
    }
    setEditingNodeId(null);
    setEditingLabel("");
  };

  const cancelEditingNodeLabel = () => {
    setEditingNodeId(null);
    setEditingLabel("");
  };

  const handleLabelInputKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitEditingNodeLabel();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelEditingNodeLabel();
    }
  };

  const handleLabelInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setEditingLabel(event.target.value);
  };

  const handleLabelInputBlur = () => {
    commitEditingNodeLabel();
  };

  const handleEdgeDoubleClick = (
    event: React.MouseEvent<SVGPathElement | SVGTextElement, MouseEvent>,
    edge: Edge,
  ) => {
    if (mode !== "idle") return;
    event.stopPropagation();
    event.preventDefault();
    setEditingNodeId(null);
    setEditingLabel("");
    setEditingEdgeId(edge.id);
    setEditingEdgeWeight(edge.weight === undefined ? "" : String(edge.weight));
  };

  const commitEditingEdgeWeight = () => {
    if (!editingEdgeId) return;
    const trimmed = editingEdgeWeight.trim();
    if (trimmed === "") {
      onEdgeWeightChange(editingEdgeId, undefined);
      setEditingEdgeId(null);
      setEditingEdgeWeight("");
      return;
    }
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) {
      return;
    }
    onEdgeWeightChange(editingEdgeId, parsed);
    setEditingEdgeId(null);
    setEditingEdgeWeight("");
  };

  const cancelEditingEdgeWeight = () => {
    setEditingEdgeId(null);
    setEditingEdgeWeight("");
  };

  const handleEdgeWeightInputKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitEditingEdgeWeight();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelEditingEdgeWeight();
    }
  };

  const handleEdgeWeightInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { value } = event.target;
    if (value === "" || EDGE_WEIGHT_INPUT_PATTERN.test(value)) {
      setEditingEdgeWeight(value);
    }
  };

  const handleEdgeWeightInputBlur = () => {
    commitEditingEdgeWeight();
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
        className={cn(
          "h-full w-full bg-neutral-100",
          mode === "add-node" ? "cursor-crosshair" : "cursor-default",
        )}
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
            viewBox={`0 0 ${GRAPH_STYLE.arrowMarker.width} ${GRAPH_STYLE.arrowMarker.height}`}
          >
            <path d={GRAPH_STYLE.arrowMarker.path} fill="black" />
          </marker>
          <marker
            id={arrowHighlightMarkerId}
            markerWidth={GRAPH_STYLE.arrowMarker.width}
            markerHeight={GRAPH_STYLE.arrowMarker.height}
            refX={GRAPH_STYLE.arrowMarker.refX}
            refY={GRAPH_STYLE.arrowMarker.refY}
            orient="auto"
            markerUnits="userSpaceOnUse"
            overflow="visible"
            viewBox={`0 0 ${GRAPH_STYLE.arrowMarker.width} ${GRAPH_STYLE.arrowMarker.height}`}
          >
            <path
              d={GRAPH_STYLE.arrowMarker.path}
              fill={GRAPH_STYLE.deleteHighlight.color}
              transform={HIGHLIGHT_ARROW_TRANSFORM}
            />
          </marker>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${gridPatternId})`} />
        {edges.map((edge) => {
          const from = nodes.find((n) => n.id === edge.from);
          const to = nodes.find((n) => n.id === edge.to);
          if (!from || !to) return null;
          const weightLabel =
            edge.weight === undefined ? "" : String(edge.weight);
          const isEditingWeight = mode === "idle" && editingEdgeId === edge.id;
          const isEdgeHighlighted =
            mode === "delete" && hoveredEdgeId === edge.id;

          if (edge.from === edge.to) {
            const loopGeometry = buildSelfLoopGeometry(from);
            const editingWidth = editingEdgeInputWidth ?? 40;
            const editingX = loopGeometry.labelPosition.x - editingWidth / 2;
            const editingY = loopGeometry.labelPosition.y - 12;

            return (
              <g key={edge.id}>
                {isEdgeHighlighted ? (
                  <path
                    d={loopGeometry.pathD}
                    stroke={GRAPH_STYLE.deleteHighlight.color}
                    fill="none"
                    strokeWidth={GRAPH_STYLE.deleteHighlight.edgeStrokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pointerEvents="none"
                  />
                ) : null}
                <path
                  d={loopGeometry.pathD}
                  stroke="black"
                  fill="none"
                  strokeWidth={GRAPH_STYLE.edgeStrokeWidth.default}
                  className={cn(mode === "delete" && "cursor-pointer")}
                  onClick={(event) => handleEdgeClick(event, edge.id)}
                  onDoubleClick={(event) => handleEdgeDoubleClick(event, edge)}
                  onMouseEnter={() => handleEdgeMouseEnter(edge.id)}
                  onMouseLeave={() => handleEdgeMouseLeave(edge.id)}
                />
                {isEditingWeight ? (
                  <foreignObject
                    x={editingX}
                    y={editingY}
                    width={editingWidth}
                    height={24}
                  >
                    <div className="flex h-full w-full items-center justify-center">
                      <input
                        ref={edgeWeightInputRef}
                        value={editingEdgeWeight}
                        onChange={handleEdgeWeightInputChange}
                        onKeyDown={handleEdgeWeightInputKeyDown}
                        onBlur={handleEdgeWeightInputBlur}
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event) => event.stopPropagation()}
                        onDoubleClick={(event) => event.stopPropagation()}
                        spellCheck={false}
                        inputMode="decimal"
                        className={cn(
                          "w-full border-none bg-transparent text-center text-xs text-black underline caret-black",
                          "focus:outline-none",
                        )}
                      />
                    </div>
                  </foreignObject>
                ) : weightLabel ? (
                  <text
                    x={loopGeometry.labelPosition.x}
                    y={loopGeometry.labelPosition.y}
                    textAnchor="middle"
                    dy="0.35em"
                    fontSize={12}
                    className={cn(mode === "delete" && "cursor-pointer")}
                    onDoubleClick={(event) =>
                      handleEdgeDoubleClick(event, edge)
                    }
                  >
                    {weightLabel}
                  </text>
                ) : null}
              </g>
            );
          }

          const curvedGeometry = buildCurvedEdgeGeometry(edge, from, to);
          if (!curvedGeometry) {
            return null;
          }
          const {
            pathD,
            labelPosition,
            labelAngle,
            axisOrigin,
            curvatureHandlePosition,
            curvatureAxisDirection,
          } = curvedGeometry;

          return (
            <g key={edge.id}>
              {isEdgeHighlighted ? (
                <path
                  d={pathD}
                  stroke={GRAPH_STYLE.deleteHighlight.color}
                  fill="none"
                  strokeWidth={GRAPH_STYLE.deleteHighlight.edgeStrokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pointerEvents="none"
                  markerEnd={
                    edge.isDirected
                      ? `url(#${arrowHighlightMarkerId})`
                      : undefined
                  }
                />
              ) : null}
              <path
                d={pathD}
                stroke="black"
                fill="none"
                strokeWidth={GRAPH_STYLE.edgeStrokeWidth.default}
                className={cn(mode === "delete" && "cursor-pointer")}
                onClick={(event) => handleEdgeClick(event, edge.id)}
                onDoubleClick={(event) => handleEdgeDoubleClick(event, edge)}
                onMouseEnter={() => handleEdgeMouseEnter(edge.id)}
                onMouseLeave={() => handleEdgeMouseLeave(edge.id)}
                markerEnd={
                  edge.isDirected ? `url(#${arrowMarkerId})` : undefined
                }
              />
              {isEditingWeight ? (
                <g
                  transform={`translate(${labelPosition.x} ${labelPosition.y}) rotate(${labelAngle})`}
                >
                  <foreignObject
                    x={editingEdgeInputWidth ? -editingEdgeInputWidth / 2 : -20}
                    y={-12}
                    width={editingEdgeInputWidth ?? 40}
                    height={24}
                  >
                    <div className="flex h-full w-full items-center justify-center">
                      <input
                        ref={edgeWeightInputRef}
                        value={editingEdgeWeight}
                        onChange={handleEdgeWeightInputChange}
                        onKeyDown={handleEdgeWeightInputKeyDown}
                        onBlur={handleEdgeWeightInputBlur}
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event) => event.stopPropagation()}
                        onDoubleClick={(event) => event.stopPropagation()}
                        spellCheck={false}
                        inputMode="decimal"
                        className={cn(
                          "w-full border-none bg-transparent text-center text-xs text-black underline caret-black",
                          "focus:outline-none",
                        )}
                      />
                    </div>
                  </foreignObject>
                </g>
              ) : weightLabel ? (
                <g
                  transform={`translate(${labelPosition.x} ${labelPosition.y}) rotate(${labelAngle})`}
                >
                  <text
                    x={0}
                    y={0}
                    textAnchor="middle"
                    dy="0.35em"
                    fontSize={12}
                    className={cn(mode === "delete" && "cursor-pointer")}
                    onDoubleClick={(event) =>
                      handleEdgeDoubleClick(event, edge)
                    }
                  >
                    {weightLabel}
                  </text>
                </g>
              ) : null}
              {mode === "adjust-curvature" ? (
                <>
                  <line
                    x1={axisOrigin.x}
                    y1={axisOrigin.y}
                    x2={curvatureHandlePosition.x}
                    y2={curvatureHandlePosition.y}
                    stroke="#a5b4fc"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                  <circle
                    cx={curvatureHandlePosition.x}
                    cy={curvatureHandlePosition.y}
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
                        curvatureAxisDirection,
                      )
                    }
                  />
                </>
              ) : null}
            </g>
          );
        })}

        {nodes.map((node) => {
          const isEditing = mode === "idle" && editingNodeId === node.id;
          return (
            <g
              key={node.id}
              onClick={(event) => handleNodeClick(event, node.id)}
              onMouseDown={(event) => handleNodeMouseDown(event, node)}
              onDoubleClick={(event) => handleNodeDoubleClick(event, node)}
              onMouseEnter={() => handleNodeMouseEnter(node.id)}
              onMouseLeave={() => handleNodeMouseLeave(node.id)}
              className={
                mode === "idle"
                  ? "cursor-grab active:cursor-grabbing"
                  : "cursor-pointer"
              }
            >
              {mode === "delete" && hoveredNodeId === node.id ? (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={
                    GRAPH_STYLE.nodeRadius +
                    GRAPH_STYLE.deleteHighlight.nodeRadiusOffset
                  }
                  fill="none"
                  stroke={GRAPH_STYLE.deleteHighlight.color}
                  strokeWidth={GRAPH_STYLE.deleteHighlight.nodeStrokeWidth}
                  pointerEvents="none"
                />
              ) : null}
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
              {isEditing ? (
                <foreignObject
                  x={
                    editingInputWidth
                      ? node.x - editingInputWidth / 2
                      : node.x - GRAPH_STYLE.nodeRadius
                  }
                  y={node.y - GRAPH_STYLE.nodeRadius}
                  width={editingInputWidth ?? GRAPH_STYLE.nodeRadius * 2}
                  height={GRAPH_STYLE.nodeRadius * 2}
                >
                  <div className="flex h-full w-full items-center justify-center">
                    <input
                      ref={labelInputRef}
                      value={editingLabel}
                      onChange={handleLabelInputChange}
                      onKeyDown={handleLabelInputKeyDown}
                      onBlur={handleLabelInputBlur}
                      onMouseDown={(event) => event.stopPropagation()}
                      onClick={(event) => event.stopPropagation()}
                      onDoubleClick={(event) => event.stopPropagation()}
                      spellCheck={false}
                      className={cn(
                        "w-full border-none bg-transparent text-center text-xs text-black underline caret-black",
                        "focus:outline-none",
                      )}
                    />
                  </div>
                </foreignObject>
              ) : (
                <text
                  x={node.x}
                  y={node.y}
                  textAnchor="middle"
                  dy="0.35em"
                  fontSize={12}
                >
                  {node.label}
                </text>
              )}
            </g>
          );
        })}
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
