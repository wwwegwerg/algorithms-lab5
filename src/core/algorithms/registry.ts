import { bfsAlgorithm } from "@/core/algorithms/bfs";
import { dfsAlgorithm } from "@/core/algorithms/dfs";
import { dijkstraAlgorithm } from "@/core/algorithms/dijkstra";
import { maxFlowFordFulkersonAlgorithm } from "@/core/algorithms/maxFlowFordFulkerson";
import { mstPrimAlgorithm } from "@/core/algorithms/mstPrim";
import type { GraphAlgorithm } from "@/core/algorithms/types";

export const algorithms: GraphAlgorithm[] = [
  bfsAlgorithm,
  dfsAlgorithm,
  maxFlowFordFulkersonAlgorithm,
  mstPrimAlgorithm,
  dijkstraAlgorithm,
];

export function getAlgorithm(id: string) {
  return algorithms.find((a) => a.id === id) ?? null;
}
