/// Connected regions + small-region merging — port of src/engine/segment.ts.
/// v3.1: CONTRAST-AWARE merging (CIEDE2000): a small region that stands out
/// against every neighbor (ΔE00 ≥ 12) is a detail (lips, eyelets, lace) and
/// survives; low-contrast small regions merge into the ΔE00-nearest neighbor.

public struct Region {
    public var id: Int
    public var colorIdx: Int
    public var area: Int
    public var pixels: [Int]
    public var minX: Int = 0
    public var minY: Int = 0
    public var maxX: Int = -1
    public var maxY: Int = -1
    public var neighbors: Set<Int> = []

    public init(id: Int, colorIdx: Int, pixels: [Int]) {
        self.id = id
        self.colorIdx = colorIdx
        self.area = pixels.count
        self.pixels = pixels
    }
}

public struct SegmentResult {
    /// Region id per pixel (compacted ids after merge).
    public var regionIds: [UInt32]
    public var regions: [Region]

    public init(regionIds: [UInt32], regions: [Region]) {
        self.regionIds = regionIds
        self.regions = regions
    }
}

/// Contrast threshold for the merge guard (ΔE00): small regions contrasting
/// MORE than this with every neighbor are details and are kept.
public let mergeContrastThreshold = 12.0

private let unassigned: UInt32 = 0xffffffff

/// Split a label map into 4-connected regions and record adjacency
/// from pixel pairs with differing labels (right/down pairs).
public func buildRegions(_ labels: [UInt16], _ width: Int, _ height: Int) -> SegmentResult {
    let n = width * height
    var regionIds = [UInt32](repeating: unassigned, count: n)
    var pixelsLists: [[Int]] = []
    var neighborSets: [Set<Int>] = []
    var queue = [Int](repeating: 0, count: n)

    for start in 0..<n {
        if regionIds[start] != unassigned { continue }
        let colorIdx = Int(labels[start])
        let id = pixelsLists.count
        var pixels: [Int] = []
        neighborSets.append([])
        var head = 0
        var tail = 0
        queue[tail] = start
        tail += 1
        regionIds[start] = UInt32(id)
        pixels.append(start)

        while head < tail {
            let p = queue[head]
            head += 1
            let x = p % width
            let y = p / width

            let q4 = [
                x + 1 < width ? p + 1 : -1,
                y + 1 < height ? p + width : -1,
                x > 0 ? p - 1 : -1,
                y > 0 ? p - width : -1,
            ]
            for q in q4 where q >= 0 {
                if Int(labels[q]) == colorIdx {
                    if regionIds[q] == unassigned {
                        regionIds[q] = UInt32(id)
                        queue[tail] = q
                        tail += 1
                        pixels.append(q)
                    }
                } else if regionIds[q] != unassigned {
                    let nb = Int(regionIds[q])
                    if nb != id {
                        neighborSets[id].insert(nb)
                        neighborSets[nb].insert(id)
                    }
                }
            }
        }
        pixelsLists.append(pixels)
    }

    var regions: [Region] = []
    regions.reserveCapacity(pixelsLists.count)
    for (id, pixels) in pixelsLists.enumerated() {
        var r = Region(id: id, colorIdx: Int(labels[pixels[0]]), pixels: pixels)
        r.neighbors = neighborSets[id]
        regions.append(r)
    }
    recomputeBboxes(&regions, regionIds, width, height)
    return SegmentResult(regionIds: regionIds, regions: regions)
}

private func recomputeBboxes(_ regions: inout [Region], _ regionIds: [UInt32], _ width: Int, _ height: Int) {
    for i in regions.indices {
        regions[i].minX = width
        regions[i].minY = height
        regions[i].maxX = -1
        regions[i].maxY = -1
    }
    for p in 0..<regionIds.count {
        let x = p % width
        let y = p / width
        let i = Int(regionIds[p])
        if x < regions[i].minX { regions[i].minX = x }
        if x > regions[i].maxX { regions[i].maxX = x }
        if y < regions[i].minY { regions[i].minY = y }
        if y > regions[i].maxY { regions[i].maxY = y }
    }
    _ = height
}

/// Merge every region smaller than minAreaPixels into its ΔE00-nearest
/// neighbor until none remain. Contrast-aware (v3.1): a small region whose
/// ΔE00 with EVERY alive neighbor is ≥ mergeContrastThreshold is kept —
/// details like lips/eyelets/lace survive. Isolated small regions are kept.
public func mergeSmallRegions(_ seg: inout SegmentResult, _ palette: [PaletteEntry], _ minAreaPixels: Int, _ width: Int, _ height: Int) {
    if minAreaPixels <= 0 { return }
    var regions = seg.regions
    var alive = [Bool](repeating: true, count: regions.count)
    var absorbedInto = [Int](repeating: -1, count: regions.count)

    var smallQueue: [Int] = []
    for r in regions where r.area < minAreaPixels { smallQueue.append(r.id) }

    let labOf: [Lab] = regions.map { palette[$0.colorIdx].lab }

    var qi = 0
    while qi < smallQueue.count {
        let smallId = smallQueue[qi]
        qi += 1
        if !alive[smallId] { continue }
        let smallArea = regions[smallId].area
        if smallArea >= minAreaPixels { continue }
        if regions[smallId].neighbors.isEmpty { continue } // isolated: keep

        // Contrast guard: a small region that stands out against EVERY alive
        // neighbor is a detail, not noise — keep it.
        var maxNeighborD = -1.0
        for nbId in regions[smallId].neighbors where alive[nbId] {
            let d = labDistance2000(labOf[smallId], labOf[nbId])
            if d > maxNeighborD { maxNeighborD = d }
        }
        if maxNeighborD < 0 { continue } // no alive neighbors: keep
        if maxNeighborD >= mergeContrastThreshold { continue } // contrast detail: keep

        // Nearest alive neighbor by ΔE00 among low-contrast candidates.
        var bestId = -1
        var bestD = Double.infinity
        for nbId in regions[smallId].neighbors where alive[nbId] {
            let d = labDistance2000(labOf[smallId], labOf[nbId])
            if d < bestD { bestD = d; bestId = nbId }
        }
        if bestId < 0 { continue }

        // Absorb: rewire neighbor sets and add areas. No pixel arrays touched.
        for nbId in regions[smallId].neighbors {
            if nbId == bestId { continue }
            regions[nbId].neighbors.remove(smallId)
            regions[nbId].neighbors.insert(bestId)
            regions[bestId].neighbors.insert(nbId)
        }
        regions[bestId].neighbors.remove(smallId)
        regions[bestId].area += regions[smallId].area
        absorbedInto[smallId] = bestId

        alive[smallId] = false
        regions[smallId].area = 0
        regions[smallId].neighbors = []

        if regions[bestId].area < minAreaPixels { smallQueue.append(bestId) }
    }

    compactAndRebuild(&seg, &regions, alive, absorbedInto, width, height)
}

/// Compact region ids (no gaps), rebuild pixel lists and bboxes in one pass,
/// and remap neighbor sets to the new ids.
private func compactAndRebuild(_ seg: inout SegmentResult, _ regions: inout [Region], _ alive: [Bool], _ absorbedInto: [Int], _ width: Int, _ height: Int) {
    var remap = [Int](repeating: -1, count: regions.count)
    var kept: [Region] = []
    for i in 0..<regions.count where alive[i] {
        remap[i] = kept.count
        kept.append(regions[i])
    }

    var finalTarget = [Int](repeating: -1, count: regions.count)
    for i in 0..<regions.count {
        var t = i
        while !alive[t] && absorbedInto[t] >= 0 { t = absorbedInto[t] }
        finalTarget[i] = alive[t] ? t : -1
    }

    var buckets: [[Int]] = .init(repeating: [], count: kept.count)
    var bboxes = kept.map { _ in (minX: width, minY: Int.max, maxX: -1, maxY: -1) }
    let regionIds = seg.regionIds
    for p in 0..<regionIds.count {
        let origId = Int(regionIds[p])
        let target = alive[origId] ? origId : finalTarget[origId]
        let id = target >= 0 ? remap[target] : -1
        if id < 0 {
            seg.regionIds[p] = 0
            buckets[0].append(p)
            continue
        }
        seg.regionIds[p] = UInt32(id)
        buckets[id].append(p)
        let x = p % width
        let y = p / width
        if x < bboxes[id].minX { bboxes[id].minX = x }
        if x > bboxes[id].maxX { bboxes[id].maxX = x }
        if y < bboxes[id].minY { bboxes[id].minY = y }
        if y > bboxes[id].maxY { bboxes[id].maxY = y }
    }

    for i in 0..<kept.count {
        var neighbors = Set<Int>()
        for nb in kept[i].neighbors {
            let mapped = remap[nb]
            if mapped >= 0 && mapped != i { neighbors.insert(mapped) }
        }
        kept[i].id = i
        kept[i].pixels = buckets[i]
        kept[i].area = buckets[i].count
        kept[i].minX = bboxes[i].minX
        kept[i].minY = bboxes[i].minY
        kept[i].maxX = bboxes[i].maxX
        kept[i].maxY = bboxes[i].maxY
        kept[i].neighbors = neighbors
    }
    seg.regions = kept
    _ = height
}
