import type { GraphEdge, Selection } from "@/core/graph/types";
import { cn } from "@/lib/utils";

export type Point = { x: number; y: number };

export type EdgeProps =
  | {
      variant: "edge";
      edge: GraphEdge;
      d: string;
      labelPoint: Point | null;
      selection: Selection;
      enableHoverOutline?: boolean;
      hoverTone?: "primary" | "destructive";
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

  const {
    edge,
    d,
    labelPoint,
    selection,
    enableHoverOutline,
    hoverTone,
    onPointerDown,
  } = props;

  const selected = selection.edgeIds.includes(edge.id);

  const label = edge.weight === undefined ? "" : String(edge.weight);

  const hoverable = !!enableHoverOutline && !selected;
  const hoverIsDestructive = hoverTone === "destructive";

  return (
    <g className={cn(enableHoverOutline && "group")}>
      {hoverable && (
        <path
          d={d}
          className={cn(
            "fill-none opacity-0 transition-opacity group-hover:opacity-100",
            hoverIsDestructive ? "stroke-destructive/35" : "stroke-primary/35",
          )}
          strokeWidth={7}
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

      <path
        d={d}
        className={cn(
          "fill-none stroke-transparent",
          enableHoverOutline && "cursor-pointer",
        )}
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
