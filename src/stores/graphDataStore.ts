import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { EdgeId, GraphEdge, GraphNode, NodeId } from "@/core/graph/types";
import { isLoop } from "@/core/graph/types";
import { validateEdgeDraft } from "@/core/graph/validate";
import { loadGraphSnapshot } from "@/core/io/graphFile";

const PERSIST_KEY = "graph-editor:graph";
const graphStorage = createJSONStorage(() => localStorage);

type GraphDataState = {
  nodes: GraphNode[];
  edges: GraphEdge[];

  lastError: string | null;
  errorNonce: number;

  nextNodeIndex: number;
  nextEdgeIndex: number;
};

type GraphDataActions = {
  clearError: () => void;
  setError: (message: string | null) => void;

  addNodeAt: (x: number, y: number) => NodeId;
  updateNode: (
    id: NodeId,
    patch: Partial<Pick<GraphNode, "label" | "x" | "y">>,
  ) => void;
  updateNodes: (patches: Array<{ id: NodeId; x: number; y: number }>) => void;
  deleteNode: (id: NodeId) => void;

  addEdge: (draft: {
    source: NodeId;
    target: NodeId;
    directed: boolean;
    weight?: number;
  }) => EdgeId | null;

  updateEdge: (
    id: EdgeId,
    patch: Partial<Pick<GraphEdge, "directed" | "weight">>,
  ) => void;
  deleteEdge: (id: EdgeId) => void;

  deleteByIds: (nodeIds: NodeId[], edgeIds: EdgeId[]) => void;

  setGraph: (nodes: GraphNode[], edges: GraphEdge[]) => void;
  resetGraph: () => void;
  clearPersistedGraph: () => void;
};

function nextId(prefix: string, index: number) {
  return `${prefix}${index}`;
}

function computeNextIndex(prefix: string, ids: readonly string[]) {
  let max = 0;
  const re = new RegExp(`^${prefix}(\\d+)$`);
  for (const id of ids) {
    const match = re.exec(id);
    if (!match) continue;

    const n = Number(match[1]);
    if (!Number.isFinite(n)) continue;

    max = Math.max(max, n);
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

const initialState: GraphDataState = {
  nodes: [],
  edges: [],
  lastError: null,
  errorNonce: 0,
  nextNodeIndex: 1,
  nextEdgeIndex: 1,
};

export const useGraphDataStore = create<GraphDataState & GraphDataActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      clearError: () => set({ lastError: null }),

      setError: (message) =>
        set((s) =>
          message === null
            ? { lastError: null }
            : { lastError: message, errorNonce: s.errorNonce + 1 },
        ),

      addNodeAt: (x, y) => {
        const id = nextId("n", get().nextNodeIndex);
        const node: GraphNode = { id, label: id, x, y };

        set((s) => ({
          nodes: [...s.nodes, node],
          nextNodeIndex: s.nextNodeIndex + 1,
          lastError: null,
        }));

        return id;
      },

      updateNode: (id, patch) =>
        set((s) => ({
          nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
        })),

      updateNodes: (patches) =>
        set((s) => {
          const patchById = new Map(patches.map((p) => [p.id, p] as const));

          return {
            nodes: s.nodes.map((n) => {
              const patch = patchById.get(n.id);
              if (!patch) return n;
              return { ...n, x: patch.x, y: patch.y };
            }),
          };
        }),

      deleteNode: (id) =>
        set((s) => {
          const nodes = s.nodes.filter((n) => n.id !== id);
          const edges = s.edges.filter(
            (e) => e.source !== id && e.target !== id,
          );

          return { nodes, edges, lastError: null };
        }),

      addEdge: (draft) => {
        const s = get();
        const validation = validateEdgeDraft(s.nodes, s.edges, draft);
        if (!validation.ok) {
          set({
            lastError: validation.message,
            errorNonce: s.errorNonce + 1,
          });
          return null;
        }

        const id = nextId("e", s.nextEdgeIndex);
        const edge: GraphEdge = { id, ...draft };

        set((prev) => ({
          edges: [...prev.edges, edge],
          nextEdgeIndex: prev.nextEdgeIndex + 1,
          lastError: null,
        }));

        return id;
      },

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
        set((s) => ({
          edges: s.edges.filter((e) => e.id !== id),
          lastError: null,
        })),

      deleteByIds: (nodeIds, edgeIds) =>
        set((s) => {
          const selectedNodeIds = new Set(nodeIds);
          const selectedEdgeIds = new Set(edgeIds);
          if (selectedNodeIds.size === 0 && selectedEdgeIds.size === 0)
            return s;

          const nodes = s.nodes.filter((n) => !selectedNodeIds.has(n.id));
          const edges = s.edges.filter(
            (e) =>
              !selectedEdgeIds.has(e.id) &&
              !selectedNodeIds.has(e.source) &&
              !selectedNodeIds.has(e.target),
          );

          return { nodes, edges, lastError: null };
        }),

      setGraph: (nodes, edges) =>
        set({
          nodes,
          edges,
          lastError: null,
          nextNodeIndex: computeNextIndex(
            "n",
            nodes.map((n) => n.id),
          ),
          nextEdgeIndex: computeNextIndex(
            "e",
            edges.map((e) => e.id),
          ),
        }),

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
