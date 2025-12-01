export type NodeId = string;

export type EdgeId = string;

export type Node = {
  id: NodeId;
  x: number;
  y: number;
  label: string;
};

export type Edge = {
  id: EdgeId;
  from: NodeId;
  to: NodeId;
  weight?: number;
  isDirected: boolean;
  curvatureOffset: number;
};

export type EditMode =
  | "idle"
  | "add-node"
  // дальше добавишь новые режимы
  | "add-edge"
  | "add-directed-edge"
  | "adjust-curvature"
  | "delete";
