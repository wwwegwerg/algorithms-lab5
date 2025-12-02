import {
  EDGE_WEIGHT_LABEL_OFFSET,
  GRAPH_STYLE,
  SELF_LOOP_CENTER_OFFSET,
  SELF_LOOP_RADIUS,
} from "@/constants/graph";
import {
  clamp,
  evaluateQuadraticPoint,
  evaluateQuadraticTangent,
  findTrimParameterFromEnd,
  findTrimParameterFromStart,
  splitQuadratic,
  type Point,
} from "@/lib/bezier";
import type { Edge, Node, NodeId } from "@/types/graph";

type EdgeValidationResult = {
  isValid: boolean;
  message?: string;
};

const MIXED_EDGE_WARNING =
  "Нельзя смешивать направленные и ненаправленные ребра.";
const DUPLICATE_DIRECTED_WARNING = "Такое направленное ребро уже существует.";
const DUPLICATE_UNDIRECTED_WARNING =
  "Нельзя добавить два ненаправленных ребра между вершинами.";

const getPairEdges = (edges: Edge[], from: NodeId, to: NodeId) =>
  edges.filter(
    (edge) =>
      (edge.from === from && edge.to === to) ||
      (edge.from === to && edge.to === from),
  );

export const validateEdgeConnection = (
  edges: Edge[],
  from: NodeId,
  to: NodeId,
  isDirected: boolean,
): EdgeValidationResult => {
  const pairEdges = getPairEdges(edges, from, to);
  const hasUndirectedEdge = pairEdges.some((edge) => !edge.isDirected);
  const hasDirectedEdge = pairEdges.some((edge) => edge.isDirected);

  if (isDirected) {
    if (hasUndirectedEdge) {
      return { isValid: false, message: MIXED_EDGE_WARNING };
    }
    const sameDirectionExists = pairEdges.some(
      (edge) => edge.isDirected && edge.from === from && edge.to === to,
    );
    if (sameDirectionExists) {
      return { isValid: false, message: DUPLICATE_DIRECTED_WARNING };
    }
    return { isValid: true };
  }

  if (hasDirectedEdge) {
    return { isValid: false, message: MIXED_EDGE_WARNING };
  }
  if (hasUndirectedEdge) {
    return { isValid: false, message: DUPLICATE_UNDIRECTED_WARNING };
  }

  return { isValid: true };
};

export type SelfLoopGeometry = {
  pathD: string;
  labelPosition: Point;
};

export const buildSelfLoopGeometry = (node: Node): SelfLoopGeometry => {
  const nodeRadius = GRAPH_STYLE.nodeRadius;
  const loopCenterX = node.x - SELF_LOOP_CENTER_OFFSET;
  const loopCenterY = node.y - SELF_LOOP_CENTER_OFFSET;
  const loopStart = { x: node.x, y: node.y - nodeRadius };
  const loopLeft = { x: node.x - nodeRadius, y: node.y };
  const pathD = [
    `M ${loopStart.x} ${loopStart.y}`,
    `A ${SELF_LOOP_RADIUS} ${SELF_LOOP_RADIUS} 0 1 0 ${loopLeft.x} ${loopLeft.y}`,
    `A ${SELF_LOOP_RADIUS} ${SELF_LOOP_RADIUS} 0 0 0 ${loopStart.x} ${loopStart.y}`,
  ].join(" ");
  const labelPosition = {
    x: loopCenterX,
    y: loopCenterY - SELF_LOOP_RADIUS - EDGE_WEIGHT_LABEL_OFFSET,
  };
  return { pathD, labelPosition };
};

export type CurvedEdgeGeometry = {
  pathD: string;
  labelPosition: Point;
  labelAngle: number;
  axisOrigin: Point;
  curvatureHandlePosition: Point;
  curvatureAxisDirection: Point;
};

export const buildCurvedEdgeGeometry = (
  edge: Edge,
  from: Node,
  to: Node,
): CurvedEdgeGeometry | null => {
  const fromPoint = { x: from.x, y: from.y };
  const toPoint = { x: to.x, y: to.y };
  const baselineDx = toPoint.x - fromPoint.x;
  const baselineDy = toPoint.y - fromPoint.y;
  const baselineLength = Math.hypot(baselineDx, baselineDy);
  if (baselineLength === 0) {
    return null;
  }

  const normalX = -baselineDy / baselineLength;
  const normalY = baselineDx / baselineLength;
  const axisOrigin = {
    x: (fromPoint.x + toPoint.x) / 2,
    y: (fromPoint.y + toPoint.y) / 2,
  };
  const offset = edge.curvatureOffset;
  const vertexX = axisOrigin.x + normalX * offset;
  const vertexY = axisOrigin.y + normalY * offset;
  const controlX = 2 * vertexX - axisOrigin.x;
  const controlY = 2 * vertexY - axisOrigin.y;

  const baseCurve = {
    p0: fromPoint,
    p1: { x: controlX, y: controlY },
    p2: toPoint,
  };
  const startTrimDistance = GRAPH_STYLE.nodeRadius;
  const desiredEndTrimDistance = edge.isDirected
    ? GRAPH_STYLE.nodeRadius + GRAPH_STYLE.arrowClearance
    : GRAPH_STYLE.nodeRadius;
  const startDistance = Math.min(
    startTrimDistance,
    Math.max(baselineLength / 2, 0),
  );
  const endDistance = Math.min(
    desiredEndTrimDistance,
    Math.max(baselineLength / 2, 0),
  );
  const tStart = findTrimParameterFromStart(
    baseCurve.p0,
    baseCurve.p1,
    baseCurve.p2,
    fromPoint,
    startDistance,
  );
  const tEnd = findTrimParameterFromEnd(
    baseCurve.p0,
    baseCurve.p1,
    baseCurve.p2,
    toPoint,
    endDistance,
  );
  const safeTStart = clamp(tStart, 0, 1);
  const safeTEnd = clamp(Math.max(tEnd, safeTStart + 0.001), 0, 1);
  const afterStartSplit = splitQuadratic(
    baseCurve.p0,
    baseCurve.p1,
    baseCurve.p2,
    safeTStart,
  ).right;
  const normalizedEndT =
    safeTEnd <= safeTStart
      ? 1
      : clamp((safeTEnd - safeTStart) / (1 - safeTStart), 0, 1);
  const trimmedCurve = splitQuadratic(
    afterStartSplit.p0,
    afterStartSplit.p1,
    afterStartSplit.p2,
    normalizedEndT,
  ).left;
  const startX = trimmedCurve.p0.x;
  const startY = trimmedCurve.p0.y;
  const controlTrimmedX = trimmedCurve.p1.x;
  const controlTrimmedY = trimmedCurve.p1.y;
  const endX = trimmedCurve.p2.x;
  const endY = trimmedCurve.p2.y;
  const pathD = `M ${startX} ${startY} Q ${controlTrimmedX} ${controlTrimmedY} ${endX} ${endY}`;

  const labelPoint = evaluateQuadraticPoint(
    trimmedCurve.p0,
    trimmedCurve.p1,
    trimmedCurve.p2,
    0.5,
  );
  const labelTangent = evaluateQuadraticTangent(
    trimmedCurve.p0,
    trimmedCurve.p1,
    trimmedCurve.p2,
    0.5,
  );
  const rawNormal = {
    x: -labelTangent.y,
    y: labelTangent.x,
  };
  const rawNormalLength = Math.hypot(rawNormal.x, rawNormal.y) || 1;
  let labelNormal = {
    x: rawNormal.x / rawNormalLength,
    y: rawNormal.y / rawNormalLength,
  };
  if (labelNormal.y > 0) {
    labelNormal = { x: -labelNormal.x, y: -labelNormal.y };
  }
  const labelPosition = {
    x: labelPoint.x + labelNormal.x * EDGE_WEIGHT_LABEL_OFFSET,
    y: labelPoint.y + labelNormal.y * EDGE_WEIGHT_LABEL_OFFSET,
  };
  const labelAngleRaw =
    (Math.atan2(labelTangent.y, labelTangent.x) * 180) / Math.PI;
  const labelAngle =
    labelAngleRaw >= 90
      ? labelAngleRaw - 180
      : labelAngleRaw <= -90
        ? labelAngleRaw + 180
        : labelAngleRaw;

  return {
    pathD,
    labelPosition,
    labelAngle,
    axisOrigin,
    curvatureHandlePosition: { x: vertexX, y: vertexY },
    curvatureAxisDirection: { x: normalX, y: normalY },
  };
};
