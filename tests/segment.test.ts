import { describe, it, expect } from 'vitest'
import { buildRegions, mergeSmallRegions } from '../src/engine/segment'
import type { PaletteEntry } from '../src/engine/types'

/** Build a uniform-palette label map with a 2×2 foreign square at (4..5, 4..5). */
function labelMap10x10(withSquare: boolean): { labels: Uint16Array; palette: PaletteEntry[] } {
  const labels = new Uint16Array(100) // all background = color 0
  if (withSquare) {
    for (let y = 4; y <= 5; y++) {
      for (let x = 4; x <= 5; x++) labels[y * 10 + x] = 1
    }
  }
  const palette: PaletteEntry[] = [
    { index: 0, lab: [70, 5, 5], hex: '#b0b0b0', pixelCount: withSquare ? 96 : 100 },
    { index: 1, lab: [30, 40, 50], hex: '#303060', pixelCount: withSquare ? 4 : 0 },
  ]
  return { labels, palette }
}

describe('buildRegions', () => {
  it('finds background + 2×2 square as separate regions and records adjacency', () => {
    const { labels } = labelMap10x10(true)
    const seg = buildRegions(labels, 10, 10)

    expect(seg.regions).toHaveLength(2)
    const bg = seg.regions[0]
    const sq = seg.regions[1]
    expect(bg.area).toBe(96)
    expect(sq.area).toBe(4)
    expect(sq.colorIdx).toBe(1)
    expect(sq.bbox).toEqual({ minX: 4, minY: 4, maxX: 5, maxY: 5 })
    expect(sq.neighbors.has(0)).toBe(true)
    expect(bg.neighbors.has(1)).toBe(true)
    // regionIds consistent
    expect(seg.regionIds[4 * 10 + 4]).toBe(1)
    expect(seg.regionIds[0]).toBe(0)
  })

  it('yields a single region without the square', () => {
    const { labels } = labelMap10x10(false)
    const seg = buildRegions(labels, 10, 10)
    expect(seg.regions).toHaveLength(1)
    expect(seg.regions[0].area).toBe(100)
  })

  it('keeps diagonals unconnected (4-connectivity)', () => {
    const labels = new Uint16Array(100)
    labels[0] = 1
    labels[1 * 10 + 1] = 1 // diagonal neighbor only
    const seg = buildRegions(labels, 10, 10)
    const ones = seg.regions.filter((r) => r.colorIdx === 1)
    expect(ones).toHaveLength(2)
    expect(ones.every((r) => r.area === 1)).toBe(true)
  })
})

describe('mergeSmallRegions', () => {
  it('merges the low-contrast 2×2 square into background at large minArea', () => {
    const { labels, palette } = labelMap10x10(true)
    const seg = buildRegions(labels, 10, 10)
    // Palette delta here is small (ΔE00 < 12): a low-contrast island merges.
    palette[1].lab = [71, 5, 5]
    mergeSmallRegions(seg, palette, 10, 10, 10) // minArea 10 px > 4 px square

    expect(seg.regions).toHaveLength(1)
    expect(seg.regions[0].area).toBe(100)
    expect(seg.regionIds.every((id) => id === 0)).toBe(true)
  })

  it('keeps the CONTRAST square even at large minArea (detail survives)', () => {
    const { labels, palette } = labelMap10x10(true)
    const seg = buildRegions(labels, 10, 10)
    // Default palette is strongly contrasted: ΔE00 far above threshold.
    mergeSmallRegions(seg, palette, 10, 10, 10)

    const sq = seg.regions.find((r) => r.colorIdx === 1)
    expect(sq).toBeDefined()
    expect(sq?.area).toBe(4)
  })

  it('keeps the square separate at minArea=0', () => {
    const { labels, palette } = labelMap10x10(true)
    const seg = buildRegions(labels, 10, 10)
    mergeSmallRegions(seg, palette, 0, 10, 10)

    expect(seg.regions).toHaveLength(2)
    const sq = seg.regions.find((r) => r.colorIdx === 1)
    expect(sq?.area).toBe(4)
  })

  it('merges low-contrast small regions into the ΔE00-nearest neighbor', () => {
    // One row of 1-px columns, all within ΔE00 < 12 of each other.
    const labels = Uint16Array.from([0, 1, 2, 0])
    const palette: PaletteEntry[] = [
      { index: 0, lab: [50, -4, -6], hex: '#787884', pixelCount: 2 },
      { index: 1, lab: [52, -2, -4], hex: '#808088', pixelCount: 1 },
      { index: 2, lab: [51, -3, -8], hex: '#7c8080', pixelCount: 1 },
    ]
    const seg = buildRegions(labels, 4, 1)
    expect(seg.regions).toHaveLength(4)
    // minArea 3 keeps the chain going: each absorption re-queues the target
    // while it is still below the threshold, so the row converges into one.
    mergeSmallRegions(seg, palette, 3, 4, 1)
    expect(seg.regions).toHaveLength(1)
    expect(seg.regions[0].area).toBe(4)
  })
})
