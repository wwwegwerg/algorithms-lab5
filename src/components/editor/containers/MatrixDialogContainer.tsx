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
    matrixDialogKind,
    matrixUnweightedSymbol,
    setMatrixUnweightedSymbol,
    setMatrixDialogKind,
  } = useGraphUiStore(
    useShallow((s) => ({
      matrixDialogKind: s.matrixDialogKind,
      matrixUnweightedSymbol: s.matrixUnweightedSymbol,
      setMatrixUnweightedSymbol: s.setMatrixUnweightedSymbol,
      setMatrixDialogKind: s.setMatrixDialogKind,
    })),
  );

  const onClose = React.useCallback(() => {
    setMatrixDialogKind("none");
  }, [setMatrixDialogKind]);

  return (
    <MatrixDialog
      open={matrixDialogKind !== "none"}
      kind={matrixDialogKind}
      nodes={nodes}
      edges={edges}
      unweightedSymbol={matrixUnweightedSymbol}
      onChangeUnweightedSymbol={setMatrixUnweightedSymbol}
      onClose={onClose}
    />
  );
}
