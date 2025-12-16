import * as React from "react";
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

  addEdgeSourceId: NodeId | null;

  overlay: OverlayState | null;

  onBackgroundClick: (point: { x: number; y: number }) => void;
  onNodeClick: (id: NodeId) => void;
  onEdgeClick: (id: string) => void;

  onNodeDrag: (id: NodeId, x: number, y: number) => void;

  onCancelEdgeDraft: () => void;
};

export function GraphCanvas({
  className,
  nodes,
  edges,
  selection,
  mode,
  addEdgeSourceId,
  overlay,
  onBackgroundClick,
  onNodeClick,
  onEdgeClick,
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

  const visited = new Set(overlay?.visitedNodeIds ?? []);
  const frontier = new Set(overlay?.frontierNodeIds ?? []);
  const active = new Set(overlay?.activeNodeIds ?? []);
  const activeEdgeId = overlay?.activeEdgeId;

  return (
    <svg
      ref={ref}
      className={cn("h-full w-full bg-muted/20 select-none", className)}
      onPointerMove={(e) => {
        const p = toSvgPoint(e.clientX, e.clientY);
        setCursorPoint(p);

        if (!dragging || mode !== "select") return;
        if (!p) return;
        onNodeDrag(dragging.id, p.x - dragging.dx, p.y - dragging.dy);
      }}
      onPointerUp={() => setDragging(null)}
      onPointerLeave={() => setDragging(null)}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        if (e.target !== e.currentTarget) return;

        const p = toSvgPoint(e.clientX, e.clientY);
        if (!p) return;
        onBackgroundClick(p);
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

      {/* Edges */}
      {edges.map((e) => {
        const d = edgePath(e, nodesById, hasOpposite(e));
        if (!d) return null;

        const selected = selection?.kind === "edge" && selection.id === e.id;
        const emphasized = activeEdgeId === e.id;

        const labelPoint = edgeLabelPoint(e, nodesById, hasOpposite(e));
        const label = e.weight === undefined ? "" : String(e.weight);

        return (
          <g key={e.id}>
            <path
              d={d}
              className={cn(
                "fill-none",
                emphasized || selected
                  ? "stroke-primary"
                  : "stroke-muted-foreground",
              )}
              strokeWidth={2}
              markerEnd={
                e.directed
                  ? emphasized || selected
                    ? "url(#arrow-primary)"
                    : "url(#arrow-default)"
                  : undefined
              }
            />
            <path
              d={d}
              className="fill-none stroke-transparent"
              strokeWidth={14}
              onPointerDown={(ev) => {
                ev.stopPropagation();
                onEdgeClick(e.id);
              }}
            />
            {labelPoint && label.length > 0 ? (
              <text
                x={labelPoint.x}
                y={labelPoint.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="pointer-events-none fill-foreground text-xs"
              >
                {label}
              </text>
            ) : null}
          </g>
        );
      })}

      {/* Draft edge */}
      {mode === "add_edge" && addEdgeSourceId && cursorPoint
        ? (() => {
            const s = nodesById.get(addEdgeSourceId);
            if (!s) return null;

            const dx = cursorPoint.x - s.x;
            const dy = cursorPoint.y - s.y;
            const dist = vecLen(dx, dy);
            const ux = dist > 0.001 ? dx / dist : 0;
            const uy = dist > 0.001 ? dy / dist : 0;

            const startX = s.x + ux * NODE_R;
            const startY = s.y + uy * NODE_R;

            const endX = cursorPoint.x;
            const endY = cursorPoint.y;

            return (
              <path
                d={`M ${startX} ${startY} L ${endX} ${endY}`}
                className="fill-none stroke-primary/40"
                strokeWidth={2}
                strokeDasharray="6 4"
              />
            );
          })()
        : null}

      {/* Nodes */}
      {nodes.map((n) => {
        const selected = selection?.kind === "node" && selection.id === n.id;
        const isVisited = visited.has(n.id);
        const isFrontier = frontier.has(n.id);
        const isActive = active.has(n.id);

        const fillClass = isActive
          ? "fill-primary"
          : isFrontier
            ? "fill-secondary"
            : isVisited
              ? "fill-accent"
              : "fill-background";

        const strokeClass = selected
          ? "stroke-primary"
          : "stroke-muted-foreground";

        return (
          <g
            key={n.id}
            onPointerDown={(e) => {
              e.stopPropagation();

              if (mode === "select") {
                const p = toSvgPoint(e.clientX, e.clientY);
                if (p) {
                  setDragging({ id: n.id, dx: p.x - n.x, dy: p.y - n.y });
                }
              }

              onNodeClick(n.id);
            }}
          >
            <circle
              cx={n.x}
              cy={n.y}
              r={NODE_R}
              className={cn(fillClass, strokeClass)}
              strokeWidth={2}
            />
            {selected ? (
              <circle
                cx={n.x}
                cy={n.y}
                r={NODE_R + 5}
                className="fill-none stroke-primary/30"
                strokeWidth={2}
              />
            ) : null}
            <text
              x={n.x}
              y={n.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className={cn(
                "pointer-events-none text-xs select-none",
                isActive ? "fill-primary-foreground" : "fill-foreground",
              )}
            >
              {n.label}
            </text>
          </g>
        );
      })}

      {/* Helpers */}
      {mode === "add_edge" && addEdgeSourceId
        ? (() => {
            const n = nodesById.get(addEdgeSourceId);
            if (!n) return null;
            return (
              <circle
                cx={n.x}
                cy={n.y}
                r={NODE_R + 7}
                className="fill-none stroke-primary/40"
                strokeWidth={2}
              />
            );
          })()
        : null}

      {/* Bounds hint */}
      {nodes.length === 0 ? (
        <text
          x={24}
          y={32}
          className="fill-foreground/60 text-sm"
          dominantBaseline="middle"
        >
          {"Клик по полотну — добавить вершину (режим Node)"}
        </text>
      ) : null}
    </svg>
  );
}
