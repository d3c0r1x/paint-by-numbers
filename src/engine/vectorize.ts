/** Contour vectorization — SPEC v3 Task 7 rework.
 * Per-region oriented boundary tracing (region interior on the LEFT of the
 * walk direction) → clean closed loops → Douglas–Peucker simplification
 * (ε ≈ 1.2 px) → Chaikin corner-cutting (2 iterations) → Path2D rendering
 * with round joins. Diagonal boundaries become straight/curved lines, not
 * pixel staircases. */
export interface Poly {
  pts: number[]; // x,y pairs; loop is closed implicitly (last → first)
}

/** Trace closed boundary loops per region. Every directed edge keeps the
 * region interior on its left, so each region yields one or more clean CCW
 * loops (holes get opposite orientation — fine for stroking). */
export function traceRegionBoundaries(
  regionIds: Uint32Array,
  width: number,
  height: number,
): Map<number, Poly[]> {
  // Directed edges bucketed per region: flat quads x1,y1,x2,y2.
  const edges = new Map<number, number[]>();
  const add = (rid: number, x1: number, y1: number, x2: number, y2: number) => {
    let list = edges.get(rid);
    if (!list) {
      list = [];
      edges.set(rid, list);
    }
    list.push(x1, y1, x2, y2);
  };
  const at = (x: number, y: number): number =>
    x < 0 || y < 0 || x >= width || y >= height ? -1 : regionIds[y * width + x];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rid = regionIds[y * width + x];
      // Right neighbor differs → edge at x+1, interior on −x side → walk UP.
      if (at(x + 1, y) !== rid) add(rid, x + 1, y + 1, x + 1, y);
      // Left neighbor differs (or image border) → edge at x, interior on +x
      // side → walk DOWN.
      if (x === 0 || at(x - 1, y) !== rid) add(rid, x, y, x, y + 1);
      // Bottom neighbor differs → edge at y+1, interior above → walk RIGHT.
      if (at(x, y + 1) !== rid) add(rid, x, y + 1, x + 1, y + 1);
      // Top neighbor differs (or image border) → edge at y, interior below
      // → walk LEFT.
      if (y === 0 || at(x, y - 1) !== rid) add(rid, x + 1, y, x, y);
    }
  }

  // Chain each region's directed edges into loops.
  const result = new Map<number, Poly[]>();
  for (const [rid, list] of edges) {
    const segCount = list.length / 4;
    const key = (x: number, y: number) => y * (width + 1) + x;
    const fromMap = new Map<number, number[]>();
    for (let s = 0; s < segCount; s++) {
      const k = key(list[s * 4], list[s * 4 + 1]);
      const bucket = fromMap.get(k);
      if (bucket) bucket.push(s);
      else fromMap.set(k, [s]);
    }

    const used = new Uint8Array(segCount);
    const polys: Poly[] = [];
    for (let s = 0; s < segCount; s++) {
      if (used[s]) continue;
      used[s] = 1;
      const pts: number[] = [list[s * 4], list[s * 4 + 1]];
      let endX = list[s * 4 + 2];
      let endY = list[s * 4 + 3];
      pts.push(endX, endY);
      const guard = segCount + 2;
      for (let step = 0; step < guard; step++) {
        const bucket = fromMap.get(key(endX, endY));
        if (!bucket) break;
        let next = -1;
        for (const c of bucket) {
          if (!used[c]) {
            next = c;
            break;
          }
        }
        if (next < 0) break;
        used[next] = 1;
        endX = list[next * 4 + 2];
        endY = list[next * 4 + 3];
        pts.push(endX, endY);
      }
      // A closed loop needs ≥ 4 corners (single pixel = 8 numbers).
      if (pts.length >= 8) polys.push({ pts });
    }
    if (polys.length) result.set(rid, polys);
  }
  return result;
}

/** Douglas–Peucker simplification for a closed polyline (pts = x,y pairs).
 * Splits the loop at the leftmost/rightmost vertices and reduces each run. */
export function simplifyPoly(pts: number[], epsilon: number): number[] {
  const n = pts.length / 2;
  if (n < 5) return pts;
  let leftI = 0;
  for (let i = 1; i < n; i++) if (pts[i * 2] < pts[leftI * 2]) leftI = i;
  let rightI = 0;
  for (let i = 1; i < n; i++) if (pts[i * 2] > pts[rightI * 2]) rightI = i;
  if (leftI === rightI) return pts;

  const keep = new Uint8Array(n);
  keep[leftI] = 1;
  keep[rightI] = 1;

  const dp = (idxs: number[], eps: number) => {
    const stack: [number, number][] = [[0, idxs.length - 1]];
    while (stack.length) {
      const [lo, hi] = stack.pop() as [number, number];
      if (hi - lo < 2) continue;
      const ax = pts[idxs[lo] * 2];
      const ay = pts[idxs[lo] * 2 + 1];
      const bx = pts[idxs[hi] * 2];
      const by = pts[idxs[hi] * 2 + 1];
      const dx = bx - ax;
      const dy = by - ay;
      const norm = Math.hypot(dx, dy) || 1;
      let maxD = -1;
      let maxI = -1;
      for (let i = lo + 1; i < hi; i++) {
        const px = pts[idxs[i] * 2];
        const py = pts[idxs[i] * 2 + 1];
        const d = Math.abs((px - ax) * dy - (py - ay) * dx) / norm;
        if (d > maxD) {
          maxD = d;
          maxI = i;
        }
      }
      if (maxD > eps && maxI > 0) {
        keep[idxs[maxI]] = 1;
        stack.push([lo, maxI], [maxI, hi]);
      }
    }
  };
  const run = (from: number, to: number) => {
    const idxs: number[] = [];
    let i = from;
    for (;;) {
      idxs.push(i);
      if (i === to) break;
      i = (i + 1) % n;
    }
    dp(idxs, epsilon);
  };
  run(leftI, rightI);
  run(rightI, leftI);

  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    if (keep[i]) out.push(pts[i * 2], pts[i * 2 + 1]);
  }
  return out;
}

/** Chaikin corner-cutting on a closed polyline, `iters` rounds. */
export function chaikinSmooth(pts: number[], iters: number): number[] {
  let cur = pts;
  for (let it = 0; it < iters; it++) {
    const n = cur.length / 2;
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
      const x0 = cur[i * 2];
      const y0 = cur[i * 2 + 1];
      const x1 = cur[((i + 1) % n) * 2];
      const y1 = cur[((i + 1) % n) * 2 + 1];
      // 75/25 cut points
      out.push(x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25);
      out.push(x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75);
    }
    cur = out;
  }
  return cur;
}

/** Simplify + smooth one region's boundary loops. A loop that DP collapses
 * below 3 vertices is degenerate (absorbed sliver) and is dropped. */
export function smoothPolys(polys: Poly[], epsilon = 1.2, chaikinIters = 2): Poly[] {
  const out: Poly[] = [];
  for (const poly of polys) {
    const simplified = simplifyPoly(poly.pts, epsilon);
    if (simplified.length < 6) continue; // < 3 points → degenerate
    out.push({ pts: chaikinSmooth(simplified, chaikinIters) });
  }
  return out;
}

/** Build Path2D per region id from the traced + smoothed boundaries. */
export function buildRegionPaths(
  regionIds: Uint32Array,
  width: number,
  height: number,
): Map<number, Path2D> {
  const byRegion = traceRegionBoundaries(regionIds, width, height);
  const paths = new Map<number, Path2D>();
  for (const [regionId, polys] of byRegion) {
    const smoothed = smoothPolys(polys);
    if (!smoothed.length) continue;
    const path = new Path2D();
    for (const poly of smoothed) {
      path.moveTo(poly.pts[0], poly.pts[1]);
      for (let i = 1; i < poly.pts.length / 2; i++) {
        path.lineTo(poly.pts[i * 2], poly.pts[i * 2 + 1]);
      }
      path.closePath();
    }
    paths.set(regionId, path);
  }
  return paths;
}
