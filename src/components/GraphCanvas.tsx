import React from "react";
import type { Edge, EditMode, Node } from "../types/graph";

type GraphCanvasProps = {
  nodes: Node[];
  edges: Edge[];
  mode: EditMode;
  onCanvasClick: (x: number, y: number) => void;
};

export function GraphCanvas({
  nodes,
  edges,
  mode,
  onCanvasClick,
}: GraphCanvasProps) {
  const handleSvgClick = (
    event: React.MouseEvent<SVGSVGElement, MouseEvent>,
  ) => {
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    onCanvasClick(x, y);
  };

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <svg
        width="100%"
        height="100%"
        onClick={handleSvgClick}
        style={{
          backgroundColor: "#f5f5f5",
          cursor: mode === "add-node" ? "crosshair" : "default",
        }}
      >
        {edges.map((edge) => {
          const from = nodes.find((n) => n.id === edge.from);
          const to = nodes.find((n) => n.id === edge.to);
          if (!from || !to) return null;

          return (
            <line
              key={edge.id}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="black"
            />
          );
        })}

        {nodes.map((node) => (
          <g key={node.id}>
            <circle
              cx={node.x}
              cy={node.y}
              r={20}
              fill="white"
              stroke="black"
            />
            <text
              x={node.x}
              y={node.y}
              textAnchor="middle"
              dy="0.35em"
              fontSize="12"
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
