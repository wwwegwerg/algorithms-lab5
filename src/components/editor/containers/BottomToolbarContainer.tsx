import * as React from "react";
import { useShallow } from "zustand/shallow";
import { BottomToolbar } from "@/components/editor/BottomToolbar";
import { downloadTextFile, readTextFile } from "@/core/io/download";
import { loadGraphSnapshot, makeGraphSnapshot } from "@/core/io/graphFile";
import { useGraphDataStore } from "@/stores/graphDataStore";
import { useGraphUiStore } from "@/stores/graphUiStore";

export function BottomToolbarContainer() {
  const {
    mode,
    setMode,
    newEdgeDirected,
    setNewEdgeDirected,
    matrixDialogKind,
    setMatrixDialogKind,
  } = useGraphUiStore(
    useShallow((s) => ({
      mode: s.interaction.mode,
      setMode: s.setMode,
      newEdgeDirected: s.newEdgeDirected,
      setNewEdgeDirected: s.setNewEdgeDirected,
      matrixDialogKind: s.matrixDialogKind,
      setMatrixDialogKind: s.setMatrixDialogKind,
    })),
  );

  const onSaveJson = React.useCallback(() => {
    const s = useGraphDataStore.getState();
    const snapshot = makeGraphSnapshot(s.nodes, s.edges);
    downloadTextFile(
      "graph.json",
      JSON.stringify(snapshot, null, 2),
      "application/json",
    );
  }, []);

  const onLoadJson = React.useCallback(async (file: File) => {
    let raw: unknown;
    try {
      const text = await readTextFile(file);
      raw = JSON.parse(text) as unknown;
    } catch {
      useGraphDataStore.getState().setError("Некорректный JSON");
      return;
    }

    const loaded = loadGraphSnapshot(raw);
    if (!loaded.ok) {
      useGraphDataStore.getState().setError(loaded.message);
      return;
    }

    useGraphDataStore
      .getState()
      .setGraph(loaded.graph.nodes, loaded.graph.edges);
    useGraphUiStore.getState().resetInteraction();
    useGraphDataStore.getState().clearError();
  }, []);

  const onClearPersistedGraph = React.useCallback(() => {
    useGraphDataStore.getState().clearPersistedGraph();
    useGraphUiStore.getState().resetUi();
  }, []);

  const onToggleMatrixDialogOpen = React.useCallback(() => {
    setMatrixDialogKind(matrixDialogKind === "none" ? "adjacency" : "none");
  }, [matrixDialogKind, setMatrixDialogKind]);

  return (
    <BottomToolbar
      mode={mode}
      onChangeMode={setMode}
      newEdgeDirected={newEdgeDirected}
      onChangeNewEdgeDirected={setNewEdgeDirected}
      matrixDialogKind={matrixDialogKind}
      onToggleMatrixDialogOpen={onToggleMatrixDialogOpen}
      onSaveJson={onSaveJson}
      onLoadJson={onLoadJson}
      onClearPersistedGraph={onClearPersistedGraph}
    />
  );
}
