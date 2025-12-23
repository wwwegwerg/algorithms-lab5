import type { GraphAlgorithm, OverlayState } from "@/core/algorithms/types";
import type { EdgeId, GraphEdge, NodeId } from "@/core/graph/types";
import { isLoop } from "@/core/graph/types";

const MAX_FLOW_ID = "MAX_FLOW_FF" as const;

type Arc = {
  edgeId: EdgeId;
  from: NodeId;
  to: NodeId;
  kind: "forward" | "backward";
  residual: number;
};

function cap(e: GraphEdge) {
  return e.weight ?? 0;
}

function cloneFlow(flow: Record<EdgeId, number>) {
  return { ...flow };
}

function buildAdj(edges: readonly GraphEdge[]) {
  const outBySrc = new Map<NodeId, GraphEdge[]>();
  const inByTgt = new Map<NodeId, GraphEdge[]>();

  for (const e of edges) {
    const out = outBySrc.get(e.source);
    if (out) out.push(e);
    else outBySrc.set(e.source, [e]);

    const inn = inByTgt.get(e.target);
    if (inn) inn.push(e);
    else inByTgt.set(e.target, [e]);
  }

  for (const list of outBySrc.values()) {
    list.sort((a, b) => a.id.localeCompare(b.id));
  }
  for (const list of inByTgt.values()) {
    list.sort((a, b) => a.id.localeCompare(b.id));
  }

  return { outBySrc, inByTgt };
}

function arcsFrom(
  nodeId: NodeId,
  adj: ReturnType<typeof buildAdj>,
  flow: Record<EdgeId, number>,
) {
  const out: Arc[] = [];

  const outgoing = adj.outBySrc.get(nodeId) ?? [];
  for (const e of outgoing) {
    const f = flow[e.id] ?? 0;
    const r = cap(e) - f;
    if (r <= 0) continue;
    out.push({
      edgeId: e.id,
      from: e.source,
      to: e.target,
      kind: "forward",
      residual: r,
    });
  }

  const incoming = adj.inByTgt.get(nodeId) ?? [];
  for (const e of incoming) {
    const f = flow[e.id] ?? 0;
    if (f <= 0) continue;
    out.push({
      edgeId: e.id,
      from: e.target,
      to: e.source,
      kind: "backward",
      residual: f,
    });
  }

  out.sort((a, b) => {
    const idCmp = a.edgeId.localeCompare(b.edgeId);
    if (idCmp !== 0) return idCmp;
    return a.kind.localeCompare(b.kind);
  });

  return out;
}

function pushStep(
  steps: OverlayState[],
  step: Partial<Omit<OverlayState, "flowByEdgeId">>,
  flow: Record<EdgeId, number>,
) {
  const base: Omit<OverlayState, "flowByEdgeId"> = {
    message: undefined,
    activeNodeIds: [],
    visitedNodeIds: [],
    frontierNodeIds: [],
    activeEdgeIds: [],
    frontierEdgeIds: [],
  };

  steps.push({ ...base, ...step, flowByEdgeId: cloneFlow(flow) });
}

function reconstructPath(
  src: NodeId,
  sink: NodeId,
  parent: Map<NodeId, { prev: NodeId; arc: Arc }>,
) {
  const arcs: Arc[] = [];
  const nodes: NodeId[] = [];

  let cur: NodeId | null = sink;
  while (cur !== null) {
    nodes.push(cur);
    if (cur === src) break;
    const p = parent.get(cur);
    if (!p) return null;
    arcs.push(p.arc);
    cur = p.prev;
  }

  nodes.reverse();
  arcs.reverse();
  return { arcs, nodes };
}

export const maxFlowFordFulkersonAlgorithm = {
  id: MAX_FLOW_ID,
  label: "Max flow (Ford–Fulkerson)",
  supports: ({ nodes, edges, sourceNodeId, sinkNodeId }) => {
    if (!sourceNodeId) {
      return { ok: false, message: "Выберите source" };
    }

    if (!sinkNodeId) {
      return { ok: false, message: "Выберите sink" };
    }

    if (sourceNodeId === sinkNodeId) {
      return { ok: false, message: "Source и sink должны быть разными" };
    }

    const isSourcePresent = nodes.some((n) => n.id === sourceNodeId);
    const isSinkPresent = nodes.some((n) => n.id === sinkNodeId);
    if (!isSourcePresent || !isSinkPresent) {
      return { ok: false, message: "Source/sink не найдены" };
    }

    for (const e of edges) {
      if (!e.isDirected) {
        return {
          ok: false,
          message: "Для max-flow нужен орграф (без неориентированных ребер)",
        };
      }
      if (isLoop(e)) {
        return { ok: false, message: "Для max-flow петли запрещены" };
      }

      if (e.weight === undefined) {
        return {
          ok: false,
          message: "Укажите capacity (weight) для каждого ребра",
        };
      }

      if (!Number.isFinite(e.weight) || e.weight <= 0) {
        return { ok: false, message: "Capacity должна быть > 0" };
      }

      if (!Number.isInteger(e.weight)) {
        return { ok: false, message: "Capacity должна быть целым числом" };
      }
    }

    return { ok: true };
  },
  run: ({ edges, sourceNodeId, sinkNodeId }) => {
    if (!sourceNodeId) {
      return [
        {
          message: "Ошибка: пустой id source",
          activeNodeIds: [],
          visitedNodeIds: [],
          frontierNodeIds: [],
          activeEdgeIds: [],
          frontierEdgeIds: [],
          flowByEdgeId: {},
        },
      ];
    }

    if (!sinkNodeId) {
      return [
        {
          message: "Ошибка: пустой id sink",
          activeNodeIds: [],
          visitedNodeIds: [],
          frontierNodeIds: [],
          activeEdgeIds: [],
          frontierEdgeIds: [],
          flowByEdgeId: {},
        },
      ];
    }

    if (sourceNodeId === sinkNodeId) {
      return [
        {
          message: "Ошибка: source и sink должны быть разными",
          activeNodeIds: [],
          visitedNodeIds: [],
          frontierNodeIds: [],
          activeEdgeIds: [],
          frontierEdgeIds: [],
          flowByEdgeId: {},
        },
      ];
    }

    for (const e of edges) {
      if (e.weight === undefined || !Number.isFinite(e.weight)) {
        return [
          {
            message: "Ошибка: не у всех ребер задана корректная capacity",
            activeNodeIds: [],
            visitedNodeIds: [],
            frontierNodeIds: [],
            activeEdgeIds: [],
            frontierEdgeIds: [],
            flowByEdgeId: {},
          },
        ];
      }

      if (sourceNodeId === sinkNodeId) {
        return [
          {
            message: "Ошибка: source и sink должны быть разными",
            activeNodeIds: [],
            visitedNodeIds: [],
            frontierNodeIds: [],
            activeEdgeIds: [],
            frontierEdgeIds: [],
            flowByEdgeId: {},
          },
        ];
      }
    }

    const flow: Record<EdgeId, number> = {};
    edges.forEach((e) => {
      flow[e.id] = 0;
    });

    const adj = buildAdj(edges);
    const steps: OverlayState[] = [];

    pushStep(
      steps,
      {
        message: `Старт max-flow: source=${sourceNodeId}, sink=${sinkNodeId}`,
        activeNodeIds: [],
        visitedNodeIds: [],
        frontierNodeIds: [],
      },
      flow,
    );

    while (true) {
      const marked = new Set<NodeId>();
      const queue: NodeId[] = [];
      const parent = new Map<NodeId, { prev: NodeId; arc: Arc }>();

      marked.add(sourceNodeId);
      queue.push(sourceNodeId);

      pushStep(
        steps,
        {
          message: "Маркировка: ищем увеличивающий путь в остаточной сети",
          activeNodeIds: [sourceNodeId],
          visitedNodeIds: Array.from(marked),
          frontierNodeIds: [...queue],
        },
        flow,
      );

      while (queue.length > 0 && !marked.has(sinkNodeId)) {
        const nodeId = queue.shift()!;

        pushStep(
          steps,
          {
            message: `Маркировка: рассматриваем вершину ${nodeId}`,
            activeNodeIds: [nodeId],
            visitedNodeIds: Array.from(marked),
            frontierNodeIds: [...queue],
          },
          flow,
        );

        const arcs = arcsFrom(nodeId, adj, flow);
        for (const arc of arcs) {
          const sign = arc.kind === "forward" ? "+" : "-";

          pushStep(
            steps,
            {
              message: `Маркировка: пробуем ребро ${arc.edgeId} (${sign}), residual=${arc.residual}`,
              activeNodeIds: [nodeId],
              visitedNodeIds: Array.from(marked),
              frontierNodeIds: [...queue],
              activeEdgeIds: [arc.edgeId],
            },
            flow,
          );

          if (marked.has(arc.to)) continue;

          marked.add(arc.to);
          parent.set(arc.to, { prev: nodeId, arc });
          queue.push(arc.to);

          pushStep(
            steps,
            {
              message: `Маркировка: пометили ${arc.to} через ${nodeId} (${sign})`,
              activeNodeIds: [arc.to],
              visitedNodeIds: Array.from(marked),
              frontierNodeIds: [...queue],
              activeEdgeIds: [arc.edgeId],
            },
            flow,
          );

          if (arc.to === sinkNodeId) break;
        }
      }

      if (!marked.has(sinkNodeId)) {
        const value = edges
          .filter((e) => e.source === sourceNodeId)
          .reduce((acc, e) => acc + (flow[e.id] ?? 0), 0);

        pushStep(
          steps,
          {
            message: `Увеличивающий путь не найден. Максимальный поток = ${value}`,
            activeNodeIds: [],
            visitedNodeIds: [],
            frontierNodeIds: [],
          },
          flow,
        );

        return steps;
      }

      const path = reconstructPath(sourceNodeId, sinkNodeId, parent);
      if (!path) {
        pushStep(
          steps,
          {
            message: "Ошибка: не удалось восстановить путь",
            activeNodeIds: [],
            visitedNodeIds: [],
            frontierNodeIds: [],
            activeEdgeIds: [],
            frontierEdgeIds: [],
          },
          flow,
        );
        return steps;
      }

      const bottleneck = path.arcs.reduce(
        (acc, arc) => Math.min(acc, arc.residual),
        Number.POSITIVE_INFINITY,
      );

      pushStep(
        steps,
        {
          message: `Найден увеличивающий путь (K=${bottleneck})`,
          activeNodeIds: [...path.nodes],
          visitedNodeIds: Array.from(marked),
          frontierNodeIds: [],
        },
        flow,
      );

      for (const arc of path.arcs) {
        const prev = flow[arc.edgeId] ?? 0;
        flow[arc.edgeId] =
          arc.kind === "forward" ? prev + bottleneck : prev - bottleneck;

        pushStep(
          steps,
          {
            message:
              arc.kind === "forward"
                ? `Увеличиваем поток по ${arc.edgeId}: +${bottleneck}`
                : `Уменьшаем поток по ${arc.edgeId}: -${bottleneck}`,
            activeNodeIds: [arc.from, arc.to],
            visitedNodeIds: [],
            frontierNodeIds: [],
            activeEdgeIds: [arc.edgeId],
          },
          flow,
        );
      }
    }
  },
} satisfies GraphAlgorithm;
