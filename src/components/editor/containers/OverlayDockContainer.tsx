import * as React from "react";
import { useShallow } from "zustand/shallow";
import { OverlayDock } from "@/components/editor/OverlayDock";
import { useGraphDataStore } from "@/stores/graphDataStore";
import { useGraphUiStore } from "@/stores/graphUiStore";

export function OverlayDockContainer() {
  const { nodes, edges } = useGraphDataStore(
    useShallow((s) => ({ nodes: s.nodes, edges: s.edges })),
  );

  const {
    mode,
    selection,
    canvasCamera,
    infoOpen,
    helpOpen,
    toggleInfoOpen,
    toggleHelpOpen,
  } = useGraphUiStore(
    useShallow((s) => ({
      mode: s.interaction.mode,
      selection: s.interaction.selection,
      canvasCamera: s.canvasCamera,
      infoOpen: s.infoOpen,
      helpOpen: s.helpOpen,
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
      mode={mode}
      selection={selection}
      selectedNode={selectedNode}
      selectedEdge={selectedEdge}
      nodesCount={nodes.length}
      edgesCount={edges.length}
      camera={canvasCamera}
      infoOpen={infoOpen}
      helpOpen={helpOpen}
      onToggleInfoOpen={toggleInfoOpen}
      onToggleHelpOpen={toggleHelpOpen}
    />
  );
}
