import * as React from "react";
import { useShallow } from "zustand/shallow";
import { OverlayDock } from "@/components/editor/OverlayDock";
import { selectOverlay, useAlgorithmStore } from "@/stores/algorithmStore";
import { useGraphDataStore } from "@/stores/graphDataStore";
import { useGraphUiStore } from "@/stores/graphUiStore";

export function OverlayDockContainer() {
  const algorithmOverlay = useAlgorithmStore(selectOverlay);

  const { nodes, edges } = useGraphDataStore(
    useShallow((s) => ({ nodes: s.nodes, edges: s.edges })),
  );

  const {
    activeToolbar,
    mode,
    selection,
    canvasCamera,
    isInfoOpen,
    isHelpOpen,
    toggleInfoOpen,
    toggleHelpOpen,
  } = useGraphUiStore(
    useShallow((s) => ({
      activeToolbar: s.activeToolbar,
      mode: s.interaction.mode,
      selection: s.interaction.selection,
      canvasCamera: s.canvasCamera,
      isInfoOpen: s.isInfoOpen,
      isHelpOpen: s.isHelpOpen,
      toggleInfoOpen: s.toggleInfoOpen,
      toggleHelpOpen: s.toggleHelpOpen,
    })),
  );

  const selectedNode = React.useMemo(() => {
    if (selection.focus?.kind !== "node") return null;
    return nodes.find((n) => n.id === selection.focus?.id) ?? null;
  }, [nodes, selection.focus?.id, selection.focus?.kind]);

  const selectedEdge = React.useMemo(() => {
    if (selection.focus?.kind !== "edge") return null;
    return edges.find((e) => e.id === selection.focus?.id) ?? null;
  }, [edges, selection.focus?.id, selection.focus?.kind]);

  return (
    <OverlayDock
      activeToolbar={activeToolbar}
      algorithmOverlay={algorithmOverlay}
      mode={mode}
      selection={selection}
      selectedNode={selectedNode}
      selectedEdge={selectedEdge}
      nodesCount={nodes.length}
      edgesCount={edges.length}
      camera={canvasCamera}
      isInfoOpen={isInfoOpen}
      isHelpOpen={isHelpOpen}
      onToggleInfoOpen={toggleInfoOpen}
      onToggleHelpOpen={toggleHelpOpen}
    />
  );
}
