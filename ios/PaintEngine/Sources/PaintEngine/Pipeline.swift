/// Smart conversion pipeline v3.1 — port of src/engine/pipeline.ts.
/// Guided filter (softened r=3, eps=80) → SLIC superpixels → palette k-means
/// over superpixel means (auto-k: SSE elbow + ΔE00-coverage floor) → per-pixel
/// labels → 2× majority filter → regions → contrast-aware RAG merge → numbers.
/// Contours are vectorized downstream (Vectorize.swift).
///
/// Pure Foundation — runs and tests on macOS/Linux and iOS.

public let workingMaxSide = 1400
/// Superpixel budget: SLIC K = pixels / superpixelArea, clamped below.
private let superpixelArea = 350

public struct Progress {
    public var step: PipelineStep
    public var percent: Int

    public init(step: PipelineStep, percent: Int) {
        self.step = step
        self.percent = percent
    }
}

public typealias ProgressFn = (Progress) -> Void

/// Full conversion on raw RGBA pixels (flat [r,g,b,a] quadruples per pixel).
public func runPipeline(_ rgba: [UInt8], _ imageWidth: Int, _ imageHeight: Int, report: ProgressFn = { _ in }) -> PipelineResult {
    // Step 1: downscale + guided (edge-preserving) smoothing + Lab. (0–20%)
    report(Progress(step: .analyze, percent: 0))
    let raw = downscaleToLab(rgba, imageWidth, imageHeight, workingMaxSide)
    report(Progress(step: .analyze, percent: 8))
    // v3.1 P2: softened guided filter — the old values flattened fine
    // structures (lace, embroidery, blush) before segmentation saw them.
    let lab = guidedSmoothLab(raw.lab, raw.width, raw.height, opts: SmoothOptions(radius: 3, eps: 80))
    let width = raw.width
    let height = raw.height
    report(Progress(step: .analyze, percent: 20))

    // Step 2: SLIC superpixels — the unit of everything below. (20–45%)
    report(Progress(step: .palette, percent: 22))
    let K = max(400, min(5000, (width * height) / superpixelArea))
    let sp = slic(lab: lab, w: width, h: height, opts: SlicOptions(numSuperpixels: K, compactness: 10, iterations: 10))
    report(Progress(step: .palette, percent: 45))

    // Step 3: palette k-means over superpixel means, auto-k (elbow + floor),
    // then perceptual refinement. (45–70%)
    let spCount = sp.count
    var spLab = [Double](repeating: 0, count: spCount * 3)
    for i in 0..<(spCount * 3) { spLab[i] = sp.means[i] }
    let k = autoKWithFloor(spLab, spCount, 10, 36)
    let q = quantize(lab: spLab, k: k, seed: 1)
    report(Progress(step: .palette, percent: 60))

    let refine = refinePalette(q.palette)
    // Reweight pixel counts by real superpixel area.
    var palette = refine.palette
    for p in palette.indices { p.pixelCount = 0 }
    for p in palette.indices { palette[p].pixelCount = 0 }
    for c in 0..<spCount {
        let idx = refine.remap[Int(q.labels[c])]
        palette[idx].pixelCount += Int(sp.sizes[c])
    }
    report(Progress(step: .palette, percent: 70))

    // Step 4: paint pixels from superpixel palette indices → regions. (70–80%)
    report(Progress(step: .regions, percent: 72))
    var pixelLabels = [UInt16](repeating: 0, count: width * height)
    for p in 0..<pixelLabels.count {
        let spId = Int(sp.ids[p])
        pixelLabels[p] = spId >= 0 ? UInt16(refine.remap[Int(q.labels[spId])]) : 0
    }
    // Majority filter on color labels BEFORE regionization (2 passes, v3.1).
    majorityFilter(&pixelLabels, width, height, 2)

    var seg = buildRegions(pixelLabels, width, height)
    report(Progress(step: .regions, percent: 80))

    // Step 5: contrast-aware RAG small-region merge. (80–88%)
    report(Progress(step: .merge, percent: 82))
    let minAreaPixels = max(350, (width * height) / 4000)
    mergeSmallRegions(&seg, palette, minAreaPixels, width, height)
    report(Progress(step: .merge, percent: 86))

    refreshPixelCounts(&palette, seg)

    // Step 6: number placement (farthest-from-border ≈ polylabel). (88–100%)
    report(Progress(step: .contours, percent: 90))
    report(Progress(step: .numbers, percent: 94))
    let regions = computeLabelPoints(&seg.regions, seg.regionIds, width, height)
    report(Progress(step: .numbers, percent: 100))

    return PipelineResult(width: width, height: height, labels: seg.regionIds, palette: palette, regions: regions)
}

/// Auto-k = max(SSE-elbow k, auto-k floor). The floor (v3.1 P1 rule): the
/// smallest k where ≥ 90% of points sit within ΔE00 ≤ 10 of their cluster.
func autoKWithFloor(_ lab: [Double], _ n: Int, _ kMin: Int, _ kMax: Int) -> Int {
    let elbow = elbowAutoK(lab, n, kMin, kMax)
    var floorK = kMax
    for k in kMin...kMax where coverageShare(lab, n, k) >= 0.9 {
        floorK = k
        break
    }
    return max(elbow, floorK)
}

/// Share of points within ΔE00 ≤ 10 of their k-means cluster color.
func coverageShare(_ lab: [Double], _ n: Int, _ k: Int) -> Double {
    let q = quantize(lab: lab, k: k, seed: 1)
    var ok = 0
    for i in 0..<n {
        let p = Lab(lab[i * 3], lab[i * 3 + 1], lab[i * 3 + 2])
        let c = q.palette[Int(q.labels[i])].lab
        if labDistance2000(p, c) <= 10 { ok += 1 }
    }
    return Double(ok) / Double(n)
}

/// SSE elbow over k ∈ [kMin..kMax] (max perpendicular distance to the chord).
func elbowAutoK(_ lab: [Double], _ n: Int, _ kMin: Int, _ kMax: Int) -> Int {
    _ = n
    var ks: [Int] = []
    var sse: [Double] = []
    var k = kMin
    while k <= kMax {
        let q = quantize(lab: lab, k: k, seed: 1)
        var s = 0.0
        for i in 0..<(lab.count / 3) {
            let c = q.palette[Int(q.labels[i])].lab
            let dl = lab[i * 3] - c.l
            let da = lab[i * 3 + 1] - c.a
            let db = lab[i * 3 + 2] - c.b
            s += dl * dl + da * da + db * db
        }
        ks.append(k)
        sse.append(s)
        k += 2
    }
    if sse.count < 3 { return kMin }
    let x0 = Double(ks[0]), y0 = sse[0]
    let x1 = Double(ks[ks.count - 1]), y1 = sse[sse.count - 1]
    let dx = x1 - x0, dy = y1 - y0
    let norm = (dx * dx + dy * dy).squareRoot()
    var bestI = 0
    var bestD = -1.0
    for i in 0..<ks.count {
        let d = abs((Double(ks[i]) - x0) * dy - (sse[i] - y0) * dx) / (norm == 0 ? 1 : norm)
        if d > bestD { bestD = d; bestI = i }
    }
    return ks[bestI]
}

/// Majority filter: 3×3 window, reassign pixels surrounded mostly by one
/// other label. `passes` = 1..2 (v3.1: two passes).
func majorityFilter(_ ids: inout [UInt16], _ width: Int, _ height: Int, _ passes: Int) {
    for _ in 0..<passes {
        let orig = ids
        for y in 1..<(height - 1) {
            for x in 1..<(width - 1) {
                let p = y * width + x
                var counts: [UInt16: Int] = [:]
                for dy in -1...1 {
                    for dx in -1...1 where !(dx == 0 && dy == 0) {
                        let q = orig[p + dy * width + dx]
                        counts[q, default: 0] += 1
                    }
                }
                let selfLabel = orig[p]
                var best: UInt16 = 0
                var bestN = 0
                for (label, nCount) in counts where label != selfLabel && nCount > bestN {
                    bestN = nCount
                    best = label
                }
                if bestN >= 6 { ids[p] = best }
            }
        }
    }
}

func refreshPixelCounts(_ palette: inout [PaletteEntry], _ seg: SegmentResult) {
    for i in palette.indices { palette[i].pixelCount = 0 }
    for r in seg.regions {
        if r.colorIdx < palette.count { palette[r.colorIdx].pixelCount += r.area }
    }
}

/// Bilinear downscale to ≤ maxSide on the long side, output as Lab triples.
public func downscaleToLab(_ rgba: [UInt8], _ sw: Int, _ sh: Int, _ maxSide: Int) -> (lab: [Double], width: Int, height: Int) {
    let scale = min(1.0, Double(maxSide) / Double(max(sw, sh)))
    let w = max(1, Int((Double(sw) * scale).rounded()))
    let h = max(1, Int((Double(sh) * scale).rounded()))

    var lab = [Double](repeating: 0, count: w * h * 3)
    let xRatio = Double(sw) / Double(w)
    let yRatio = Double(sh) / Double(h)

    for y in 0..<h {
        let sy = min(Double(sh - 1), (Double(y) + 0.5) * yRatio - 0.5)
        let y0 = max(0, Int(sy.rounded(.down)))
        let y1 = min(sh - 1, y0 + 1)
        let fy = sy - Double(y0)
        for x in 0..<w {
            let sx = min(Double(sw - 1), (Double(x) + 0.5) * xRatio - 0.5)
            let x0 = max(0, Int(sx.rounded(.down)))
            let x1 = min(sw - 1, x0 + 1)
            let fx = sx - Double(x0)

            let p = y * w + x
            var rgb: [Double] = .init(repeating: 0, count: 3)
            for ch in 0..<3 {
                let c00 = Double(rgba[(y0 * sw + x0) * 4 + ch])
                let c01 = Double(rgba[(y0 * sw + x1) * 4 + ch])
                let c10 = Double(rgba[(y1 * sw + x0) * 4 + ch])
                let c11 = Double(rgba[(y1 * sw + x1) * 4 + ch])
                rgb[ch] = c00 * (1 - fx) * (1 - fy) + c01 * fx * (1 - fy)
                    + c10 * (1 - fx) * fy + c11 * fx * fy
            }
            // Alpha: treat non-opaque pixels as white background.
            let a00 = Double(rgba[(y0 * sw + x0) * 4 + 3])
            let a01 = Double(rgba[(y0 * sw + x1) * 4 + 3])
            let a10 = Double(rgba[(y1 * sw + x0) * 4 + 3])
            let a11 = Double(rgba[(y1 * sw + x1) * 4 + 3])
            let a = a00 * (1 - fx) * (1 - fy) + a01 * fx * (1 - fy)
                + a10 * (1 - fx) * fy + a11 * fx * fy
            if a < 250 {
                let k = a / 255
                for ch in 0..<3 { rgb[ch] = rgb[ch] * k + 255 * (1 - k) }
            }

            let c = rgbToLab(rgb[0], rgb[1], rgb[2])
            lab[p * 3] = c.l
            lab[p * 3 + 1] = c.a
            lab[p * 3 + 2] = c.b
        }
    }
    return (lab, w, h)
}
