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

  const toSvgPoint = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return null;

    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    return { x, y };
  };

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

  const draftSourceNode =
    mode === "add_edge" && edgeDraftSourceId
      ? (nodesById.get(edgeDraftSourceId) ?? null)
      : null;

  const boxRect = boxSelect ? normalizeBox(boxSelect) : null;
  const draftPathD = draftEdgePath(draftSourceNode, cursorPoint);

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

        <marker
          id="arrow-destructive"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
          className="text-destructive"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>

        <marker
          id="arrow-context"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path
            d="M 0 0 L 10 5 L 0 10 z"
            fill="context-stroke"
            stroke="context-stroke"
          />
        </marker>
      </defs>

      <rect
        width="100%"
        height="100%"
        fill="url(#grid-large)"
        pointerEvents="none"
      />
      <rect
        width="100%"
        height="100%"
        fill="url(#grid-small)"
        pointerEvents="none"
      />

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
            e.stopPropagation();

            if (mode === "select" && !e.shiftKey) {
              const p = toSvgPoint(e.clientX, e.clientY);
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
    </svg>
  );
}
