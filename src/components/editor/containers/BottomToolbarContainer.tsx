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
    bottomPanel,
    toggleBottomPanel,
  } = useGraphUiStore(
    useShallow((s) => ({
      mode: s.interaction.mode,
      setMode: s.setMode,
      newEdgeDirected: s.newEdgeDirected,
      setNewEdgeDirected: s.setNewEdgeDirected,
      bottomPanel: s.bottomPanel,
      toggleBottomPanel: s.toggleBottomPanel,
    })),
  );

  return (
    <BottomToolbar
      mode={mode}
      onChangeMode={setMode}
      newEdgeDirected={newEdgeDirected}
      onChangeNewEdgeDirected={setNewEdgeDirected}
      bottomPanel={bottomPanel}
      onTogglePanel={toggleBottomPanel}
      onSaveJson={() => {
        const s = useGraphDataStore.getState();
        const snapshot = makeGraphSnapshot(s.nodes, s.edges);
        downloadTextFile(
          "graph.json",
          JSON.stringify(snapshot, null, 2),
          "application/json",
        );
      }}
      onLoadJson={async (file) => {
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
      }}
      onClearPersistedGraph={() => {
        useGraphDataStore.getState().clearPersistedGraph();
        useGraphUiStore.getState().resetUi();
      }}
    />
  );
}
