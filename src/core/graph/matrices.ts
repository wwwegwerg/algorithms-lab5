import type {
  GraphEdge,
  GraphNode,
  MatrixUnweightedSymbol,
} from "@/core/graph/types";
import { isLoop } from "@/core/graph/types";

export type MatrixTable = {
  cornerLabel: string;
  columnLabels: string[];
  rowLabels: string[];
  values: string[][];
};

function edgeValue(edge: GraphEdge, unweightedSymbol: MatrixUnweightedSymbol) {
  if (edge.weight === undefined) return unweightedSymbol;
  return String(edge.weight);
}

export function buildAdjacencyMatrix(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  unweightedSymbol: MatrixUnweightedSymbol,
): MatrixTable {
  const nodeLabels = nodes.map((n) => n.id);
  const indexById = new Map(nodes.map((n, i) => [n.id, i] as const));

  const values = Array.from({ length: nodes.length }, () =>
    Array.from({ length: nodes.length }, () => ""),
  );

  for (const edge of edges) {
    const i = indexById.get(edge.source);
    const j = indexById.get(edge.target);
    if (i === undefined || j === undefined) continue;

    const value = edgeValue(edge, unweightedSymbol);

    if (edge.directed) {
      values[i][j] = value;
      continue;
    }

    if (isLoop(edge)) {
      values[i][i] = value;
      continue;
    }

    values[i][j] = value;
    values[j][i] = value;
  }

  return {
    cornerLabel: "V\\V",
    columnLabels: nodeLabels,
    rowLabels: nodeLabels,
    values,
  };
}

export function buildIncidenceMatrix(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
): MatrixTable {
  const rowLabels = nodes.map((n) => n.id);
  const nodeIndex = new Map(nodes.map((n, i) => [n.id, i] as const));

  const columnLabels = edges.map((e) => {
    const base = e.directed
      ? `${e.source}->${e.target}`
      : `${e.source}--${e.target}`;
    const w = e.weight === undefined ? "" : ` w=${e.weight}`;
    return `${e.id}: ${base}${w}`;
  });

  const values = Array.from({ length: nodes.length }, () =>
    Array.from({ length: edges.length }, () => "0"),
  );

  edges.forEach((edge, col) => {
    const s = nodeIndex.get(edge.source);
    const t = nodeIndex.get(edge.target);
    if (s === undefined || t === undefined) return;

    if (edge.directed) {
      values[s][col] = "-1";
      values[t][col] = "1";
      return;
    }

    if (isLoop(edge)) {
      values[s][col] = "2";
      return;
    }

    values[s][col] = "1";
    values[t][col] = "1";
  });

  return {
    cornerLabel: "V\\E",
    columnLabels,
    rowLabels,
    values,
  };
}

function csvEscape(value: string) {
  if (value.includes('"') || value.includes(",") || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function matrixToCsv(table: MatrixTable) {
  const header = [table.cornerLabel, ...table.columnLabels]
    .map(csvEscape)
    .join(",");
  const rows = table.values.map((row, i) =>
    [table.rowLabels[i] ?? "", ...row].map(csvEscape).join(","),
  );
  return [header, ...rows].join("\n");
}
