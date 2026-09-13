import XCTest
@testable import PaintEngine

final class ColorSpaceTests: XCTestCase {
    func testReferenceColors() {
        let white = rgbToLab(255, 255, 255)
        XCTAssertEqual(white.l, 100, accuracy: 0.5)
        XCTAssertEqual(white.a, 0, accuracy: 0.5)
        XCTAssertEqual(white.b, 0, accuracy: 0.5)

        let black = rgbToLab(0, 0, 0)
        XCTAssertEqual(black.l, 0, accuracy: 0.5)

        let red = rgbToLab(255, 0, 0)
        XCTAssertEqual(red.l, 53.23, accuracy: 0.5)
        XCTAssertEqual(red.a, 80.11, accuracy: 0.5)
        XCTAssertEqual(red.b, 67.22, accuracy: 0.5)
    }

    func testRoundTrip() {
        for v in stride(from: 0, through: 255, by: 17) {
            let lab = rgbToLab(Double(v), Double(255 - v), Double(v / 2))
            let rgb = labToRgb(lab)
            XCTAssertEqual(abs(rgb.r - v) <= 1, true)
            XCTAssertEqual(abs(rgb.g - (255 - v)) <= 1, true)
        }
    }
}

final class CIEDE2000Tests: XCTestCase {
    /// Sharma, Wu & Dalal (2005) reference pairs (subset of the 34-case table).
    static let cases: [([Double], [Double], Double)] = [
        ([50.0000, 2.6772, -79.7751], [50.0000, 0.0000, -82.7485], 2.0425),
        ([50.0000, 3.1571, -77.2803], [50.0000, 0.0000, -82.7485], 2.8615),
        ([50.0000, 2.8361, -74.0200], [50.0000, 0.0000, -82.7485], 3.4412),
        ([50.0000, -1.3802, -84.2814], [50.0000, 0.0000, -82.7485], 1.0000),
        ([50.0000, 2.5000, 0.0000], [73.0000, 25.0000, -18.0000], 27.1492),
        ([50.0000, 2.5000, 0.0000], [61.0000, -5.0000, 29.0000], 22.8977),
        ([50.0000, 2.5000, 0.0000], [56.0000, -27.0000, -3.0000], 31.9030),
        ([50.0000, 2.5000, 0.0000], [58.0000, 24.0000, 15.0000], 19.4535),
        ([50.0000, 2.5000, 0.0000], [50.0000, 3.1736, 0.5854], 1.0000),
        ([60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644),
        ([63.0109, -31.0961, -5.8663], [62.8187, -29.7946, -4.0864], 1.2630),
        ([61.2901, 3.7196, -5.3901], [61.4292, 2.2480, -4.9620], 1.8731),
        ([35.0831, -44.1164, 3.7933], [35.0232, -40.0716, 1.5901], 1.8645),
        ([22.7233, 20.0904, -46.6940], [23.0331, 14.9730, -42.5619], 2.0373),
        ([36.4612, 47.8580, 18.3852], [36.2715, 50.5065, 21.2231], 1.4146),
        ([90.8027, -2.0831, 1.4410], [91.1528, -1.6435, 0.0447], 1.4441),
        ([2.0776, 0.0795, -1.1350], [0.9033, -0.0636, -0.5514], 0.9082),
    ]

    func testSharmaReferencePairs() {
        for (i, c) in Self.cases.enumerated() {
            let d = labDistance2000(Lab(c.0[0], c.0[1], c.0[2]), Lab(c.1[0], c.1[1], c.1[2]))
            XCTAssertEqual(d, c.2, accuracy: 0.02, "case \(i + 1)")
        }
    }

    func testSymmetryAndZero() {
        let a = Lab(53.2, 80.1, 67.2)
        let b = Lab(61.5, -5.3, 29.0)
        XCTAssertEqual(labDistance2000(a, b), labDistance2000(b, a), accuracy: 1e-10)
        XCTAssertEqual(labDistance2000(a, a), 0, accuracy: 1e-12)
    }
}

final class QuantizeTests: XCTestCase {
    func testThreePureColors() {
        var lab: [Double] = []
        for base in [[80.0, 10.0, -20.0], [40.0, 50.0, 30.0], [20.0, -10.0, -30.0]] {
            for _ in 0..<50 { lab.append(contentsOf: base) }
        }
        let q = quantize(lab: lab, k: 3, seed: 1)
        XCTAssertEqual(q.palette.count, 3)
        // Medoid colors must be actual members.
        for entry in q.palette {
            let hit = stride(from: 0, to: lab.count, by: 3).contains {
                abs(lab[$0] - entry.lab.l) < 1e-9 && abs(lab[$0 + 1] - entry.lab.a) < 1e-9
            }
            XCTAssertTrue(hit)
        }
    }

    func testDeterminism() {
        var lab: [Double] = []
        for i in 0..<300 {
            lab.append(Double(i % 100))
            lab.append(Double((i * 7) % 60) - 30)
            lab.append(Double((i * 13) % 60) - 30)
        }
        let a = quantize(lab: lab, k: 8, seed: 42)
        let b = quantize(lab: lab, k: 8, seed: 42)
        XCTAssertEqual(a.palette.map(\.hex), b.palette.map(\.hex))
        XCTAssertEqual(Array(a.labels), Array(b.labels))
    }
}

final class AutoPaletteTests: XCTestCase {
    func testMergeCloseKeepDistinct() {
        let input = [
            PaletteEntry(index: 0, lab: Lab(70, 5, 5), hex: "#000000", pixelCount: 500),
            PaletteEntry(index: 1, lab: Lab(69, 6, 4), hex: "#000000", pixelCount: 300),
            PaletteEntry(index: 2, lab: Lab(30, 40, 50), hex: "#000000", pixelCount: 200),
        ]
        let r = refinePalette(input, 12, maxPalette)
        XCTAssertEqual(r.palette.count, 2)
        XCTAssertEqual(r.palette[0].pixelCount, 800)
        XCTAssertEqual(r.remap[0], r.remap[1])
        XCTAssertNotEqual(r.remap[2], r.remap[0])
    }

    func testCapAtBudget() {
        var input: [PaletteEntry] = []
        for i in 0..<50 {
            input.append(PaletteEntry(index: i, lab: Lab(Double(i) * 2, 0, 0), hex: "#000000", pixelCount: 10))
        }
        let r = refinePalette(input, 2, maxPalette)
        XCTAssertLessThanOrEqual(r.palette.count, maxPalette)
    }
}

final class SegmentTests: XCTestCase {
    func testBuildRegionsAndAdjacency() {
        var labels = [UInt16](repeating: 0, count: 100)
        for y in 4...5 { for x in 4...5 { labels[y * 10 + x] = 1 } }
        let seg = buildRegions(labels, 10, 10)
        XCTAssertEqual(seg.regions.count, 2)
        XCTAssertEqual(seg.regions[0].area, 96)
        XCTAssertEqual(seg.regions[1].area, 4)
        XCTAssertTrue(seg.regions[1].neighbors.contains(0))
    }

    func testContrastSmallRegionSurvives() {
        var labels = [UInt16](repeating: 0, count: 16 * 16)
        for y in 7...8 { for x in 7...8 { labels[y * 16 + x] = 1 } }
        let palette = [
            PaletteEntry(index: 0, lab: Lab(70, 0, 0), hex: "#000000", pixelCount: 0),
            PaletteEntry(index: 1, lab: Lab(25, 0, 0), hex: "#000000", pixelCount: 0),
        ]
        var seg = buildRegions(labels, 16, 16)
        mergeSmallRegions(&seg, palette, 100, 16, 16)
        let square = seg.regions.first { $0.colorIdx == 1 }
        XCTAssertNotNil(square) // high contrast ⇒ detail survives
        XCTAssertEqual(square?.area, 4)
    }

    func testLowContrastSmallRegionMerges() {
        var labels = [UInt16](repeating: 0, count: 16 * 16)
        for y in 7...8 { for x in 7...8 { labels[y * 16 + x] = 1 } }
        let palette = [
            PaletteEntry(index: 0, lab: Lab(70, 0, 0), hex: "#000000", pixelCount: 0),
            PaletteEntry(index: 1, lab: Lab(68, 0, 0), hex: "#000000", pixelCount: 0),
        ]
        var seg = buildRegions(labels, 16, 16)
        mergeSmallRegions(&seg, palette, 100, 16, 16)
        XCTAssertEqual(seg.regions.count, 1)
        XCTAssertEqual(seg.regions[0].area, 256)
    }
}

final class VectorizeTests: XCTestCase {
    func testStaircaseCollapsesToDiagonal() {
        var pts: [Double] = []
        for i in 0...40 { pts.append(contentsOf: [Double(i), Double(i)]) }
        let simplified = simplifyPoly(pts, 1.2)
        XCTAssertLessThanOrEqual(simplified.count / 2, 3)
        for i in stride(from: 0, to: simplified.count, by: 2) {
            XCTAssertLessThanOrEqual(abs(simplified[i] - simplified[i + 1]), 1)
        }
    }

    func testChaikinKeepsClosed() {
        let square: [Double] = [0, 0, 10, 0, 10, 10, 0, 10]
        let smoothed = chaikinSmooth(square, 2)
        XCTAssertEqual(smoothed.count, square.count * 4)
        var minX = Double.infinity, maxX = -Double.infinity
        for i in stride(from: 0, to: smoothed.count, by: 2) {
            minX = min(minX, smoothed[i])
            maxX = max(maxX, smoothed[i])
        }
        XCTAssertGreaterThanOrEqual(minX, -0.01)
        XCTAssertLessThanOrEqual(maxX, 10.01)
    }

    func testTraceFindsSquareLoop() {
        var labels = [UInt32](repeating: 0, count: 100)
        for y in 3...6 { for x in 3...6 { labels[y * 10 + x] = 1 } }
        let polys = traceRegionBoundaries(labels, 10, 10)
        XCTAssertNotNil(polys[1])
        XCTAssertFalse(polys[1]!.isEmpty)
    }
}

final class PipelineTests: XCTestCase {
    func testSyntheticThreeBlobs() {
        let w = 120, h = 120
        var rgba = [UInt8](repeating: 255, count: w * h * 4)
        for y in 0..<h {
            for x in 0..<w {
                let p = (y * w + x) * 4
                if x < w / 3 {
                    rgba[p] = 200; rgba[p + 1] = 60; rgba[p + 2] = 60
                } else if x < 2 * w / 3 {
                    rgba[p] = 60; rgba[p + 1] = 160; rgba[p + 2] = 80
                } else {
                    rgba[p] = 70; rgba[p + 1] = 90; rgba[p + 2] = 210
                }
                rgba[p + 3] = 255
            }
        }
        let result = runPipeline(rgba, w, h)
        XCTAssertFalse(result.palette.isEmpty)
        XCTAssertLessThanOrEqual(result.palette.count, 36)
        XCTAssertGreaterThanOrEqual(result.regions.count, 3)
        // Every pixel labeled and within range.
        for l in result.labels where Int(l) >= result.regions.count { XCTFail("label out of range") }
    }

    func testAutoKFloorKeepsGradientResolution() {
        let n = 900
        var lab = [Double](repeating: 0, count: n * 3)
        for i in 0..<n {
            lab[i * 3] = Double(i) / Double(n) * 90 + 5
        }
        let k = autoKWithFloor(lab, n, 2, 36)
        let share = coverageShare(lab, n, k)
        XCTAssertGreaterThanOrEqual(share, 0.9)
    }

    func testFillPixelsMatchRegions() {
        let palette = [
            PaletteEntry(index: 0, lab: Lab(70, 0, 0), hex: "#c0c0c0", pixelCount: 0),
            PaletteEntry(index: 1, lab: Lab(25, 0, 0), hex: "#202020", pixelCount: 0),
        ]
        let regions = [RegionInfo(colorIdx: 0, area: 96, labelX: 2, labelY: 2, fontSize: 12),
                       RegionInfo(colorIdx: 1, area: 4, labelX: 4.5, labelY: 4.5, fontSize: 10)]
        var labels = [UInt32](repeating: 0, count: 100)
        for y in 4...5 { for x in 4...5 { labels[y * 10 + x] = 1 } }
        let px = buildFillPixels(labels, regions, palette, 10, 10)
        XCTAssertEqual(px.count, 400)
        XCTAssertEqual(Int(px[(4 * 10 + 4) * 4]), 0x20) // dark square pixel
        XCTAssertEqual(Int(px[0]), 0xc0) // background pixel
    }
}
