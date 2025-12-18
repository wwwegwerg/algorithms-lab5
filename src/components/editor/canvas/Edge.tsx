import * as React from "react";
import type { EdgeId, GraphEdge } from "@/core/graph/types";
import { cn } from "@/lib/utils";

export type Point = { x: number; y: number };

export type EdgeProps =
  | {
      variant: "edge";
      edge: GraphEdge;
      d: string;
      labelPoint: Point | null;
      selected: boolean;
      enableHoverOutline?: boolean;
      hoverTone?: "primary" | "destructive";
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
    labelPoint,
    selected,
    enableHoverOutline,
    hoverTone,
    onPointerDown,
    onDoubleClick,
  } = props;

  const label = edge.weight === undefined ? "" : String(edge.weight);

  const hoverable = !!enableHoverOutline && !selected;
  const hoverIsDestructive = hoverTone === "destructive";

  return (
    <g className={cn(enableHoverOutline && "group")}>
      <path
        d={d}
        className={cn(
          "fill-none stroke-transparent",
          enableHoverOutline && "cursor-pointer",
        )}
        strokeWidth={14}
        pointerEvents="stroke"
        onPointerDown={(e) => onPointerDown(edge.id, e)}
        onDoubleClick={
          onDoubleClick ? (e) => onDoubleClick(edge.id, e) : undefined
        }
      />

      {hoverable && (
        <path
          d={d}
          className={cn(
            "fill-none opacity-0 transition-opacity group-hover:opacity-100",
            hoverIsDestructive ? "stroke-destructive/35" : "stroke-primary/35",
          )}
          strokeWidth={7}
          markerEnd={edge.directed ? "url(#arrow-context-hover)" : undefined}
          pointerEvents="none"
        />
      )}

      <path
        d={d}
        className={cn(
          "fill-none",
          selected ? "stroke-primary" : "stroke-muted-foreground",
          hoverable &&
            (hoverIsDestructive
              ? "group-hover:stroke-destructive"
              : "group-hover:stroke-primary"),
        )}
        strokeWidth={2}
        markerEnd={edge.directed ? "url(#arrow-context)" : undefined}
        pointerEvents="none"
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

export const Edge = React.memo(EdgeInner);
