/// Fill rendering — port of src/engine/fillRender.ts.
/// The "fully colored" picture: every pixel gets its region's palette color.
/// Pure data functions — unit-tested without UIKit.

/// Fully-colored RGBA pixels (width×height×4): each pixel gets its region's
/// palette color; unknown regions fall back to white. Per-pixel mapping
/// avoids antialiasing seams between adjacent regions.
public func buildFillPixels(_ labels: [UInt32], _ regions: [RegionInfo], _ palette: [PaletteEntry], _ width: Int, _ height: Int) -> [UInt8] {
    var out = [UInt8](repeating: 255, count: width * height * 4)
    // Region id → (r, g, b) resolved up front.
    var rgbs: [(Int, Int, Int)] = .init(repeating: (255, 255, 255), count: regions.count)
    for (id, r) in regions.enumerated() {
        if r.colorIdx < palette.count {
            let hex = palette[r.colorIdx].hex
            if let rgb = hexToRgb(hex) {
                rgbs[id] = (rgb.r, rgb.g, rgb.b)
            }
        }
    }
    for i in 0..<(width * height) {
        let rid = Int(labels[i])
        let o = i * 4
        if rid < rgbs.count {
            out[o] = UInt8(rgbs[rid].0)
            out[o + 1] = UInt8(rgbs[rid].1)
            out[o + 2] = UInt8(rgbs[rid].2)
        }
        out[o + 3] = 255
    }
    return out
}

/// Group region ids by palette index — geometry source for highlighting all
/// regions of the active color.
public func regionIdsByColorIndex(_ regions: [RegionInfo]) -> [Int: [Int]] {
    var map: [Int: [Int]] = [:]
    for (id, r) in regions.enumerated() {
        map[r.colorIdx, default: []].append(id)
    }
    return map
}
