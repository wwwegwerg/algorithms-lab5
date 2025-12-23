import type { GraphAlgorithm, OverlayState } from "@/core/algorithms/types";
import type { GraphEdge, NodeId } from "@/core/graph/types";
import { isLoop } from "@/core/graph/types";

function isFiniteWeight(edge: GraphEdge) {
  return edge.weight !== undefined && Number.isFinite(edge.weight);
}

function asWeight(edge: GraphEdge) {
  return edge.weight as number;
}

export const mstPrimAlgorithm: GraphAlgorithm = {
  id: "MST_PRIM",
  label: "MST (Прим)",
  supports: ({ nodes, edges, sourceNodeId }) => {
    if (!sourceNodeId) {
      return { ok: false, message: "Выберите стартовую вершину" };
    }

    const isPresent = nodes.some((n) => n.id === sourceNodeId);
    if (!isPresent) {
      return { ok: false, message: "Стартовая вершина не найдена" };
    }

    for (const e of edges) {
      if (e.isDirected) {
        return {
          ok: false,
          message: "Для MST нужен неориентированный граф",
        };
      }

      if (isLoop(e)) {
        return { ok: false, message: "Петли не поддерживаются для MST" };
      }

      if (!isFiniteWeight(e)) {
        return {
          ok: false,
          message: "Для MST веса должны быть на всех ребрах",
        };
      }
    }

    return { ok: true };
  },
  run: ({ nodes, edges, sourceNodeId }) => {
    const steps: OverlayState[] = [];

    const inTree = new Set<NodeId>([sourceNodeId]);
    const treeEdgeIds = new Set<string>();

    let totalWeight = 0;

    steps.push({
      message: `Старт Прима: ${sourceNodeId}`,
      activeNodeIds: [sourceNodeId],
      visitedNodeIds: Array.from(inTree),
      frontierNodeIds: [],
      activeEdgeIds: [],
      frontierEdgeIds: [],
    });

    const allNodeIds = new Set(nodes.map((n) => n.id));

    while (true) {
      const candidateEdges: GraphEdge[] = [];

      for (const e of edges) {
        if (isLoop(e)) continue;

        const aIn = inTree.has(e.source);
        const bIn = inTree.has(e.target);
        if (aIn === bIn) continue;
        if (!isFiniteWeight(e)) continue;

        candidateEdges.push(e);
      }

      candidateEdges.sort((a, b) => {
        const w = asWeight(a) - asWeight(b);
        if (w !== 0) return w;
        return a.id.localeCompare(b.id);
      });

      const frontierEdgeIds = candidateEdges.map((e) => e.id);
      const frontierNodeIds = Array.from(
        new Set(
          candidateEdges
            .flatMap((e) => [e.source, e.target])
            .filter((id) => !inTree.has(id)),
        ),
      );

      steps.push({
        message:
          candidateEdges.length === 0
            ? "Кандидатов больше нет"
            : `Кандидатов: ${candidateEdges.length}`,
        activeNodeIds: [],
        visitedNodeIds: Array.from(inTree),
        frontierNodeIds,
        activeEdgeIds: Array.from(treeEdgeIds),
        frontierEdgeIds,
      });

      const next = candidateEdges[0] ?? null;
      if (!next) break;

      const w = asWeight(next);
      const nextNode = inTree.has(next.source) ? next.target : next.source;

      steps.push({
        message: `Выбираем ребро ${next.id} (w=${w}) → добавляем вершину ${nextNode}`,
        activeNodeIds: [next.source, next.target],
        visitedNodeIds: Array.from(inTree),
        frontierNodeIds,
        activeEdgeIds: Array.from(treeEdgeIds),
        frontierEdgeIds,
      });

      treeEdgeIds.add(next.id);
      inTree.add(nextNode);
      totalWeight += w;

      steps.push({
        message: `Добавили ${next.id}. Текущий вес остова: ${totalWeight}`,
        activeNodeIds: [nextNode],
        visitedNodeIds: Array.from(inTree),
        frontierNodeIds: [],
        activeEdgeIds: Array.from(treeEdgeIds),
        frontierEdgeIds: [],
      });

      if (inTree.size >= allNodeIds.size) break;
    }

    if (inTree.size < allNodeIds.size) {
      steps.push({
        message: `Граф несвязный: остов построен для компоненты (${inTree.size}/${allNodeIds.size}). Вес: ${totalWeight}`,
        activeNodeIds: [],
        visitedNodeIds: Array.from(inTree),
        frontierNodeIds: [],
        activeEdgeIds: Array.from(treeEdgeIds),
        frontierEdgeIds: [],
      });
    } else {
      steps.push({
        message: `Готово. Вес минимального остовного дерева: ${totalWeight}`,
        activeNodeIds: [],
        visitedNodeIds: Array.from(inTree),
        frontierNodeIds: [],
        activeEdgeIds: Array.from(treeEdgeIds),
        frontierEdgeIds: [],
      });
    }

    return steps;
  },
};
