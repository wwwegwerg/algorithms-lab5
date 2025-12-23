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
  isDirected: boolean;
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

export type SelectionItem =
  | { kind: "node"; id: NodeId }
  | { kind: "edge"; id: EdgeId };

export type SelectionState = {
  nodeIds: NodeId[];
  edgeIds: EdgeId[];
  focus: SelectionItem | null;
};

export type Selection = SelectionState;

export type EditorMode = "select" | "add_node" | "add_edge" | "delete";

export type MatrixUnweightedSymbol = "-" | "1" | "∞";

export function isLoop(edge: Pick<GraphEdge, "source" | "target">) {
  return edge.source === edge.target;
}
