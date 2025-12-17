import { InfoIcon, KeyboardIcon } from "lucide-react";
import { HelpOverlay } from "@/components/editor/HelpOverlay";
import { InfoOverlay } from "@/components/editor/InfoOverlay";
import { Button } from "@/components/ui/button";
import type {
  EditorMode,
  GraphEdge,
  GraphNode,
  Selection,
} from "@/core/graph/types";
import { useGraphUiStore } from "@/stores/graphUiStore";

export type OverlayDockProps = {
  mode: EditorMode;
  selection: Selection;
  selectedNode: GraphNode | null;
  selectedEdge: GraphEdge | null;
  nodesCount: number;
  edgesCount: number;
};

export function OverlayDock({
  mode,
  selection,
  selectedNode,
  selectedEdge,
  nodesCount,
  edgesCount,
}: OverlayDockProps) {
  const infoOpen = useGraphUiStore((s) => s.infoOpen);
  const toggleInfoOpen = useGraphUiStore((s) => s.toggleInfoOpen);
  const helpOpen = useGraphUiStore((s) => s.helpOpen);
  const toggleHelpOpen = useGraphUiStore((s) => s.toggleHelpOpen);

  return (
    <div className="pointer-events-none absolute top-3 right-3 z-40 flex items-start gap-2">
      <div className="flex flex-col gap-2">
        <HelpOverlay isOpen={helpOpen} mode={mode} />
        <InfoOverlay
          isOpen={infoOpen}
          selection={selection}
          node={selectedNode}
          edge={selectedEdge}
          mode={mode}
          nodesCount={nodesCount}
          edgesCount={edgesCount}
        />
      </div>

      <div className="pointer-events-auto flex flex-col gap-2">
        <Button
          size="icon-sm"
          variant={helpOpen ? "default" : "outline"}
          onClick={toggleHelpOpen}
          title="Help"
        >
          <KeyboardIcon />
        </Button>

        <Button
          size="icon-sm"
          variant={infoOpen ? "default" : "outline"}
          onClick={toggleInfoOpen}
          title="Info"
        >
          <InfoIcon />
        </Button>
      </div>
    </div>
  );
}
