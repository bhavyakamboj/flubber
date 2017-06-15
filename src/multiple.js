import { interpolateRing } from "./interpolate.js";
import { toPathString } from "./svg.js";
import { addPoints } from "./add.js";
import normalizeRing from "./normalize.js";
import triangulate from "./triangulate.js";
import pieceOrder from "./order.js";
import { INVALID_INPUT_ALL } from "./errors.js";

export function separate(
  fromShape,
  toShapes,
  { maxSegmentLength = 10, string = true, single = false } = {}
) {
  let fromRing = normalizeRing(fromShape, maxSegmentLength);

  if (fromRing.length < toShapes.length + 2) {
    addPoints(fromRing, toShapes.length + 2 - fromRing.length);
  }

  let fromRings = triangulate(fromRing, toShapes.length),
    toRings = toShapes.map(d => normalizeRing(d, maxSegmentLength)),
    t0 = typeof fromShape === "string" && fromShape,
    t1;

  if (single && toShapes.every(s => typeof s === "string")) {
    t1 = toShapes.join(" ");
  } else if (!single) {
    t1 = toShapes.slice(0);
  }

  return interpolateSets(fromRings, toRings, { string, single, t0, t1 });
}

export function combine(
  fromShapes,
  toShape,
  { maxSegmentLength = 10, string = true, single = false } = {}
) {
  let interpolators = separate(toShape, fromShapes, { maxSegmentLength, string, single });
  return single ? t => interpolators(1 - t) : interpolators.map(fn => t => fn(1 - t));
}

export function all(
  fromShapes,
  toShapes,
  { maxSegmentLength = 10, string = true, single = false, match = true } = {}
) {
  if (
    !Array.isArray(fromShapes) ||
    !Array.isArray(toShapes) ||
    fromShapes.length !== toShapes.length ||
    !fromShapes.length
  ) {
    throw new TypeError(INVALID_INPUT_ALL);
  }

  let normalize = s => normalizeRing(s, maxSegmentLength),
    fromRings = fromShapes.map(normalize),
    toRings = toShapes.map(normalize),
    t0,
    t1;

  if (single) {
    if (fromShapes.every(s => typeof s === "string")) {
      t0 = fromShapes.join(" ");
    }
    if (toShapes.every(s => typeof s === "string")) {
      t1 = toShapes.join(" ");
    }
  } else {
    t0 = fromShapes.slice(0);
    t1 = toShapes.slice(0);
  }

  return interpolateSets(fromRings, toRings, { string, single, t0, t1, match });
}

function interpolateSets(fromRings, toRings, { string, single, t0, t1, match = true } = {}) {
  let order = match ? pieceOrder(fromRings, toRings) : d3.range(fromRings.length),
    interpolators = order.map((d, i) => interpolateRing(fromRings[d], toRings[i], string));

  if (match && Array.isArray(t0)) {
    t0 = order.map(d => t0[d]);
  }

  if (single) {
    let multiInterpolator = string
      ? t => interpolators.map(fn => fn(t)).join(" ")
      : t => interpolators.map(fn => fn(t));

    if (string && (t0 || t1)) {
      return t => (t < 1e-4 && t0) || (1 - t < 1e-4 && t1) || multiInterpolator(t);
    }
    return multiInterpolator;
  } else if (string) {
    t0 = Array.isArray(t0) ? t0.map(d => typeof d === "string" && d) : [];
    t1 = Array.isArray(t1) ? t1.map(d => typeof d === "string" && d) : [];

    return interpolators.map((fn, i) => {
      if (t0[i] || t1[i]) {
        return t => (t < 1e-4 && t0[i]) || (1 - t < 1e-4 && t1[i]) || fn(t);
      }
      return fn;
    });
  }

  return interpolators;
}
