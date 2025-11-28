export type NodeId = string;

export type Node = {
  id: NodeId;
  x: number;
  y: number;
  label: string;
};

export type Edge = {
  id: string;
  from: NodeId;
  to: NodeId;
  weight?: number;
};

export type EditMode =
  | "idle"
  | "add-node"
  // дальше добавишь новые режимы
  | "add-edge"
  | "delete";
