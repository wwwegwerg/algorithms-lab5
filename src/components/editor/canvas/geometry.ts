import type { GraphEdge, GraphNode } from "@/core/graph/types";
import { isLoop } from "@/core/graph/types";

export const NODE_R = 18;

export type BoxSelect = {
  start: { x: number; y: number };
  end: { x: number; y: number };
  additive: boolean;
};

export function vecLen(dx: number, dy: number) {
  return Math.hypot(dx, dy);
}

export function normalizeBox(box: BoxSelect) {
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

export function pointInBox(
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

export function edgePath(
  edge: GraphEdge,
  nodesById: Map<string, GraphNode>,
  hasOppositeDirected: boolean,
) {
  const s = nodesById.get(edge.source);
  const t = nodesById.get(edge.target);
  if (!s || !t) return null;

  if (isLoop(edge)) {
    const r = 18;
    const cx = s.x;
    const cy = s.y - NODE_R - 18;

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

export function edgeLabelPoint(
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

export function draftEdgePath(
  source: GraphNode | null,
  cursor: { x: number; y: number } | null,
) {
  if (!source) return null;
  if (!cursor) return null;

  const dx = cursor.x - source.x;
  const dy = cursor.y - source.y;
  const dist = vecLen(dx, dy);
  if (dist < 0.001) return null;

  const ux = dx / dist;
  const uy = dy / dist;

  const startX = source.x + ux * NODE_R;
  const startY = source.y + uy * NODE_R;

  return `M ${startX} ${startY} L ${cursor.x} ${cursor.y}`;
}
