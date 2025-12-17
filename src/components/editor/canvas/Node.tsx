import type {
  EditorMode,
  GraphNode,
  NodeId,
  Selection,
} from "@/core/graph/types";
import { cn } from "@/lib/utils";

const NODE_R = 18;

export type NodeProps = {
  node: GraphNode;
  mode: EditorMode;
  selection: Selection;
  edgeDraftSourceId: NodeId | null;

  onPointerDown: (e: React.PointerEvent<SVGGElement>) => void;
};

export function Node({
  node,
  mode,
  selection,
  edgeDraftSourceId,
  onPointerDown,
}: NodeProps) {
  const isSelected = selection.nodeIds.includes(node.id);
  const isDraftSource = mode === "add_edge" && edgeDraftSourceId === node.id;

  const showRing = isDraftSource || isSelected;
  const ringRadius = isDraftSource ? NODE_R + 7 : NODE_R + 5;
  const ringClassName = isDraftSource
    ? "fill-none stroke-primary/40"
    : "fill-none stroke-primary/30";

  const hoverEnabled =
    mode === "select" || mode === "add_edge" || mode === "delete";

  return (
    <g
      key={node.id}
      onPointerDown={onPointerDown}
      className={cn(hoverEnabled && "group cursor-pointer")}
    >
      <circle
        cx={node.x}
        cy={node.y}
        r={NODE_R}
        className={cn(
          "fill-background",
          isSelected || isDraftSource
            ? "stroke-primary"
            : "stroke-muted-foreground",
          hoverEnabled &&
            !isSelected &&
            !isDraftSource &&
            (mode === "delete"
              ? "group-hover:stroke-destructive"
              : "group-hover:stroke-primary"),
        )}
        strokeWidth={2}
      />

      {hoverEnabled && !showRing && (
        <circle
          cx={node.x}
          cy={node.y}
          r={NODE_R + 5}
          className={cn(
            "fill-none opacity-0 transition-opacity group-hover:opacity-100",
            mode === "delete" ? "stroke-destructive/35" : "stroke-primary/35",
          )}
          strokeWidth={2}
          pointerEvents="none"
        />
      )}

      {showRing && (
        <circle
          cx={node.x}
          cy={node.y}
          r={ringRadius}
          className={ringClassName}
          strokeWidth={2}
        />
      )}

      <text
        x={node.x}
        y={node.y}
        textAnchor="middle"
        dominantBaseline="middle"
        className={cn(
          "pointer-events-none fill-foreground text-xs select-none",
        )}
      >
        {node.label}
      </text>
    </g>
  );
}
