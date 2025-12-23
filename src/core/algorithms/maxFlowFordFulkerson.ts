import type { GraphAlgorithm, OverlayState } from "@/core/algorithms/types";
import type { EdgeId, GraphEdge, NodeId } from "@/core/graph/types";
import { isLoop } from "@/core/graph/types";

const MAX_FLOW_ID = "MAX_FLOW_FF";

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
  step: Omit<OverlayState, "flowByEdgeId">,
  flow: Record<EdgeId, number>,
) {
  steps.push({ ...step, flowByEdgeId: cloneFlow(flow) });
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

export const maxFlowFordFulkersonAlgorithm: GraphAlgorithm = {
  id: MAX_FLOW_ID,
  label: "Max flow (Ford–Fulkerson, DFS)",
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
          flowByEdgeId: {},
        },
      ];
    }

    for (const e of edges) {
      if (e.weight === undefined) {
        return [
          {
            message: `Ошибка: пустой weight у ребра ${e.id}`,
            activeNodeIds: [],
            visitedNodeIds: [],
            frontierNodeIds: [],
            flowByEdgeId: {},
          },
        ];
      }

      if (!Number.isInteger(e.weight)) {
        return [
          {
            message: `Ошибка: weight у ребра ${e.id} должен быть целым числом`,
            activeNodeIds: [],
            visitedNodeIds: [],
            frontierNodeIds: [],
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
      const visited = new Set<NodeId>();
      const stack: NodeId[] = [];
      const idxStack: number[] = [];
      const parent = new Map<NodeId, { prev: NodeId; arc: Arc }>();
      const options = new Map<NodeId, Arc[]>();

      visited.add(sourceNodeId);
      stack.push(sourceNodeId);
      idxStack.push(0);

      pushStep(
        steps,
        {
          message: "DFS: ищем увеличивающий путь в остаточной сети",
          activeNodeIds: [sourceNodeId],
          visitedNodeIds: Array.from(visited),
          frontierNodeIds: [...stack],
        },
        flow,
      );

      while (stack.length > 0) {
        const nodeId = stack[stack.length - 1]!;
        if (nodeId === sinkNodeId) break;

        const arcs = options.get(nodeId) ?? arcsFrom(nodeId, adj, flow);
        options.set(nodeId, arcs);

        const idx = idxStack[idxStack.length - 1]!;
        if (idx >= arcs.length) {
          stack.pop();
          idxStack.pop();
          continue;
        }

        const arc = arcs[idx]!;
        idxStack[idxStack.length - 1] = idx + 1;

        pushStep(
          steps,
          {
            message: `DFS: пробуем ребро ${arc.edgeId} (${arc.kind}), residual=${arc.residual}`,
            activeNodeIds: [nodeId],
            visitedNodeIds: Array.from(visited),
            frontierNodeIds: [...stack],
            activeEdgeId: arc.edgeId,
          },
          flow,
        );

        if (visited.has(arc.to)) continue;

        visited.add(arc.to);
        parent.set(arc.to, { prev: nodeId, arc });
        stack.push(arc.to);
        idxStack.push(0);

        pushStep(
          steps,
          {
            message: `DFS: переходим в ${arc.to}`,
            activeNodeIds: [arc.to],
            visitedNodeIds: Array.from(visited),
            frontierNodeIds: [...stack],
          },
          flow,
        );
      }

      if (!visited.has(sinkNodeId)) {
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
          message: `Найден увеличивающий путь (bottleneck=${bottleneck})`,
          activeNodeIds: [...path.nodes],
          visitedNodeIds: Array.from(visited),
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
            activeEdgeId: arc.edgeId,
          },
          flow,
        );
      }
    }
  },
};
