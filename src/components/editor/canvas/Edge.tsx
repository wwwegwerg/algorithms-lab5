import type * as React from "react";
import type { EdgeId, GraphEdge, Selection } from "@/core/graph/types";
import { cn } from "@/lib/utils";

export type Point = { x: number; y: number };

export type EdgeProps =
  | {
      variant: "edge";
      edge: GraphEdge;
      d: string;
      labelPoint: Point | null;
      selection: Selection;
      activeEdgeId?: EdgeId;
      onPointerDown: (e: React.PointerEvent<SVGPathElement>) => void;
    }
  | {
      variant: "draft";
      d: string;
    };

export function Edge(props: EdgeProps) {
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

  const { edge, d, labelPoint, selection, activeEdgeId, onPointerDown } = props;

  const selected = selection?.kind === "edge" && selection.id === edge.id;
  const emphasized = activeEdgeId === edge.id;

  const label = edge.weight === undefined ? "" : String(edge.weight);

  return (
    <g>
      <path
        d={d}
        className={cn(
          "fill-none",
          emphasized || selected ? "stroke-primary" : "stroke-muted-foreground",
        )}
        strokeWidth={2}
        markerEnd={
          edge.directed
            ? emphasized || selected
              ? "url(#arrow-primary)"
              : "url(#arrow-default)"
            : undefined
        }
      />

      <path
        d={d}
        className="fill-none stroke-transparent"
        strokeWidth={14}
        onPointerDown={onPointerDown}
      />

      {labelPoint && label.length > 0 && (
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
