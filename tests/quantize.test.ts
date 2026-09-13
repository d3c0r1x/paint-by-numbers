import { describe, it, expect } from 'vitest'
import { quantize, mulberry32 } from '../src/engine/quantize'
import { rgbToLab, labDistance } from '../src/engine/colorSpace'

function pureImageLabs(colors: Array<[number, number, number]>, repeats: number): Float64Array {
  const lab = new Float64Array(colors.length * repeats * 3)
  let o = 0
  for (let i = 0; i < repeats; i++) {
    for (const [r, g, b] of colors) {
      const [L, A, B] = rgbToLab(r, g, b)
      lab[o++] = L
      lab[o++] = A
      lab[o++] = B
    }
  }
  return lab
}

describe('quantize', () => {
  it('3 pure colors at k=3 → exactly those 3 colors (Lab ≤ 5)', () => {
    const colors: Array<[number, number, number]> = [
      [220, 40, 40],
      [40, 180, 70],
      [50, 80, 220],
    ]
    const lab = pureImageLabs(colors, 500)
    const { palette, labels } = quantize(lab, 3, 42)

    expect(palette).toHaveLength(3)
    for (const [r, g, b] of colors) {
      const target = rgbToLab(r, g, b)
      const nearest = Math.min(...palette.map((p) => labDistance(p.lab, target)))
      expect(nearest).toBeLessThanOrEqual(5)
    }
    // every palette entry is used
    const used = new Set(labels)
    expect(used.size).toBe(3)
  })

  it('is deterministic for the same seed', () => {
    const lab = pureImageLabs(
      [
        [200, 30, 90],
        [30, 200, 150],
        [17, 4, 201],
        [240, 220, 60],
      ],
      300,
    )
    const a = quantize(lab, 4, 123)
    const b = quantize(lab, 4, 123)
    expect(a.palette.map((p) => p.hex)).toEqual(b.palette.map((p) => p.hex))
    expect(Array.from(a.labels)).toEqual(Array.from(b.labels))
  })

  it('orders palette by pixelCount descending', () => {
    // one dominant color + two small ones
    const lab = new Float64Array(900 * 3)
    let o = 0
    for (let i = 0; i < 800; i++) {
      const [L, A, B] = rgbToLab(240, 240, 240)
      lab[o++] = L
      lab[o++] = A
      lab[o++] = B
    }
    for (let i = 0; i < 50; i++) {
      const [L, A, B] = rgbToLab(200, 30, 30)
      lab[o++] = L
      lab[o++] = A
      lab[o++] = B
    }
    for (let i = 0; i < 50; i++) {
      const [L, A, B] = rgbToLab(30, 30, 200)
      lab[o++] = L
      lab[o++] = A
      lab[o++] = B
    }
    const { palette } = quantize(lab, 3, 7)
    expect(palette[0].pixelCount).toBeGreaterThanOrEqual(palette[1].pixelCount)
    expect(palette[1].pixelCount).toBeGreaterThanOrEqual(palette[2].pixelCount)
    expect(palette[0].pixelCount).toBe(800)
  })

  it('mulberry32 is deterministic', () => {
    const a = mulberry32(99)
    const b = mulberry32(99)
    for (let i = 0; i < 10; i++) expect(a()).toBe(b())
  })
})
