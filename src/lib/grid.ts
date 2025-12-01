import { GRID_CONFIG } from "@/constants/grid";

export const snapToGrid = (value: number): number =>
  Math.round(value / GRID_CONFIG.snapSize) * GRID_CONFIG.snapSize;

export const snapPointToGrid = (x: number, y: number) => ({
  x: snapToGrid(x),
  y: snapToGrid(y),
});
