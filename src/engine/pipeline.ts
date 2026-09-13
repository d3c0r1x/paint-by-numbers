/** Smart conversion pipeline (v3): guided filter → SLIC superpixels →
 * palette k-means over superpixel means (auto-k via SSE elbow, 10..36) →
 * per-pixel labels → regions → RAG small-region merge → majority filter →
 * numbers. Contours are vectorized on the main thread from `labels`
 * (see vectorize.ts), so the worker output stays transferable/plain data. */
import { rgbToLab, labDistance2000 } from './colorSpace';
import { guidedSmoothLab } from './smooth';
import { slic } from './slic';
import { quantize } from './quantize';
import { refinePalette } from './autoPalette';
import { buildRegions, mergeSmallRegions, type SegmentResult } from './segment';
import { computeLabelPoints } from './labels';
import type { PaletteEntry, PipelineResult, PipelineStep } from './types';

export const WORKING_MAX_SIDE = 1400;
/** Superpixel budget: SLIC K = pixels / SUPERPIXEL_AREA, clamped 2000..5000. */
const SUPERPIXEL_AREA = 350;

type ProgressFn = (p: { step: PipelineStep; percent: number }) => void;

/** Main-thread API: run the conversion in a module web worker. */
export function runConversion(
  imageData: ImageData,
  onProgress: ProgressFn,
): Promise<PipelineResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
    });
    const dataBuffer = imageData.data.buffer as ArrayBuffer;

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === 'progress') {
        onProgress({ step: msg.step, percent: msg.percent });
      } else if (msg.type === 'done') {
        worker.terminate();
        resolve(msg.result as PipelineResult);
      } else if (msg.type === 'error') {
        worker.terminate();
        reject(new Error(msg.message));
      }
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message || 'worker error'));
    };

    worker.postMessage({ type: 'convert', imageData }, [dataBuffer]);
  });
}

/** Full conversion on raw RGBA pixels. Executed inside the worker. */
export function runPipeline(imageData: ImageData, report: ProgressFn): PipelineResult {
  // Step 1: downscale + guided (edge-preserving) smoothing + Lab. (0–20%)
  report({ step: 'analyze', percent: 0 });
  const raw = downscaleToLab(imageData, WORKING_MAX_SIDE);
  report({ step: 'analyze', percent: 8 });
  // v3.1 P2: softened guided filter (r=3, eps=80) — the old r=4/eps=300
  // flattened fine structures (lace, embroidery, blush) before segmentation
  // ever saw them.
  const lab = guidedSmoothLab(raw.lab, raw.width, raw.height, { radius: 3, eps: 80 });
  const { width, height } = raw;
  report({ step: 'analyze', percent: 20 });

  // Step 2: SLIC superpixels — the unit of everything below. (20–45%)
  report({ step: 'palette', percent: 22 });
  const K = Math.max(400, Math.min(5000, Math.round((width * height) / SUPERPIXEL_AREA)));
  const sp = slic(lab, width, height, { numSuperpixels: K, compactness: 10, iterations: 10 });
  report({ step: 'palette', percent: 45 });

  // Step 3: palette k-means over superpixel means (area-weighted points),
  // auto-k via SSE elbow in [10..36], then perceptual refinement. (45–70%)
  const spCount = sp.count;
  const spLab = new Float64Array(spCount * 3);
  spLab.set(sp.means.subarray(0, spCount * 3));
  const spToPalette = new Int32Array(spCount);
  const k = autoKWithFloor(spLab, spCount, 10, 36);
  const q = quantize(spLab, k, 1);
  // quantize counts "pixels" = superpixels; reweight by real area.
  for (let c = 0; c < q.palette.length; c++) q.palette[c].pixelCount = 0;
  for (let c = 0; c < spCount; c++) q.palette[q.labels[c]].pixelCount += sp.sizes[c];
  report({ step: 'palette', percent: 60 });

  const { palette, remap } = refinePalette(q.palette);
  // Superpixel → palette index map (q.labels is per-superpixel).
  for (let c = 0; c < spCount; c++) spToPalette[c] = remap[q.labels[c]] as number;
  report({ step: 'palette', percent: 70 });

  // Step 4: paint pixels from superpixel palette indices → regions. (70–80%)
  report({ step: 'regions', percent: 72 });
  const pixelLabels = new Uint16Array(width * height);
  for (let p = 0; p < pixelLabels.length; p++) {
    const spId = sp.ids[p];
    pixelLabels[p] = spId >= 0 ? spToPalette[spId] : 0;
  }
  // Majority filter on color labels BEFORE regionization: smooths stray
  // superpixel islands without corrupting region bookkeeping. Two passes
  // (SPEC v3.1): one pass leaves second-order speckle islands behind.
  majorityFilter(pixelLabels, width, height, 2);

  const seg = buildRegions(pixelLabels, width, height);
  report({ step: 'regions', percent: 80 });

  // Step 5: RAG small-region merge. (80–88%)
  report({ step: 'merge', percent: 82 });
  const minAreaPixels = Math.max(350, Math.round((width * height) / 4000));
  mergeSmallRegions(seg, palette, minAreaPixels, width, height);
  report({ step: 'merge', percent: 86 });

  refreshPixelCounts(seg, palette);

  // Step 6: number placement (farthest-from-border ≈ polylabel). (88–100%)
  report({ step: 'contours', percent: 90 });
  report({ step: 'numbers', percent: 94 });
  const regions = computeLabelPoints(seg.regions, seg.regionIds, width, height);
  report({ step: 'numbers', percent: 100 });

  return {
    width,
    height,
    labels: seg.regionIds, // region id per pixel; regions[i].colorIdx → palette entry
    palette,
    regions,
  };
}

/** Auto-k = max(SSE-elbow k, auto-k floor). The floor (SPEC v3.1 P1 rule):
 * the smallest k in range where ≥ 90% of superpixels sit within ΔE00 ≤ 10
 * of their cluster color — a computable guarantee that the palette does not
 * crush gradients into visibly wrong buckets. Exported for tests via
 * `autoKWithFloorForTest`. */
export function autoKWithFloorForTest(
  lab: Float64Array,
  n: number,
  kMin: number,
  kMax: number,
): number {
  return autoKWithFloor(lab, n, kMin, kMax);
}

function autoKWithFloor(lab: Float64Array, n: number, kMin: number, kMax: number): number {
  const elbow = elbowAutoK(lab, n, kMin, kMax);
  let floor = kMax;
  for (let k = kMin; k <= kMax; k++) {
    if (coverageShare(lab, n, k) >= 0.9) {
      floor = k;
      break;
    }
  }
  return Math.max(elbow, floor);
}

/** Share of points within ΔE00 ≤ 10 of their k-means cluster color. */
function coverageShare(lab: Float64Array, n: number, k: number): number {
  const q = quantize(lab, k, 1);
  let ok = 0;
  for (let i = 0; i < n; i++) {
    const p: [number, number, number] = [lab[i * 3], lab[i * 3 + 1], lab[i * 3 + 2]];
    const c = q.palette[q.labels[i]];
    if (labDistance2000(p, c.lab) <= 10) ok++;
  }
  return ok / n;
}

/** SSE elbow over k ∈ [kMin..kMax]: run weighted k-means for each k on the
 * superpixel means (deterministic), pick the k whose SSE point is farthest
 * below the chord connecting the curve endpoints (max perpendicular gain). */
function elbowAutoK(lab: Float64Array, n: number, kMin: number, kMax: number): number {
  void n;
  const ks: number[] = [];
  const sse: number[] = [];
  for (let k = kMin; k <= kMax; k += 2) {
    const q = quantize(lab, k, 1);
    let s = 0;
    for (let i = 0; i < lab.length / 3; i++) {
      const c = q.labels[i];
      const dl = lab[i * 3] - q.palette[c].lab[0];
      const da = lab[i * 3 + 1] - q.palette[c].lab[1];
      const db = lab[i * 3 + 2] - q.palette[c].lab[2];
      s += dl * dl + da * da + db * db;
    }
    ks.push(k);
    sse.push(s);
  }
  if (sse.length < 3) return kMin;
  // Chord from first to last point; max perpendicular distance = elbow.
  const x0 = ks[0];
  const y0 = sse[0];
  const x1 = ks[ks.length - 1];
  const y1 = sse[sse.length - 1];
  const dx = x1 - x0;
  const dy = y1 - y0;
  const norm = Math.hypot(dx, dy) || 1;
  let bestI = 0;
  let bestD = -1;
  for (let i = 0; i < ks.length; i++) {
    const d = Math.abs((ks[i] - x0) * dy - (sse[i] - y0) * dx) / norm;
    if (d > bestD) {
      bestD = d;
      bestI = i;
    }
  }
  return ks[bestI];
}

/** Majority filter: 3×3 window, reassign minority-label pixels surrounded
 * mostly by one other label. `passes` = 1..2. Generic over typed arrays. */
function majorityFilter<T extends Uint16Array | Uint32Array>(
  ids: T,
  width: number,
  height: number,
  passes: number,
): void {
  for (let pass = 0; pass < passes; pass++) {
    const orig = ids.slice();
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const p = y * width + x;
        // Count neighbor labels.
        const counts = new Map<number, number>();
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const q = orig[p + dy * width + dx];
            counts.set(q, (counts.get(q) ?? 0) + 1);
          }
        }
        const self = orig[p];
        let best = -1;
        let bestN = 0;
        for (const [label, nCount] of counts) {
          if (label !== self && nCount > bestN) {
            bestN = nCount;
            best = label;
          }
        }
        if (best >= 0 && bestN >= 6) ids[p] = best;
      }
    }
  }
}

function refreshPixelCounts(seg: SegmentResult, palette: PaletteEntry[]): void {
  palette.forEach((p) => (p.pixelCount = 0));
  for (const r of seg.regions) palette[r.colorIdx].pixelCount += r.area;
}

/** Bilinear downscale to ≤ maxSide on the long side, output as Lab triples.
 * (Grain is handled by the guided filter downstream, so no extra blur here.) */
export function downscaleToLab(
  imageData: ImageData,
  maxSide: number,
): { lab: Float64Array; width: number; height: number } {
  const sw = imageData.width;
  const sh = imageData.height;
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));

  const rgb = new Float64Array(w * h * 3);
  const src = imageData.data;

  const xRatio = sw / w;
  const yRatio = sh / h;
  for (let y = 0; y < h; y++) {
    const sy = Math.min(sh - 1, (y + 0.5) * yRatio - 0.5);
    const y0 = Math.max(0, Math.floor(sy));
    const y1 = Math.min(sh - 1, y0 + 1);
    const fy = sy - y0;
    for (let x = 0; x < w; x++) {
      const sx = Math.min(sw - 1, (x + 0.5) * xRatio - 0.5);
      const x0 = Math.max(0, Math.floor(sx));
      const x1 = Math.min(sw - 1, x0 + 1);
      const fx = sx - x0;

      for (let ch = 0; ch < 3; ch++) {
        rgb[(y * w + x) * 3 + ch] =
          src[(y0 * sw + x0) * 4 + ch] * (1 - fx) * (1 - fy) +
          src[(y0 * sw + x1) * 4 + ch] * fx * (1 - fy) +
          src[(y1 * sw + x0) * 4 + ch] * (1 - fx) * fy +
          src[(y1 * sw + x1) * 4 + ch] * fx * fy;
      }
      // Alpha: treat non-opaque pixels as white background.
      const a =
        src[(y0 * sw + x0) * 4 + 3] * (1 - fx) * (1 - fy) +
        src[(y0 * sw + x1) * 4 + 3] * fx * (1 - fy) +
        src[(y1 * sw + x0) * 4 + 3] * (1 - fx) * fy +
        src[(y1 * sw + x1) * 4 + 3] * fx * fy;
      if (a < 250) {
        const o = (y * w + x) * 3;
        const k = a / 255;
        rgb[o] = rgb[o] * k + 255 * (1 - k);
        rgb[o + 1] = rgb[o + 1] * k + 255 * (1 - k);
        rgb[o + 2] = rgb[o + 2] * k + 255 * (1 - k);
      }
    }
  }

  const lab = new Float64Array(w * h * 3);
  for (let p = 0; p < w * h; p++) {
    const [L, A, B] = rgbToLab(rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2]);
    lab[p * 3] = L;
    lab[p * 3 + 1] = A;
    lab[p * 3 + 2] = B;
  }
  return { lab, width: w, height: h };
}

export type { SegmentResult };
