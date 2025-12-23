import { Bug, KeyboardIcon } from "lucide-react";
import { HelpOverlay } from "@/components/editor/HelpOverlay";
import { InfoOverlay } from "@/components/editor/InfoOverlay";
import { Button } from "@/components/ui/button";
import type { OverlayState } from "@/core/algorithms/types";
import type {
  EditorMode,
  GraphEdge,
  GraphNode,
  Selection,
} from "@/core/graph/types";
import type { ActiveToolbar, CanvasCamera } from "@/stores/graphUiStore";

export type OverlayDockProps = {
  activeToolbar: ActiveToolbar;
  algorithmOverlay: OverlayState | null;

  mode: EditorMode;
  selection: Selection;
  selectedNode: GraphNode | null;
  selectedEdge: GraphEdge | null;
  nodesCount: number;
  edgesCount: number;
  camera: CanvasCamera | null;

  isInfoOpen: boolean;
  isHelpOpen: boolean;
  onToggleInfoOpen: () => void;
  onToggleHelpOpen: () => void;
};

export function OverlayDock({
  activeToolbar,
  algorithmOverlay,
  mode,
  selection,
  selectedNode,
  selectedEdge,
  nodesCount,
  edgesCount,
  camera,
  isInfoOpen,
  isHelpOpen,
  onToggleInfoOpen,
  onToggleHelpOpen,
}: OverlayDockProps) {
  return (
    <div className="pointer-events-none absolute top-3 right-3 z-40 flex items-start gap-2">
      <div className="flex flex-col gap-2">
        <HelpOverlay isOpen={isHelpOpen} />
        <InfoOverlay
          isOpen={isInfoOpen}
          activeToolbar={activeToolbar}
          algorithmOverlay={algorithmOverlay}
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
          variant={isHelpOpen ? "default" : "outline"}
          onClick={onToggleHelpOpen}
          title="Help"
          aria-label="Help"
          aria-pressed={isHelpOpen}
          aria-expanded={isHelpOpen}
        >
          <KeyboardIcon />
        </Button>

        <Button
          size="icon-sm"
          variant={isInfoOpen ? "default" : "outline"}
          onClick={onToggleInfoOpen}
          title="Info"
          aria-label="Info"
          aria-pressed={isInfoOpen}
          aria-expanded={isInfoOpen}
        >
          <Bug />
        </Button>
      </div>
    </div>
  );
}
