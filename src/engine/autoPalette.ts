/** Smart auto-palette (replaces SPEC difficulty presets): keep practically
 * all colors — the symbol budget (1..9, 0, A..Z = 36) is the only real limit.
 * Phase 1 dedupes indistinguishable shades (ΔE00 < minDist). Phase 2 merges
 * the CLOSEST cluster pair repeatedly until the palette fits the budget, so
 * a smooth-gradient photo keeps 36 graded steps instead of collapsing.
 * All comparisons are CIEDE2000 — perceptual, unlike CIE76. */
import { labDistance2000 } from './colorSpace';
import type { Lab, PaletteEntry } from './types';

/** Max palette size: digits 1..9 + 0 + letters A..Z = 36 symbols (reference legend). */
export const MAX_PALETTE = 36;
/** Shades closer than this are considered the same paint (noise-level dupes). */
export const MIN_COLOR_DISTANCE = 5;

export interface RefineResult {
  palette: PaletteEntry[];
  /** old palette index → new palette index (for remapping label maps). */
  remap: Int32Array;
}

interface Cluster {
  labSum: [number, number, number];
  weight: number;
  pixelCount: number;
  /** Palette index that seeded this cluster. */
  seed: number;
}

function meanOf(c: Cluster): Lab {
  return [c.labSum[0] / c.weight, c.labSum[1] / c.weight, c.labSum[2] / c.weight];
}

export function refinePalette(
  palette: PaletteEntry[],
  minDist = MIN_COLOR_DISTANCE,
  maxColors = MAX_PALETTE,
): RefineResult {
  const clusters: Cluster[] = [];
  const assign = new Int32Array(palette.length);

  // Phase 1 — leader clustering: dedupe only near-identical shades.
  for (let i = 0; i < palette.length; i++) {
    const p = palette[i];
    let best = -1;
    let bestD = Infinity;
    for (let c = 0; c < clusters.length; c++) {
      const d = labDistance2000(p.lab, meanOf(clusters[c]));
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    if (best >= 0 && bestD < minDist) {
      const cl = clusters[best];
      cl.labSum[0] += p.lab[0] * p.pixelCount;
      cl.labSum[1] += p.lab[1] * p.pixelCount;
      cl.labSum[2] += p.lab[2] * p.pixelCount;
      cl.weight += p.pixelCount;
      cl.pixelCount += p.pixelCount;
      assign[i] = best;
    } else {
      clusters.push({
        labSum: [p.lab[0] * p.pixelCount, p.lab[1] * p.pixelCount, p.lab[2] * p.pixelCount],
        weight: p.pixelCount,
        pixelCount: p.pixelCount,
        seed: i,
      });
      assign[i] = clusters.length - 1;
    }
  }

  // Phase 2 — agglomerative: merge the closest pair until ≤ maxColors.
  while (clusters.length > maxColors) {
    let bi = 0;
    let bj = 1;
    let bestD = Infinity;
    for (let i = 0; i < clusters.length; i++) {
      const mi = meanOf(clusters[i]);
      for (let j = i + 1; j < clusters.length; j++) {
        const d = labDistance2000(mi, meanOf(clusters[j]));
        if (d < bestD) {
          bestD = d;
          bi = i;
          bj = j;
        }
      }
    }
    const a = clusters[bi];
    const b = clusters[bj];
    a.labSum[0] += b.labSum[0];
    a.labSum[1] += b.labSum[1];
    a.labSum[2] += b.labSum[2];
    a.weight += b.weight;
    a.pixelCount += b.pixelCount;
    clusters.splice(bj, 1);
    // Reindex assignments above the removed slot.
    for (let i = 0; i < assign.length; i++) {
      if (assign[i] === bj) assign[i] = bi;
      else if (assign[i] > bj) assign[i] -= 1;
    }
  }

  // Palette order: pixelCount desc ⇒ symbol 1 = the largest area.
  const result: PaletteEntry[] = [];
  const clusterPos = new Map<number, number>();
  clusters
    .map((c, i) => ({ i, pixelCount: c.pixelCount }))
    .sort((x, y) => y.pixelCount - x.pixelCount || x.i - y.i)
    .forEach(({ i }) => {
      const mean = meanOf(clusters[i]);
      clusterPos.set(i, result.length);
      result.push({
        index: result.length,
        lab: mean,
        hex: hexFromLab(mean),
        pixelCount: clusters[i].pixelCount,
      });
    });

  // Remap: every old palette index → its cluster's new position; entries of
  // clusters removed in phase 2 already point at their absorber via reindex.
  const remap = new Int32Array(palette.length);
  for (let i = 0; i < palette.length; i++) {
    remap[i] = clusterPos.get(assign[i]) ?? 0;
  }

  return { palette: result, remap };
}

function hexFromLab(lab: Lab): string {
  const [r, g, b] = labToRgbSafe(lab);
  const to = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

function labToRgbSafe(lab: Lab): [number, number, number] {
  // Local conversion to avoid a circular import with colorSpace helpers.
  const f = (t: number) => (t > 0.206897 ? t ** 3 : (t - 4 / 29) / 7.787);
  const fy = (lab[0] + 16) / 116;
  const x = 0.95047 * f(fy + lab[1] / 500);
  const y = 1.0 * f(fy);
  const z = 1.08883 * f(fy - lab[2] / 200);
  const toS = (c: number) => {
    const v = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
    return v * 255;
  };
  const r = toS(3.2404542 * x - 1.5371385 * y - 0.4985314 * z);
  const g = toS(-0.969266 * x + 1.8760108 * y + 0.041556 * z);
  const b = toS(0.0556434 * x - 0.2040259 * y + 1.0572252 * z);
  return [r, g, b];
}
