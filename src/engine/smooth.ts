/** Guided filter (He et al., 2010) over Lab planes — SPEC v3 Task 5.5.
 * Edge-preserving smoothing: kills photo grain/texture WITHOUT blurring
 * region boundaries. Implemented with O(N) box filters (moving sums),
 * no integral-image allocations beyond a couple of Float64 planes.
 *
 * Self-guided variant: the image guides itself per channel, which is the
 * standard fast approximation for denoising and is plenty for regionizing.
 */

/** Box (moving-average) filter of a single-channel plane, radius r, O(N). */
function boxFilter(src: Float64Array, w: number, h: number, r: number): Float64Array {
  const tmp = new Float64Array(src.length)
  const out = new Float64Array(src.length)

  // Horizontal pass: sliding window sum.
  for (let y = 0; y < h; y++) {
    const row = y * w
    let acc = 0
    for (let x = -r; x <= r; x++) acc += src[row + Math.min(w - 1, Math.max(0, x))]
    const denom = 2 * r + 1
    for (let x = 0; x < w; x++) {
      tmp[row + x] = acc / denom
      const add = src[row + Math.min(w - 1, x + r + 1)]
      const sub = src[row + Math.max(0, x - r)]
      acc += add - sub
    }
  }

  // Vertical pass: sliding window sum over the horizontal result.
  const denom = 2 * r + 1
  for (let x = 0; x < w; x++) {
    let acc = 0
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc / denom
      const add = tmp[Math.min(h - 1, y + r + 1) * w + x]
      const sub = tmp[Math.max(0, y - r) * w + x]
      acc += add - sub
    }
  }
  return out
}

function mul(a: Float64Array, b: Float64Array): Float64Array {
  const out = new Float64Array(a.length)
  for (let i = 0; i < a.length; i++) out[i] = a[i] * b[i]
  return out
}

function addScaled(a: Float64Array, b: Float64Array, s: Float64Array): Float64Array {
  // Guided-filter output: q = ā·I + b̄
  const out = new Float64Array(a.length)
  for (let i = 0; i < a.length; i++) out[i] = a[i] * b[i] + s[i]
  return out
}

/** Self-guided filter of one plane. eps controls edge preservation:
 * small eps → sharper edges preserved, more texture kept; larger → smoother. */
function guidedPlane(p: Float64Array, w: number, h: number, r: number, eps: number): Float64Array {
  const meanI = boxFilter(p, w, h, r)
  const meanII = boxFilter(mul(p, p), w, h, r)
  // var = E[I²] − E[I]² ; a = var/(var+eps), b = mean − a·mean
  const varI = new Float64Array(p.length)
  const a = new Float64Array(p.length)
  const b = new Float64Array(p.length)
  for (let i = 0; i < p.length; i++) {
    varI[i] = Math.max(0, meanII[i] - meanI[i] * meanI[i])
    a[i] = varI[i] / (varI[i] + eps)
    b[i] = meanI[i] * (1 - a[i])
  }
  const meanA = boxFilter(a, w, h, r)
  const meanB = boxFilter(b, w, h, r)
  return addScaled(meanA, p, meanB)
}

export interface SmoothOptions {
  /** Box radius in pixels (default 4 — ≈ texture scale at working res). */
  radius?: number
  /** Regularization (default 300 in Lab units² — strong edge preservation). */
  eps?: number
}

/** Smooth all three Lab planes with a guided filter. Returns a new buffer. */
export function guidedSmoothLab(
  lab: Float64Array,
  w: number,
  h: number,
  opts: SmoothOptions = {},
): Float64Array {
  const r = opts.radius ?? 4
  const eps = opts.eps ?? 300
  const n = w * h
  const out = new Float64Array(n * 3)
  for (let c = 0; c < 3; c++) {
    const plane = new Float64Array(n)
    for (let i = 0; i < n; i++) plane[i] = lab[i * 3 + c]
    const smooth = guidedPlane(plane, w, h, r, eps)
    for (let i = 0; i < n; i++) out[i * 3 + c] = smooth[i]
  }
  return out
}
