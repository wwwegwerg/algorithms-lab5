import { BottomToolbarContainer } from "@/components/editor/containers/BottomToolbarContainer";
import { EditorToast } from "@/components/editor/containers/EditorToast";
import { GraphCanvasContainer } from "@/components/editor/containers/GraphCanvasContainer";
import { MatrixDialogContainer } from "@/components/editor/containers/MatrixDialogContainer";
import { OverlayDockContainer } from "@/components/editor/containers/OverlayDockContainer";

export function GraphEditor() {
  return (
    <div className="relative h-dvh w-dvw overflow-hidden">
      <GraphCanvasContainer />
      <EditorToast />
      <MatrixDialogContainer />
      <OverlayDockContainer />
      <BottomToolbarContainer />
    </div>
  );
}
