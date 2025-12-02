import { GRAPH_STYLE } from "@/constants/graph";

export const EDITING_CHAR_PIXEL_WIDTH = 7;

export const EDGE_WEIGHT_INPUT_PATTERN = /^-?\d*(\.\d*)?$/;

export const EDGE_WEIGHT_LABEL_OFFSET = 10;

export const SELF_LOOP_CENTER_OFFSET = GRAPH_STYLE.nodeRadius;

export const SELF_LOOP_RADIUS = Math.hypot(
  SELF_LOOP_CENTER_OFFSET,
  SELF_LOOP_CENTER_OFFSET - GRAPH_STYLE.nodeRadius,
);

export const SELF_LOOP_LABEL_OFFSET = 12;

const ARROW_MARKER_CENTER = { x: 7.5, y: 6 };

const HIGHLIGHT_ARROW_SCALE: number = GRAPH_STYLE.deleteHighlight.arrowScale;

export const HIGHLIGHT_ARROW_TRANSFORM =
  HIGHLIGHT_ARROW_SCALE === 1
    ? undefined
    : `translate(${ARROW_MARKER_CENTER.x} ${ARROW_MARKER_CENTER.y}) scale(${HIGHLIGHT_ARROW_SCALE}) translate(-${ARROW_MARKER_CENTER.x} -${ARROW_MARKER_CENTER.y})`;
