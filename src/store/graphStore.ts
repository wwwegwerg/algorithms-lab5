import { create } from "zustand";
import type {
  EdgeId,
  EditorMode,
  GraphEdge,
  GraphNode,
  MatrixUnweightedSymbol,
  NodeId,
  Selection,
} from "@/core/graph/types";
import { isLoop } from "@/core/graph/types";
import { validateEdgeDraft } from "@/core/graph/validate";

export type BottomPanel = "none" | "adjacency" | "incidence";

type GraphState = {
  nodes: GraphNode[];
  edges: GraphEdge[];

  mode: EditorMode;
  selection: Selection;

  infoOpen: boolean;
  helpOpen: boolean;

  addEdgeSourceId: NodeId | null;
  newEdgeDirected: boolean;

  bottomPanel: BottomPanel;
  matrixUnweightedSymbol: MatrixUnweightedSymbol;

  lastError: string | null;

  nextNodeIndex: number;
  nextEdgeIndex: number;
};

type GraphActions = {
  clearError: () => void;

  setMode: (mode: EditorMode) => void;
  setSelection: (selection: Selection) => void;

  setInfoOpen: (open: boolean) => void;
  toggleInfoOpen: () => void;

  setHelpOpen: (open: boolean) => void;
  toggleHelpOpen: () => void;

  setBottomPanel: (panel: BottomPanel) => void;
  setMatrixUnweightedSymbol: (symbol: MatrixUnweightedSymbol) => void;

  addNodeAt: (x: number, y: number) => void;
  updateNode: (
    id: NodeId,
    patch: Partial<Pick<GraphNode, "label" | "x" | "y">>,
  ) => void;
  deleteNode: (id: NodeId) => void;

  startEdgeFrom: (id: NodeId) => void;
  cancelEdgeDraft: () => void;
  setNewEdgeDirected: (directed: boolean) => void;
  addEdgeTo: (targetId: NodeId) => void;

  updateEdge: (
    id: EdgeId,
    patch: Partial<Pick<GraphEdge, "directed" | "weight">>,
  ) => void;
  deleteEdge: (id: EdgeId) => void;

  deleteSelection: () => void;

  setGraph: (nodes: GraphNode[], edges: GraphEdge[]) => void;
  resetGraph: () => void;
};

const initialState: GraphState = {
  nodes: [],
  edges: [],

  mode: "select",
  selection: null,

  infoOpen: false,
  helpOpen: false,

  addEdgeSourceId: null,
  newEdgeDirected: false,

  bottomPanel: "none",
  matrixUnweightedSymbol: "_",

  lastError: null,

  nextNodeIndex: 1,
  nextEdgeIndex: 1,
};

function nextId(prefix: string, index: number) {
  return `${prefix}${index}`;
}

function computeNextIndex(prefix: string, ids: readonly string[]) {
  let max = 0;
  const re = new RegExp(`^${prefix}(\\d+)$`);
  for (const id of ids) {
    const match = re.exec(id);
    const n = match ? Number(match[1]) : 0;
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return max + 1;
}

export const useGraphStore = create<GraphState & GraphActions>((set, get) => ({
  ...initialState,

  clearError: () => set({ lastError: null }),

  setMode: (mode) =>
    set((s) => ({
      mode,
      addEdgeSourceId: mode === "add_edge" ? s.addEdgeSourceId : null,
      selection: mode === "add_edge" ? s.selection : s.selection,
      lastError: null,
    })),

  setSelection: (selection) => set({ selection, lastError: null }),

  setInfoOpen: (open) => set({ infoOpen: open }),
  toggleInfoOpen: () => set((s) => ({ infoOpen: !s.infoOpen })),

  setHelpOpen: (open) => set({ helpOpen: open }),
  toggleHelpOpen: () => set((s) => ({ helpOpen: !s.helpOpen })),

  setBottomPanel: (panel) => set({ bottomPanel: panel, lastError: null }),

  setMatrixUnweightedSymbol: (symbol) =>
    set({ matrixUnweightedSymbol: symbol }),

  addNodeAt: (x, y) =>
    set((s) => {
      const id = nextId("n", s.nextNodeIndex);
      const node: GraphNode = { id, label: id, x, y };
      return {
        nodes: [...s.nodes, node],
        nextNodeIndex: s.nextNodeIndex + 1,
        selection: { kind: "node", id },
        lastError: null,
      };
    }),

  updateNode: (id, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    })),

  deleteNode: (id) =>
    set((s) => {
      const nodes = s.nodes.filter((n) => n.id !== id);
      const edges = s.edges.filter((e) => e.source !== id && e.target !== id);
      const selection =
        s.selection?.kind === "node" && s.selection.id === id
          ? null
          : s.selection;

      return {
        nodes,
        edges,
        selection,
        addEdgeSourceId: s.addEdgeSourceId === id ? null : s.addEdgeSourceId,
        lastError: null,
      };
    }),

  startEdgeFrom: (id) => set({ addEdgeSourceId: id, lastError: null }),

  cancelEdgeDraft: () => set({ addEdgeSourceId: null, lastError: null }),

  setNewEdgeDirected: (directed) => set({ newEdgeDirected: directed }),

  addEdgeTo: (targetId) =>
    set((s) => {
      const sourceId = s.addEdgeSourceId;
      if (!sourceId) return s;

      const draft = {
        source: sourceId,
        target: targetId,
        directed: s.newEdgeDirected,
      };

      const validation = validateEdgeDraft(s.nodes, s.edges, draft);
      if (!validation.ok) {
        return { ...s, lastError: validation.message };
      }

      const id = nextId("e", s.nextEdgeIndex);
      const edge: GraphEdge = { id, ...draft };

      const selection: Selection = { kind: "edge", id };

      return {
        ...s,
        edges: [...s.edges, edge],
        nextEdgeIndex: s.nextEdgeIndex + 1,
        addEdgeSourceId: null,
        selection,
        lastError: null,
      };
    }),

  updateEdge: (id, patch) =>
    set((s) => {
      const edge = s.edges.find((e) => e.id === id);
      if (!edge) return s;

      const next: GraphEdge = { ...edge, ...patch };

      if (isLoop(next)) {
        next.directed = false;
      }

      const validation = validateEdgeDraft(
        s.nodes,
        s.edges,
        {
          source: next.source,
          target: next.target,
          directed: next.directed,
          weight: next.weight,
        },
        id,
      );

      if (!validation.ok) {
        return { ...s, lastError: validation.message };
      }

      return {
        ...s,
        edges: s.edges.map((e) => (e.id === id ? next : e)),
        lastError: null,
      };
    }),

  deleteEdge: (id) =>
    set((s) => ({
      edges: s.edges.filter((e) => e.id !== id),
      selection:
        s.selection?.kind === "edge" && s.selection.id === id
          ? null
          : s.selection,
      lastError: null,
    })),

  deleteSelection: () => {
    const { selection } = get();
    if (!selection) return;

    if (selection.kind === "node") get().deleteNode(selection.id);
    if (selection.kind === "edge") get().deleteEdge(selection.id);
  },

  setGraph: (nodes, edges) =>
    set(() => ({
      nodes,
      edges,
      selection: null,
      addEdgeSourceId: null,
      lastError: null,
      nextNodeIndex: computeNextIndex(
        "n",
        nodes.map((n) => n.id),
      ),
      nextEdgeIndex: computeNextIndex(
        "e",
        edges.map((e) => e.id),
      ),
    })),

  resetGraph: () => set({ ...initialState }),
}));
