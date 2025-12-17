import { useShallow } from "zustand/shallow";
import { OverlayDock } from "@/components/editor/OverlayDock";
import { useGraphDataStore } from "@/stores/graphDataStore";
import { useGraphUiStore } from "@/stores/graphUiStore";

export function OverlayDockContainer() {
  const { nodes, edges } = useGraphDataStore(
    useShallow((s) => ({ nodes: s.nodes, edges: s.edges })),
  );

  const { mode, selection, canvasCamera } = useGraphUiStore(
    useShallow((s) => ({
      mode: s.interaction.mode,
      selection: s.interaction.selection,
      canvasCamera: s.canvasCamera,
    })),
  );

  const selectedNode =
    selection.focus?.kind === "node"
      ? (nodes.find((n) => n.id === selection.focus?.id) ?? null)
      : null;

  const selectedEdge =
    selection.focus?.kind === "edge"
      ? (edges.find((e) => e.id === selection.focus?.id) ?? null)
      : null;

  return (
    <OverlayDock
      mode={mode}
      selection={selection}
      selectedNode={selectedNode}
      selectedEdge={selectedEdge}
      nodesCount={nodes.length}
      edgesCount={edges.length}
      camera={canvasCamera}
    />
  );
}
