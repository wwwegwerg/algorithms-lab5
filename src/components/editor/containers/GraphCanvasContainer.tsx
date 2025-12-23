import * as React from "react";
import { useShallow } from "zustand/shallow";
import { GraphCanvas } from "@/components/editor/GraphCanvas";
import type { EdgeId, NodeId } from "@/core/graph/types";
import { isEditableTarget } from "@/lib/dom";
import { useGraphDataStore } from "@/stores/graphDataStore";
import { useGraphUiStore } from "@/stores/graphUiStore";

export function GraphCanvasContainer() {
  const { nodes, edges, updateNode, updateNodes } = useGraphDataStore(
    useShallow((s) => ({
      nodes: s.nodes,
      edges: s.edges,
      updateNode: s.updateNode,
      updateNodes: s.updateNodes,
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
    infoOpen,
    setCanvasCamera,
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
      infoOpen: s.infoOpen,
      setCanvasCamera: s.setCanvasCamera,
    })),
  );

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Backspace" && e.key !== "Delete") return;

      if (isEditableTarget(e.target)) return;
      deleteSelection();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteSelection]);

  React.useEffect(() => {
    if (infoOpen) return;
    setCanvasCamera(null);
  }, [infoOpen, setCanvasCamera]);

  const onBackgroundClick = React.useCallback(
    (p: { x: number; y: number }, additive: boolean) => {
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
    },
    [addNodeAt, cancelEdgeDraft, clearSelection, mode],
  );

  const onNodeClick = React.useCallback(
    (id: NodeId, additive: boolean) => {
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
    },
    [addEdgeTo, deleteNode, edgeDraftSourceId, mode, selectNode, startEdgeFrom],
  );

  const onEdgeClick = React.useCallback(
    (id: EdgeId, additive: boolean) => {
      if (mode === "delete") {
        deleteEdge(id);
        return;
      }

      selectEdge(id, additive);
    },
    [deleteEdge, mode, selectEdge],
  );

  const onNodeDrag = React.useCallback(
    (id: NodeId, x: number, y: number) => {
      updateNode(id, { x, y });
    },
    [updateNode],
  );

  const onNodesDrag = React.useCallback(
    (updates: Array<{ id: NodeId; x: number; y: number }>) => {
      updateNodes(updates);
    },
    [updateNodes],
  );

  const onNodeDoubleClick = React.useCallback(
    (id: NodeId) => {
      if (mode !== "select") return;
      openEditNode(id);
    },
    [mode, openEditNode],
  );

  const onEdgeDoubleClick = React.useCallback(
    (id: EdgeId) => {
      if (mode !== "select") return;
      openEditEdge(id);
    },
    [mode, openEditEdge],
  );

  return (
    <GraphCanvas
      nodes={nodes}
      edges={edges}
      selection={selection}
      mode={mode}
      edgeDraftSourceId={edgeDraftSourceId}
      onCameraChange={infoOpen ? setCanvasCamera : undefined}
      onBackgroundClick={onBackgroundClick}
      onNodeClick={onNodeClick}
      onEdgeClick={onEdgeClick}
      onNodeDrag={onNodeDrag}
      onNodesDrag={onNodesDrag}
      onNodeDoubleClick={onNodeDoubleClick}
      onEdgeDoubleClick={onEdgeDoubleClick}
      onBoxSelect={applyBoxSelection}
      onCancelEdgeDraft={cancelEdgeDraft}
    />
  );
}
