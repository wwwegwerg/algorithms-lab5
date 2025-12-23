import type { GraphAlgorithm, OverlayState } from "@/core/algorithms/types";
import type { EdgeId, GraphEdge, GraphNode, NodeId } from "@/core/graph/types";
import { isLoop } from "@/core/graph/types";

function isFiniteWeight(edge: GraphEdge) {
  return edge.weight !== undefined && Number.isFinite(edge.weight);
}

function fmtDist(n: number) {
  return Number.isFinite(n) ? String(n) : "∞";
}

type AdjItem = { to: NodeId; edgeId: EdgeId; weight: number };

function buildUndirectedAdj(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
) {
  const adj = new Map<NodeId, AdjItem[]>();
  for (const n of nodes) adj.set(n.id, []);

  for (const e of edges) {
    if (e.isDirected) continue;
    if (isLoop(e)) continue;
    if (!isFiniteWeight(e)) continue;

    const w = e.weight as number;
    adj.get(e.source)?.push({ to: e.target, edgeId: e.id, weight: w });
    adj.get(e.target)?.push({ to: e.source, edgeId: e.id, weight: w });
  }

  for (const list of adj.values()) {
    list.sort((a, b) => {
      const w = a.weight - b.weight;
      if (w !== 0) return w;
      return a.edgeId.localeCompare(b.edgeId);
    });
  }

  return adj;
}

function collectTreeEdgeIds(parentEdgeByNode: Map<NodeId, EdgeId | null>) {
  const out: EdgeId[] = [];
  for (const e of parentEdgeByNode.values()) {
    if (e) out.push(e);
  }
  out.sort();
  return out;
}

function reconstructPath(
  source: NodeId,
  sink: NodeId,
  parentNodeByNode: Map<NodeId, NodeId | null>,
  parentEdgeByNode: Map<NodeId, EdgeId | null>,
) {
  const nodes: NodeId[] = [];
  const edges: EdgeId[] = [];

  let cur: NodeId | null = sink;
  while (cur !== null) {
    nodes.push(cur);
    if (cur === source) break;
    const currentNodeId: NodeId = cur;
    const prevNodeId = parentNodeByNode.get(currentNodeId) ?? null;
    const prevEdgeId = parentEdgeByNode.get(currentNodeId) ?? null;
    if (!prevNodeId || !prevEdgeId) return null;
    edges.push(prevEdgeId);
    cur = prevNodeId;
  }

  nodes.reverse();
  edges.reverse();
  return { nodes, edges };
}

export const dijkstraAlgorithm: GraphAlgorithm = {
  id: "DIJKSTRA",
  label: "Dijkstra (кратчайший путь)",
  supports: ({ nodes, edges, sourceNodeId, sinkNodeId }) => {
    if (!sourceNodeId) {
      return { ok: false, message: "Выберите стартовую вершину" };
    }

    if (!sinkNodeId) {
      return { ok: false, message: "Выберите конечную вершину" };
    }

    if (sourceNodeId === sinkNodeId) {
      return { ok: false, message: "Старт и финиш должны быть разными" };
    }

    const hasSource = nodes.some((n) => n.id === sourceNodeId);
    const hasSink = nodes.some((n) => n.id === sinkNodeId);
    if (!hasSource || !hasSink) {
      return { ok: false, message: "Старт/финиш не найдены" };
    }

    for (const e of edges) {
      if (e.isDirected) {
        return {
          ok: false,
          message: "Дейкстра: поддерживаются только неориентированные ребра",
        };
      }

      if (isLoop(e)) {
        return {
          ok: false,
          message: "Дейкстра: петли не поддерживаются",
        };
      }

      if (!isFiniteWeight(e)) {
        return {
          ok: false,
          message: "Дейкстра: у всех ребер должен быть вес",
        };
      }

      if ((e.weight as number) < 0) {
        return {
          ok: false,
          message: "Дейкстра: веса должны быть неотрицательными",
        };
      }
    }

    return { ok: true };
  },
  run: ({ nodes, edges, sourceNodeId, sinkNodeId }) => {
    if (!sinkNodeId) {
      return [
        {
          message: "Ошибка: пустой id конечной вершины",
          activeNodeIds: [],
          visitedNodeIds: [],
          frontierNodeIds: [],
          activeEdgeIds: [],
          frontierEdgeIds: [],
        },
      ];
    }

    const adj = buildUndirectedAdj(nodes, edges);

    const dist = new Map<NodeId, number>();
    const parentNodeByNode = new Map<NodeId, NodeId | null>();
    const parentEdgeByNode = new Map<NodeId, EdgeId | null>();

    const unvisited = new Set<NodeId>();
    const visited = new Set<NodeId>();

    for (const n of nodes) {
      dist.set(n.id, Number.POSITIVE_INFINITY);
      parentNodeByNode.set(n.id, null);
      parentEdgeByNode.set(n.id, null);
      unvisited.add(n.id);
    }

    dist.set(sourceNodeId, 0);

    const steps: OverlayState[] = [];

    steps.push({
      message: `Старт: dist(${sourceNodeId})=0, остальные=∞ (цель: ${sinkNodeId})`,
      activeNodeIds: [sourceNodeId],
      visitedNodeIds: [],
      frontierNodeIds: [sourceNodeId],
      activeEdgeIds: [],
      frontierEdgeIds: [],
    });

    while (unvisited.size > 0) {
      let current: NodeId | null = null;
      let best = Number.POSITIVE_INFINITY;

      for (const id of unvisited) {
        const d = dist.get(id) ?? Number.POSITIVE_INFINITY;
        if (d < best) {
          best = d;
          current = id;
        }
      }

      if (!current || !Number.isFinite(best)) {
        steps.push({
          message:
            "Маршрут не существует: все оставшиеся вершины недостижимы (dist=∞)",
          activeNodeIds: [],
          visitedNodeIds: Array.from(visited),
          frontierNodeIds: [],
          activeEdgeIds: collectTreeEdgeIds(parentEdgeByNode),
          frontierEdgeIds: [],
        });
        return steps;
      }

      unvisited.delete(current);
      visited.add(current);

      steps.push({
        message: `Выбрали текущую вершину: ${current} (dist=${fmtDist(best)})`,
        activeNodeIds: [current],
        visitedNodeIds: Array.from(visited),
        frontierNodeIds: Array.from(unvisited).filter((id) =>
          Number.isFinite(dist.get(id) ?? Number.POSITIVE_INFINITY),
        ),
        activeEdgeIds: collectTreeEdgeIds(parentEdgeByNode),
        frontierEdgeIds: [],
      });

      if (current === sinkNodeId) {
        const path = reconstructPath(
          sourceNodeId,
          sinkNodeId,
          parentNodeByNode,
          parentEdgeByNode,
        );

        steps.push({
          message: `Дошли до финиша ${sinkNodeId}. Длина пути = ${fmtDist(
            dist.get(sinkNodeId) ?? Number.POSITIVE_INFINITY,
          )}`,
          activeNodeIds: path ? path.nodes : [sinkNodeId],
          visitedNodeIds: Array.from(visited),
          frontierNodeIds: [],
          activeEdgeIds: path
            ? path.edges
            : collectTreeEdgeIds(parentEdgeByNode),
          frontierEdgeIds: [],
        });

        return steps;
      }

      const outgoing = adj.get(current) ?? [];
      const frontierEdges = outgoing
        .filter((a) => unvisited.has(a.to))
        .map((a) => a.edgeId);

      steps.push({
        message: `Релаксация соседей вершины ${current}`,
        activeNodeIds: [current],
        visitedNodeIds: Array.from(visited),
        frontierNodeIds: outgoing
          .filter((a) => unvisited.has(a.to))
          .map((a) => a.to),
        activeEdgeIds: collectTreeEdgeIds(parentEdgeByNode),
        frontierEdgeIds: frontierEdges,
      });

      for (const arc of outgoing) {
        if (!unvisited.has(arc.to)) continue;

        const currentDist = dist.get(current) ?? Number.POSITIVE_INFINITY;
        const oldDist = dist.get(arc.to) ?? Number.POSITIVE_INFINITY;
        const candidate = currentDist + arc.weight;

        steps.push({
          message: `Проверяем: dist(${arc.to}) = min(${fmtDist(oldDist)}, ${fmtDist(
            currentDist,
          )} + ${arc.weight})`,
          activeNodeIds: [current, arc.to],
          visitedNodeIds: Array.from(visited),
          frontierNodeIds: [arc.to],
          activeEdgeIds: [arc.edgeId, ...collectTreeEdgeIds(parentEdgeByNode)],
          frontierEdgeIds: frontierEdges,
        });

        if (candidate < oldDist) {
          dist.set(arc.to, candidate);
          parentNodeByNode.set(arc.to, current);
          parentEdgeByNode.set(arc.to, arc.edgeId);

          steps.push({
            message: `Обновили: dist(${arc.to}) = ${fmtDist(candidate)} через ${current}`,
            activeNodeIds: [arc.to],
            visitedNodeIds: Array.from(visited),
            frontierNodeIds: [arc.to],
            activeEdgeIds: collectTreeEdgeIds(parentEdgeByNode),
            frontierEdgeIds: frontierEdges,
          });
        }
      }
    }

    steps.push({
      message: "Завершено",
      activeNodeIds: [],
      visitedNodeIds: Array.from(visited),
      frontierNodeIds: [],
      activeEdgeIds: collectTreeEdgeIds(parentEdgeByNode),
      frontierEdgeIds: [],
    });

    return steps;
  },
};
