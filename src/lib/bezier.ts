export type Point = { x: number; y: number };

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const evaluateQuadraticPoint = (
  p0: Point,
  p1: Point,
  p2: Point,
  t: number,
) => {
  const oneMinusT = 1 - t;
  const x =
    oneMinusT * oneMinusT * p0.x + 2 * oneMinusT * t * p1.x + t * t * p2.x;
  const y =
    oneMinusT * oneMinusT * p0.y + 2 * oneMinusT * t * p1.y + t * t * p2.y;
  return { x, y };
};

export const evaluateQuadraticTangent = (
  p0: Point,
  p1: Point,
  p2: Point,
  t: number,
) => {
  const ax = p1.x - p0.x;
  const ay = p1.y - p0.y;
  const bx = p2.x - p1.x;
  const by = p2.y - p1.y;
  const tangent = {
    x: 2 * ((1 - t) * ax + t * bx),
    y: 2 * ((1 - t) * ay + t * by),
  };
  const length = Math.hypot(tangent.x, tangent.y) || 1;
  return { x: tangent.x / length, y: tangent.y / length };
};

export const splitQuadratic = (p0: Point, p1: Point, p2: Point, t: number) => {
  const p01 = {
    x: p0.x + (p1.x - p0.x) * t,
    y: p0.y + (p1.y - p0.y) * t,
  };
  const p12 = {
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t,
  };
  const p012 = {
    x: p01.x + (p12.x - p01.x) * t,
    y: p01.y + (p12.y - p01.y) * t,
  };
  return {
    left: { p0, p1: p01, p2: p012 },
    right: { p0: p012, p1: p12, p2 },
  };
};

export const findTrimParameterFromStart = (
  p0: Point,
  p1: Point,
  p2: Point,
  reference: Point,
  distance: number,
): number => {
  if (distance <= 0) return 0;
  let left = 0;
  let right = 1;
  for (let i = 0; i < 30; i += 1) {
    const mid = (left + right) / 2;
    const point = evaluateQuadraticPoint(p0, p1, p2, mid);
    const currentDistance = Math.hypot(
      point.x - reference.x,
      point.y - reference.y,
    );
    if (currentDistance < distance) {
      left = mid;
    } else {
      right = mid;
    }
  }
  return right;
};

export const findTrimParameterFromEnd = (
  p0: Point,
  p1: Point,
  p2: Point,
  reference: Point,
  distance: number,
): number => {
  if (distance <= 0) return 1;
  let left = 0;
  let right = 1;
  for (let i = 0; i < 30; i += 1) {
    const mid = (left + right) / 2;
    const point = evaluateQuadraticPoint(p0, p1, p2, mid);
    const currentDistance = Math.hypot(
      point.x - reference.x,
      point.y - reference.y,
    );
    if (currentDistance < distance) {
      right = mid;
    } else {
      left = mid;
    }
  }
  return left;
};
