import type { GraphAlgorithm, OverlayState } from "@/core/algorithms/types";
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

export const bfsAlgorithm = {
  id: "BFS",
  label: "BFS (обход в ширину)",
  supports: ({ nodes, sourceNodeId }) => {
    if (!sourceNodeId) {
      return { ok: false, message: "Выберите стартовую вершину" };
    }

    const isPresent = nodes.some((n) => n.id === sourceNodeId);
    return isPresent
      ? { ok: true }
      : { ok: false, message: "Стартовая вершина не найдена" };
  },
  run: ({ edges, sourceNodeId }) => {
    if (!sourceNodeId) {
      return [
        {
          message: "Ошибка: пустой id стартовой вершины",
          activeNodeIds: [],
          visitedNodeIds: [],
          frontierNodeIds: [],
          activeEdgeIds: [],
          frontierEdgeIds: [],
        },
      ];
    }

    const visited = new Set<NodeId>();
    const order: NodeId[] = [];
    const queue: NodeId[] = [];
    const steps: OverlayState[] = [];

    queue.push(sourceNodeId);
    visited.add(sourceNodeId);

    steps.push({
      message: `Старт: ${sourceNodeId}`,
      activeNodeIds: [],
      visitedNodeIds: Array.from(visited),
      frontierNodeIds: [...queue],
      activeEdgeIds: [],
      frontierEdgeIds: [],
    });

    while (queue.length > 0) {
      const node = queue.shift()!;
      order.push(node);

      steps.push({
        message: `Обрабатываем вершину: ${node}`,
        activeNodeIds: [node],
        visitedNodeIds: Array.from(visited),
        frontierNodeIds: [...queue],
        activeEdgeIds: [],
        frontierEdgeIds: [],
      });

      const neighbors = neighborsOf(node, edges);
      for (const { neighbor, viaEdgeId } of neighbors) {
        steps.push({
          message: `Проверяем ребро ${viaEdgeId}`,
          activeNodeIds: [node],
          visitedNodeIds: Array.from(visited),
          frontierNodeIds: [...queue],
          activeEdgeIds: [viaEdgeId],
          frontierEdgeIds: [],
        });

        if (visited.has(neighbor)) continue;

        visited.add(neighbor);
        queue.push(neighbor);

        steps.push({
          message: `Добавили в очередь: ${neighbor}`,
          activeNodeIds: [node],
          visitedNodeIds: Array.from(visited),
          frontierNodeIds: [...queue],
          activeEdgeIds: [viaEdgeId],
          frontierEdgeIds: [],
        });
      }
    }

    steps.push({
      message: `Готово. Порядок вершин: ${order.join(", ")}`,
      activeNodeIds: [],
      visitedNodeIds: Array.from(visited),
      frontierNodeIds: [],
      activeEdgeIds: [],
      frontierEdgeIds: [],
    });

    return steps;
  },
} satisfies GraphAlgorithm;
