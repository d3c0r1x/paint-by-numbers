import { describe, expect, it } from 'vitest'
import { guidedSmoothLab } from '../src/engine/smooth'
import { slic } from '../src/engine/slic'
import { simplifyPoly, chaikinSmooth } from '../src/engine/vectorize'

describe('guidedSmoothLab', () => {
  it('flattens noise but keeps a sharp step edge', () => {
    const w = 32
    const h = 8
    const lab = new Float64Array(w * h * 3)
    // Left half L≈50, right half L≈70, plus high-frequency noise.
    let seed = 42
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff - 0.5
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x
        lab[p * 3] = (x < w / 2 ? 50 : 70) + rand() * 12
        lab[p * 3 + 1] = 0
        lab[p * 3 + 2] = 0
      }
    }
    const out = guidedSmoothLab(lab, w, h, { radius: 3, eps: 300 })
    // Interior noise variance should drop dramatically.
    let inVar = 0
    let outVar = 0
    for (let x = 2; x < w / 2 - 2; x++) {
      const p = (4 * w + x) * 3
      inVar += (lab[p] - 50) ** 2
      outVar += (out[p] - 50) ** 2
    }
    expect(outVar).toBeLessThan(inVar / 4)
    // Edge contrast must survive: center-left vs center-right differ ≈ 20.
    const left = out[(4 * w + Math.floor(w / 2) - 3) * 3]
    const right = out[(4 * w + Math.floor(w / 2) + 3) * 3]
    expect(Math.abs(right - left)).toBeGreaterThan(12)
  })
})

describe('slic', () => {
  it('produces ~K superpixels covering every pixel', () => {
    const w = 120
    const h = 90
    const lab = new Float64Array(w * h * 3)
    for (let p = 0; p < w * h; p++) {
      const x = p % w
      const y = (p - x) / w
      // Two color blobs + gradient.
      lab[p * 3] = x < w / 2 ? 40 + y / 10 : 65
      lab[p * 3 + 1] = x < w / 2 ? -10 : 15
      lab[p * 3 + 2] = 5
    }
    const K = 200
    const res = slic(lab, w, h, { numSuperpixels: K, compactness: 10, iterations: 8 })
    expect(res.count).toBeGreaterThan(K * 0.4)
    expect(res.count).toBeLessThan(K * 2.5)
    let unassigned = 0
    for (let p = 0; p < w * h; p++) if (res.ids[p] < 0 || res.ids[p] >= res.count) unassigned++
    expect(unassigned).toBe(0)
    // Mean colors must be finite.
    for (let c = 0; c < res.count; c++) {
      if (res.sizes[c] === 0) continue
      expect(Number.isFinite(res.means[c * 3])).toBe(true)
    }
  })
})

describe('vectorize', () => {
  it('simplifies a pixel staircase to within 1 px of the true diagonal', () => {
    // Staircase along the diagonal y = x on a 40×40 grid.
    const pts: number[] = []
    for (let i = 0; i <= 40; i++) pts.push(i, i)
    const simplified = simplifyPoly(pts, 1.2)
    // After DP the line should collapse to just its endpoints.
    expect(simplified.length / 2).toBeLessThanOrEqual(3)
    // Every kept vertex must lie on the diagonal (distance ≤ 1).
    for (let i = 0; i < simplified.length; i += 2) {
      expect(Math.abs(simplified[i] - simplified[i + 1])).toBeLessThanOrEqual(1)
    }
  })

  it('chaikin keeps the polygon closed and roughly in place', () => {
    const square = [0, 0, 10, 0, 10, 10, 0, 10]
    const smoothed = chaikinSmooth(square, 2)
    expect(smoothed.length).toBe(square.length * 4)
    let minX = Infinity
    let maxX = -Infinity
    for (let i = 0; i < smoothed.length; i += 2) {
      minX = Math.min(minX, smoothed[i])
      maxX = Math.max(maxX, smoothed[i])
    }
    expect(minX).toBeGreaterThanOrEqual(-0.01)
    expect(maxX).toBeLessThanOrEqual(10.01)
  })
})
