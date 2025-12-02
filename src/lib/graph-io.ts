import { snapPointToGrid } from "@/lib/grid";
import type { Edge, Node } from "@/types/graph";

export type AdjacencyMatrix = number[][];
export type GraphSnapshot = {
  nodes: Node[];
  edges: Edge[];
};

const DEFAULT_WEIGHT = 1;
const LAYOUT_CENTER = { x: 400, y: 300 };
const MIN_LAYOUT_RADIUS = 100;
const MAX_LAYOUT_RADIUS = 280;

export const graphToAdjacencyMatrix = (
  nodes: Node[],
  edges: Edge[],
): AdjacencyMatrix => {
  const size = nodes.length;
  if (size === 0) {
    return [];
  }
  const indexById = new Map(nodes.map((node, index) => [node.id, index]));
  const matrix: AdjacencyMatrix = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => 0),
  );

  edges.forEach((edge) => {
    const fromIndex = indexById.get(edge.from);
    const toIndex = indexById.get(edge.to);
    if (fromIndex === undefined || toIndex === undefined) {
      return;
    }
    const weight = edge.weight ?? DEFAULT_WEIGHT;
    matrix[fromIndex][toIndex] = weight;
    if (!edge.isDirected || edge.from === edge.to) {
      matrix[toIndex][fromIndex] = weight;
    }
  });

  return matrix;
};

export const formatAdjacencyMatrix = (matrix: AdjacencyMatrix): string => {
  if (matrix.length === 0) {
    return "";
  }
  return matrix.map((row) => row.join(" ")).join("\n");
};

export const serializeGraphSnapshot = (nodes: Node[], edges: Edge[]): string =>
  JSON.stringify({ nodes, edges }, null, 2);

export const parseGraphSnapshot = (raw: string): GraphSnapshot => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Некорректный JSON.");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("JSON должен содержать объект.");
  }
  const { nodes, edges } = parsed as {
    nodes?: unknown;
    edges?: unknown;
  };
  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    throw new Error("JSON должен содержать массивы nodes и edges.");
  }
  return { nodes: nodes as Node[], edges: edges as Edge[] };
};

export const parseAdjacencyMatrix = (raw: string): AdjacencyMatrix => {
  if (!raw.trim()) {
    return [];
  }
  const rows = raw
    .split(/\n+/)
    .map((row) => row.trim())
    .filter((row) => row.length > 0);
  if (rows.length === 0) {
    return [];
  }
  const matrix = rows.map((row) =>
    row.split(/\s+/).map((value) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        throw new Error(`Невозможно преобразовать "${value}" в число.`);
      }
      return parsed;
    }),
  );
  const size = matrix.length;
  matrix.forEach((row, rowIndex) => {
    if (row.length !== size) {
      throw new Error(
        `Матрица должна быть квадратной: строка ${rowIndex + 1} имеет ${row.length} элементов при ожидаемых ${size}.`,
      );
    }
  });
  return matrix;
};

const computeLayoutRadius = (nodeCount: number): number => {
  if (nodeCount <= 1) {
    return 0;
  }
  const scaled = nodeCount * 20;
  return Math.max(MIN_LAYOUT_RADIUS, Math.min(MAX_LAYOUT_RADIUS, scaled));
};

export const buildGraphFromAdjacencyMatrix = (
  matrix: AdjacencyMatrix,
): { nodes: Node[]; edges: Edge[] } => {
  const size = matrix.length;
  if (size === 0) {
    return { nodes: [], edges: [] };
  }

  matrix.forEach((row, rowIndex) => {
    if (row.length !== size) {
      throw new Error(
        `Матрица должна быть квадратной: строка ${rowIndex + 1} имеет ${row.length} элементов при ожидаемых ${size}.`,
      );
    }
  });

  const radius = computeLayoutRadius(size);
  const nodes: Node[] = Array.from({ length: size }, (_, index) => {
    const angle = (2 * Math.PI * index) / size;
    const x = LAYOUT_CENTER.x + radius * Math.cos(angle);
    const y = LAYOUT_CENTER.y + radius * Math.sin(angle);
    const snapped = snapPointToGrid(x, y);
    return {
      id: crypto.randomUUID(),
      x: snapped.x,
      y: snapped.y,
      label: `V${index + 1}`,
    };
  });

  const edges: Edge[] = [];
  const undirectedPairs = new Set<string>();

  for (let i = 0; i < size; i += 1) {
    for (let j = 0; j < size; j += 1) {
      const weight = matrix[i][j];
      if (weight === 0) continue;
      if (i === j) {
        edges.push({
          id: crypto.randomUUID(),
          from: nodes[i].id,
          to: nodes[i].id,
          weight,
          isDirected: false,
          curvatureOffset: 0,
        });
        continue;
      }
      const symmetric = matrix[j][i];
      if (weight === symmetric) {
        if (i < j) {
          const pairKey = `${i}-${j}`;
          if (!undirectedPairs.has(pairKey)) {
            undirectedPairs.add(pairKey);
            edges.push({
              id: crypto.randomUUID(),
              from: nodes[i].id,
              to: nodes[j].id,
              weight,
              isDirected: false,
              curvatureOffset: 0,
            });
          }
        }
        continue;
      }
      edges.push({
        id: crypto.randomUUID(),
        from: nodes[i].id,
        to: nodes[j].id,
        weight,
        isDirected: true,
        curvatureOffset: 0,
      });
    }
  }

  return { nodes, edges };
};
