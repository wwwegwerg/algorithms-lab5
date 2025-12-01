import { GRAPH_STYLE } from "@/constants/graph";
import type { Node } from "@/types/graph";

export const computeEdgeEndpoints = (
  from: Node,
  to: Node,
  isDirected: boolean,
) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);

  if (distance === 0) {
    return { startX: from.x, startY: from.y, endX: to.x, endY: to.y };
  }

  const unitX = dx / distance;
  const unitY = dy / distance;
  const startInset = Math.min(GRAPH_STYLE.nodeRadius, distance / 2);
  const desiredEndInset = isDirected
    ? GRAPH_STYLE.nodeRadius + GRAPH_STYLE.arrowClearance
    : GRAPH_STYLE.nodeRadius;
  const endInset = Math.min(
    desiredEndInset,
    Math.max(distance - startInset, 0),
  );

  return {
    startX: from.x + unitX * startInset,
    startY: from.y + unitY * startInset,
    endX: to.x - unitX * endInset,
    endY: to.y - unitY * endInset,
  };
};
