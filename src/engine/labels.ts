/** Region number placement per SPEC Task 7: the pixel farthest from the
 * region border (inverse BFS from borders → max distance), centroid fallback.
 * Font size heuristic: clamp(round(sqrt(area)/3), 10, 48) px, color #333.
 * Membership is an O(1) regionIds lookup and buffers are shared across
 * regions (stamp-based), so the whole pass is O(pixels) even for the
 * hundreds of thousands of tiny regions a real photo can produce. */
import type { Region } from './segment';
import type { RegionInfo } from './types';
import { symbolFor } from './symbols';

export function computeLabelPoints(
  regions: Region[],
  regionIds: Uint32Array,
  width: number,
  height: number,
): RegionInfo[] {
  const n = width * height;
  // Stamp trick: stamp[p] === currentStamp ⇒ dist[p] is valid for region `cur`.
  const dist = new Int32Array(n);
  const stamp = new Int32Array(n);
  const queue = new Int32Array(n);
  let currentStamp = 0;

  const out: RegionInfo[] = [];
  for (const region of regions) {
    currentStamp++;
    const point = farthestFromBorder(
      region,
      regionIds,
      width,
      height,
      dist,
      stamp,
      queue,
      currentStamp,
    );
    out.push({
      colorIdx: region.colorIdx,
      area: region.area,
      labelX: point.x + 0.5,
      labelY: point.y + 0.5,
      fontSize: clampFontSize(Math.round(Math.sqrt(region.area) / 3)),
    });
  }
  return out;
}

function clampFontSize(size: number): number {
  return Math.min(48, Math.max(10, size));
}

function farthestFromBorder(
  region: Region,
  regionIds: Uint32Array,
  width: number,
  height: number,
  dist: Int32Array,
  stamp: Int32Array,
  queue: Int32Array,
  currentStamp: number,
): { x: number; y: number } {
  let head = 0;
  let tail = 0;

  // Seed BFS from region pixels that touch the image edge or a non-member.
  for (const p of region.pixels) {
    const x = p % width;
    const y = (p - x) / width;
    const border =
      x === 0 ||
      y === 0 ||
      x === width - 1 ||
      y === height - 1 ||
      regionIds[p - 1] !== region.id ||
      regionIds[p + 1] !== region.id ||
      regionIds[p - width] !== region.id ||
      regionIds[p + width] !== region.id;
    if (border) {
      dist[p] = 0;
      stamp[p] = currentStamp;
      queue[tail++] = p;
    }
  }

  let maxDist = -1;
  let maxP = region.pixels[0];
  while (head < tail) {
    const p = queue[head++];
    const d = dist[p];
    if (d > maxDist) {
      maxDist = d;
      maxP = p;
    }
    const x = p % width;
    const y = (p - x) / width;
    // Neighbor in bounds, same region, not visited yet.
    if (x > 0 && regionIds[p - 1] === region.id && stamp[p - 1] !== currentStamp) {
      dist[p - 1] = d + 1;
      stamp[p - 1] = currentStamp;
      queue[tail++] = p - 1;
    }
    if (x + 1 < width && regionIds[p + 1] === region.id && stamp[p + 1] !== currentStamp) {
      dist[p + 1] = d + 1;
      stamp[p + 1] = currentStamp;
      queue[tail++] = p + 1;
    }
    if (y > 0 && regionIds[p - width] === region.id && stamp[p - width] !== currentStamp) {
      dist[p - width] = d + 1;
      stamp[p - width] = currentStamp;
      queue[tail++] = p - width;
    }
    if (y + 1 < height && regionIds[p + width] === region.id && stamp[p + width] !== currentStamp) {
      dist[p + width] = d + 1;
      stamp[p + width] = currentStamp;
      queue[tail++] = p + width;
    }
  }

  // Centroid fallback if BFS found no interior point (1-2 px regions).
  if (maxDist <= 0) {
    let sx = 0;
    let sy = 0;
    for (const p of region.pixels) {
      const x = p % width;
      sx += x;
      sy += (p - x) / width;
    }
    const cx = Math.round(sx / region.area);
    const cy = Math.round(sy / region.area);
    if (cx >= 0 && cy >= 0 && cx < width && cy < height) {
      return { x: cx, y: cy };
    }
  }

  const mx = maxP % width;
  return { x: mx, y: (maxP - mx) / width };
}

/** Draw region numbers in #333, centered on the label point (Task 7/10). */
export function drawNumbers(ctx: CanvasRenderingContext2D, regions: RegionInfo[]): void {
  ctx.save();
  ctx.fillStyle = '#333333';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const region of regions) {
    ctx.font = `${region.fontSize}px system-ui, sans-serif`;
    ctx.fillText(symbolFor(region.colorIdx), region.labelX, region.labelY);
  }
  ctx.restore();
}
