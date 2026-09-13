/// Auto-palette refinement — port of src/engine/autoPalette.ts, upgraded to
/// CIEDE2000 for all comparisons (v3.1). Phase 1 dedupes indistinguishable
/// shades (ΔE00 < minDist). Phase 2 merges the CLOSEST cluster pair repeatedly
/// until the palette fits the symbol budget (36).

/// Max palette size: digits 1..9 + 0 + letters A..Z = 36 symbols.
public let maxPalette = 36
/// Shades closer than this are considered the same paint (noise-level dupes).
public let minColorDistance = 5.0

public struct RefineResult {
    public var palette: [PaletteEntry]
    /// Old palette index → new palette index.
    public var remap: [Int]

    public init(palette: [PaletteEntry], remap: [Int]) {
        self.palette = palette
        self.remap = remap
    }
}

private struct Cluster {
    var labSum: (Double, Double, Double)
    var weight: Double
    var pixelCount: Int
}

private func meanOf(_ c: Cluster) -> Lab {
    Lab(c.labSum.0 / c.weight, c.labSum.1 / c.weight, c.labSum.2 / c.weight)
}

public func refinePalette(_ palette: [PaletteEntry], _ minDist: Double = minColorDistance, _ maxColors: Int = maxPalette) -> RefineResult {
    var clusters: [Cluster] = []
    var assign = [Int](repeating: 0, count: palette.count)

    // Phase 1 — leader clustering: dedupe only near-identical shades.
    for (i, p) in palette.enumerated() {
        var best = -1
        var bestD = Double.infinity
        for c in 0..<clusters.count {
            let d = labDistance2000(p.lab, meanOf(clusters[c]))
            if d < bestD { bestD = d; best = c }
        }
        if best >= 0 && bestD < minDist {
            let cl = clusters[best]
            clusters[best] = Cluster(
                labSum: (cl.labSum.0 + p.lab.l * Double(p.pixelCount),
                         cl.labSum.1 + p.lab.a * Double(p.pixelCount),
                         cl.labSum.2 + p.lab.b * Double(p.pixelCount)),
                weight: cl.weight + Double(p.pixelCount),
                pixelCount: cl.pixelCount + p.pixelCount)
            assign[i] = best
        } else {
            clusters.append(Cluster(
                labSum: (p.lab.l * Double(p.pixelCount), p.lab.a * Double(p.pixelCount), p.lab.b * Double(p.pixelCount)),
                weight: Double(p.pixelCount),
                pixelCount: p.pixelCount))
            assign[i] = clusters.count - 1
        }
    }

    // Phase 2 — agglomerative: merge the closest pair until ≤ maxColors.
    while clusters.count > maxColors {
        var bi = 0, bj = 1
        var bestD = Double.infinity
        for i in 0..<clusters.count {
            let mi = meanOf(clusters[i])
            for j in (i + 1)..<clusters.count {
                let d = labDistance2000(mi, meanOf(clusters[j]))
                if d < bestD { bestD = d; bi = i; bj = j }
            }
        }
        let a = clusters[bi]
        let b = clusters[bj]
        clusters[bi] = Cluster(
            labSum: (a.labSum.0 + b.labSum.0, a.labSum.1 + b.labSum.1, a.labSum.2 + b.labSum.2),
            weight: a.weight + b.weight,
            pixelCount: a.pixelCount + b.pixelCount)
        clusters.remove(at: bj)
        for i in 0..<assign.count {
            if assign[i] == bj { assign[i] = bi }
            else if assign[i] > bj { assign[i] -= 1 }
        }
    }

    // Palette order: pixelCount desc ⇒ symbol 1 = the largest area.
    var result: [PaletteEntry] = []
    var clusterPos: [Int: Int] = [:]
    let order = clusters.indices.map { (i: $0, pixelCount: clusters[$0].pixelCount) }
        .sorted { $0.pixelCount != $1.pixelCount ? $0.pixelCount > $1.pixelCount : $0.i < $1.i }
    for entry in order {
        let mean = meanOf(clusters[entry.i])
        clusterPos[entry.i] = result.count
        result.append(PaletteEntry(index: result.count, lab: mean, hex: labToHex(mean), pixelCount: clusters[entry.i].pixelCount))
    }

    var remap = [Int](repeating: 0, count: palette.count)
    for i in 0..<palette.count {
        remap[i] = clusterPos[assign[i]] ?? 0
    }
    return RefineResult(palette: result, remap: remap)
}
