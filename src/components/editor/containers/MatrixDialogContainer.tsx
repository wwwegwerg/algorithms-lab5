import * as React from "react";
import { useShallow } from "zustand/shallow";
import { MatrixDialog } from "@/components/editor/MatrixDialog";
import { useGraphDataStore } from "@/stores/graphDataStore";
import { useGraphUiStore } from "@/stores/graphUiStore";

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

  const onClose = React.useCallback(() => {
    setBottomPanel("none");
  }, [setBottomPanel]);

  return (
    <MatrixDialog
      open={bottomPanel !== "none"}
      kind={bottomPanel}
      nodes={nodes}
      edges={edges}
      unweightedSymbol={matrixUnweightedSymbol}
      onChangeUnweightedSymbol={setMatrixUnweightedSymbol}
      onClose={onClose}
    />
  );
}
