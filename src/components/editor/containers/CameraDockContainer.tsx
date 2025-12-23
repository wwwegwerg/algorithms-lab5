import { useShallow } from "zustand/shallow";
import { CameraDock } from "@/components/editor/CameraDock";
import { useGraphUiStore } from "@/stores/graphUiStore";

export function CameraDockContainer() {
  const { requestZoomIn, requestResetZoom, requestZoomOut, requestGoToOrigin } =
    useGraphUiStore(
      useShallow((s) => ({
        requestZoomIn: s.requestZoomIn,
        requestResetZoom: s.requestResetZoom,
        requestZoomOut: s.requestZoomOut,
        requestGoToOrigin: s.requestGoToOrigin,
      })),
    );

  return (
    <CameraDock
      onZoomIn={requestZoomIn}
      onResetZoom={requestResetZoom}
      onZoomOut={requestZoomOut}
      onGoToOrigin={requestGoToOrigin}
    />
  );
}
