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

export const bfsAlgorithm: GraphAlgorithm = {
  id: "BFS",
  label: "BFS (обход в ширину)",
  supports: ({ nodes, startNodeId }) => {
    const isPresent = nodes.some((n) => n.id === startNodeId);
    return isPresent
      ? { ok: true }
      : { ok: false, message: "Стартовая вершина не найдена" };
  },
  run: ({ edges, startNodeId }) => {
    const visited = new Set<NodeId>();
    const queue: NodeId[] = [];
    const steps = [];

    queue.push(startNodeId);
    visited.add(startNodeId);

    steps.push({
      message: `Старт: ${startNodeId}`,
      activeNodeIds: [],
      visitedNodeIds: Array.from(visited),
      frontierNodeIds: [...queue],
    });

    while (queue.length > 0) {
      const node = queue.shift();
      if (!node) break;

      steps.push({
        message: `Обрабатываем вершину: ${node}`,
        activeNodeIds: [node],
        visitedNodeIds: Array.from(visited),
        frontierNodeIds: [...queue],
      });

      const neighbors = neighborsOf(node, edges);
      for (const { neighbor, viaEdgeId } of neighbors) {
        steps.push({
          message: `Проверяем ребро ${viaEdgeId}`,
          activeNodeIds: [node],
          visitedNodeIds: Array.from(visited),
          frontierNodeIds: [...queue],
          activeEdgeId: viaEdgeId,
        });

        if (visited.has(neighbor)) continue;

        visited.add(neighbor);
        queue.push(neighbor);

        steps.push({
          message: `Добавили в очередь: ${neighbor}`,
          activeNodeIds: [node],
          visitedNodeIds: Array.from(visited),
          frontierNodeIds: [...queue],
          activeEdgeId: viaEdgeId,
        });
      }
    }

    steps.push({
      message: "Готово",
      activeNodeIds: [],
      visitedNodeIds: Array.from(visited),
      frontierNodeIds: [],
    });

    return steps;
  },
};
