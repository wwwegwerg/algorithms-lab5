export const GRAPH_STYLE = {
  nodeRadius: 20,
  selectionRingOffset: 6,
  arrowClearance: 4,
  edgeStrokeWidth: {
    default: 2,
    delete: 4,
  },
  deleteHighlight: {
    color: "#0f766e",
    nodeStrokeWidth: 4,
    nodeRadiusOffset: 4,
    edgeStrokeWidth: 6,
    arrowScale: 2.6,
  },
  arrowMarker: {
    width: 12,
    height: 12,
    refX: 10,
    refY: 6,
    path: "M0,0 L12,6 L0,12 z",
  },
} as const;

export const SELECTION_RING_RADIUS =
  GRAPH_STYLE.nodeRadius + GRAPH_STYLE.selectionRingOffset;
