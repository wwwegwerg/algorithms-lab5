import * as React from "react";
import { useShallow } from "zustand/shallow";
import { GraphCanvas } from "@/components/editor/GraphCanvas";
import type { EdgeId, NodeId } from "@/core/graph/types";
import { isEditableTarget } from "@/lib/dom";
import { selectOverlay, useAlgorithmStore } from "@/stores/algorithmStore";
import { useGraphDataStore } from "@/stores/graphDataStore";
import { useGraphUiStore } from "@/stores/graphUiStore";

export function GraphCanvasContainer() {
  const algorithmOverlay = useAlgorithmStore(selectOverlay);

  const { nodes, edges, updateNode, updateNodes } = useGraphDataStore(
    useShallow((s) => ({
      nodes: s.nodes,
      edges: s.edges,
      updateNode: s.updateNode,
      updateNodes: s.updateNodes,
    })),
  );

  const {
    activeToolbar,
    mode,
    selection,
    edgeDraftSourceId,
    setMode,
    showGraphToolbar,
    showAlgorithmToolbar,
    isNewEdgeDirected,
    setNewEdgeDirected,
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
    isInfoOpen,
    setCanvasCamera,
    cameraCommand,
    cameraCommandNonce,
  } = useGraphUiStore(
    useShallow((s) => ({
      activeToolbar: s.activeToolbar,
      mode: s.interaction.mode,
      selection: s.interaction.selection,
      edgeDraftSourceId: s.interaction.edgeDraft?.sourceId ?? null,
      setMode: s.setMode,
      showGraphToolbar: s.showGraphToolbar,
      showAlgorithmToolbar: s.showAlgorithmToolbar,
      isNewEdgeDirected: s.isNewEdgeDirected,
      setNewEdgeDirected: s.setNewEdgeDirected,
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
      isInfoOpen: s.isInfoOpen,
      setCanvasCamera: s.setCanvasCamera,
      cameraCommand: s.cameraCommand,
      cameraCommandNonce: s.cameraCommandNonce,
    })),
  );

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== "Backquote") return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;

      if (isEditableTarget(e.target)) return;

      if (e.target instanceof HTMLElement) {
        if (e.target.closest("button,a,[role='button'],[role='dialog']"))
          return;
      }

      if (activeToolbar === "algorithms") {
        showGraphToolbar();
      } else {
        showAlgorithmToolbar();
      }

      e.preventDefault();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeToolbar, showAlgorithmToolbar, showGraphToolbar]);

  React.useEffect(() => {
    if (activeToolbar === "algorithms") return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Backspace" && e.key !== "Delete") return;

      if (isEditableTarget(e.target)) return;
      deleteSelection();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeToolbar, deleteSelection]);

  React.useEffect(() => {
    if (activeToolbar === "algorithms") return;

    function onKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.code === "Digit1" || e.code === "Numpad1") {
        setMode("select");
        e.preventDefault();
        return;
      }

      if (e.code === "Digit2" || e.code === "Numpad2") {
        setMode("add_node");
        e.preventDefault();
        return;
      }

      if (e.code === "Digit3" || e.code === "Numpad3") {
        if (mode === "add_edge") {
          setNewEdgeDirected(!isNewEdgeDirected);
        } else {
          setMode("add_edge");
        }
        e.preventDefault();
        return;
      }

      if (e.code === "Digit4" || e.code === "Numpad4") {
        setMode("delete");
        e.preventDefault();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeToolbar, isNewEdgeDirected, mode, setMode, setNewEdgeDirected]);

  React.useEffect(() => {
    if (isInfoOpen) return;
    setCanvasCamera(null);
  }, [isInfoOpen, setCanvasCamera]);

  const onBackgroundClick = React.useCallback(
    (p: { x: number; y: number }, isAdditive: boolean) => {
      if (mode === "add_node") {
        addNodeAt(p.x, p.y);
        return;
      }

      if (mode === "select") {
        if (!isAdditive) clearSelection();
        return;
      }

      if (mode === "add_edge") {
        cancelEdgeDraft();
      }
    },
    [addNodeAt, cancelEdgeDraft, clearSelection, mode],
  );

  const onNodeClick = React.useCallback(
    (id: NodeId, isAdditive: boolean) => {
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

      const isAdditiveAllowed = mode !== "add_node";
      selectNode(id, isAdditiveAllowed && isAdditive);
    },
    [addEdgeTo, deleteNode, edgeDraftSourceId, mode, selectNode, startEdgeFrom],
  );

  const onEdgeClick = React.useCallback(
    (id: EdgeId, isAdditive: boolean) => {
      if (mode === "delete") {
        deleteEdge(id);
        return;
      }

      selectEdge(id, isAdditive);
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
      if (activeToolbar === "algorithms") return;
      if (mode !== "select") return;
      openEditNode(id);
    },
    [activeToolbar, mode, openEditNode],
  );

  const onEdgeDoubleClick = React.useCallback(
    (id: EdgeId) => {
      if (activeToolbar === "algorithms") return;
      if (mode !== "select") return;
      openEditEdge(id);
    },
    [activeToolbar, mode, openEditEdge],
  );

  return (
    <GraphCanvas
      nodes={nodes}
      edges={edges}
      selection={selection}
      mode={mode}
      edgeDraftSourceId={edgeDraftSourceId}
      algorithmOverlay={
        activeToolbar === "algorithms" ? algorithmOverlay : null
      }
      cameraCommand={
        cameraCommand
          ? { nonce: cameraCommandNonce, command: cameraCommand }
          : null
      }
      onCameraChange={isInfoOpen ? setCanvasCamera : undefined}
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
