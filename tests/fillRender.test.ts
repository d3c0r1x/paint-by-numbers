import { describe, it, expect } from 'vitest'
import { hexToRgb, buildFillPixels, regionIdsByColorIndex } from '../src/engine/fillRender'
import type { PaletteEntry, RegionInfo } from '../src/engine/types'

function region(colorIdx: number): RegionInfo {
  return { colorIdx, area: 1, labelX: 0, labelY: 0, fontSize: 10 }
}

function paletteEntry(index: number, hex: string): PaletteEntry {
  return { index, lab: [0, 0, 0], hex, pixelCount: 1 }
}

describe('hexToRgb', () => {
  it('parses #rrggbb', () => {
    expect(hexToRgb('#ff0000')).toEqual([255, 0, 0])
    expect(hexToRgb('#00ff7f')).toEqual([0, 255, 127])
    expect(hexToRgb('#010203')).toEqual([1, 2, 3])
  })

  it('accepts a form without # and mixed case', () => {
    expect(hexToRgb('AbCdEf')).toEqual([171, 205, 239])
  })

  it('falls back to white on malformed input', () => {
    expect(hexToRgb('nope')).toEqual([255, 255, 255])
    expect(hexToRgb('#12345')).toEqual([255, 255, 255])
    expect(hexToRgb('#1234567')).toEqual([255, 255, 255])
  })
})

describe('buildFillPixels', () => {
  it('colors every pixel with its region palette color', () => {
    // 2×2 image: two regions — left column red, right column blue.
    const labels = new Uint32Array([0, 1, 0, 1])
    const regions = [region(0), region(1)]
    const palette = [paletteEntry(0, '#ff0000'), paletteEntry(1, '#0000ff')]
    const px = buildFillPixels(labels, regions, palette, 2, 2)

    expect(px.length).toBe(16)
    expect([...px.slice(0, 4)]).toEqual([255, 0, 0, 255])
    expect([...px.slice(4, 8)]).toEqual([0, 0, 255, 255])
    expect([...px.slice(8, 12)]).toEqual([255, 0, 0, 255])
    expect([...px.slice(12, 16)]).toEqual([0, 0, 255, 255])
  })

  it('several regions may share one palette color', () => {
    const labels = new Uint32Array([0, 1])
    const regions = [region(2), region(2)]
    const palette = [paletteEntry(0, '#111111'), paletteEntry(1, '#222222'), paletteEntry(2, '#334455')]
    const px = buildFillPixels(labels, regions, palette, 2, 1)
    expect([...px.slice(0, 3)]).toEqual([0x33, 0x44, 0x55])
    expect([...px.slice(4, 7)]).toEqual([0x33, 0x44, 0x55])
  })

  it('falls back to white for unknown region ids and palette gaps', () => {
    const labels = new Uint32Array([7, 0])
    const regions = [region(9)] // colorIdx 9 has no palette entry
    const palette = [paletteEntry(0, '#ff0000')]
    const px = buildFillPixels(labels, regions, palette, 2, 1)
    expect([...px.slice(0, 4)]).toEqual([255, 255, 255, 255]) // unknown region id
    expect([...px.slice(4, 8)]).toEqual([255, 255, 255, 255]) // missing palette entry
  })

  it('output size matches dimensions', () => {
    const px = buildFillPixels(new Uint32Array(30), [region(0)], [paletteEntry(0, '#000000')], 6, 5)
    expect(px.length).toBe(6 * 5 * 4)
  })
})

describe('regionIdsByColorIndex', () => {
  it('groups region ids by palette index preserving order', () => {
    const regions = [region(2), region(0), region(2), region(1), region(2)]
    const map = regionIdsByColorIndex(regions)
    expect(map.get(0)).toEqual([1])
    expect(map.get(1)).toEqual([3])
    expect(map.get(2)).toEqual([0, 2, 4])
    expect(map.size).toBe(3)
  })

  it('returns an empty map for no regions', () => {
    expect(regionIdsByColorIndex([]).size).toBe(0)
  })
})
