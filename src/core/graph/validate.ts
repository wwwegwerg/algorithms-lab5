import type { EdgeId, GraphEdge, GraphNode, NodeId } from "@/core/graph/types";
import { isLoop } from "@/core/graph/types";

export type ValidationResult = { ok: true } | { ok: false; message: string };

function hasNode(nodes: readonly GraphNode[], id: NodeId) {
  return nodes.some((n) => n.id === id);
}

function connectsPair(edge: GraphEdge, a: NodeId, b: NodeId) {
  if (edge.directed) return edge.source === a && edge.target === b;
  return (
    (edge.source === a && edge.target === b) ||
    (edge.source === b && edge.target === a)
  );
}

function touchesPairUndirected(edge: GraphEdge, a: NodeId, b: NodeId) {
  return (
    (edge.source === a && edge.target === b) ||
    (edge.source === b && edge.target === a)
  );
}

export type EdgeDraft = Omit<GraphEdge, "id">;

export function validateEdgeDraft(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  draft: EdgeDraft,
  ignoreEdgeId?: EdgeId,
): ValidationResult {
  if (!hasNode(nodes, draft.source) || !hasNode(nodes, draft.target)) {
    return { ok: false, message: "Ребро ссылается на несуществующую вершину" };
  }

  if (isLoop(draft)) {
    if (draft.directed) {
      return {
        ok: false,
        message: "Петля может быть только неориентированной",
      };
    }

    const otherLoopExists = edges.some(
      (e) =>
        e.id !== ignoreEdgeId &&
        !e.directed &&
        isLoop(e) &&
        e.source === draft.source,
    );

    if (otherLoopExists) {
      return { ok: false, message: "На вершине может быть только одна петля" };
    }

    return { ok: true };
  }

  const a = draft.source;
  const b = draft.target;

  if (!draft.directed) {
    const anyEdgeBetween = edges.some(
      (e) => e.id !== ignoreEdgeId && touchesPairUndirected(e, a, b),
    );

    if (anyEdgeBetween) {
      return {
        ok: false,
        message:
          "Между двумя вершинами может быть только одно ребро или пара взаимных дуг",
      };
    }

    return { ok: true };
  }

  const undirectedBetween = edges.some(
    (e) =>
      e.id !== ignoreEdgeId && !e.directed && touchesPairUndirected(e, a, b),
  );
  if (undirectedBetween) {
    return {
      ok: false,
      message:
        "Нельзя добавить дугу: уже есть неориентированное ребро между вершинами",
    };
  }

  const sameDirectionExists = edges.some(
    (e) => e.id !== ignoreEdgeId && e.directed && connectsPair(e, a, b),
  );
  if (sameDirectionExists) {
    return { ok: false, message: "Такая дуга уже существует" };
  }

  return { ok: true };
}
