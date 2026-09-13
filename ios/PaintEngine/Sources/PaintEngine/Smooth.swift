/// Guided filter (He et al., 2010) over Lab planes — port of src/engine/smooth.ts.
/// Edge-preserving smoothing: kills photo grain/texture WITHOUT blurring
/// region boundaries. O(N) box filters (moving sums).
///
/// v3.1 defaults are SOFTENED (r=3, eps=80): the old r=4/eps=300 flattened
/// fine structures (lace, embroidery, blush) before segmentation saw them.

/// Box (moving-average) filter of a single-channel plane, radius r, O(N).
func boxFilter(_ src: [Double], _ w: Int, _ h: Int, _ r: Int) -> [Double] {
    var tmp = [Double](repeating: 0, count: src.count)
    var out = [Double](repeating: 0, count: src.count)
    let denom = Double(2 * r + 1)

    for y in 0..<h {
        let row = y * w
        var acc = 0.0
        for x in -r...r { acc += src[row + min(w - 1, max(0, x))] }
        for x in 0..<w {
            tmp[row + x] = acc / denom
            let add = src[row + min(w - 1, x + r + 1)]
            let sub = src[row + max(0, x - r)]
            acc += add - sub
        }
    }

    for x in 0..<w {
        var acc = 0.0
        for y in -r...r { acc += tmp[min(h - 1, max(0, y)) * w + x] }
        for y in 0..<h {
            out[y * w + x] = acc / denom
            let add = tmp[min(h - 1, y + r + 1) * w + x]
            let sub = tmp[max(0, y - r) * w + x]
            acc += add - sub
        }
    }
    return out
}

/// Self-guided filter of one plane. eps controls edge preservation.
func guidedPlane(_ p: [Double], _ w: Int, _ h: Int, _ r: Int, _ eps: Double) -> [Double] {
    let meanI = boxFilter(p, w, h, r)
    let p2 = p.map { $0 * $0 }
    let meanII = boxFilter(p2, w, h, r)
    var a = [Double](repeating: 0, count: p.count)
    var b = [Double](repeating: 0, count: p.count)
    for i in 0..<p.count {
        let varI = max(0, meanII[i] - meanI[i] * meanI[i])
        a[i] = varI / (varI + eps)
        b[i] = meanI[i] * (1 - a[i])
    }
    let meanA = boxFilter(a, w, h, r)
    let meanB = boxFilter(b, w, h, r)
    var out = [Double](repeating: 0, count: p.count)
    for i in 0..<p.count { out[i] = meanA[i] * p[i] + meanB[i] }
    return out
}

public struct SmoothOptions {
    /// Box radius in pixels (v3.1 default 3).
    public var radius: Int
    /// Regularization in Lab units² (v3.1 default 80 — softer than before).
    public var eps: Double

    public init(radius: Int = 3, eps: Double = 80) {
        self.radius = radius
        self.eps = eps
    }
}

/// Smooth all three Lab planes with a guided filter. Returns a new buffer.
public func guidedSmoothLab(_ lab: [Double], _ w: Int, _ h: Int, opts: SmoothOptions = SmoothOptions()) -> [Double] {
    let n = w * h
    var out = [Double](repeating: 0, count: n * 3)
    for c in 0..<3 {
        var plane = [Double](repeating: 0, count: n)
        for i in 0..<n { plane[i] = lab[i * 3 + c] }
        let smooth = guidedPlane(plane, w, h, opts.radius, opts.eps)
        for i in 0..<n { out[i * 3 + c] = smooth[i] }
    }
    return out
}
