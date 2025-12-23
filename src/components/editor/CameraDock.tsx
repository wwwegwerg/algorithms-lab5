import { Crosshair, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";

export type CameraDockProps = {
  onZoomIn: () => void;
  onResetZoom: () => void;
  onZoomOut: () => void;
  onGoToOrigin: () => void;
};

export function CameraDock({
  onZoomIn,
  onResetZoom,
  onZoomOut,
  onGoToOrigin,
}: CameraDockProps) {
  return (
    <div className="absolute top-1/2 right-3 z-40 -translate-y-1/2">
      <ButtonGroup orientation="vertical">
        <Button
          size="icon-sm"
          variant="outline"
          onClick={onZoomIn}
          title="Zoom in"
          aria-label="Zoom in"
        >
          <ZoomIn />
        </Button>
        <Button
          size="icon-sm"
          variant="outline"
          onClick={onResetZoom}
          title="Reset zoom"
          aria-label="Reset zoom"
        >
          <RotateCcw />
        </Button>
        <Button
          size="icon-sm"
          variant="outline"
          onClick={onZoomOut}
          title="Zoom out"
          aria-label="Zoom out"
        >
          <ZoomOut />
        </Button>
        <Button
          size="icon-sm"
          variant="outline"
          onClick={onGoToOrigin}
          title="Go to origin"
          aria-label="Go to origin"
        >
          <Crosshair />
        </Button>
      </ButtonGroup>
    </div>
  );
}
