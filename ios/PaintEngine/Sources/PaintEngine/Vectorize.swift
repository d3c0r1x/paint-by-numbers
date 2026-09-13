/// Contour vectorization — port of src/engine/vectorize.ts.
/// Per-region oriented boundary tracing (region interior on the LEFT of the
/// walk direction) → clean closed loops → Douglas–Peucker simplification
/// (ε ≈ 1.2 px) → Chaikin corner-cutting (2 iterations). iOS renders the
/// returned polylines with UIBezierPath/CGPath round joins.

public struct Poly {
    /// x,y pairs; loop is closed implicitly (last → first).
    public var pts: [Double]

    public init(pts: [Double]) { self.pts = pts }
}

/// Trace closed boundary loops per region. Every directed edge keeps the
/// region interior on its left, so each region yields one or more clean loops.
public func traceRegionBoundaries(_ regionIds: [UInt32], _ width: Int, _ height: Int) -> [Int: [Poly]] {
    var edges: [Int: [Double]] = [:]
    func add(_ rid: Int, _ x1: Double, _ y1: Double, _ x2: Double, _ y2: Double) {
        edges[rid, default: []].append(contentsOf: [x1, y1, x2, y2])
    }
    func at(_ x: Int, _ y: Int) -> Int {
        if x < 0 || y < 0 || x >= width || y >= height { return -1 }
        return Int(regionIds[y * width + x])
    }

    for y in 0..<height {
        for x in 0..<width {
            let rid = Int(regionIds[y * width + x])
            if at(x + 1, y) != rid { add(rid, Double(x + 1), Double(y + 1), Double(x + 1), Double(y)) }
            if x == 0 || at(x - 1, y) != rid { add(rid, Double(x), Double(y), Double(x), Double(y + 1)) }
            if at(x, y + 1) != rid { add(rid, Double(x), Double(y + 1), Double(x + 1), Double(y + 1)) }
            if y == 0 || at(x, y - 1) != rid { add(rid, Double(x + 1), Double(y), Double(x), Double(y)) }
        }
    }

    var result: [Int: [Poly]] = [:]
    for (rid, list) in edges {
        let segCount = list.count / 4
        func key(_ x: Double, _ y: Double) -> Int { Int(y) * (width + 1) + Int(x) }
        var fromMap: [Int: [Int]] = [:]
        for s in 0..<segCount {
            let k = key(list[s * 4], list[s * 4 + 1])
            fromMap[k, default: []].append(s)
        }

        var used = [Bool](repeating: false, count: segCount)
        var polys: [Poly] = []
        for s in 0..<segCount {
            if used[s] { continue }
            used[s] = true
            var pts: [Double] = [list[s * 4], list[s * 4 + 1]]
            var endX = list[s * 4 + 2]
            var endY = list[s * 4 + 3]
            pts.append(contentsOf: [endX, endY])
            let guardSteps = segCount + 2
            for _ in 0..<guardSteps {
                let bucket = fromMap[key(endX, endY)]
                var next = -1
                for c in bucket where !used[c] { next = c; break }
                if next < 0 { break }
                used[next] = true
                endX = list[next * 4 + 2]
                endY = list[next * 4 + 3]
                pts.append(contentsOf: [endX, endY])
            }
            if pts.count >= 8 { polys.append(Poly(pts: pts)) }
        }
        if !polys.isEmpty { result[rid] = polys }
    }
    return result
}

/// Douglas–Peucker simplification for a closed polyline (pts = x,y pairs).
public func simplifyPoly(_ pts: [Double], _ epsilon: Double) -> [Double] {
    let n = pts.count / 2
    if n < 5 { return pts }
    var leftI = 0
    for i in 1..<n where pts[i * 2] < pts[leftI * 2] { leftI = i }
    var rightI = 0
    for i in 1..<n where pts[i * 2] > pts[rightI * 2] { rightI = i }
    if leftI == rightI { return pts }

    var keep = [Bool](repeating: false, count: n)
    keep[leftI] = true
    keep[rightI] = true

    func dp(_ idxs: [Int], _ eps: Double) {
        var stack: [(Int, Int)] = [(0, idxs.count - 1)]
        while let (lo, hi) = stack.popLast() {
            if hi - lo < 2 { continue }
            let ax = pts[idxs[lo] * 2], ay = pts[idxs[lo] * 2 + 1]
            let bx = pts[idxs[hi] * 2], by = pts[idxs[hi] * 2 + 1]
            let dx = bx - ax, dy = by - ay
            let norm = (dx * dx + dy * dy).squareRoot()
            var maxD = -1.0
            var maxI = -1
            for i in (lo + 1)..<hi {
                let px = pts[idxs[i] * 2], py = pts[idxs[i] * 2 + 1]
                let d = abs((px - ax) * dy - (py - ay) * dx) / (norm == 0 ? 1 : norm)
                if d > maxD { maxD = d; maxI = i }
            }
            if maxD > eps && maxI > 0 {
                keep[idxs[maxI]] = true
                stack.append((lo, maxI))
                stack.append((maxI, hi))
            }
        }
    }
    func run(_ from: Int, _ to: Int) {
        var idxs: [Int] = []
        var i = from
        repeat {
            idxs.append(i)
            i = (i + 1) % n
        } while i != to
        idxs.append(to)
        dp(idxs, epsilon)
    }
    run(leftI, rightI)
    run(rightI, leftI)

    var out: [Double] = []
    for i in 0..<n where keep[i] {
        out.append(pts[i * 2])
        out.append(pts[i * 2 + 1])
    }
    return out
}

/// Chaikin corner-cutting on a closed polyline, `iters` rounds.
public func chaikinSmooth(_ pts: [Double], _ iters: Int) -> [Double] {
    var cur = pts
    for _ in 0..<iters {
        let n = cur.count / 2
        var out: [Double] = []
        out.reserveCapacity(n * 4)
        for i in 0..<n {
            let x0 = cur[i * 2], y0 = cur[i * 2 + 1]
            let x1 = cur[((i + 1) % n) * 2], y1 = cur[((i + 1) % n) * 2 + 1]
            out.append(x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25)
            out.append(x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75)
        }
        cur = out
    }
    return cur
}

/// Simplify + smooth one region's boundary loops.
public func smoothPolys(_ polys: [Poly], _ epsilon: Double = 1.2, _ chaikinIters: Int = 2) -> [Poly] {
    var out: [Poly] = []
    for poly in polys {
        let simplified = simplifyPoly(poly.pts, epsilon)
        if simplified.count < 6 { continue } // < 3 points → degenerate
        out.append(Poly(pts: chaikinSmooth(simplified, chaikinIters)))
    }
    return out
}
