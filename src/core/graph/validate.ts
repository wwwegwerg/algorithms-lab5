import type { EdgeId, GraphEdge, GraphNode, NodeId } from "@/core/graph/types";
import { isLoop } from "@/core/graph/types";

export type ValidationResult = { ok: true } | { ok: false; message: string };

function hasNode(nodes: readonly GraphNode[], id: NodeId) {
  return nodes.some((n) => n.id === id);
}

function touchesPair(edge: GraphEdge, a: NodeId, b: NodeId) {
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
    if (draft.isDirected) {
      return {
        ok: false,
        message: "Петля может быть только неориентированной",
      };
    }

    const isOtherLoop = edges.some(
      (e) =>
        e.id !== ignoreEdgeId &&
        !e.isDirected &&
        isLoop(e) &&
        e.source === draft.source,
    );

    if (isOtherLoop) {
      return { ok: false, message: "На вершине может быть только одна петля" };
    }

    return { ok: true };
  }

  const isTouching = (e: GraphEdge) =>
    e.id !== ignoreEdgeId &&
    !isLoop(e) &&
    touchesPair(e, draft.source, draft.target);

  if (!draft.isDirected) {
    const isUndirectedExists = edges.some(
      (e) => isTouching(e) && !e.isDirected,
    );
    if (isUndirectedExists) {
      return {
        ok: false,
        message: "Между двумя вершинами может быть только одно ребро",
      };
    }

    const isDirectedExists = edges.some((e) => isTouching(e) && e.isDirected);
    if (isDirectedExists) {
      return {
        ok: false,
        message: "Нельзя добавить ребро: между вершинами уже есть ребро",
      };
    }

    return { ok: true };
  }

  const isUndirectedExists = edges.some((e) => isTouching(e) && !e.isDirected);
  if (isUndirectedExists) {
    return {
      ok: false,
      message:
        "Нельзя добавить ребро: уже есть неориентированное ребро между вершинами",
    };
  }

  const isSameDirectionExists = edges.some(
    (e) =>
      e.id !== ignoreEdgeId &&
      e.isDirected &&
      e.source === draft.source &&
      e.target === draft.target,
  );
  if (isSameDirectionExists) {
    return { ok: false, message: "Такое ребро уже существует" };
  }

  return { ok: true };
}
