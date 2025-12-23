import * as React from "react";
import { Edge, Node } from "@/components/editor/canvas";
import {
  draftEdgePath,
  edgeLabelPoint,
  edgePath,
  normalizeBox,
  pointInBox,
  type BoxSelect,
} from "@/components/editor/canvas/geometry";
import type { OverlayState } from "@/core/algorithms/types";
import type {
  EdgeId,
  EditorMode,
  GraphEdge,
  GraphNode,
  NodeId,
  Selection,
} from "@/core/graph/types";
import { isEditableTarget } from "@/lib/dom";
import { cn } from "@/lib/utils";
import type { CameraCommand } from "@/stores/graphUiStore";

export type CanvasCameraState = {
  x: number;
  y: number;
  scale: number;
  viewWidth: number;
  viewHeight: number;
};

export type GraphCanvasProps = {
  className?: string;

  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];

  selection: Selection;
  mode: EditorMode;

  edgeDraftSourceId: NodeId | null;

  algorithmOverlay?: OverlayState | null;

  cameraCommand?: { nonce: number; command: CameraCommand } | null;

  onCameraChange?: (camera: CanvasCameraState) => void;

  onBackgroundClick: (
    point: { x: number; y: number },
    isAdditive: boolean,
  ) => void;
  onNodeClick: (id: NodeId, isAdditive: boolean) => void;
  onNodeDoubleClick: (id: NodeId) => void;
  onEdgeClick: (id: EdgeId, isAdditive: boolean) => void;
  onEdgeDoubleClick: (id: EdgeId) => void;
  onBoxSelect: (
    nodeIds: NodeId[],
    edgeIds: EdgeId[],
    isAdditive: boolean,
  ) => void;

  onNodeDrag: (id: NodeId, x: number, y: number) => void;
  onNodesDrag?: (updates: Array<{ id: NodeId; x: number; y: number }>) => void;

  onCancelEdgeDraft: () => void;
};

type Camera = {
  // Top-left world coordinate.
  x: number;
  y: number;
  scale: number;
};

type PanState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
};

const DEFAULT_SCALE = 1.2;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 60;

const DRAG_THRESHOLD_PX = 4;
const DRAG_THRESHOLD_SQ = DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function GraphCanvas({
  className,
  nodes,
  edges,
  selection,
  mode,
  edgeDraftSourceId,
  algorithmOverlay,
  cameraCommand,
  onCameraChange,
  onBackgroundClick,
  onNodeClick,
  onNodeDoubleClick,
  onEdgeClick,
  onEdgeDoubleClick,
  onBoxSelect,
  onNodeDrag,
  onNodesDrag,
  onCancelEdgeDraft,
}: GraphCanvasProps) {
  const ref = React.useRef<SVGSVGElement | null>(null);

  const cameraRef = React.useRef<Camera>({ x: 0, y: 0, scale: DEFAULT_SCALE });
  const isCameraInitializedRef = React.useRef(false);

  const pendingCameraRef = React.useRef<CanvasCameraState | null>(null);
  const sentCameraKeyRef = React.useRef<string | null>(null);
  const cameraRafRef = React.useRef<number | null>(null);

  const lastCameraCommandNonceRef = React.useRef<number | null>(null);

  const gridLargeRef = React.useRef<SVGRectElement | null>(null);
  const gridSmallRef = React.useRef<SVGRectElement | null>(null);

  const isSpacePressedRef = React.useRef(false);
  const [isSpacePressed, setSpacePressed] = React.useState(false);

  const [panning, setPanning] = React.useState<PanState | null>(null);

  type DraggingState =
    | {
        kind: "single";
        pointerId: number;
        id: NodeId;
        startWorld: { x: number; y: number };
        startNode: { x: number; y: number };
      }
    | {
        kind: "multi";
        pointerId: number;
        nodeIds: NodeId[];
        startWorld: { x: number; y: number };
        startPositions: Map<NodeId, { x: number; y: number }>;
      };

  type PendingNodeDrag = {
    pointerId: number;
    id: NodeId;
    startClientX: number;
    startClientY: number;
    startWorld: { x: number; y: number };
    startNode: { x: number; y: number };
    startSelectionNodeIds: NodeId[];
    isSelected: boolean;
    startPositions: Map<NodeId, { x: number; y: number }>;
  };

  const [dragging, setDragging] = React.useState<DraggingState | null>(null);
  const pendingNodeDragRef = React.useRef<PendingNodeDrag | null>(null);
  const [cursorPoint, setCursorPoint] = React.useState<{
    x: number;
    y: number;
  } | null>(null);
  const [boxSelect, setBoxSelect] = React.useState<BoxSelect | null>(null);

  const nodesById = React.useMemo(() => {
    return new Map(nodes.map((n) => [n.id, n]));
  }, [nodes]);

  const reverseDirected = React.useMemo(() => {
    const next = new Set<string>();
    for (const edge of edges) {
      if (!edge.isDirected) continue;
      next.add(`${edge.source}->${edge.target}`);
    }
    return next;
  }, [edges]);

  const edgeGeometry = React.useMemo(() => {
    const dById = new Map<EdgeId, string | null>();
    const labelPointById = new Map<EdgeId, { x: number; y: number } | null>();

    for (const edge of edges) {
      const isOppositeDirected =
        edge.isDirected &&
        reverseDirected.has(`${edge.target}->${edge.source}`);

      dById.set(edge.id, edgePath(edge, nodesById, isOppositeDirected));
      labelPointById.set(
        edge.id,
        edgeLabelPoint(edge, nodesById, isOppositeDirected),
      );
    }

    return { dById, labelPointById };
  }, [edges, nodesById, reverseDirected]);

  const selectedNodeSet = React.useMemo(() => {
    return new Set(selection.nodeIds);
  }, [selection.nodeIds]);

  const selectedEdgeSet = React.useMemo(() => {
    return new Set(selection.edgeIds);
  }, [selection.edgeIds]);

  const algorithmActiveNodeSet = React.useMemo(() => {
    return new Set(algorithmOverlay?.activeNodeIds ?? []);
  }, [algorithmOverlay?.activeNodeIds]);

  const algorithmVisitedNodeSet = React.useMemo(() => {
    return new Set(algorithmOverlay?.visitedNodeIds ?? []);
  }, [algorithmOverlay?.visitedNodeIds]);

  const algorithmFrontierNodeSet = React.useMemo(() => {
    return new Set(algorithmOverlay?.frontierNodeIds ?? []);
  }, [algorithmOverlay?.frontierNodeIds]);

  const algorithmActiveEdgeId = algorithmOverlay?.activeEdgeId ?? null;

  const applyNodePositionUpdates = React.useCallback(
    (updates: Array<{ id: NodeId; x: number; y: number }>) => {
      if (updates.length === 0) return;

      if (onNodesDrag) {
        onNodesDrag(updates);
        return;
      }

      for (const u of updates) {
        onNodeDrag(u.id, u.x, u.y);
      }
    },
    [onNodeDrag, onNodesDrag],
  );

  const ensureCameraInitialized = React.useCallback((el: SVGSVGElement) => {
    if (isCameraInitializedRef.current) return;

    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w <= 0 || h <= 0) return;

    // Initial view: center world origin (0,0).
    cameraRef.current = {
      x: -(w / DEFAULT_SCALE) / 2,
      y: -(h / DEFAULT_SCALE) / 2,
      scale: DEFAULT_SCALE,
    };
    isCameraInitializedRef.current = true;
  }, []);

  const applyViewBox = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;

    ensureCameraInitialized(el);

    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w <= 0 || h <= 0) return;

    const { x, y, scale } = cameraRef.current;

    const viewWidth = w / scale;
    const viewHeight = h / scale;

    el.setAttribute("viewBox", `${x} ${y} ${viewWidth} ${viewHeight}`);

    const applyRect = (rect: SVGRectElement | null) => {
      if (!rect) return;
      rect.setAttribute("x", String(x));
      rect.setAttribute("y", String(y));
      rect.setAttribute("width", String(viewWidth));
      rect.setAttribute("height", String(viewHeight));
    };

    applyRect(gridLargeRef.current);
    applyRect(gridSmallRef.current);

    if (!onCameraChange) return;

    pendingCameraRef.current = { x, y, scale, viewWidth, viewHeight };

    if (cameraRafRef.current !== null) return;

    cameraRafRef.current = window.requestAnimationFrame(() => {
      cameraRafRef.current = null;

      const next = pendingCameraRef.current;
      if (!next) return;

      const key = `${next.x}|${next.y}|${next.scale}|${next.viewWidth}|${next.viewHeight}`;
      if (sentCameraKeyRef.current === key) return;

      sentCameraKeyRef.current = key;
      onCameraChange(next);
    });
  }, [ensureCameraInitialized, onCameraChange]);

  const resetView = React.useCallback(() => {
    const el = ref.current;
    if (!el) {
      cameraRef.current = { x: 0, y: 0, scale: DEFAULT_SCALE };
      isCameraInitializedRef.current = false;
      return;
    }

    const w = el.clientWidth;
    const h = el.clientHeight;

    cameraRef.current = {
      x: -(w / DEFAULT_SCALE) / 2,
      y: -(h / DEFAULT_SCALE) / 2,
      scale: DEFAULT_SCALE,
    };
    isCameraInitializedRef.current = true;

    applyViewBox();
  }, [applyViewBox]);

  const clientToWorldPoint = React.useCallback(
    (clientX: number, clientY: number) => {
      const el = ref.current;
      if (!el) return null;

      const ctm = el.getScreenCTM();
      if (!ctm) return null;

      const point = new DOMPoint(clientX, clientY);
      const next = point.matrixTransform(ctm.inverse());

      return { x: next.x, y: next.y };
    },
    [],
  );

  const startPan = React.useCallback((e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;

    pendingNodeDragRef.current = null;
    setDragging(null);
    setBoxSelect(null);

    el.setPointerCapture(e.pointerId);

    const { x, y } = cameraRef.current;

    setPanning({
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: x,
      startY: y,
    });
  }, []);

  const handleEdgePointerDown = React.useCallback(
    (id: EdgeId, e: React.PointerEvent<SVGPathElement>) => {
      // PointerEvent.button: 0 = left (LMB), 1 = middle (MMB), 2 = right (RMB).
      // Pan shortcuts: middle drag OR Space + left drag.
      if (e.button === 1 || (e.button === 0 && isSpacePressedRef.current)) {
        e.preventDefault();
        e.stopPropagation();
        startPan(e);
        return;
      }

      e.stopPropagation();
      onEdgeClick(id, e.shiftKey);
    },
    [onEdgeClick, startPan],
  );

  const handleEdgeDoubleClick = React.useCallback(
    (id: EdgeId, e: React.MouseEvent<SVGPathElement>) => {
      e.stopPropagation();
      onEdgeDoubleClick(id);
    },
    [onEdgeDoubleClick],
  );

  const handleNodePointerDown = React.useCallback(
    (id: NodeId, e: React.PointerEvent<SVGGElement>) => {
      // PointerEvent.button: 0 = left (LMB), 1 = middle (MMB), 2 = right (RMB).
      // Pan shortcuts: middle drag OR Space + left drag.
      if (e.button === 1 || (e.button === 0 && isSpacePressedRef.current)) {
        e.preventDefault();
        e.stopPropagation();
        startPan(e);
        return;
      }

      e.stopPropagation();

      if (mode !== "select" || e.shiftKey) {
        onNodeClick(id, e.shiftKey);
        return;
      }

      setBoxSelect(null);
      setDragging(null);

      const node = nodesById.get(id);
      const p = clientToWorldPoint(e.clientX, e.clientY);
      if (!node || !p) {
        onNodeClick(id, false);
        return;
      }

      const startSelectionNodeIds = [...selection.nodeIds];
      const startPositions = new Map(
        startSelectionNodeIds.flatMap((nodeId) => {
          const n = nodesById.get(nodeId);
          return n ? [[nodeId, { x: n.x, y: n.y }] as const] : [];
        }),
      );

      pendingNodeDragRef.current = {
        pointerId: e.pointerId,
        id,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startWorld: p,
        startNode: { x: node.x, y: node.y },
        startSelectionNodeIds,
        isSelected: selectedNodeSet.has(id),
        startPositions,
      };
    },
    [
      clientToWorldPoint,
      mode,
      nodesById,
      onNodeClick,
      selection.nodeIds,
      selectedNodeSet,
      startPan,
    ],
  );

  const handleNodeDoubleClick = React.useCallback(
    (id: NodeId, e: React.MouseEvent<SVGGElement>) => {
      e.stopPropagation();
      onNodeDoubleClick(id);
    },
    [onNodeDoubleClick],
  );

  React.useLayoutEffect(() => {
    applyViewBox();
  }, [applyViewBox]);

  React.useEffect(() => {
    if (!cameraCommand) return;

    const { nonce, command } = cameraCommand;
    if (lastCameraCommandNonceRef.current === nonce) return;

    lastCameraCommandNonceRef.current = nonce;
    pendingNodeDragRef.current = null;

    setPanning(null);
    setDragging(null);
    setBoxSelect(null);

    const el = ref.current;
    if (!el) return;

    ensureCameraInitialized(el);

    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w <= 0 || h <= 0) return;

    const prev = cameraRef.current;

    const viewWidth = w / prev.scale;
    const viewHeight = h / prev.scale;
    const centerX = prev.x + viewWidth / 2;
    const centerY = prev.y + viewHeight / 2;

    const ZOOM_FACTOR = 1.2;

    if (command.kind === "go_to_origin") {
      const originViewWidth = w / prev.scale;
      const originViewHeight = h / prev.scale;

      cameraRef.current = {
        ...prev,
        x: -originViewWidth / 2,
        y: -originViewHeight / 2,
      };

      applyViewBox();
      return;
    }

    const nextScale =
      command.kind === "zoom_in"
        ? clamp(prev.scale * ZOOM_FACTOR, ZOOM_MIN, ZOOM_MAX)
        : command.kind === "zoom_out"
          ? clamp(prev.scale / ZOOM_FACTOR, ZOOM_MIN, ZOOM_MAX)
          : DEFAULT_SCALE;

    const nextViewWidth = w / nextScale;
    const nextViewHeight = h / nextScale;

    cameraRef.current = {
      x: centerX - nextViewWidth / 2,
      y: centerY - nextViewHeight / 2,
      scale: nextScale,
    };

    applyViewBox();
  }, [applyViewBox, cameraCommand, ensureCameraInitialized]);

  React.useEffect(() => {
    if (!onCameraChange) return;
    applyViewBox();
  }, [applyViewBox, onCameraChange]);

  React.useEffect(() => {
    return () => {
      if (cameraRafRef.current === null) return;
      window.cancelAnimationFrame(cameraRafRef.current);
      cameraRafRef.current = null;
    };
  }, []);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onResize = () => {
      // Anchor the top-left world position on resize.
      // This intentionally does NOT keep the center fixed.
      applyViewBox();
    };

    const ro = new ResizeObserver(onResize);
    ro.observe(el);

    return () => ro.disconnect();
  }, [applyViewBox]);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;

      if (e.code === "Space") {
        if (!isSpacePressedRef.current) {
          setSpacePressed(true);
        }

        isSpacePressedRef.current = true;
        e.preventDefault();
        return;
      }

      const isResetKey = e.code === "Digit0" || e.code === "Numpad0";
      if (isResetKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        resetView();
        e.preventDefault();
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      isSpacePressedRef.current = false;
      setSpacePressed(false);
    }

    function onBlur() {
      isSpacePressedRef.current = false;
      setSpacePressed(false);
      setPanning(null);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [resetView]);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancelEdgeDraft();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancelEdgeDraft]);

  React.useEffect(() => {
    if (mode === "add_edge" && edgeDraftSourceId) return;
    setCursorPoint(null);
  }, [edgeDraftSourceId, mode]);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      const clientWidth = el.clientWidth;
      const clientHeight = el.clientHeight;
      if (clientWidth <= 0 || clientHeight <= 0) return;

      e.preventDefault();

      const prev = cameraRef.current;
      const isZoom = e.ctrlKey || e.metaKey;

      if (!isZoom) {
        cameraRef.current = {
          ...prev,
          x: prev.x + e.deltaX / prev.scale,
          y: prev.y + e.deltaY / prev.scale,
        };
        applyViewBox();
        return;
      }

      const point = clientToWorldPoint(e.clientX, e.clientY);
      const factor = Math.exp(-e.deltaY * 0.002);
      const nextScale = clamp(prev.scale * factor, ZOOM_MIN, ZOOM_MAX);

      if (!point) {
        cameraRef.current = { ...prev, scale: nextScale };
        applyViewBox();
        return;
      }

      const viewWidth = clientWidth / prev.scale;
      const viewHeight = clientHeight / prev.scale;

      const u = (point.x - prev.x) / viewWidth;
      const v = (point.y - prev.y) / viewHeight;

      const nextViewWidth = clientWidth / nextScale;
      const nextViewHeight = clientHeight / nextScale;

      cameraRef.current = {
        x: point.x - u * nextViewWidth,
        y: point.y - v * nextViewHeight,
        scale: nextScale,
      };

      applyViewBox();
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [applyViewBox, clientToWorldPoint]);

  const draftSourceNode =
    mode === "add_edge" && edgeDraftSourceId
      ? (nodesById.get(edgeDraftSourceId) ?? null)
      : null;

  const boxRect = boxSelect ? normalizeBox(boxSelect) : null;
  const draftPathD = draftEdgePath(draftSourceNode, cursorPoint);

  return (
    <svg
      ref={ref}
      className={cn(
        "h-full w-full touch-none bg-muted/20 select-none",
        {
          "cursor-grabbing": panning,
          "cursor-grab": !panning && isSpacePressed,
        },
        className,
      )}
      onPointerMove={(e) => {
        if (panning) {
          const { scale } = cameraRef.current;

          const dx = (e.clientX - panning.startClientX) / scale;
          const dy = (e.clientY - panning.startClientY) / scale;

          cameraRef.current = {
            ...cameraRef.current,
            x: panning.startX - dx,
            y: panning.startY - dy,
          };

          applyViewBox();
          return;
        }

        const p = clientToWorldPoint(e.clientX, e.clientY);

        const pendingNodeDrag = pendingNodeDragRef.current;
        if (pendingNodeDrag && mode === "select") {
          const dx = e.clientX - pendingNodeDrag.startClientX;
          const dy = e.clientY - pendingNodeDrag.startClientY;
          const distSq = dx * dx + dy * dy;

          if (distSq >= DRAG_THRESHOLD_SQ && p) {
            e.currentTarget.setPointerCapture(pendingNodeDrag.pointerId);

            const startWorld = pendingNodeDrag.startWorld;
            const deltaX = p.x - startWorld.x;
            const deltaY = p.y - startWorld.y;

            const nodeIds = pendingNodeDrag.startSelectionNodeIds.filter(
              (nodeId) => pendingNodeDrag.startPositions.has(nodeId),
            );

            const isGroupDrag =
              pendingNodeDrag.isSelected && nodeIds.length > 1;

            if (isGroupDrag) {
              const updates = nodeIds.flatMap((nodeId) => {
                const pos = pendingNodeDrag.startPositions.get(nodeId);
                return pos
                  ? [{ id: nodeId, x: pos.x + deltaX, y: pos.y + deltaY }]
                  : [];
              });

              applyNodePositionUpdates(updates);

              setDragging({
                kind: "multi",
                pointerId: pendingNodeDrag.pointerId,
                nodeIds,
                startWorld,
                startPositions: pendingNodeDrag.startPositions,
              });
            } else {
              onNodeClick(pendingNodeDrag.id, false);
              applyNodePositionUpdates([
                {
                  id: pendingNodeDrag.id,
                  x: pendingNodeDrag.startNode.x + deltaX,
                  y: pendingNodeDrag.startNode.y + deltaY,
                },
              ]);

              setDragging({
                kind: "single",
                pointerId: pendingNodeDrag.pointerId,
                id: pendingNodeDrag.id,
                startWorld,
                startNode: pendingNodeDrag.startNode,
              });
            }

            pendingNodeDragRef.current = null;
            return;
          }
        }

        if (boxSelect && p) {
          setBoxSelect({ ...boxSelect, end: p });
          return;
        }

        if (mode === "add_edge" && edgeDraftSourceId) {
          setCursorPoint(p);
        }

        if (!dragging || mode !== "select") return;
        if (e.pointerId !== dragging.pointerId) return;
        if (!p) return;

        const deltaX = p.x - dragging.startWorld.x;
        const deltaY = p.y - dragging.startWorld.y;

        if (dragging.kind === "single") {
          applyNodePositionUpdates([
            {
              id: dragging.id,
              x: dragging.startNode.x + deltaX,
              y: dragging.startNode.y + deltaY,
            },
          ]);
          return;
        }

        const updates = dragging.nodeIds.flatMap((nodeId) => {
          const pos = dragging.startPositions.get(nodeId);
          return pos
            ? [{ id: nodeId, x: pos.x + deltaX, y: pos.y + deltaY }]
            : [];
        });

        applyNodePositionUpdates(updates);
      }}
      onPointerUp={(e) => {
        const el = ref.current;
        if (el && el.hasPointerCapture(e.pointerId)) {
          el.releasePointerCapture(e.pointerId);
        }

        setPanning(null);
        setDragging(null);

        const pendingNodeDrag = pendingNodeDragRef.current;
        pendingNodeDragRef.current = null;

        if (
          pendingNodeDrag &&
          mode === "select" &&
          e.pointerId === pendingNodeDrag.pointerId
        ) {
          onNodeClick(pendingNodeDrag.id, false);
        }

        if (!boxSelect) return;

        const rect = normalizeBox(boxSelect);
        const nodeIds = nodes
          .filter((n) => pointInBox({ x: n.x, y: n.y }, rect))
          .map((n) => n.id);

        const edgeIds = edges
          .filter((edge) => {
            const s = nodesById.get(edge.source);
            const t = nodesById.get(edge.target);
            if (!s || !t) return false;

            if (pointInBox({ x: s.x, y: s.y }, rect)) return true;
            if (pointInBox({ x: t.x, y: t.y }, rect)) return true;

            const lp = edgeGeometry.labelPointById.get(edge.id) ?? null;
            return lp ? pointInBox(lp, rect) : false;
          })
          .map((edge) => edge.id);

        onBoxSelect(nodeIds, edgeIds, boxSelect.isAdditive);
        setBoxSelect(null);
      }}
      onPointerLeave={(e) => {
        const el = ref.current;
        if (el && el.hasPointerCapture(e.pointerId)) {
          el.releasePointerCapture(e.pointerId);
        }

        pendingNodeDragRef.current = null;
        setPanning(null);
        setDragging(null);
        setBoxSelect(null);
      }}
      onPointerCancel={(e) => {
        const el = ref.current;
        if (el && el.hasPointerCapture(e.pointerId)) {
          el.releasePointerCapture(e.pointerId);
        }

        pendingNodeDragRef.current = null;
        setPanning(null);
        setDragging(null);
        setBoxSelect(null);
      }}
      onPointerDown={(e) => {
        // PointerEvent.button: 0 = left (LMB), 1 = middle (MMB), 2 = right (RMB).
        if (e.button !== 0 && e.button !== 1) return;
        if (e.target !== e.currentTarget) return;

        pendingNodeDragRef.current = null;

        if (e.button === 1 || (e.button === 0 && isSpacePressedRef.current)) {
          e.preventDefault();
          startPan(e);
          return;
        }

        if (e.button !== 0) return;

        const p = clientToWorldPoint(e.clientX, e.clientY);
        if (!p) return;

        if (mode === "select") {
          setBoxSelect({ start: p, end: p, isAdditive: e.shiftKey });
          return;
        }

        onBackgroundClick(p, e.shiftKey);
      }}
    >
      <defs>
        <pattern
          id="grid-small"
          width={24}
          height={24}
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 24 0 L 0 0 0 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
            className="text-foreground/5"
          />
        </pattern>

        <pattern
          id="grid-large"
          width={120}
          height={120}
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 120 0 L 0 0 0 120"
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
            className="text-foreground/7"
          />
        </pattern>

        <marker
          id="arrow-context"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
        </marker>

        <marker
          id="arrow-context-hover"
          viewBox="0 0 10 10"
          refX="6.6"
          refY="5"
          markerWidth="17"
          markerHeight="17"
          markerUnits="userSpaceOnUse"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
        </marker>
      </defs>

      <rect
        ref={gridLargeRef}
        x={0}
        y={0}
        width={0}
        height={0}
        fill="url(#grid-large)"
        pointerEvents="none"
      />
      <rect
        ref={gridSmallRef}
        x={0}
        y={0}
        width={0}
        height={0}
        fill="url(#grid-small)"
        pointerEvents="none"
      />

      <g className={cn((isSpacePressed || panning) && "pointer-events-none")}>
        {boxRect && (
          <rect
            x={boxRect.x}
            y={boxRect.y}
            width={boxRect.width}
            height={boxRect.height}
            className="fill-primary/10 stroke-primary"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        )}

        {/* Edges */}
        {edges.map((e) => {
          const d = edgeGeometry.dById.get(e.id) ?? null;
          if (!d) return null;

          const labelPoint = edgeGeometry.labelPointById.get(e.id) ?? null;

          return (
            <Edge
              key={e.id}
              variant="edge"
              edge={e}
              mode={mode}
              d={d}
              labelPoint={labelPoint}
              isSelected={selectedEdgeSet.has(e.id)}
              isAlgorithmActive={algorithmActiveEdgeId === e.id}
              onPointerDown={handleEdgePointerDown}
              onDoubleClick={handleEdgeDoubleClick}
            />
          );
        })}

        {/* Draft edge */}
        {draftPathD && <Edge variant="draft" d={draftPathD} />}

        {/* Nodes */}
        {nodes.map((n) => (
          <Node
            key={n.id}
            node={n}
            mode={mode}
            isSelected={selectedNodeSet.has(n.id)}
            isDraftSource={edgeDraftSourceId === n.id}
            isAlgorithmActive={algorithmActiveNodeSet.has(n.id)}
            isAlgorithmVisited={algorithmVisitedNodeSet.has(n.id)}
            isAlgorithmFrontier={algorithmFrontierNodeSet.has(n.id)}
            onPointerDown={handleNodePointerDown}
            onDoubleClick={handleNodeDoubleClick}
          />
        ))}
      </g>
    </svg>
  );
}
