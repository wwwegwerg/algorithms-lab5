import type { EdgeId, GraphEdge, GraphNode, NodeId } from "@/core/graph/types";

export type OverlayState = {
  message?: string;

  activeNodeIds: NodeId[];
  visitedNodeIds: NodeId[];
  frontierNodeIds: NodeId[];

  activeEdgeIds: EdgeId[];
  frontierEdgeIds: EdgeId[];

  flowByEdgeId?: Record<EdgeId, number>;
};

export type AlgorithmSupport = { ok: true } | { ok: false; message: string };

export type AlgorithmContext = {
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
  sourceNodeId: NodeId;
  sinkNodeId?: NodeId;
};

export type GraphAlgorithm = {
  id: string;
  label: string;
  supports: (ctx: AlgorithmContext) => AlgorithmSupport;
  run: (ctx: AlgorithmContext) => OverlayState[];
};
