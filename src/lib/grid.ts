export const NODE_GRID_SIZE = 10;
export const GRID_SIZE = 20;

export const snapToGrid = (value: number): number =>
  Math.round(value / NODE_GRID_SIZE) * NODE_GRID_SIZE;

export const snapPointToGrid = (x: number, y: number) => ({
  x: snapToGrid(x),
  y: snapToGrid(y),
});
