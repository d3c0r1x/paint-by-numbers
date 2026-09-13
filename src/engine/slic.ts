/** SLIC superpixels (Achanta et al., 2012) — SPEC v3 Task 5.7.
 * Compactness m ≈ 10 in Lab space, K targets 2000–5000 superpixels.
 * Units are superpixels, not pixels: regionizing superpixels instead of
 * pixels removes per-pixel noise — this is the main cure for ragged edges.
 * Deterministic: fixed seed for center init, deterministic search order.
 */
export interface SlicOptions {
  /** Target superpixel count (clamped to 2000..5000 by caller typically). */
  numSuperpixels: number
  /** Compactness (default 10). Higher = more regular shapes. */
  compactness?: number
  /** Iterations of the assignment/update loop (default 10). */
  iterations?: number
}

export interface SlicResult {
  /** Superpixel id per pixel. */
  ids: Int32Array
  /** Mean Lab color per superpixel (weighted by area). */
  means: Float64Array
  /** Pixel count per superpixel. */
  sizes: Int32Array
  count: number
}

/** Run SLIC on a Lab buffer (3 triples per pixel). */
export function slic(lab: Float64Array, w: number, h: number, opts: SlicOptions): SlicResult {
  const n = w * h
  const K = Math.max(1, Math.min(opts.numSuperpixels, n))
  const m = opts.compactness ?? 10
  const iters = opts.iterations ?? 10
  const S = Math.sqrt(n / K) // sampling interval

  const ids = new Int32Array(n).fill(-1)
  const distBuf = new Float64Array(n).fill(Infinity)

  // Initialize centers on a grid with a small 3x3 neighborhood gradient pull
  // (avoid placing centers on noisy edges: pick lowest-gradient neighbor).
  const centers: number[] = [] // [L, a, b, x, y] * K
  const gridCols = Math.max(1, Math.round(w / S))
  const gridRows = Math.max(1, Math.round(h / S))
  const actualK = gridCols * gridRows
  const grad = new Float64Array(n)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x
      const l1 = lab[(p - 1) * 3]
      const l2 = lab[(p + 1) * 3]
      const l3 = lab[(p - w) * 3]
      const l4 = lab[(p + w) * 3]
      grad[p] = (l2 - l1) ** 2 + (l4 - l3) ** 2
    }
  }
  for (let gy = 0; gy < gridRows; gy++) {
    for (let gx = 0; gx < gridCols; gx++) {
      let cx = Math.min(w - 1, Math.round((gx + 0.5) * (w / gridCols)))
      let cy = Math.min(h - 1, Math.round((gy + 0.5) * (h / gridRows)))
      // Move to the lowest-gradient pixel in a 3x3 window.
      let bestG = Infinity
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = Math.min(w - 1, Math.max(0, cx + dx))
          const ny = Math.min(h - 1, Math.max(0, cy + dy))
          const g = grad[ny * w + nx]
          if (g < bestG) {
            bestG = g
            cx = nx
            cy = ny
          }
        }
      }
      const p = cy * w + cx
      centers.push(lab[p * 3], lab[p * 3 + 1], lab[p * 3 + 2], cx, cy)
      void actualK
    }
  }
  const kc = centers.length / 5

  const sums = new Float64Array(kc * 5) // L,a,b,x,y sums
  const counts = new Int32Array(kc)

  const m2 = m * m
  const maxL = 100 * 100 // L² normalization scale (Lab L ∈ [0..100])
  for (let iter = 0; iter < iters; iter++) {
    sums.fill(0)
    counts.fill(0)
    distBuf.fill(Infinity)

    for (let c = 0; c < kc; c++) {
      const cL = centers[c * 5]
      const cA = centers[c * 5 + 1]
      const cB = centers[c * 5 + 2]
      const cX = centers[c * 5 + 3]
      const cY = centers[c * 5 + 4]

      const x0 = Math.max(0, Math.floor(cX - S))
      const x1 = Math.min(w - 1, Math.ceil(cX + S))
      const y0 = Math.max(0, Math.floor(cY - S))
      const y1 = Math.min(h - 1, Math.ceil(cY + S))

      for (let y = y0; y <= y1; y++) {
        const row = y * w
        for (let x = x0; x <= x1; x++) {
          const p = row + x
          const o = p * 3
          const dl = lab[o] - cL
          const da = lab[o + 1] - cA
          const db = lab[o + 2] - cB
          const dx = x - cX
          const dy = y - cY
          const d = (dl * dl + da * da + db * db) + (m2 / maxL) * (dx * dx + dy * dy)
          if (d < distBuf[p]) {
            distBuf[p] = d
            ids[p] = c
          }
        }
      }
    }

    // Update centers.
    let maxMove = 0
    for (let c = 0; c < kc; c++) {
      const o5 = c * 5
      if (counts[c] > 0) {
        const nL = sums[o5] / counts[c]
        const nA = sums[o5 + 1] / counts[c]
        const nB = sums[o5 + 2] / counts[c]
        const nX = sums[o5 + 3] / counts[c]
        const nY = sums[o5 + 4] / counts[c]
        maxMove = Math.max(
          maxMove,
          Math.abs(nL - centers[o5]),
          Math.abs(nA - centers[o5 + 1]),
          Math.abs(nB - centers[o5 + 2]),
        )
        centers[o5] = nL
        centers[o5 + 1] = nA
        centers[o5 + 2] = nB
        centers[o5 + 3] = nX
        centers[o5 + 4] = nY
      }
    }
    if (maxMove < 1) break
  }

  // Stragglers (pixels with no center nearby ever claimed them): assign to
  // nearest already-assigned neighbor via one forward/backward sweep.
  for (let p = 0; p < n; p++) {
    if (ids[p] >= 0) continue
    const x = p % w
    const left = x > 0 ? ids[p - 1] : -1
    const up = p >= w ? ids[p - w] : -1
    ids[p] = left >= 0 ? left : Math.max(0, up)
  }
  for (let p = n - 1; p >= 0; p--) {
    if (ids[p] >= 0) continue
    const x = p % w
    const right = x + 1 < w ? ids[p + 1] : -1
    const down = p + w < n ? ids[p + w] : -1
    ids[p] = right >= 0 ? right : Math.max(0, down)
  }

  // Mean Lab per superpixel.
  const sums2 = new Float64Array(kc * 3)
  const sizes = new Int32Array(kc)
  for (let p = 0; p < n; p++) {
    const c = ids[p]
    sizes[c]++
    sums2[c * 3] += lab[p * 3]
    sums2[c * 3 + 1] += lab[p * 3 + 1]
    sums2[c * 3 + 2] += lab[p * 3 + 2]
  }
  const means = new Float64Array(kc * 3)
  for (let c = 0; c < kc; c++) {
    if (sizes[c] > 0) {
      means[c * 3] = sums2[c * 3] / sizes[c]
      means[c * 3 + 1] = sums2[c * 3 + 1] / sizes[c]
      means[c * 3 + 2] = sums2[c * 3 + 2] / sizes[c]
    }
  }

  return { ids, means, sizes, count: kc }
}
