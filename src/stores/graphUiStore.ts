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
import { useGraphDataStore } from "@/stores/graphDataStore";

function clearGraphError() {
  useGraphDataStore.getState().clearError();
}

export type MatrixDialogKind = "none" | "adjacency" | "incidence";

export type ActiveToolbar = "graph" | "algorithms";

export type EdgeDraft = { sourceId: NodeId };

export type InteractionState = {
  mode: EditorMode;
  selection: SelectionState;
  edgeDraft: EdgeDraft | null;
};

export type CanvasCamera = {
  x: number;
  y: number;
  scale: number;
  viewWidth: number;
  viewHeight: number;
};

export type CameraCommand =
  | { kind: "zoom_in" }
  | { kind: "zoom_out" }
  | { kind: "reset_zoom" }
  | { kind: "go_to_origin" };

type EditTarget = { kind: "node"; id: NodeId } | { kind: "edge"; id: EdgeId };

type GraphUiState = {
  interaction: InteractionState;

  infoOpen: boolean;
  helpOpen: boolean;

  newEdgeDirected: boolean;

  matrixDialogKind: MatrixDialogKind;
  matrixUnweightedSymbol: MatrixUnweightedSymbol;

  activeToolbar: ActiveToolbar;

  editTarget: EditTarget | null;

  canvasCamera: CanvasCamera | null;

  cameraCommand: CameraCommand | null;
  cameraCommandNonce: number;
};

type GraphUiActions = {
  resetUi: () => void;
  resetInteraction: () => void;

  openEditNode: (id: NodeId) => void;
  openEditEdge: (id: EdgeId) => void;
  closeEditDialog: () => void;

  setMode: (mode: EditorMode) => void;

  showGraphToolbar: () => void;
  showAlgorithmToolbar: () => void;

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

  setCanvasCamera: (camera: CanvasCamera | null) => void;

  requestCameraCommand: (command: CameraCommand) => void;
  requestZoomIn: () => void;
  requestZoomOut: () => void;
  requestResetZoom: () => void;
  requestGoToOrigin: () => void;

  setHelpOpen: (open: boolean) => void;
  toggleHelpOpen: () => void;

  setMatrixDialogKind: (kind: MatrixDialogKind) => void;
  toggleMatrixDialogKind: (kind: Exclude<MatrixDialogKind, "none">) => void;
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

  matrixDialogKind: "none",
  matrixUnweightedSymbol: "-",

  activeToolbar: "graph",

  editTarget: null,

  canvasCamera: null,

  cameraCommand: null,
  cameraCommandNonce: 0,
};

export const useGraphUiStore = create<GraphUiState & GraphUiActions>()(
  (set, get) => ({
    ...initialState,

    resetUi: () => {
      clearGraphError();
      set({ ...initialState });
    },

    openEditNode: (id) =>
      set(() => {
        clearGraphError();
        return { editTarget: { kind: "node", id } };
      }),

    openEditEdge: (id) =>
      set(() => {
        clearGraphError();
        return { editTarget: { kind: "edge", id } };
      }),

    closeEditDialog: () => set({ editTarget: null }),

    resetInteraction: () => {
      clearGraphError();
      set((s) => ({
        ...s,
        interaction: {
          mode: "select",
          selection: emptySelection,
          edgeDraft: null,
        },
        editTarget: null,
      }));
    },

    setMode: (mode) =>
      set((s) => {
        clearGraphError();

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
          editTarget: null,
        };
      }),

    showGraphToolbar: () => {
      get().setMode("select");
      set({ activeToolbar: "graph" });
    },

    showAlgorithmToolbar: () => {
      get().setMode("select");
      set({ activeToolbar: "algorithms", matrixDialogKind: "none" });
    },

    clearSelection: () => {
      clearGraphError();
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
        clearGraphError();

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
        clearGraphError();

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
        clearGraphError();

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

    setCanvasCamera: (camera) => set({ canvasCamera: camera }),

    requestCameraCommand: (command) =>
      set((s) => ({
        ...s,
        cameraCommand: command,
        cameraCommandNonce: s.cameraCommandNonce + 1,
      })),

    requestZoomIn: () => get().requestCameraCommand({ kind: "zoom_in" }),
    requestZoomOut: () => get().requestCameraCommand({ kind: "zoom_out" }),
    requestResetZoom: () => get().requestCameraCommand({ kind: "reset_zoom" }),
    requestGoToOrigin: () =>
      get().requestCameraCommand({ kind: "go_to_origin" }),

    setHelpOpen: (open) => set({ helpOpen: open }),
    toggleHelpOpen: () => set((s) => ({ helpOpen: !s.helpOpen })),

    setMatrixDialogKind: (kind) => {
      clearGraphError();
      set({ matrixDialogKind: kind });
    },

    toggleMatrixDialogKind: (kind) =>
      set((s) => {
        clearGraphError();
        return {
          matrixDialogKind: s.matrixDialogKind === kind ? "none" : kind,
        };
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
      clearGraphError();
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
      clearGraphError();
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
