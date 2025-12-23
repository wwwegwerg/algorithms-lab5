import * as React from "react";
import type { EditorMode, GraphNode, NodeId } from "@/core/graph/types";
import { cn } from "@/lib/utils";

const NODE_R = 18;

export type NodeProps = {
  node: GraphNode;
  mode: EditorMode;
  isSelected: boolean;
  isDraftSource: boolean;

  isAlgorithmActive: boolean;
  isAlgorithmVisited: boolean;
  isAlgorithmFrontier: boolean;

  onPointerDown: (id: NodeId, e: React.PointerEvent<SVGGElement>) => void;
  onDoubleClick?: (id: NodeId, e: React.MouseEvent<SVGGElement>) => void;
};

function NodeInner({
  node,
  mode,
  isSelected,
  isDraftSource,
  isAlgorithmActive,
  isAlgorithmVisited,
  isAlgorithmFrontier,
  onPointerDown,
  onDoubleClick,
}: NodeProps) {
  const ringRadius = isDraftSource ? NODE_R + 7 : NODE_R + 5;
  const isHoverable =
    mode === "select" || mode === "add_edge" || mode === "delete";
  const isHighlighted = isDraftSource || isSelected || isAlgorithmActive;

  return (
    <g
      onPointerDown={(e) => onPointerDown(node.id, e)}
      onDoubleClick={
        onDoubleClick ? (e) => onDoubleClick(node.id, e) : undefined
      }
      className={cn(isHoverable && "group cursor-pointer")}
    >
      {/* main path */}
      <circle
        cx={node.x}
        cy={node.y}
        r={NODE_R}
        className={cn(
          "fill-background stroke-muted-foreground transition-colors",
          isAlgorithmVisited && "stroke-primary/35",
          isAlgorithmFrontier && "stroke-primary/70",
          isHighlighted && "stroke-primary",
          mode === "delete"
            ? "group-hover:stroke-destructive"
            : "group-hover:stroke-primary",
        )}
        strokeWidth={2}
      />

      {/* halo */}
      {(isHoverable || isHighlighted) && (
        <circle
          cx={node.x}
          cy={node.y}
          r={ringRadius}
          className={cn(
            "fill-none stroke-transparent transition-colors",
            isHighlighted && "stroke-primary/35",
            mode === "delete"
              ? "group-hover:stroke-destructive/35"
              : "group-hover:stroke-primary/35",
          )}
          strokeWidth={2}
          pointerEvents="none"
        />
      )}

      {/* label */}
      <text
        x={node.x}
        y={node.y}
        textAnchor="middle"
        dominantBaseline="middle"
        className="pointer-events-none fill-foreground text-xs select-none"
      >
        {node.label}
      </text>
    </g>
  );
}

export const Node = React.memo(NodeInner);
