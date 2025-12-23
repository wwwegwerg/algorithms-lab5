import type { GraphEdge, GraphNode, GraphSnapshot } from "@/core/graph/types";
import { validateEdgeDraft } from "@/core/graph/validate";

export type GraphFileLoadResult =
  | { ok: true; graph: { nodes: GraphNode[]; edges: GraphEdge[] } }
  | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function parseNode(raw: unknown): GraphNode | null {
  if (!isRecord(raw)) return null;
  if (!isString(raw.id)) return null;
  if (!isString(raw.label)) return null;
  if (!isNumber(raw.x) || !isNumber(raw.y)) return null;
  return { id: raw.id, label: raw.label, x: raw.x, y: raw.y };
}

function parseEdge(raw: unknown): GraphEdge | null {
  if (!isRecord(raw)) return null;
  if (!isString(raw.id)) return null;
  if (!isString(raw.source) || !isString(raw.target)) return null;
  if (typeof raw.isDirected !== "boolean") return null;

  if (raw.weight === undefined) {
    return {
      id: raw.id,
      source: raw.source,
      target: raw.target,
      isDirected: raw.isDirected,
    };
  }

  if (!isNumber(raw.weight)) return null;

  return {
    id: raw.id,
    source: raw.source,
    target: raw.target,
    isDirected: raw.isDirected,
    weight: raw.weight,
  };
}

export function makeGraphSnapshot(
  nodes: GraphNode[],
  edges: GraphEdge[],
): GraphSnapshot {
  return {
    version: 1,
    nodes,
    edges,
    meta: {
      savedAtIso: new Date().toISOString(),
    },
  };
}

export function loadGraphSnapshot(raw: unknown): GraphFileLoadResult {
  if (!isRecord(raw)) return { ok: false, message: "Некорректный JSON" };
  if (raw.version !== 1) {
    return { ok: false, message: "Неподдерживаемая версия файла" };
  }

  const rawNodes = raw.nodes;
  const rawEdges = raw.edges;

  if (!Array.isArray(rawNodes) || !Array.isArray(rawEdges)) {
    return { ok: false, message: "Ожидались поля nodes и edges" };
  }

  const nodes: GraphNode[] = [];
  for (const n of rawNodes) {
    const node = parseNode(n);
    if (!node) return { ok: false, message: "Некорректная вершина в файле" };
    nodes.push(node);
  }

  const edges: GraphEdge[] = [];
  for (const e of rawEdges) {
    const edge = parseEdge(e);
    if (!edge) return { ok: false, message: "Некорректное ребро в файле" };
    edges.push(edge);
  }

  const uniqueNodeIds = new Set(nodes.map((n) => n.id));
  if (uniqueNodeIds.size !== nodes.length) {
    return { ok: false, message: "В файле есть вершины с одинаковыми id" };
  }

  const uniqueEdgeIds = new Set(edges.map((e) => e.id));
  if (uniqueEdgeIds.size !== edges.length) {
    return { ok: false, message: "В файле есть ребра с одинаковыми id" };
  }

  for (const edge of edges) {
    const validation = validateEdgeDraft(
      nodes,
      edges,
      {
        source: edge.source,
        target: edge.target,
        isDirected: edge.isDirected,
        weight: edge.weight,
      },
      edge.id,
    );

    if (!validation.ok) {
      return { ok: false, message: `Некорректный граф: ${validation.message}` };
    }
  }

  return { ok: true, graph: { nodes, edges } };
}
