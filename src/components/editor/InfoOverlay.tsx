import type {
  EditorMode,
  GraphEdge,
  GraphNode,
  Selection,
} from "@/core/graph/types";

export type InfoOverlayProps = {
  isOpen: boolean;
  selection: Selection;
  node: GraphNode | null;
  edge: GraphEdge | null;
  mode: EditorMode;
  nodesCount: number;
  edgesCount: number;
};

function describeSelection(selection: Selection) {
  if (!selection) return "(nothing selected)";
  return `${selection.kind}: ${selection.id}`;
}

export function InfoOverlay({
  isOpen,
  selection,
  node,
  edge,
  mode,
  nodesCount,
  edgesCount,
}: InfoOverlayProps) {
  if (!isOpen) return null;

  const lines: string[] = [];
  lines.push(`mode: ${mode}`);
  lines.push(`nodes: ${nodesCount}`);
  lines.push(`edges: ${edgesCount}`);
  lines.push(`selected: ${describeSelection(selection)}`);

  if (selection?.kind === "node" && node) {
    lines.push("");
    lines.push("[node]");
    lines.push(`id: ${node.id}`);
    lines.push(`label: ${node.label}`);
    lines.push(`x: ${Math.round(node.x)}`);
    lines.push(`y: ${Math.round(node.y)}`);
  }

  if (selection?.kind === "edge" && edge) {
    lines.push("");
    lines.push("[edge]");
    lines.push(`id: ${edge.id}`);
    lines.push(`directed: ${edge.directed ? "true" : "false"}`);
    lines.push(`source: ${edge.source}`);
    lines.push(`target: ${edge.target}`);
    lines.push(
      `weight: ${edge.weight === undefined ? "(none)" : String(edge.weight)}`,
    );
  }

  return (
    <div className="pointer-events-none absolute top-12 right-3 z-40 w-[360px]">
      <div className="pointer-events-auto rounded-lg bg-black/60 px-3 py-2 text-xs leading-relaxed text-white shadow-lg ring-1 ring-white/10 backdrop-blur">
        <div className="whitespace-pre-wrap">{lines.join("\n")}</div>
      </div>
    </div>
  );
}
