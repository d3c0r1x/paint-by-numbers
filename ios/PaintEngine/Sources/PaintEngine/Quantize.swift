/// K-means++ quantization in CIELAB (port of src/engine/quantize.ts).
/// v3.1: the palette color of each cluster is its **medoid** (the member
/// closest to the centroid) instead of the mean, so saturated accents and
/// highlights do not wash out toward gray.

/// Deterministic PRNG (mulberry32). Same seed → same sequence.
public func mulberry32(seed: UInt32) -> () -> Double {
    var a = seed
    return {
        a = a &+ 0x6d2b79f5
        var t = a
        t = (t ^ (t >> 15)) &* (1 | t)
        t = (t &+ ((t ^ (t >> 7)) &* (t | 61))) ^ t
        return Double(t ^ (t >> 14)) / 4294967296.0
    }
}

private let MAX_ITER = 20
private let MOVE_EPS = 0.5 // stop early when centroids move less than this (Lab units)
private let MAX_FIT_POINTS = 240_000 // fit centroids on a deterministic stride subsample

/// Quantize Lab pixels (flat [L,a,b] triples) into k colors. Returns the
/// palette ordered by pixelCount descending and a label map (palette index
/// per input point). Palette colors are cluster medoids.
public func quantize(lab: [Double], k: Int, seed: UInt32) -> (palette: [PaletteEntry], labels: [UInt16]) {
    let n = lab.count / 3
    guard n > 0, k >= 1 else { return ([], []) }
    let kk = min(k, 65535)

    // Deterministic subsample for centroid fitting on large images.
    var fitLab = lab
    var fitN = n
    if n > MAX_FIT_POINTS {
        let stride = (n + MAX_FIT_POINTS - 1) / MAX_FIT_POINTS
        fitN = (n + stride - 1) / stride
        fitLab = [Double](repeating: 0, count: fitN * 3)
        for j in 0..<fitN {
            let i = min(j * stride, n - 1)
            fitLab[j * 3] = lab[i * 3]
            fitLab[j * 3 + 1] = lab[i * 3 + 1]
            fitLab[j * 3 + 2] = lab[i * 3 + 2]
        }
    }

    let centroids = fitCentroids(fitLab, fitN, kk, seed)

    // Assign every input point; build counts, sums and medoid candidates.
    let labels = [UInt16](repeating: 0, count: n)
    var counts = [Double](repeating: 0, count: centroids.count)
    var sums = [Double](repeating: 0, count: centroids.count * 3)
    // Medoid: member closest to the centroid (squared Lab euclidean).
    var medoidIdx = [Int](repeating: -1, count: centroids.count)
    var medoidD2 = [Double](repeating: .infinity, count: centroids.count)

    var labelsMut = labels
    for i in 0..<n {
        let L = lab[i * 3], A = lab[i * 3 + 1], B = lab[i * 3 + 2]
        var best = 0
        var bestD = Double.infinity
        for c in 0..<centroids.count {
            let dl = L - centroids[c].l
            let da = A - centroids[c].a
            let db = B - centroids[c].b
            let d = dl * dl + da * da + db * db
            if d < bestD {
                bestD = d
                best = c
            }
        }
        labelsMut[i] = UInt16(best)
        counts[best] += 1
        sums[best * 3] += L
        sums[best * 3 + 1] += A
        sums[best * 3 + 2] += B
        if bestD < medoidD2[best] {
            medoidD2[best] = bestD
            medoidIdx[best] = i
        }
    }

    // Palette sorted by pixelCount descending (color 1 = largest area).
    let order = centroids.indices.map { (i: $0, count: counts[$0]) }
        .sorted { $0.count != $1.count ? $0.count > $1.count : $0.i < $1.i }
    var remap = [Int](repeating: 0, count: centroids.count)
    var palette: [PaletteEntry] = []
    palette.reserveCapacity(centroids.count)
    for (newIndex, entry) in order.enumerated() {
        remap[entry.i] = newIndex
        let centroid = centroids[entry.i]
        let color: Lab
        if entry.count > 0, medoidIdx[entry.i] >= 0 {
            let m = medoidIdx[entry.i]
            color = Lab(lab[m * 3], lab[m * 3 + 1], lab[m * 3 + 2])
        } else {
            color = centroid // empty cluster keeps its centroid
        }
        palette.append(PaletteEntry(index: newIndex, lab: color, hex: labToHex(color), pixelCount: Int(entry.count)))
    }
    for i in 0..<n { labelsMut[i] = UInt16(remap[Int(labelsMut[i])]) }

    return (palette, labelsMut)
}

private func fitCentroids(_ lab: [Double], _ n: Int, _ k: Int, _ seed: UInt32) -> [Lab] {
    let rand = mulberry32(seed: seed)
    var centroids: [Lab] = []

    func px(_ i: Int, _ c: Int) -> Double { lab[i * 3 + c] }

    // K-means++ init
    let first = Int(Double(rand()) * Double(n))
    centroids.append(Lab(px(first, 0), px(first, 1), px(first, 2)))

    var dist2 = [Double](repeating: .infinity, count: n)
    for _ in 1..<k {
        var sum = 0.0
        let last = centroids[centroids.count - 1]
        for i in 0..<n {
            let dl = px(i, 0) - last.l
            let da = px(i, 1) - last.a
            let db = px(i, 2) - last.b
            let d = dl * dl + da * da + db * db
            if d < dist2[i] { dist2[i] = d }
            sum += dist2[i]
        }
        if sum <= 0 {
            // All points coincide with chosen centroids; duplicate to keep k fixed.
            let src = Int(Double(rand()) * Double(n))
            centroids.append(Lab(px(src, 0), px(src, 1), px(src, 2)))
            continue
        }
        var r = Double(rand()) * sum
        var pick = n - 1
        for i in 0..<n {
            r -= dist2[i]
            if r <= 0 {
                pick = i
                break
            }
        }
        centroids.append(Lab(px(pick, 0), px(pick, 1), px(pick, 2)))
    }

    // Lloyd iterations
    let counts = [Int](repeating: 0, count: k)
    let sums = [Double](repeating: 0, count: k * 3)
    var countsMut = counts
    var sumsMut = sums
    for _ in 0..<MAX_ITER {
        for c in 0..<k { countsMut[c] = 0 }
        for c in 0..<k * 3 { sumsMut[c] = 0 }
        var moved = 0.0

        for i in 0..<n {
            let L = px(i, 0), A = px(i, 1), B = px(i, 2)
            var best = 0
            var bestD = Double.infinity
            for c in 0..<centroids.count {
                let dl = L - centroids[c].l
                let da = A - centroids[c].a
                let db = B - centroids[c].b
                let d = dl * dl + da * da + db * db
                if d < bestD {
                    bestD = d
                    best = c
                }
            }
            countsMut[best] += 1
            sumsMut[best * 3] += L
            sumsMut[best * 3 + 1] += A
            sumsMut[best * 3 + 2] += B
        }

        for c in 0..<centroids.count {
            if countsMut[c] == 0 { continue } // keep previous centroid for empty clusters
            let nl = sumsMut[c * 3] / Double(countsMut[c])
            let na = sumsMut[c * 3 + 1] / Double(countsMut[c])
            let nb = sumsMut[c * 3 + 2] / Double(countsMut[c])
            moved = max(moved, abs(nl - centroids[c].l), abs(na - centroids[c].a), abs(nb - centroids[c].b))
            centroids[c] = Lab(nl, na, nb)
        }

        if moved < MOVE_EPS { break }
    }

    return centroids
}
