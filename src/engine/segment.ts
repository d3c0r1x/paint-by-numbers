/** Connected regions + small-region merging per SPEC Task 6.
 * Designed for real photos: the merge loop is pure bookkeeping (no pixel
 * array concatenation); pixel lists and bboxes are rebuilt in a single
 * O(pixels) pass afterwards. */
import { labDistance2000 } from './colorSpace'
import type { Lab, PaletteEntry } from './types'

/** Contrast-aware merging (SPEC v3.1 P0): a region smaller than minArea is
 * merged into a neighbor ONLY if their ΔE00 is below this threshold. Small
 * but contrast-bearing regions (lips, eyelets, lace, blush) survive instead
 * of being dissolved into their surroundings. */
export const MERGE_CONTRAST_THRESHOLD = 12

export interface Region {
  id: number
  colorIdx: number
  area: number
  pixels: number[]
  bbox: { minX: number; minY: number; maxX: number; maxY: number }
  neighbors: Set<number>
}

export interface SegmentResult {
  /** Region id per pixel (compacted ids after merge). */
  regionIds: Uint32Array
  regions: Region[]
}

const UNASSIGNED = 0xffffffff

/** Split a label map into 4-connected regions and record adjacency
 * from pixel pairs with differing labels (right/down pairs). */
export function buildRegions(
  labels: Uint16Array,
  width: number,
  height: number,
): SegmentResult {
  const n = width * height
  const regionIds = new Uint32Array(n).fill(UNASSIGNED)
  const pixelsLists: number[][] = []
  const neighborSets: Set<number>[] = []
  const queue = new Int32Array(n)

  for (let start = 0; start < n; start++) {
    if (regionIds[start] !== UNASSIGNED) continue
    const colorIdx = labels[start]
    const id = pixelsLists.length
    const pixels: number[] = []
    neighborSets.push(new Set<number>())
    let head = 0
    let tail = 0
    queue[tail++] = start
    regionIds[start] = id
    pixels.push(start)

    while (head < tail) {
      const p = queue[head++]
      const x = p % width
      const y = (p - x) / width

      // 4-connectivity: right, down, left, up.
      // Same-label unassigned neighbors are claimed; differing-label neighbors
      // record adjacency once both regions exist (the reverse pair is always
      // examined by the other region's BFS, so nothing is missed).
      const q4 = [x + 1 < width ? p + 1 : -1, y + 1 < height ? p + width : -1, x > 0 ? p - 1 : -1, y > 0 ? p - width : -1]
      for (const q of q4) {
        if (q < 0) continue
        if (labels[q] === colorIdx) {
          if (regionIds[q] === UNASSIGNED) {
            regionIds[q] = id
            queue[tail++] = q
            pixels.push(q)
          }
        } else if (regionIds[q] !== UNASSIGNED) {
          addAdjacency(neighborSets, id, regionIds[q] as number)
        }
      }
    }

    pixelsLists.push(pixels)
  }

  const regions: Region[] = pixelsLists.map((pixels, id) => ({
    id,
    colorIdx: labels[pixels[0]] as number,
    area: pixels.length,
    pixels,
    bbox: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    neighbors: neighborSets[id],
  }))
  recomputeBboxes(regions, regionIds, width, height)

  return { regionIds, regions }
}

function addAdjacency(neighborSets: Set<number>[], a: number, b: number): void {
  if (a === b) return
  neighborSets[a].add(b)
  neighborSets[b].add(a)
}

function recomputeBboxes(
  regions: Region[],
  regionIds: Uint32Array,
  width: number,
  height: number,
): void {
  for (const r of regions) {
    r.bbox = { minX: width, minY: height, maxX: -1, maxY: -1 }
  }
  for (let p = 0; p < regionIds.length; p++) {
    const r = regions[regionIds[p]]
    const x = p % width
    const y = (p - x) / width
    if (x < r.bbox.minX) r.bbox.minX = x
    if (x > r.bbox.maxX) r.bbox.maxX = x
    if (y < r.bbox.minY) r.bbox.minY = y
    if (y > r.bbox.maxY) r.bbox.maxY = y
  }
}

/** Merge every region smaller than minAreaPixels into its nearest neighbor
 * until none remain (isolated small regions are kept). Two merging regimes:
 *  - contrast-aware pass: contrast small regions (ΔE00 ≥ threshold with every
 *    neighbor) are KEPT — details like lips/lace survive;
 *  - everything else merges into the ΔE00-nearest alive neighbor.
 * Only area/neighbor bookkeeping happens here; pixels are rebuilt once. */
export function mergeSmallRegions(
  seg: SegmentResult,
  palette: PaletteEntry[],
  minAreaPixels: number,
  width: number,
  height: number,
): void {
  if (minAreaPixels <= 0) return
  const { regions } = seg
  const alive = regions.map(() => true)
  /** absorbedInto[a] = the region that finally absorbed a's pixels. */
  const absorbedInto = new Int32Array(regions.length).fill(-1)

  const smallQueue: number[] = []
  for (const r of regions) {
    if (r.area < minAreaPixels) smallQueue.push(r.id)
  }

  const labOf: Lab[] = regions.map((r) => palette[r.colorIdx].lab)
  const dE00 = (a: number, b: number): number => labDistance2000(labOf[a], labOf[b])

  let qi = 0
  while (qi < smallQueue.length) {
    const smallId = smallQueue[qi++]
    if (!alive[smallId]) continue
    const small = regions[smallId]
    if (small.area >= minAreaPixels) continue
    if (small.neighbors.size === 0) continue // isolated: keep as-is

    // Contrast guard: a small region that stands out against EVERY alive
    // neighbor is a detail, not noise — keep it.
    let maxNeighborD = -1
    for (const nbId of small.neighbors) {
      if (!alive[nbId]) continue
      const d = dE00(smallId, nbId)
      if (d > maxNeighborD) maxNeighborD = d
    }
    if (maxNeighborD < 0) continue // no alive neighbors: keep
    if (maxNeighborD >= MERGE_CONTRAST_THRESHOLD) continue // contrast detail: keep

    // Nearest alive neighbor by ΔE00 (perceptual) among the low-contrast
    // candidates — the merge target must itself be a low-contrast neighbor.
    let bestId = -1
    let bestD = Infinity
    for (const nbId of small.neighbors) {
      if (!alive[nbId]) continue
      const d = dE00(smallId, nbId)
      if (d < bestD) {
        bestD = d
        bestId = nbId
      }
    }
    if (bestId < 0) continue

    // Absorb: rewire neighbor sets and add areas. No pixel arrays touched.
    const into = regions[bestId]
    for (const nbId of small.neighbors) {
      if (nbId === bestId) continue
      regions[nbId].neighbors.delete(smallId)
      regions[nbId].neighbors.add(bestId)
      into.neighbors.add(nbId)
    }
    into.neighbors.delete(smallId)
    into.area += small.area
    // Track the absorption chain so compaction can route the small region's
    // pixels (and any pixels of regions absorbed into it earlier) to `into`.
    absorbedInto[smallId] = bestId

    alive[smallId] = false
    small.area = 0
    small.neighbors.clear()

    // Absorption can drag the target below minArea; re-evaluate it, but it
    // re-enters the merge only if it is still low-contrast vs its neighbors.
    if (into.area < minAreaPixels) smallQueue.push(bestId)
  }

  compactAndRebuild(seg, alive, absorbedInto, width, height)
}

/** Compact region ids (no gaps), rebuild pixel lists and bboxes in one pass,
 * and remap neighbor sets to the new ids. Pixels of absorbed regions are
 * routed to their final absorber via the absorption chain. */
function compactAndRebuild(
  seg: SegmentResult,
  alive: boolean[],
  absorbedInto: Int32Array,
  width: number,
  height: number,
): void {
  void height
  const remap = new Int32Array(seg.regions.length).fill(-1)
  const kept: Region[] = []
  for (let i = 0; i < seg.regions.length; i++) {
    if (!alive[i]) continue
    remap[i] = kept.length
    kept.push(seg.regions[i])
  }

  // Resolve each dead region's final absorber once (chains are short: each
  // hop moves to an alive-or-later-absorbed region, but we guard with a walk).
  const finalTarget = new Int32Array(seg.regions.length)
  for (let i = 0; i < seg.regions.length; i++) {
    let t = i
    while (!alive[t] && absorbedInto[t] >= 0) t = absorbedInto[t]
    finalTarget[i] = alive[t] ? t : -1
  }

  const buckets: number[][] = kept.map(() => [])
  const bboxes = kept.map(() => ({ minX: width, minY: Infinity, maxX: -1, maxY: -1 }))
  const { regionIds } = seg
  for (let p = 0; p < regionIds.length; p++) {
    const origId = regionIds[p]
    const target = alive[origId] ? origId : finalTarget[origId]
    const id = target >= 0 ? remap[target] : -1
    if (id < 0) {
      // Unreachable for well-formed input (every pixel belongs to a region
      // that stayed alive or was absorbed); guard against corrupt maps.
      regionIds[p] = 0
      buckets[0].push(p)
      continue
    }
    regionIds[p] = id
    buckets[id].push(p)
    const x = p % width
    const y = (p - x) / width
    const b = bboxes[id]
    if (x < b.minX) b.minX = x
    if (x > b.maxX) b.maxX = x
    if (y < b.minY) b.minY = y
    if (y > b.maxY) b.maxY = y
  }

  seg.regions = kept.map((r, i) => {
    const neighbors = new Set<number>()
    for (const nb of r.neighbors) {
      const mapped = remap[nb]
      if (mapped >= 0 && mapped !== i) neighbors.add(mapped)
    }
    r.id = i
    r.pixels = buckets[i]
    r.area = buckets[i].length
    r.bbox = bboxes[i]
    r.neighbors = neighbors
    return r
  })
}
