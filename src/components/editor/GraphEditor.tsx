import { BottomToolbarContainer } from "@/components/editor/containers/BottomToolbarContainer";
import { CameraDockContainer } from "@/components/editor/containers/CameraDockContainer";
import { EditObjectDialog } from "@/components/editor/containers/EditObjectDialog";
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
      <CameraDockContainer />
      <BottomToolbarContainer />
      <EditObjectDialog />
    </div>
  );
}
