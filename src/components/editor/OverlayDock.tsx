import { Bug, KeyboardIcon } from "lucide-react";
import { HelpOverlay } from "@/components/editor/HelpOverlay";
import { InfoOverlay } from "@/components/editor/InfoOverlay";
import { Button } from "@/components/ui/button";
import type {
  EditorMode,
  GraphEdge,
  GraphNode,
  Selection,
} from "@/core/graph/types";
import type { CanvasCamera } from "@/stores/graphUiStore";

export type OverlayDockProps = {
  mode: EditorMode;
  selection: Selection;
  selectedNode: GraphNode | null;
  selectedEdge: GraphEdge | null;
  nodesCount: number;
  edgesCount: number;
  camera: CanvasCamera | null;

  infoOpen: boolean;
  helpOpen: boolean;
  onToggleInfoOpen: () => void;
  onToggleHelpOpen: () => void;
};

export function OverlayDock({
  mode,
  selection,
  selectedNode,
  selectedEdge,
  nodesCount,
  edgesCount,
  camera,
  infoOpen,
  helpOpen,
  onToggleInfoOpen,
  onToggleHelpOpen,
}: OverlayDockProps) {
  return (
    <div className="pointer-events-none absolute top-3 right-3 z-40 flex items-start gap-2">
      <div className="flex flex-col gap-2">
        <HelpOverlay isOpen={helpOpen} />
        <InfoOverlay
          isOpen={infoOpen}
          selection={selection}
          node={selectedNode}
          edge={selectedEdge}
          mode={mode}
          nodesCount={nodesCount}
          edgesCount={edgesCount}
          camera={camera}
        />
      </div>

      <div className="pointer-events-auto flex flex-col gap-2">
        <Button
          size="icon-sm"
          variant={helpOpen ? "default" : "outline"}
          onClick={onToggleHelpOpen}
          title="Help"
          aria-label="Help"
          aria-pressed={helpOpen}
          aria-expanded={helpOpen}
        >
          <KeyboardIcon />
        </Button>

        <Button
          size="icon-sm"
          variant={infoOpen ? "default" : "outline"}
          onClick={onToggleInfoOpen}
          title="Info"
          aria-label="Info"
          aria-pressed={infoOpen}
          aria-expanded={infoOpen}
        >
          <Bug />
        </Button>
      </div>
    </div>
  );
}
