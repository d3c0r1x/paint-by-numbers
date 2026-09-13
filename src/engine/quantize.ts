/** K-means++ quantization in CIELAB per SPEC Task 5.
 * v3.1: the palette color of each cluster is its **medoid** — the member
 * closest to the centroid — instead of the mean. Means wash saturated
 * accents (blush, lips, bokeh highlights) toward gray; a medoid keeps the
 * paint color a color that actually occurs in the image. */
import { labToHex } from './colorSpace';
import type { Lab, PaletteEntry } from './types';

/** Deterministic PRNG (mulberry32). Same seed → same sequence. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MAX_ITER = 20;
const MOVE_EPS = 0.5; // stop early when centroids move less than this (Lab units)
const MAX_FIT_POINTS = 240_000; // fit centroids on a deterministic stride subsample

interface FitResult {
  centroids: Lab[];
}

function fitCentroids(lab: Float64Array, n: number, k: number, seed: number): FitResult {
  const rand = mulberry32(seed);
  const centroids: Lab[] = [];

  const px = (i: number, c: 0 | 1 | 2): number => lab[i * 3 + c];

  // K-means++ init
  const first = Math.floor(rand() * n);
  centroids.push([px(first, 0), px(first, 1), px(first, 2)]);

  const dist2 = new Float64Array(n).fill(Infinity);
  for (let ci = 1; ci < k; ci++) {
    let sum = 0;
    const last = centroids[centroids.length - 1];
    for (let i = 0; i < n; i++) {
      const dl = px(i, 0) - last[0];
      const da = px(i, 1) - last[1];
      const db = px(i, 2) - last[2];
      const d = dl * dl + da * da + db * db;
      if (d < dist2[i]) dist2[i] = d;
      sum += dist2[i];
    }
    if (sum <= 0) {
      // All points coincide with chosen centroids; duplicate to keep k fixed.
      const src = Math.floor(rand() * n);
      centroids.push([px(src, 0), px(src, 1), px(src, 2)]);
      continue;
    }
    let r = rand() * sum;
    let pick = n - 1;
    for (let i = 0; i < n; i++) {
      r -= dist2[i];
      if (r <= 0) {
        pick = i;
        break;
      }
    }
    centroids.push([px(pick, 0), px(pick, 1), px(pick, 2)]);
  }

  // Lloyd iterations
  const counts = new Int32Array(k);
  const sums = new Float64Array(k * 3);
  for (let iter = 0; iter < MAX_ITER; iter++) {
    counts.fill(0);
    sums.fill(0);
    let moved = 0;

    for (let i = 0; i < n; i++) {
      const L = px(i, 0);
      const A = px(i, 1);
      const B = px(i, 2);
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const dl = L - centroids[c][0];
        const da = A - centroids[c][1];
        const dbv = B - centroids[c][2];
        const d = dl * dl + da * da + dbv * dbv;
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      counts[best]++;
      sums[best * 3] += L;
      sums[best * 3 + 1] += A;
      sums[best * 3 + 2] += B;
    }

    for (let c = 0; c < centroids.length; c++) {
      if (counts[c] === 0) continue; // keep previous centroid for empty clusters
      const nl = sums[c * 3] / counts[c];
      const na = sums[c * 3 + 1] / counts[c];
      const nb = sums[c * 3 + 2] / counts[c];
      moved = Math.max(
        moved,
        Math.abs(nl - centroids[c][0]),
        Math.abs(na - centroids[c][1]),
        Math.abs(nb - centroids[c][2]),
      );
      centroids[c] = [nl, na, nb];
    }

    if (moved < MOVE_EPS) break;
  }

  return { centroids };
}

/** Quantize Lab pixels (3 per point) into k colors.
 * Returns palette ordered by pixelCount descending and a label map (palette index per input point). */
export function quantize(
  lab: Float64Array,
  k: number,
  seed: number,
): { palette: PaletteEntry[]; labels: Uint16Array } {
  const n = lab.length / 3;
  if (n === 0 || k < 1) {
    return { palette: [], labels: new Uint16Array(0) };
  }
  const kk = Math.min(k, 65535);

  // Deterministic subsample for centroid fitting on large images.
  let fitLab = lab;
  let fitN = n;
  if (n > MAX_FIT_POINTS) {
    const stride = Math.ceil(n / MAX_FIT_POINTS);
    fitN = Math.floor((n + stride - 1) / stride);
    fitLab = new Float64Array(fitN * 3);
    for (let j = 0; j < fitN; j++) {
      const i = Math.min(j * stride, n - 1);
      fitLab[j * 3] = lab[i * 3];
      fitLab[j * 3 + 1] = lab[i * 3 + 1];
      fitLab[j * 3 + 2] = lab[i * 3 + 2];
    }
  }

  const { centroids } = fitCentroids(fitLab, fitN, kk, seed);

  // Assign every input point and build counts + medoid candidates.
  const labels = new Uint16Array(n);
  const counts = new Float64Array(centroids.length);
  const sums = new Float64Array(centroids.length * 3);
  // Medoid: member closest to the centroid (squared Lab euclidean).
  const medoidIdx = new Int32Array(centroids.length).fill(-1);
  const medoidD2 = new Float64Array(centroids.length).fill(Infinity);
  for (let i = 0; i < n; i++) {
    const L = lab[i * 3];
    const A = lab[i * 3 + 1];
    const B = lab[i * 3 + 2];
    let best = 0;
    let bestD = Infinity;
    for (let c = 0; c < centroids.length; c++) {
      const dl = L - centroids[c][0];
      const da = A - centroids[c][1];
      const dbv = B - centroids[c][2];
      const d = dl * dl + da * da + dbv * dbv;
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    labels[i] = best;
    counts[best]++;
    sums[best * 3] += L;
    sums[best * 3 + 1] += A;
    sums[best * 3 + 2] += B;
    if (bestD < medoidD2[best]) {
      medoidD2[best] = bestD;
      medoidIdx[best] = i;
    }
  }

  // Palette sorted by pixelCount descending (color 1 = largest area).
  const order = centroids
    .map((_, i) => ({ i, count: counts[i] }))
    .sort((a, b) => b.count - a.count || a.i - b.i);
  const remap = new Int32Array(centroids.length);
  const palette: PaletteEntry[] = order.map((entry, newIndex) => {
    remap[entry.i] = newIndex;
    const c = centroids[entry.i];
    const count = counts[entry.i];
    // Medoid color: an actual image color, not the (washed-out) mean.
    const mi = medoidIdx[entry.i];
    const color: Lab = count > 0 && mi >= 0 ? [lab[mi * 3], lab[mi * 3 + 1], lab[mi * 3 + 2]] : c;
    return { index: newIndex, lab: color, hex: labToHex(color), pixelCount: count };
  });
  for (let i = 0; i < n; i++) labels[i] = remap[labels[i]];

  return { palette, labels };
}
