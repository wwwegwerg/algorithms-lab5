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
import type {
  GraphEdge,
  GraphNode,
  NodeId,
  Selection,
} from "@/core/graph/types";
import { cn } from "@/lib/utils";

export type GraphCanvasProps = {
  className?: string;

  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];

  selection: Selection;
  mode: "select" | "add_node" | "add_edge" | "delete";

  edgeDraftSourceId: NodeId | null;

  onBackgroundClick: (
    point: { x: number; y: number },
    additive: boolean,
  ) => void;
  onNodeClick: (id: NodeId, additive: boolean) => void;
  onNodeDoubleClick: (id: NodeId) => void;
  onEdgeClick: (id: string, additive: boolean) => void;
  onEdgeDoubleClick: (id: string) => void;
  onBoxSelect: (
    nodeIds: NodeId[],
    edgeIds: string[],
    additive: boolean,
  ) => void;

  onNodeDrag: (id: NodeId, x: number, y: number) => void;

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

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 6;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

export function GraphCanvas({
  className,
  nodes,
  edges,
  selection,
  mode,
  edgeDraftSourceId,
  onBackgroundClick,
  onNodeClick,
  onNodeDoubleClick,
  onEdgeClick,
  onEdgeDoubleClick,
  onBoxSelect,
  onNodeDrag,
  onCancelEdgeDraft,
}: GraphCanvasProps) {
  const ref = React.useRef<SVGSVGElement | null>(null);

  const cameraRef = React.useRef<Camera>({ x: 0, y: 0, scale: 1 });
  const cameraInitializedRef = React.useRef(false);

  const gridLargeRef = React.useRef<SVGRectElement | null>(null);
  const gridSmallRef = React.useRef<SVGRectElement | null>(null);

  const spacePressedRef = React.useRef(false);
  const [spacePressed, setSpacePressed] = React.useState(false);

  const [panning, setPanning] = React.useState<PanState | null>(null);

  const [dragging, setDragging] = React.useState<{
    id: NodeId;
    dx: number;
    dy: number;
  } | null>(null);
  const [cursorPoint, setCursorPoint] = React.useState<{
    x: number;
    y: number;
  } | null>(null);
  const [boxSelect, setBoxSelect] = React.useState<BoxSelect | null>(null);

  const nodesById = new Map(nodes.map((n) => [n.id, n]));

  const reverseDirected = new Set<string>();
  for (const e of edges) {
    if (!e.directed) continue;
    reverseDirected.add(`${e.source}->${e.target}`);
  }

  const hasOpposite = (edge: GraphEdge) =>
    edge.directed && reverseDirected.has(`${edge.target}->${edge.source}`);

  const ensureCameraInitialized = React.useCallback((el: SVGSVGElement) => {
    if (cameraInitializedRef.current) return;

    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w <= 0 || h <= 0) return;

    // Initial view: center world origin (0,0).
    cameraRef.current = { x: -w / 2, y: -h / 2, scale: 1 };
    cameraInitializedRef.current = true;
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
  }, [ensureCameraInitialized]);

  const resetView = React.useCallback(() => {
    const el = ref.current;
    if (!el) {
      cameraRef.current = { x: 0, y: 0, scale: 1 };
      cameraInitializedRef.current = false;
      return;
    }

    const w = el.clientWidth;
    const h = el.clientHeight;

    cameraRef.current = {
      x: -w / 2,
      y: -h / 2,
      scale: 1,
    };
    cameraInitializedRef.current = true;

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

  React.useLayoutEffect(() => {
    applyViewBox();
  }, [applyViewBox]);

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
        if (!spacePressedRef.current) {
          setSpacePressed(true);
        }

        spacePressedRef.current = true;
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
      spacePressedRef.current = false;
      setSpacePressed(false);
    }

    function onBlur() {
      spacePressedRef.current = false;
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
          "cursor-grab": !panning && spacePressed,
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

        if (boxSelect && p) {
          setBoxSelect({ ...boxSelect, end: p });
          return;
        }

        if (mode === "add_edge" && edgeDraftSourceId) {
          setCursorPoint(p);
        }

        if (!dragging || mode !== "select") return;
        if (!p) return;
        onNodeDrag(dragging.id, p.x - dragging.dx, p.y - dragging.dy);
      }}
      onPointerUp={() => {
        setPanning(null);
        setDragging(null);

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

            const lp = edgeLabelPoint(edge, nodesById, hasOpposite(edge));
            return lp ? pointInBox(lp, rect) : false;
          })
          .map((edge) => edge.id);

        onBoxSelect(nodeIds, edgeIds, boxSelect.additive);
        setBoxSelect(null);
      }}
      onPointerLeave={() => {
        setPanning(null);
        setDragging(null);
        setBoxSelect(null);
      }}
      onPointerCancel={() => {
        setPanning(null);
        setDragging(null);
        setBoxSelect(null);
      }}
      onPointerDown={(e) => {
        // PointerEvent.button: 0 = left (LMB), 1 = middle (MMB), 2 = right (RMB).
        if (e.button !== 0 && e.button !== 1) return;
        if (e.target !== e.currentTarget) return;

        if (e.button === 1 || (e.button === 0 && spacePressedRef.current)) {
          e.preventDefault();
          startPan(e);
          return;
        }

        if (e.button !== 0) return;

        const p = clientToWorldPoint(e.clientX, e.clientY);
        if (!p) return;

        if (mode === "select") {
          setBoxSelect({ start: p, end: p, additive: e.shiftKey });
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

      <g className={cn((spacePressed || panning) && "pointer-events-none")}>
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
          const d = edgePath(e, nodesById, hasOpposite(e));
          if (!d) return null;

          return (
            <Edge
              key={e.id}
              variant="edge"
              edge={e}
              d={d}
              labelPoint={edgeLabelPoint(e, nodesById, hasOpposite(e))}
              selection={selection}
              enableHoverOutline={mode === "select" || mode === "delete"}
              hoverTone={mode === "delete" ? "destructive" : "primary"}
              onPointerDown={(ev) => {
                // PointerEvent.button: 0 = left (LMB), 1 = middle (MMB), 2 = right (RMB).
                // Pan shortcuts: middle drag OR Space + left drag.
                if (
                  ev.button === 1 ||
                  (ev.button === 0 && spacePressedRef.current)
                ) {
                  ev.preventDefault();
                  ev.stopPropagation();
                  startPan(ev);
                  return;
                }

                ev.stopPropagation();
                onEdgeClick(e.id, ev.shiftKey);
              }}
              onDoubleClick={(ev) => {
                ev.stopPropagation();
                onEdgeDoubleClick(e.id);
              }}
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
            selection={selection}
            edgeDraftSourceId={edgeDraftSourceId}
            onPointerDown={(e) => {
              // PointerEvent.button: 0 = left (LMB), 1 = middle (MMB), 2 = right (RMB).
              // Pan shortcuts: middle drag OR Space + left drag.
              if (
                e.button === 1 ||
                (e.button === 0 && spacePressedRef.current)
              ) {
                e.preventDefault();
                e.stopPropagation();
                startPan(e);
                return;
              }

              e.stopPropagation();

              if (mode === "select" && !e.shiftKey) {
                const p = clientToWorldPoint(e.clientX, e.clientY);
                if (p) {
                  setDragging({ id: n.id, dx: p.x - n.x, dy: p.y - n.y });
                }
              }

              onNodeClick(n.id, e.shiftKey);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onNodeDoubleClick(n.id);
            }}
          />
        ))}
      </g>
    </svg>
  );
}
