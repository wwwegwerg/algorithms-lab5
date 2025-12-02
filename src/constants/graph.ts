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

export const EDITING_CHAR_PIXEL_WIDTH = 7;

export const EDGE_WEIGHT_INPUT_PATTERN = /^-?\d*(\.\d*)?$/;

export const EDGE_WEIGHT_LABEL_OFFSET = 10;

export const SELF_LOOP_CENTER_OFFSET = GRAPH_STYLE.nodeRadius;

export const SELF_LOOP_RADIUS = Math.hypot(
  SELF_LOOP_CENTER_OFFSET,
  SELF_LOOP_CENTER_OFFSET - GRAPH_STYLE.nodeRadius,
);

const ARROW_MARKER_CENTER = { x: 7.5, y: 6 };

const HIGHLIGHT_ARROW_SCALE: number = GRAPH_STYLE.deleteHighlight.arrowScale;

export const HIGHLIGHT_ARROW_TRANSFORM =
  HIGHLIGHT_ARROW_SCALE === 1
    ? undefined
    : `translate(${ARROW_MARKER_CENTER.x} ${ARROW_MARKER_CENTER.y}) scale(${HIGHLIGHT_ARROW_SCALE}) translate(-${ARROW_MARKER_CENTER.x} -${ARROW_MARKER_CENTER.y})`;
