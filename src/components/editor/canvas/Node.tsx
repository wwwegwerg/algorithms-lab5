import * as React from "react";
import type { EditorMode, GraphNode, NodeId } from "@/core/graph/types";
import { cn } from "@/lib/utils";

const NODE_R = 18;

export type NodeProps = {
  node: GraphNode;
  mode: EditorMode;
  isSelected: boolean;
  edgeDraftSourceId: NodeId | null;

  onPointerDown: (id: NodeId, e: React.PointerEvent<SVGGElement>) => void;
  onDoubleClick?: (id: NodeId, e: React.MouseEvent<SVGGElement>) => void;
};

function NodeInner({
  node,
  mode,
  isSelected,
  edgeDraftSourceId,
  onPointerDown,
  onDoubleClick,
}: NodeProps) {
  const isDraftSource = mode === "add_edge" && edgeDraftSourceId === node.id;

  const showRing = isDraftSource || isSelected;
  const ringRadius = isDraftSource ? NODE_R + 7 : NODE_R + 5;

  const hoverEnabled =
    mode === "select" || mode === "add_edge" || mode === "delete";

  return (
    <g
      onPointerDown={(e) => onPointerDown(node.id, e)}
      onDoubleClick={
        onDoubleClick ? (e) => onDoubleClick(node.id, e) : undefined
      }
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
          className={cn(
            "fill-none",
            isDraftSource ? "stroke-primary/40" : "stroke-primary/30",
          )}
          strokeWidth={2}
        />
      )}

      <text
        x={node.x}
        y={node.y}
        textAnchor="middle"
        dominantBaseline="middle"
        className={"pointer-events-none fill-foreground text-xs select-none"}
      >
        {node.label}
      </text>
    </g>
  );
}

export const Node = React.memo(NodeInner);
