import * as React from "react";
import { useShallow } from "zustand/shallow";
import { GraphCanvas } from "@/components/editor/GraphCanvas";
import { useGraphDataStore } from "@/stores/graphDataStore";
import { useGraphUiStore } from "@/stores/graphUiStore";

export function GraphCanvasContainer() {
  const { nodes, edges, updateNode } = useGraphDataStore(
    useShallow((s) => ({
      nodes: s.nodes,
      edges: s.edges,
      updateNode: s.updateNode,
    })),
  );

  const {
    mode,
    selection,
    edgeDraftSourceId,
    addNodeAt,
    clearSelection,
    selectNode,
    selectEdge,
    applyBoxSelection,
    startEdgeFrom,
    cancelEdgeDraft,
    addEdgeTo,
    deleteNode,
    deleteEdge,
    deleteSelection,
    openEditNode,
    openEditEdge,
  } = useGraphUiStore(
    useShallow((s) => ({
      mode: s.interaction.mode,
      selection: s.interaction.selection,
      edgeDraftSourceId: s.interaction.edgeDraft?.sourceId ?? null,
      addNodeAt: s.addNodeAt,
      clearSelection: s.clearSelection,
      selectNode: s.selectNode,
      selectEdge: s.selectEdge,
      applyBoxSelection: s.applyBoxSelection,
      startEdgeFrom: s.startEdgeFrom,
      cancelEdgeDraft: s.cancelEdgeDraft,
      addEdgeTo: s.addEdgeTo,
      deleteNode: s.deleteNode,
      deleteEdge: s.deleteEdge,
      deleteSelection: s.deleteSelection,
      openEditNode: s.openEditNode,
      openEditEdge: s.openEditEdge,
    })),
  );

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Backspace" && e.key !== "Delete") return;

      const target = e.target;
      const isEditable =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable);

      if (isEditable) return;
      deleteSelection();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteSelection]);

  return (
    <GraphCanvas
      nodes={nodes}
      edges={edges}
      selection={selection}
      mode={mode}
      edgeDraftSourceId={edgeDraftSourceId}
      onBackgroundClick={(p, additive) => {
        if (mode === "add_node") {
          addNodeAt(p.x, p.y);
          return;
        }

        if (mode === "select") {
          if (!additive) clearSelection();
          return;
        }

        if (mode === "add_edge") {
          cancelEdgeDraft();
        }
      }}
      onNodeClick={(id, additive) => {
        if (mode === "delete") {
          deleteNode(id);
          return;
        }

        if (mode === "add_edge") {
          if (!edgeDraftSourceId) {
            startEdgeFrom(id);
            return;
          }

          addEdgeTo(id);
          return;
        }

        selectNode(id, additive);
      }}
      onEdgeClick={(id, additive) => {
        if (mode === "delete") {
          deleteEdge(id);
          return;
        }

        selectEdge(id, additive);
      }}
      onNodeDrag={(id, x, y) => {
        updateNode(id, { x, y });
      }}
      onNodeDoubleClick={(id) => {
        if (mode !== "select") return;
        openEditNode(id);
      }}
      onEdgeDoubleClick={(id) => {
        if (mode !== "select") return;
        openEditEdge(id);
      }}
      onBoxSelect={applyBoxSelection}
      onCancelEdgeDraft={() => cancelEdgeDraft()}
    />
  );
}
