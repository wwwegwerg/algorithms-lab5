import { create } from "zustand";
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
import { useGraphDataStore } from "@/store/graphDataStore";

export type BottomPanel = "none" | "adjacency" | "incidence";

export type EdgeDraft = { sourceId: NodeId };

export type InteractionState = {
  mode: EditorMode;
  selection: SelectionState;
  edgeDraft: EdgeDraft | null;
};

type GraphUiState = {
  interaction: InteractionState;

  infoOpen: boolean;
  helpOpen: boolean;

  newEdgeDirected: boolean;

  bottomPanel: BottomPanel;
  matrixUnweightedSymbol: MatrixUnweightedSymbol;
};

type GraphUiActions = {
  resetUi: () => void;
  resetInteraction: () => void;

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
  toggleBottomPanel: (panel: Exclude<BottomPanel, "none">) => void;
  setMatrixUnweightedSymbol: (symbol: MatrixUnweightedSymbol) => void;

  addNodeAt: (x: number, y: number) => void;

  startEdgeFrom: (id: NodeId) => void;
  cancelEdgeDraft: () => void;
  setNewEdgeDirected: (directed: boolean) => void;
  addEdgeTo: (targetId: NodeId) => EdgeId | null;

  deleteNode: (id: NodeId) => void;
  deleteEdge: (id: EdgeId) => void;
  deleteSelection: () => void;
};

const emptySelection: SelectionState = {
  nodeIds: [],
  edgeIds: [],
  focus: null,
};

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

function pruneSelectionToGraph(
  selection: SelectionState,
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
) {
  const nodeSet = new Set(nodes.map((n) => n.id));
  const edgeSet = new Set(edges.map((e) => e.id));

  return normalizeSelection({
    nodeIds: selection.nodeIds.filter((id) => nodeSet.has(id)),
    edgeIds: selection.edgeIds.filter((id) => edgeSet.has(id)),
    focus: selection.focus,
  });
}

const initialState: GraphUiState = {
  interaction: {
    mode: "select",
    selection: emptySelection,
    edgeDraft: null,
  },

  infoOpen: false,
  helpOpen: false,

  newEdgeDirected: false,

  bottomPanel: "none",
  matrixUnweightedSymbol: "-",
};

export const useGraphUiStore = create<GraphUiState & GraphUiActions>()(
  (set, get) => ({
    ...initialState,

    resetUi: () => {
      useGraphDataStore.getState().clearError();
      set({ ...initialState });
    },

    resetInteraction: () => {
      useGraphDataStore.getState().clearError();
      set((s) => ({
        ...s,
        interaction: {
          mode: "select",
          selection: emptySelection,
          edgeDraft: null,
        },
      }));
    },

    setMode: (mode) =>
      set((s) => {
        useGraphDataStore.getState().clearError();

        if (mode === s.interaction.mode) {
          return s;
        }

        return {
          ...s,
          interaction: {
            ...s.interaction,
            mode,
            selection: emptySelection,
            edgeDraft: null,
          },
        };
      }),

    clearSelection: () => {
      useGraphDataStore.getState().clearError();
      set((s) => ({
        ...s,
        interaction: {
          ...s.interaction,
          selection: emptySelection,
          edgeDraft: null,
        },
      }));
    },

    selectNode: (id, additive) =>
      set((s) => {
        useGraphDataStore.getState().clearError();

        if (!additive) {
          return {
            ...s,
            interaction: {
              ...s.interaction,
              selection: {
                nodeIds: [id],
                edgeIds: [],
                focus: { kind: "node", id },
              },
              edgeDraft: null,
            },
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
          ...s,
          interaction: {
            ...s.interaction,
            selection: normalizeSelection({
              nodeIds: toggled.next,
              edgeIds: s.interaction.selection.edgeIds,
              focus,
            }),
            edgeDraft: null,
          },
        };
      }),

    selectEdge: (id, additive) =>
      set((s) => {
        useGraphDataStore.getState().clearError();

        if (!additive) {
          return {
            ...s,
            interaction: {
              ...s.interaction,
              selection: {
                nodeIds: [],
                edgeIds: [id],
                focus: { kind: "edge", id },
              },
              edgeDraft: null,
            },
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
          ...s,
          interaction: {
            ...s.interaction,
            selection: normalizeSelection({
              nodeIds: s.interaction.selection.nodeIds,
              edgeIds: toggled.next,
              focus,
            }),
            edgeDraft: null,
          },
        };
      }),

    applyBoxSelection: (nodeIds, edgeIds, additive) =>
      set((s) => {
        useGraphDataStore.getState().clearError();

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
          ...s,
          interaction: {
            ...s.interaction,
            selection: normalizeSelection(selection),
            edgeDraft: null,
          },
        };
      }),

    setInfoOpen: (open) => set({ infoOpen: open }),
    toggleInfoOpen: () => set((s) => ({ infoOpen: !s.infoOpen })),

    setHelpOpen: (open) => set({ helpOpen: open }),
    toggleHelpOpen: () => set((s) => ({ helpOpen: !s.helpOpen })),

    setBottomPanel: (panel) => {
      useGraphDataStore.getState().clearError();
      set({ bottomPanel: panel });
    },

    toggleBottomPanel: (panel) =>
      set((s) => {
        useGraphDataStore.getState().clearError();
        return { bottomPanel: s.bottomPanel === panel ? "none" : panel };
      }),

    setMatrixUnweightedSymbol: (symbol) =>
      set({ matrixUnweightedSymbol: symbol }),

    addNodeAt: (x, y) => {
      const id = useGraphDataStore.getState().addNodeAt(x, y);
      set((s) => ({
        ...s,
        interaction: {
          ...s.interaction,
          selection: {
            nodeIds: [id],
            edgeIds: [],
            focus: { kind: "node", id },
          },
          edgeDraft: null,
        },
      }));
    },

    startEdgeFrom: (id) => {
      useGraphDataStore.getState().clearError();
      set((s) => ({
        ...s,
        interaction: {
          ...s.interaction,
          selection: emptySelection,
          edgeDraft: { sourceId: id },
        },
      }));
    },

    cancelEdgeDraft: () => {
      useGraphDataStore.getState().clearError();
      set((s) => ({
        ...s,
        interaction: { ...s.interaction, edgeDraft: null },
      }));
    },

    setNewEdgeDirected: (directed) => set({ newEdgeDirected: directed }),

    addEdgeTo: (targetId) => {
      const sourceId = get().interaction.edgeDraft?.sourceId;
      if (!sourceId) return null;

      const id = useGraphDataStore.getState().addEdge({
        source: sourceId,
        target: targetId,
        directed: get().newEdgeDirected,
      });

      if (!id) return null;

      set((s) => ({
        ...s,
        interaction: {
          ...s.interaction,
          selection: {
            nodeIds: [],
            edgeIds: [id],
            focus: { kind: "edge", id },
          },
          edgeDraft: null,
        },
      }));

      return id;
    },

    deleteNode: (id) => {
      useGraphDataStore.getState().deleteNode(id);
      const nextGraph = useGraphDataStore.getState();

      set((s) => {
        const selection = pruneSelectionToGraph(
          s.interaction.selection,
          nextGraph.nodes,
          nextGraph.edges,
        );

        const edgeDraft =
          s.interaction.edgeDraft?.sourceId === id
            ? null
            : s.interaction.edgeDraft;

        return {
          ...s,
          interaction: { ...s.interaction, selection, edgeDraft },
        };
      });
    },

    deleteEdge: (id) => {
      useGraphDataStore.getState().deleteEdge(id);
      const nextGraph = useGraphDataStore.getState();

      set((s) => ({
        ...s,
        interaction: {
          ...s.interaction,
          selection: pruneSelectionToGraph(
            s.interaction.selection,
            nextGraph.nodes,
            nextGraph.edges,
          ),
        },
      }));
    },

    deleteSelection: () => {
      const s = get();
      const nodeIds = s.interaction.selection.nodeIds;
      const edgeIds = s.interaction.selection.edgeIds;

      if (nodeIds.length === 0 && edgeIds.length === 0) return;

      useGraphDataStore.getState().deleteByIds(nodeIds, edgeIds);

      set((prev) => {
        const edgeDraft =
          prev.interaction.edgeDraft &&
          nodeIds.includes(prev.interaction.edgeDraft.sourceId)
            ? null
            : prev.interaction.edgeDraft;

        return {
          ...prev,
          interaction: {
            ...prev.interaction,
            selection: emptySelection,
            edgeDraft,
          },
        };
      });
    },
  }),
);
