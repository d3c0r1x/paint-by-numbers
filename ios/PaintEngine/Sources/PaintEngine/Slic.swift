/// SLIC superpixels (Achanta et al., 2012) — port of src/engine/slic.ts.
/// Compactness m ≈ 10 in Lab space. Units are superpixels, not pixels:
/// regionizing superpixels instead of pixels removes per-pixel noise.
/// Deterministic: fixed seed for center init, deterministic search order.

public struct SlicOptions {
    /// Target superpixel count.
    public var numSuperpixels: Int
    /// Compactness (default 10). Higher = more regular shapes.
    public var compactness: Int
    /// Iterations of the assignment/update loop (default 10).
    public var iterations: Int

    public init(numSuperpixels: Int, compactness: Int = 10, iterations: Int = 10) {
        self.numSuperpixels = numSuperpixels
        self.compactness = compactness
        self.iterations = iterations
    }
}

public struct SlicResult {
    /// Superpixel id per pixel.
    public var ids: [Int32]
    /// Mean Lab color per superpixel (flat [L,a,b] triples).
    public var means: [Double]
    /// Pixel count per superpixel.
    public var sizes: [Int32]
    public var count: Int
}

/// Run SLIC on a Lab buffer (flat [L,a,b] triples per pixel).
public func slic(lab: [Double], w: Int, h: Int, opts: SlicOptions) -> SlicResult {
    let n = w * h
    let K = max(1, min(opts.numSuperpixels, n))
    let m = Double(opts.compactness)
    let iters = opts.iterations
    let S = (Double(n) / Double(K)).squareRoot() // sampling interval

    var ids = [Int32](repeating: -1, count: n)
    var distBuf = [Double](repeating: .infinity, count: n)

    // Initialize centers on a grid with a small 3x3 neighborhood gradient pull
    // (avoid placing centers on noisy edges: pick lowest-gradient neighbor).
    var centers: [Double] = [] // [L, a, b, x, y] * K
    centers.reserveCapacity(K * 5)
    let gridCols = max(1, Int((Double(w) / S).rounded()))
    let gridRows = max(1, Int((Double(h) / S).rounded()))
    var grad = [Double](repeating: 0, count: n)
    if w > 2 && h > 2 {
        for y in 1..<(h - 1) {
            for x in 1..<(w - 1) {
                let p = y * w + x
                let l1 = lab[(p - 1) * 3]
                let l2 = lab[(p + 1) * 3]
                let l3 = lab[(p - w) * 3]
                let l4 = lab[(p + w) * 3]
                grad[p] = (l2 - l1) * (l2 - l1) + (l4 - l3) * (l4 - l3)
            }
        }
    }
    for gy in 0..<gridRows {
        for gx in 0..<gridCols {
            var cx = min(w - 1, Int(((Double(gx) + 0.5) * (Double(w) / Double(gridCols)))).rounded())
            var cy = min(h - 1, Int(((Double(gy) + 0.5) * (Double(h) / Double(gridRows)))).rounded())
            // Move to the lowest-gradient pixel in a 3x3 window.
            var bestG = Double.infinity
            for dy in -1...1 {
                for dx in -1...1 {
                    let nx = min(w - 1, max(0, cx + dx))
                    let ny = min(h - 1, max(0, cy + dy))
                    let g = grad[ny * w + nx]
                    if g < bestG {
                        bestG = g
                        cx = nx
                        cy = ny
                    }
                }
            }
            let p = cy * w + cx
            centers.append(contentsOf: [lab[p * 3], lab[p * 3 + 1], lab[p * 3 + 2], Double(cx), Double(cy)])
        }
    }
    let kc = centers.count / 5

    var sums = [Double](repeating: 0, count: kc * 5) // L,a,b,x,y sums
    var counts = [Int32](repeating: 0, count: kc)

    let m2 = m * m
    let maxL = 100.0 * 100.0 // L² normalization scale (Lab L ∈ [0..100])
    for _ in 0..<iters {
        for i in 0..<sums.count { sums[i] = 0 }
        for c in 0..<kc { counts[c] = 0 }
        for i in 0..<distBuf.count { distBuf[i] = .infinity }

        for c in 0..<kc {
            let cL = centers[c * 5]
            let cA = centers[c * 5 + 1]
            let cB = centers[c * 5 + 2]
            let cX = centers[c * 5 + 3]
            let cY = centers[c * 5 + 4]

            let x0 = max(0, Int(cX - S).rounded(.down))
            let x1 = min(w - 1, Int((cX + S).rounded(.up)))
            let y0 = max(0, Int(cY - S).rounded(.down))
            let y1 = min(h - 1, Int((cY + S).rounded(.up)))

            for y in y0...y1 {
                let row = y * w
                for x in x0...x1 {
                    let p = row + x
                    let o = p * 3
                    let dl = lab[o] - cL
                    let da = lab[o + 1] - cA
                    let db = lab[o + 2] - cB
                    let dx = Double(x) - cX
                    let dy = Double(y) - cY
                    let d = (dl * dl + da * da + db * db) + (m2 / maxL) * (dx * dx + dy * dy)
                    if d < distBuf[p] {
                        distBuf[p] = d
                        ids[p] = Int32(c)
                    }
                }
            }
        }

        // Update centers.
        var maxMove = 0.0
        for c in 0..<kc {
            let o5 = c * 5
            if counts[c] > 0 {
                let cnt = Double(counts[c])
                let nL = sums[o5] / cnt
                let nA = sums[o5 + 1] / cnt
                let nB = sums[o5 + 2] / cnt
                let nX = sums[o5 + 3] / cnt
                let nY = sums[o5 + 4] / cnt
                maxMove = max(maxMove, abs(nL - centers[o5]), abs(nA - centers[o5 + 1]), abs(nB - centers[o5 + 2]))
                centers[o5] = nL
                centers[o5 + 1] = nA
                centers[o5 + 2] = nB
                centers[o5 + 3] = nX
                centers[o5 + 4] = nY
            }
        }
        if maxMove < 1 { break }
    }

    // Stragglers (pixels with no center nearby ever claimed them): assign to
    // nearest already-assigned neighbor via one forward/backward sweep.
    for p in 0..<n {
        if ids[p] >= 0 { continue }
        let x = p % w
        let left = x > 0 ? ids[p - 1] : -1
        let up = p >= w ? ids[p - w] : -1
        ids[p] = left >= 0 ? left : max(0, up)
    }
    for p in stride(from: n - 1, through: 0, by: -1) {
        if ids[p] >= 0 { continue }
        let x = p % w
        let right = x + 1 < w ? ids[p + 1] : -1
        let down = p + w < n ? ids[p + w] : -1
        ids[p] = right >= 0 ? right : max(0, down)
    }

    // Mean Lab per superpixel.
    var sums2 = [Double](repeating: 0, count: kc * 3)
    var sizes = [Int32](repeating: 0, count: kc)
    for p in 0..<n {
        let c = Int(ids[p])
        sizes[c] += 1
        sums2[c * 3] += lab[p * 3]
        sums2[c * 3 + 1] += lab[p * 3 + 1]
        sums2[c * 3 + 2] += lab[p * 3 + 2]
    }
    var means = [Double](repeating: 0, count: kc * 3)
    for c in 0..<kc {
        if sizes[c] > 0 {
            let sz = Double(sizes[c])
            means[c * 3] = sums2[c * 3] / sz
            means[c * 3 + 1] = sums2[c * 3 + 1] / sz
            means[c * 3 + 2] = sums2[c * 3 + 2] / sz
        }
    }

    return SlicResult(ids: ids, means: means, sizes: sizes, count: kc)
}
