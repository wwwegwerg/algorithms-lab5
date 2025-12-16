import type { EdgeId, GraphEdge, GraphNode, NodeId } from "@/core/graph/types";

export type OverlayState = {
  message?: string;
  activeNodeIds: NodeId[];
  visitedNodeIds: NodeId[];
  frontierNodeIds: NodeId[];
  activeEdgeId?: EdgeId;
};

export type AlgorithmSupport = { ok: true } | { ok: false; message: string };

export type AlgorithmContext = {
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
  startNodeId: NodeId;
};

export type GraphAlgorithm = {
  id: string;
  label: string;
  supports: (ctx: AlgorithmContext) => AlgorithmSupport;
  run: (ctx: AlgorithmContext) => OverlayState[];
};
