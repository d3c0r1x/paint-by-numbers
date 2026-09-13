/** Reference-fill helpers: the "fully colored" picture where every pixel gets
 * its region's palette color. Pure data functions — unit-tested without DOM.
 * Used by the dev preview overlay and the "finish for me" history action. */
import type { PaletteEntry, RegionInfo } from './types'

const WHITE: [number, number, number] = [255, 255, 255]

/** Parse '#rrggbb' into [r, g, b]; white on malformed input. */
export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return WHITE
  const v = parseInt(m[1], 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

/** Fully-colored RGBA pixels (width×height×4): each pixel gets its region's
 * palette color, unknown regions fall back to white. Per-pixel mapping avoids
 * the antialiasing seams that Path2D region fills would leave between
 * adjacent regions. */
export function buildFillPixels(
  labels: Uint32Array,
  regions: RegionInfo[],
  palette: PaletteEntry[],
  width: number,
  height: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height * 4)
  // Region id → rgb resolved up front to keep the hot loop allocation-free.
  const rgbs: Array<[number, number, number]> = regions.map((r) => {
    const p = palette[r.colorIdx]
    return p ? hexToRgb(p.hex) : WHITE
  })
  const n = width * height
  for (let i = 0; i < n; i++) {
    const rgb = rgbs[labels[i]] ?? WHITE
    const o = i * 4
    out[o] = rgb[0]
    out[o + 1] = rgb[1]
    out[o + 2] = rgb[2]
    out[o + 3] = 255
  }
  return out
}

/** Group region ids by palette index — geometry source for highlighting all
 * regions of the active color. */
export function regionIdsByColorIndex(regions: RegionInfo[]): Map<number, number[]> {
  const map = new Map<number, number[]>()
  regions.forEach((r, id) => {
    const list = map.get(r.colorIdx)
    if (list) list.push(id)
    else map.set(r.colorIdx, [id])
  })
  return map
}
