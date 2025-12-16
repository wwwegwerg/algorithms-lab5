import { bfsAlgorithm } from "@/core/algorithms/bfs";
import type { GraphAlgorithm } from "@/core/algorithms/types";

export const algorithms: GraphAlgorithm[] = [bfsAlgorithm];

export function getAlgorithm(id: string) {
  return algorithms.find((a) => a.id === id) ?? null;
}
