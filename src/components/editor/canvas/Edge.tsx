import * as React from "react";
import type { EdgeId, EditorMode, GraphEdge } from "@/core/graph/types";
import { cn } from "@/lib/utils";

export type Point = { x: number; y: number };

export type EdgeProps =
  | {
      variant: "edge";
      edge: GraphEdge;
      mode: EditorMode;
      d: string;
      labelPoint: Point | null;
      labelText?: string | null;
      isSelected: boolean;
      isAlgorithmActive: boolean;
      isAlgorithmFrontier: boolean;
      onPointerDown: (
        id: EdgeId,
        e: React.PointerEvent<SVGPathElement>,
      ) => void;
      onDoubleClick?: (id: EdgeId, e: React.MouseEvent<SVGPathElement>) => void;
    }
  | {
      variant: "draft";
      d: string;
    };

function EdgeInner(props: EdgeProps) {
  if (props.variant === "draft") {
    return (
      <path
        d={props.d}
        className="fill-none stroke-primary/40"
        strokeWidth={2}
        strokeDasharray="6 4"
      />
    );
  }

  const {
    edge,
    d,
    mode,
    labelPoint,
    labelText,
    isSelected,
    isAlgorithmActive,
    isAlgorithmFrontier,
    onPointerDown,
    onDoubleClick,
  } = props;

  const isHoverable = mode === "select" || mode === "delete";
  const isHighlighted = isAlgorithmActive || isSelected;

  const label =
    labelText ?? (edge.weight === undefined ? null : String(edge.weight));

  return (
    <g className={cn(isHoverable && "group cursor-pointer")}>
      {/* hitbox */}
      <path
        d={d}
        className={cn("fill-none stroke-transparent")}
        strokeWidth={14}
        pointerEvents="stroke"
        onPointerDown={(e) => onPointerDown(edge.id, e)}
        onDoubleClick={
          onDoubleClick ? (e) => onDoubleClick(edge.id, e) : undefined
        }
      />

      {/* main path */}
      <path
        d={d}
        className={cn(
          "fill-none stroke-muted-foreground transition-colors",
          isAlgorithmFrontier && "stroke-primary/70",
          isHighlighted && "stroke-primary",
          mode === "delete"
            ? "group-hover:stroke-destructive"
            : "group-hover:stroke-primary",
        )}
        strokeWidth={2}
        markerEnd={edge.isDirected ? "url(#arrow-context)" : undefined}
        pointerEvents="none"
      />

      {/* halo */}
      {(isHoverable || isHighlighted) && (
        <path
          d={d}
          className={cn(
            "fill-none stroke-transparent transition-colors",
            isHighlighted && "stroke-primary/35",
            mode === "delete"
              ? "group-hover:stroke-destructive/35"
              : "group-hover:stroke-primary/35",
          )}
          strokeWidth={7}
          markerEnd={edge.isDirected ? "url(#arrow-context-hover)" : undefined}
          pointerEvents="none"
        />
      )}

      {/* label */}
      {labelPoint && label && (
        <text
          x={labelPoint.x}
          y={labelPoint.y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="pointer-events-none fill-foreground text-xs"
        >
          {label}
        </text>
      )}
    </g>
  );
}

export const Edge = React.memo(EdgeInner);
