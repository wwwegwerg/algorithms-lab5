import { bfsAlgorithm } from "@/core/algorithms/bfs";
import { dfsAlgorithm } from "@/core/algorithms/dfs";
import { dijkstraAlgorithm } from "@/core/algorithms/dijkstra";
import { maxFlowFordFulkersonAlgorithm } from "@/core/algorithms/maxFlowFordFulkerson";
import { mstPrimAlgorithm } from "@/core/algorithms/mstPrim";
import type { GraphAlgorithm } from "@/core/algorithms/types";

export const algorithms = [
  bfsAlgorithm,
  dfsAlgorithm,
  maxFlowFordFulkersonAlgorithm,
  mstPrimAlgorithm,
  dijkstraAlgorithm,
] as const satisfies readonly GraphAlgorithm[];

export type AlgorithmId = (typeof algorithms)[number]["id"];

export function getAlgorithm(id: AlgorithmId) {
  return algorithms.find((a) => a.id === id) ?? null;
}
