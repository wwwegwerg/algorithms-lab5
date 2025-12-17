import { useShallow } from "zustand/shallow";
import { MatrixDialog } from "@/components/editor/MatrixDialog";
import { useGraphDataStore } from "@/store/graphDataStore";
import { useGraphUiStore } from "@/store/graphUiStore";

export function MatrixDialogContainer() {
  const { nodes, edges } = useGraphDataStore(
    useShallow((s) => ({ nodes: s.nodes, edges: s.edges })),
  );

  const {
    bottomPanel,
    matrixUnweightedSymbol,
    setMatrixUnweightedSymbol,
    setBottomPanel,
  } = useGraphUiStore(
    useShallow((s) => ({
      bottomPanel: s.bottomPanel,
      matrixUnweightedSymbol: s.matrixUnweightedSymbol,
      setMatrixUnweightedSymbol: s.setMatrixUnweightedSymbol,
      setBottomPanel: s.setBottomPanel,
    })),
  );

  return (
    <MatrixDialog
      open={bottomPanel !== "none"}
      kind={bottomPanel}
      nodes={nodes}
      edges={edges}
      unweightedSymbol={matrixUnweightedSymbol}
      onChangeUnweightedSymbol={setMatrixUnweightedSymbol}
      onClose={() => setBottomPanel("none")}
    />
  );
}
