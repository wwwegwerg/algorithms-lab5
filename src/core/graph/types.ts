export type NodeId = string;
export type EdgeId = string;

export type GraphNode = {
  id: NodeId;
  label: string;
  x: number;
  y: number;
};

export type GraphEdge = {
  id: EdgeId;
  source: NodeId;
  target: NodeId;
  directed: boolean;
  weight?: number;
};

export type GraphSnapshot = {
  version: 1;
  nodes: GraphNode[];
  edges: GraphEdge[];
  meta?: {
    savedAtIso?: string;
  };
};

export type Selection =
  | { kind: "node"; id: NodeId }
  | { kind: "edge"; id: EdgeId }
  | null;

export type EditorMode = "select" | "add_node" | "add_edge" | "delete";

export type MatrixUnweightedSymbol = "_" | "1" | "∞";

export function isLoop(edge: Pick<GraphEdge, "source" | "target">) {
  return edge.source === edge.target;
}
