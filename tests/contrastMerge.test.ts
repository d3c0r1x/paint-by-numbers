import { describe, it, expect } from 'vitest'
import { buildRegions, mergeSmallRegions, MERGE_CONTRAST_THRESHOLD } from '../src/engine/segment'
import type { PaletteEntry } from '../src/engine/types'

function paletteEntry(index: number, lab: [number, number, number]): PaletteEntry {
  return { index, lab, hex: '#000000', pixelCount: 0 }
}

describe('contrast-aware small-region merging (ΔE00 guard)', () => {
  it('KEEPS a small but high-contrast region (details survive)', () => {
    // 16×16 background (L=70) with a 2×2 dark square (L=25) — ΔE00 far above
    // the threshold, so the square is a detail (eyelet/lip-like), not noise.
    const w = 16
    const h = 16
    const labels = new Uint16Array(w * h) // background color 0
    for (let y = 7; y <= 8; y++) {
      for (let x = 7; x <= 8; x++) labels[y * w + x] = 1
    }
    const palette = [paletteEntry(0, [70, 0, 0]), paletteEntry(1, [25, 0, 0])]
    const seg = buildRegions(labels, w, h)
    expect(seg.regions).toHaveLength(2)

    mergeSmallRegions(seg, palette, 100, w, h) // square (4 px) is «small»

    const square = seg.regions.find((r) => r.colorIdx === 1)
    expect(square).toBeDefined()
    expect(square?.area).toBe(4)
  })

  it('merges a small LOW-contrast region into its neighbor', () => {
    // Background L=70, square L=68 — ΔE00 well below the threshold.
    const w = 16
    const h = 16
    const labels = new Uint16Array(w * h)
    for (let y = 7; y <= 8; y++) {
      for (let x = 7; x <= 8; x++) labels[y * w + x] = 1
    }
    const palette = [paletteEntry(0, [70, 0, 0]), paletteEntry(1, [68, 0, 0])]
    const seg = buildRegions(labels, w, h)
    mergeSmallRegions(seg, palette, 100, w, h)

    expect(seg.regions).toHaveLength(1)
    expect(seg.regions[0].area).toBe(w * h)
  })

  it('counts kept contrast regions (before the fix this is 0)', () => {
    // Three contrast details on three different backgrounds.
    const w = 24
    const h = 24
    const labels = new Uint16Array(w * h)
    // Background split into two halves with different colors.
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) labels[y * w + x] = x < w / 2 ? 0 : 2
    }
    // Dark detail on the left half, bright detail on the right half.
    labels[4 * w + 4] = 1
    labels[4 * w + 5] = 1
    labels[5 * w + 4] = 1
    labels[5 * w + 5] = 1
    labels[14 * w + 18] = 3
    labels[14 * w + 19] = 3
    labels[15 * w + 18] = 3
    labels[15 * w + 19] = 3

    const palette = [
      paletteEntry(0, [75, 0, 0]),
      paletteEntry(1, [20, 0, 0]),
      paletteEntry(2, [45, 30, -20]),
      paletteEntry(3, [95, -5, 10]),
    ]
    const seg = buildRegions(labels, w, h)
    mergeSmallRegions(seg, palette, 100, w, h)

    const kept = seg.regions.filter((r) => r.colorIdx === 1 || r.colorIdx === 3)
    expect(kept).toHaveLength(2)
    expect(kept.reduce((s, r) => s + r.area, 0)).toBe(8)
  })

  it('exposes the threshold at the documented value', () => {
    expect(MERGE_CONTRAST_THRESHOLD).toBe(12)
  })
})
