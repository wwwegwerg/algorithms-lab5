import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  EdgeId,
  EditorMode,
  GraphEdge,
  GraphNode,
  MatrixUnweightedSymbol,
  NodeId,
  SelectionItem,
  SelectionState,
} from "@/core/graph/types";
import { isLoop } from "@/core/graph/types";
import { validateEdgeDraft } from "@/core/graph/validate";
import { loadGraphSnapshot } from "@/core/io/graphFile";

const PERSIST_KEY = "graph-editor:graph";
const graphStorage = createJSONStorage(() => localStorage);

export type BottomPanel = "none" | "adjacency" | "incidence";

export type EdgeDraft = { sourceId: NodeId };

export type InteractionState = {
  mode: EditorMode;
  selection: SelectionState;
  edgeDraft: EdgeDraft | null;
};

type GraphState = {
  nodes: GraphNode[];
  edges: GraphEdge[];

  interaction: InteractionState;

  infoOpen: boolean;
  helpOpen: boolean;

  newEdgeDirected: boolean;

  bottomPanel: BottomPanel;
  matrixUnweightedSymbol: MatrixUnweightedSymbol;

  lastError: string | null;
  errorNonce: number;

  nextNodeIndex: number;
  nextEdgeIndex: number;
};

type GraphActions = {
  clearError: () => void;

  setMode: (mode: EditorMode) => void;

  clearSelection: () => void;
  selectNode: (id: NodeId, additive: boolean) => void;
  selectEdge: (id: EdgeId, additive: boolean) => void;
  applyBoxSelection: (
    nodeIds: NodeId[],
    edgeIds: EdgeId[],
    additive: boolean,
  ) => void;

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
  clearPersistedGraph: () => void;
};

const emptySelection: SelectionState = {
  nodeIds: [],
  edgeIds: [],
  focus: null,
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function tryLoadPersistedGraph(persisted: unknown) {
  if (!isRecord(persisted)) return null;
  const rawNodes = persisted.nodes;
  const rawEdges = persisted.edges;
  if (!Array.isArray(rawNodes) || !Array.isArray(rawEdges)) return null;

  const loaded = loadGraphSnapshot({
    version: 1,
    nodes: rawNodes,
    edges: rawEdges,
  });
  if (!loaded.ok) return null;
  return loaded.graph;
}

function removeId<T extends string>(ids: readonly T[], id: T) {
  return ids.filter((x) => x !== id);
}

function uniqueAppend<T extends string>(ids: readonly T[], id: T) {
  if (ids.includes(id)) return [...ids];
  return [...ids, id];
}

function toggleId<T extends string>(ids: readonly T[], id: T) {
  if (ids.includes(id)) return { next: removeId(ids, id), included: false };
  return { next: [...ids, id], included: true };
}

function normalizeSelection(selection: SelectionState): SelectionState {
  if (!selection.focus) return selection;

  if (selection.focus.kind === "node") {
    if (!selection.nodeIds.includes(selection.focus.id)) {
      return { ...selection, focus: null };
    }
  }

  if (selection.focus.kind === "edge") {
    if (!selection.edgeIds.includes(selection.focus.id)) {
      return { ...selection, focus: null };
    }
  }

  return selection;
}

const initialState: GraphState = {
  nodes: [],
  edges: [],

  interaction: {
    mode: "select",
    selection: emptySelection,
    edgeDraft: null,
  },

  infoOpen: false,
  helpOpen: false,

  newEdgeDirected: false,

  bottomPanel: "none",
  matrixUnweightedSymbol: "_",

  lastError: null,
  errorNonce: 0,

  nextNodeIndex: 1,
  nextEdgeIndex: 1,
};

export const useGraphStore = create<GraphState & GraphActions>()(
  persist(
    (set) => ({
      ...initialState,

      clearError: () => set({ lastError: null }),

      setMode: (mode) =>
        set((s) => {
          const interaction: InteractionState = { ...s.interaction, mode };

          if (mode === "add_edge") {
            interaction.selection = emptySelection;
            interaction.edgeDraft = null;
          } else {
            interaction.edgeDraft = null;
          }

          return { interaction, lastError: null };
        }),

      clearSelection: () =>
        set((s) => ({
          interaction: {
            ...s.interaction,
            selection: emptySelection,
            edgeDraft: null,
          },
          lastError: null,
        })),

      selectNode: (id, additive) =>
        set((s) => {
          if (!additive) {
            return {
              interaction: {
                ...s.interaction,
                selection: {
                  nodeIds: [id],
                  edgeIds: [],
                  focus: { kind: "node", id },
                },
                edgeDraft: null,
              },
              lastError: null,
            };
          }

          const toggled = toggleId(s.interaction.selection.nodeIds, id);
          const focus: SelectionItem | null = toggled.included
            ? { kind: "node", id }
            : s.interaction.selection.focus?.kind === "node" &&
                s.interaction.selection.focus.id === id
              ? null
              : s.interaction.selection.focus;

          return {
            interaction: {
              ...s.interaction,
              selection: normalizeSelection({
                nodeIds: toggled.next,
                edgeIds: s.interaction.selection.edgeIds,
                focus,
              }),
              edgeDraft: null,
            },
            lastError: null,
          };
        }),

      selectEdge: (id, additive) =>
        set((s) => {
          if (!additive) {
            return {
              interaction: {
                ...s.interaction,
                selection: {
                  nodeIds: [],
                  edgeIds: [id],
                  focus: { kind: "edge", id },
                },
                edgeDraft: null,
              },
              lastError: null,
            };
          }

          const toggled = toggleId(s.interaction.selection.edgeIds, id);
          const focus: SelectionItem | null = toggled.included
            ? { kind: "edge", id }
            : s.interaction.selection.focus?.kind === "edge" &&
                s.interaction.selection.focus.id === id
              ? null
              : s.interaction.selection.focus;

          return {
            interaction: {
              ...s.interaction,
              selection: normalizeSelection({
                nodeIds: s.interaction.selection.nodeIds,
                edgeIds: toggled.next,
                focus,
              }),
              edgeDraft: null,
            },
            lastError: null,
          };
        }),

      applyBoxSelection: (nodeIds, edgeIds, additive) =>
        set((s) => {
          const focus: SelectionItem | null =
            nodeIds.length > 0
              ? { kind: "node", id: nodeIds[nodeIds.length - 1]! }
              : edgeIds.length > 0
                ? { kind: "edge", id: edgeIds[edgeIds.length - 1]! }
                : additive
                  ? s.interaction.selection.focus
                  : null;

          const selection: SelectionState = additive
            ? {
                nodeIds: nodeIds.reduce(
                  (acc, id) => uniqueAppend(acc, id),
                  s.interaction.selection.nodeIds,
                ),
                edgeIds: edgeIds.reduce(
                  (acc, id) => uniqueAppend(acc, id),
                  s.interaction.selection.edgeIds,
                ),
                focus,
              }
            : { nodeIds, edgeIds, focus };

          return {
            interaction: {
              ...s.interaction,
              selection: normalizeSelection(selection),
              edgeDraft: null,
            },
            lastError: null,
          };
        }),

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
            interaction: {
              ...s.interaction,
              selection: {
                nodeIds: [id],
                edgeIds: [],
                focus: { kind: "node", id },
              },
              edgeDraft: null,
            },
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
          const edges = s.edges.filter(
            (e) => e.source !== id && e.target !== id,
          );

          const remainingNodeIds = new Set(nodes.map((n) => n.id));
          const remainingEdgeIds = new Set(edges.map((e) => e.id));

          const selection: SelectionState = normalizeSelection({
            nodeIds: s.interaction.selection.nodeIds.filter((nid) =>
              remainingNodeIds.has(nid),
            ),
            edgeIds: s.interaction.selection.edgeIds.filter((eid) =>
              remainingEdgeIds.has(eid),
            ),
            focus: s.interaction.selection.focus,
          });

          const edgeDraft =
            s.interaction.edgeDraft?.sourceId === id
              ? null
              : s.interaction.edgeDraft;

          return {
            nodes,
            edges,
            interaction: { ...s.interaction, selection, edgeDraft },
            lastError: null,
          };
        }),

      startEdgeFrom: (id) =>
        set((s) => ({
          interaction: {
            ...s.interaction,
            selection: emptySelection,
            edgeDraft: { sourceId: id },
          },
          lastError: null,
        })),

      cancelEdgeDraft: () =>
        set((s) => ({
          interaction: { ...s.interaction, edgeDraft: null },
          lastError: null,
        })),

      setNewEdgeDirected: (directed) => set({ newEdgeDirected: directed }),

      addEdgeTo: (targetId) =>
        set((s) => {
          const sourceId = s.interaction.edgeDraft?.sourceId;
          if (!sourceId) return s;

          const draft = {
            source: sourceId,
            target: targetId,
            directed: s.newEdgeDirected,
          };

          const validation = validateEdgeDraft(s.nodes, s.edges, draft);
          if (!validation.ok) {
            return {
              ...s,
              lastError: validation.message,
              errorNonce: s.errorNonce + 1,
            };
          }

          const id = nextId("e", s.nextEdgeIndex);
          const edge: GraphEdge = { id, ...draft };

          return {
            ...s,
            edges: [...s.edges, edge],
            nextEdgeIndex: s.nextEdgeIndex + 1,
            interaction: {
              ...s.interaction,
              selection: {
                nodeIds: [],
                edgeIds: [id],
                focus: { kind: "edge", id },
              },
              edgeDraft: null,
            },
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
            return {
              ...s,
              lastError: validation.message,
              errorNonce: s.errorNonce + 1,
            };
          }

          return {
            ...s,
            edges: s.edges.map((e) => (e.id === id ? next : e)),
            lastError: null,
          };
        }),

      deleteEdge: (id) =>
        set((s) => {
          const edges = s.edges.filter((e) => e.id !== id);
          const remainingEdgeIds = new Set(edges.map((e) => e.id));

          const selection: SelectionState = normalizeSelection({
            nodeIds: s.interaction.selection.nodeIds,
            edgeIds: s.interaction.selection.edgeIds.filter((eid) =>
              remainingEdgeIds.has(eid),
            ),
            focus: s.interaction.selection.focus,
          });

          return {
            edges,
            interaction: { ...s.interaction, selection },
            lastError: null,
          };
        }),

      deleteSelection: () =>
        set((s) => {
          const selectedNodeIds = new Set(s.interaction.selection.nodeIds);
          const selectedEdgeIds = new Set(s.interaction.selection.edgeIds);

          if (selectedNodeIds.size === 0 && selectedEdgeIds.size === 0)
            return s;

          const nodes = s.nodes.filter((n) => !selectedNodeIds.has(n.id));
          const edges = s.edges.filter(
            (e) =>
              !selectedEdgeIds.has(e.id) &&
              !selectedNodeIds.has(e.source) &&
              !selectedNodeIds.has(e.target),
          );

          const edgeDraft =
            s.interaction.edgeDraft &&
            selectedNodeIds.has(s.interaction.edgeDraft.sourceId)
              ? null
              : s.interaction.edgeDraft;

          return {
            nodes,
            edges,
            interaction: {
              ...s.interaction,
              selection: emptySelection,
              edgeDraft,
            },
            lastError: null,
          };
        }),

      setGraph: (nodes, edges) =>
        set((s) => ({
          nodes,
          edges,
          interaction: {
            ...s.interaction,
            mode: "select",
            selection: emptySelection,
            edgeDraft: null,
          },
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

      clearPersistedGraph: () => {
        set({ ...initialState });
        graphStorage?.removeItem(PERSIST_KEY);
      },
    }),
    {
      name: PERSIST_KEY,
      version: 1,
      storage: graphStorage,
      partialize: (s) => ({ nodes: s.nodes, edges: s.edges }),
      merge: (persisted, current) => {
        const next = tryLoadPersistedGraph(persisted);
        if (!next) return current;

        return {
          ...current,
          nodes: next.nodes,
          edges: next.edges,
          interaction: {
            ...current.interaction,
            mode: "select",
            selection: emptySelection,
            edgeDraft: null,
          },
          lastError: null,
          nextNodeIndex: computeNextIndex(
            "n",
            next.nodes.map((n) => n.id),
          ),
          nextEdgeIndex: computeNextIndex(
            "e",
            next.edges.map((e) => e.id),
          ),
        };
      },
    },
  ),
);
