import type { Edge, NodeId } from "@/types/graph";

type EdgeValidationResult = {
  isValid: boolean;
  message?: string;
};

const MIXED_EDGE_WARNING =
  "Нельзя смешивать направленные и ненаправленные ребра.";
const DUPLICATE_DIRECTED_WARNING = "Такое направленное ребро уже существует.";
const DUPLICATE_UNDIRECTED_WARNING =
  "Нельзя добавить два ненаправленных ребра между вершинами.";

const getPairEdges = (edges: Edge[], from: NodeId, to: NodeId) =>
  edges.filter(
    (edge) =>
      (edge.from === from && edge.to === to) ||
      (edge.from === to && edge.to === from),
  );

export const validateEdgeConnection = (
  edges: Edge[],
  from: NodeId,
  to: NodeId,
  isDirected: boolean,
): EdgeValidationResult => {
  const pairEdges = getPairEdges(edges, from, to);
  const hasUndirectedEdge = pairEdges.some((edge) => !edge.isDirected);
  const hasDirectedEdge = pairEdges.some((edge) => edge.isDirected);

  if (isDirected) {
    if (hasUndirectedEdge) {
      return { isValid: false, message: MIXED_EDGE_WARNING };
    }
    const sameDirectionExists = pairEdges.some(
      (edge) => edge.isDirected && edge.from === from && edge.to === to,
    );
    if (sameDirectionExists) {
      return { isValid: false, message: DUPLICATE_DIRECTED_WARNING };
    }
    return { isValid: true };
  }

  if (hasDirectedEdge) {
    return { isValid: false, message: MIXED_EDGE_WARNING };
  }
  if (hasUndirectedEdge) {
    return { isValid: false, message: DUPLICATE_UNDIRECTED_WARNING };
  }

  return { isValid: true };
};
