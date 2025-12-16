import type * as React from "react";
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

  isVisited: boolean;
  isFrontier: boolean;
  isActive: boolean;

  onPointerDown: (e: React.PointerEvent<SVGGElement>) => void;
};

export function Node({
  node,
  mode,
  selection,
  edgeDraftSourceId,
  isVisited,
  isFrontier,
  isActive,
  onPointerDown,
}: NodeProps) {
  const isSelected = selection?.kind === "node" && selection.id === node.id;
  const isDraftSource = mode === "add_edge" && edgeDraftSourceId === node.id;

  const showRing = isDraftSource || isSelected;
  const ringRadius = isDraftSource ? NODE_R + 7 : NODE_R + 5;
  const ringClassName = isDraftSource
    ? "fill-none stroke-primary/40"
    : "fill-none stroke-primary/30";

  return (
    <g key={node.id} onPointerDown={onPointerDown}>
      <circle
        cx={node.x}
        cy={node.y}
        r={NODE_R}
        className={cn(
          "fill-background",
          isVisited && "fill-accent",
          isFrontier && "fill-secondary",
          isActive && "fill-primary",
          isSelected || isDraftSource
            ? "stroke-primary"
            : "stroke-muted-foreground",
        )}
        strokeWidth={2}
      />

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
          "pointer-events-none text-xs select-none",
          isActive ? "fill-primary-foreground" : "fill-foreground",
        )}
      >
        {node.label}
      </text>
    </g>
  );
}
