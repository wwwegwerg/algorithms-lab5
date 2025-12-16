import * as React from "react";
import { Edge, Node } from "@/components/editor/canvas";
import type { OverlayState } from "@/core/algorithms/types";
import type {
  GraphEdge,
  GraphNode,
  NodeId,
  Selection,
} from "@/core/graph/types";
import { isLoop } from "@/core/graph/types";
import { cn } from "@/lib/utils";

const NODE_R = 18;

function vecLen(dx: number, dy: number) {
  return Math.hypot(dx, dy);
}

type BoxSelect = {
  start: { x: number; y: number };
  end: { x: number; y: number };
  additive: boolean;
};

function normalizeBox(box: BoxSelect) {
  const minX = Math.min(box.start.x, box.end.x);
  const minY = Math.min(box.start.y, box.end.y);
  const maxX = Math.max(box.start.x, box.end.x);
  const maxY = Math.max(box.start.y, box.end.y);
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    minX,
    minY,
    maxX,
    maxY,
  };
}

function pointInBox(
  point: { x: number; y: number },
  box: ReturnType<typeof normalizeBox>,
) {
  return (
    point.x >= box.minX &&
    point.x <= box.maxX &&
    point.y >= box.minY &&
    point.y <= box.maxY
  );
}

function edgePath(
  edge: GraphEdge,
  nodesById: Map<string, GraphNode>,
  hasOppositeDirected: boolean,
) {
  const s = nodesById.get(edge.source);
  const t = nodesById.get(edge.target);
  if (!s || !t) return null;

  if (isLoop(edge)) {
    const x = s.x;
    const y = s.y;
    const r = 18;
    const ox = 0;
    const oy = -NODE_R - 18;
    const cx = x + ox;
    const cy = y + oy;

    const startX = cx - r;
    const startY = cy;
    const endX = cx + r;
    const endY = cy;

    return `M ${startX} ${startY} A ${r} ${r} 0 1 1 ${endX} ${endY} A ${r} ${r} 0 1 1 ${startX} ${startY}`;
  }

  const dx = t.x - s.x;
  const dy = t.y - s.y;
  const dist = vecLen(dx, dy);
  if (dist < 0.001) return null;

  const ux = dx / dist;
  const uy = dy / dist;

  const startX = s.x + ux * NODE_R;
  const startY = s.y + uy * NODE_R;
  const endX = t.x - ux * NODE_R;
  const endY = t.y - uy * NODE_R;

  if (edge.directed && hasOppositeDirected) {
    const px = -uy;
    const py = ux;
    const offset = 22;

    const midX = (startX + endX) / 2 + px * offset;
    const midY = (startY + endY) / 2 + py * offset;

    return `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`;
  }

  return `M ${startX} ${startY} L ${endX} ${endY}`;
}

function edgeLabelPoint(
  edge: GraphEdge,
  nodesById: Map<string, GraphNode>,
  hasOppositeDirected: boolean,
) {
  const s = nodesById.get(edge.source);
  const t = nodesById.get(edge.target);
  if (!s || !t) return null;

  if (isLoop(edge)) {
    return { x: s.x, y: s.y - NODE_R - 44 };
  }

  const mx = (s.x + t.x) / 2;
  const my = (s.y + t.y) / 2;

  if (edge.directed && hasOppositeDirected) {
    const dx = t.x - s.x;
    const dy = t.y - s.y;
    const dist = vecLen(dx, dy);
    if (dist < 0.001) return { x: mx, y: my };

    const px = -dy / dist;
    const py = dx / dist;
    return { x: mx + px * 22, y: my + py * 22 };
  }

  return { x: mx, y: my };
}

export type GraphCanvasProps = {
  className?: string;

  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];

  selection: Selection;
  mode: "select" | "add_node" | "add_edge" | "delete";

  edgeDraftSourceId: NodeId | null;

  overlay: OverlayState | null;

  onBackgroundClick: (
    point: { x: number; y: number },
    additive: boolean,
  ) => void;
  onNodeClick: (id: NodeId, additive: boolean) => void;
  onEdgeClick: (id: string, additive: boolean) => void;
  onBoxSelect: (
    nodeIds: NodeId[],
    edgeIds: string[],
    additive: boolean,
  ) => void;

  onNodeDrag: (id: NodeId, x: number, y: number) => void;

  onCancelEdgeDraft: () => void;
};

export function GraphCanvas({
  className,
  nodes,
  edges,
  selection,
  mode,
  edgeDraftSourceId,
  overlay,
  onBackgroundClick,
  onNodeClick,
  onEdgeClick,
  onBoxSelect,
  onNodeDrag,
  onCancelEdgeDraft,
}: GraphCanvasProps) {
  const ref = React.useRef<SVGSVGElement | null>(null);
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

  const nodesById = React.useMemo(
    () => new Map(nodes.map((n) => [n.id, n])),
    [nodes],
  );

  const reverseDirected = React.useMemo(() => {
    const set = new Set<string>();
    for (const e of edges) {
      if (!e.directed) continue;
      set.add(`${e.source}->${e.target}`);
    }
    return set;
  }, [edges]);

  const hasOpposite = React.useCallback(
    (edge: GraphEdge) =>
      edge.directed && reverseDirected.has(`${edge.target}->${edge.source}`),
    [reverseDirected],
  );

  const toSvgPoint = React.useCallback((clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return null;

    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    return { x, y };
  }, []);

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

  const visited = new Set(overlay?.visitedNodeIds ?? []);
  const frontier = new Set(overlay?.frontierNodeIds ?? []);
  const active = new Set(overlay?.activeNodeIds ?? []);
  const activeEdgeId = overlay?.activeEdgeId;

  const draftSourceNode =
    mode === "add_edge" && edgeDraftSourceId
      ? (nodesById.get(edgeDraftSourceId) ?? null)
      : null;

  const boxRect = boxSelect ? normalizeBox(boxSelect) : null;

  const draftPathD = React.useMemo(() => {
    if (!draftSourceNode) return null;
    if (!cursorPoint) return null;

    const dx = cursorPoint.x - draftSourceNode.x;
    const dy = cursorPoint.y - draftSourceNode.y;
    const dist = vecLen(dx, dy);
    if (dist < 0.001) return null;

    const ux = dx / dist;
    const uy = dy / dist;

    const startX = draftSourceNode.x + ux * NODE_R;
    const startY = draftSourceNode.y + uy * NODE_R;

    const endX = cursorPoint.x;
    const endY = cursorPoint.y;

    return `M ${startX} ${startY} L ${endX} ${endY}`;
  }, [cursorPoint, draftSourceNode]);

  return (
    <svg
      ref={ref}
      className={cn("h-full w-full bg-muted/20 select-none", className)}
      onPointerMove={(e) => {
        const p = toSvgPoint(e.clientX, e.clientY);

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
          .map((e) => e.id);

        onBoxSelect(nodeIds, edgeIds, boxSelect.additive);
        setBoxSelect(null);
      }}
      onPointerLeave={() => {
        setDragging(null);
        setBoxSelect(null);
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        if (e.target !== e.currentTarget) return;

        const p = toSvgPoint(e.clientX, e.clientY);
        if (!p) return;

        if (mode === "select") {
          setBoxSelect({ start: p, end: p, additive: e.shiftKey });
          return;
        }

        onBackgroundClick(p, e.shiftKey);
      }}
    >
      <defs>
        <marker
          id="arrow-default"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
          className="text-muted-foreground"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>
        <marker
          id="arrow-primary"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
          className="text-primary"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>
      </defs>

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
            activeEdgeId={activeEdgeId}
            onPointerDown={(ev) => {
              ev.stopPropagation();
              onEdgeClick(e.id, ev.shiftKey);
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
          isVisited={visited.has(n.id)}
          isFrontier={frontier.has(n.id)}
          isActive={active.has(n.id)}
          onPointerDown={(e) => {
            e.stopPropagation();

            if (mode === "select" && !e.shiftKey) {
              const p = toSvgPoint(e.clientX, e.clientY);
              if (p) {
                setDragging({ id: n.id, dx: p.x - n.x, dy: p.y - n.y });
              }
            }

            onNodeClick(n.id, e.shiftKey);
          }}
        />
      ))}
    </svg>
  );
}
