import type { GraphAlgorithm } from "@/core/algorithms/types";
import type { GraphEdge, NodeId } from "@/core/graph/types";
import { isLoop } from "@/core/graph/types";

function neighborsOf(nodeId: NodeId, edges: readonly GraphEdge[]) {
  const out: { neighbor: NodeId; viaEdgeId: string }[] = [];

  for (const e of edges) {
    if (isLoop(e)) continue;

    if (e.isDirected) {
      if (e.source === nodeId)
        out.push({ neighbor: e.target, viaEdgeId: e.id });
      continue;
    }

    if (e.source === nodeId) out.push({ neighbor: e.target, viaEdgeId: e.id });
    if (e.target === nodeId) out.push({ neighbor: e.source, viaEdgeId: e.id });
  }

  return out;
}

export const dfsAlgorithm: GraphAlgorithm = {
  id: "DFS",
  label: "DFS (обход в глубину)",
  supports: ({ nodes, sourceNodeId }) => {
    const isPresent = nodes.some((n) => n.id === sourceNodeId);
    return isPresent
      ? { ok: true }
      : { ok: false, message: "Стартовая вершина не найдена" };
  },
  run: ({ edges, sourceNodeId }) => {
    const visited = new Set<NodeId>();
    const order: NodeId[] = [];
    const stack: NodeId[] = [];
    const steps = [];

    stack.push(sourceNodeId);
    visited.add(sourceNodeId);

    steps.push({
      message: `Старт: ${sourceNodeId}`,
      activeNodeIds: [],
      visitedNodeIds: Array.from(visited),
      frontierNodeIds: [...stack],
    });

    while (stack.length > 0) {
      const node = stack.pop();
      if (!node) break;

      order.push(node);

      steps.push({
        message: `Обрабатываем вершину: ${node}`,
        activeNodeIds: [node],
        visitedNodeIds: Array.from(visited),
        frontierNodeIds: [...stack],
      });

      const neighbors = neighborsOf(node, edges);
      for (const { neighbor, viaEdgeId } of neighbors) {
        steps.push({
          message: `Проверяем ребро ${viaEdgeId}`,
          activeNodeIds: [node],
          visitedNodeIds: Array.from(visited),
          frontierNodeIds: [...stack],
          activeEdgeId: viaEdgeId,
        });

        if (visited.has(neighbor)) continue;

        visited.add(neighbor);
        stack.push(neighbor);

        steps.push({
          message: `Добавили в стек: ${neighbor}`,
          activeNodeIds: [node],
          visitedNodeIds: Array.from(visited),
          frontierNodeIds: [...stack],
          activeEdgeId: viaEdgeId,
        });
      }
    }

    steps.push({
      message: `Готово. Порядок вершин: ${order.join(", ")}`,
      activeNodeIds: [],
      visitedNodeIds: Array.from(visited),
      frontierNodeIds: [],
    });

    return steps;
  },
};
