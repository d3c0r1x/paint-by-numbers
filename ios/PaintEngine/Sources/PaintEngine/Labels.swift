/// Labels (region number placement) — port of src/engine/labels.ts.
/// Number position: the pixel farthest from the region border (reverse BFS
/// → max distance point), fallback to centroid. Font size heuristic per SPEC.

public func computeLabelPoints(_ regions: inout [Region], _ regionIds: [UInt32], _ width: Int, _ height: Int) -> [RegionInfo] {
    var infos: [RegionInfo] = []
    infos.reserveCapacity(regions.count)

    for r in regions {
        let n = width * height
        var dist = [Int32](repeating: -1, count: n)
        var queue: [Int] = []
        queue.reserveCapacity(r.pixels.count)

        // Seed: border pixels (any 4-neighbor outside the region).
        for p in r.pixels {
            let x = p % width
            let y = p / width
            let isBorder =
                (x + 1 >= width || Int(regionIds[p + 1]) != r.id) ||
                (x == 0 || Int(regionIds[p - 1]) != r.id) ||
                (y + 1 >= height || Int(regionIds[p + width]) != r.id) ||
                (y == 0 || Int(regionIds[p - width]) != r.id)
            if isBorder {
                dist[p] = 0
                queue.append(p)
            }
        }

        var head = 0
        var bestP = r.pixels[0]
        var bestD = 0
        while head < queue.count {
            let p = queue[head]
            head += 1
            let d = dist[p]
            if d > bestD { bestD = d; bestP = p }
            let x = p % width
            let y = p / width
            for q in [x + 1 < width ? p + 1 : -1,
                      x > 0 ? p - 1 : -1,
                      y + 1 < height ? p + width : -1,
                      y > 0 ? p - width : -1] where q >= 0 {
                if Int(regionIds[q]) == r.id && dist[q] < 0 {
                    dist[q] = d + 1
                    queue.append(q)
                }
            }
        }

        // Fallback: pixel nearest the centroid if BFS found nothing.
        if bestD == 0 && r.pixels.count > 1 {
            let cx = r.pixels.reduce(0) { $0 + $1 % width } / r.pixels.count
            let cy = r.pixels.reduce(0) { $0 + $1 / width } / r.pixels.count
            var bestScore = Int.max
            for p in r.pixels {
                let px = p % width, py = p / width
                let score = (px - cx) * (px - cx) + (py - cy) * (py - cy)
                if score < bestScore { bestScore = score; bestP = p }
            }
        }

        let side = Double(r.maxX - r.minX + 1) * Double(r.maxY - r.minY + 1)
        let fill = side > 0 ? Double(r.area) / side : 0
        let fontSize = max(10, min(48, Int((sqrt(Double(r.area) * max(fill, 0.35)) / 3.0).rounded())))

        infos.append(RegionInfo(
            colorIdx: r.colorIdx,
            area: r.area,
            labelX: Double(bestP % width) + 0.5,
            labelY: Double(bestP / width) + 0.5,
            fontSize: fontSize))
    }

    // Attach computed points to regions (kept for callers wanting both).
    for i in regions.indices {
        if i < infos.count {
            regions[i].minX = regions[i].minX // no-op; label info lives in RegionInfo
        }
    }
    return infos
}
