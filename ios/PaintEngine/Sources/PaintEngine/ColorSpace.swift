/// Color space conversions (port of src/engine/colorSpace.ts, standard sRGB/D65
/// formulas) plus CIEDE2000 (Sharma et al. 2005) for perceptual comparisons.

// XYZ (D65) → linear sRGB inverse matrix
private let M_INV = [
    3.2404542, -1.5371385, -0.4985314,
    -0.969266, 1.8760108, 0.041556,
    0.0556434, -0.2040259, 1.0572252,
]

// White point D65
private let XN = 0.95047
private let YN = 1.0
private let ZN = 1.08883

private let EPS = 0.008856
private let KAPPA = 7.787

private func srgbChannelToLinear(_ c: Double) -> Double {
    let v = c / 255
    return v <= 0.04045 ? v / 12.92 : pow((v + 0.055) / 1.055, 2.4)
}

private func linearChannelToSrgb(_ c: Double) -> Int {
    let v = c <= 0.0031308 ? 12.92 * c : 1.055 * pow(c, 1 / 2.4) - 0.055
    return Int((255 * v).rounded())
}

private func clamp255(_ v: Double) -> Double {
    return min(255, max(0, v))
}

private func labF(_ t: Double) -> Double {
    return t > EPS ? cbrt(t) : KAPPA * t + 16 / 116
}

private func labFinv(_ u: Double) -> Double {
    let c = u * u * u
    return c > EPS ? c : (u - 16 / 116) / KAPPA
}

/// sRGB (0..255) → CIELAB, D65 reference white.
public func rgbToLab(_ r: Double, _ g: Double, _ b: Double) -> Lab {
    let rl = srgbChannelToLinear(r)
    let gl = srgbChannelToLinear(g)
    let bl = srgbChannelToLinear(b)

    let x = (0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl) / XN
    let y = (0.2126729 * rl + 0.7151522 * gl + 0.072175 * bl) / YN
    let z = (0.0193339 * rl + 0.119192 * gl + 0.9503041 * bl) / ZN

    let fx = labF(x)
    let fy = labF(y)
    let fz = labF(z)

    return Lab(116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))
}

/// CIELAB → sRGB (0..255, rounded and clamped).
public func labToRgb(_ lab: Lab) -> (r: Int, g: Int, b: Int) {
    let fy = (lab.l + 16) / 116
    let fx = fy + lab.a / 500
    let fz = fy - lab.b / 200

    let x = labFinv(fx) * XN
    let y = labFinv(fy) * YN
    let z = labFinv(fz) * ZN

    let rl = M_INV[0] * x + M_INV[1] * y + M_INV[2] * z
    let gl = M_INV[3] * x + M_INV[4] * y + M_INV[5] * z
    let bl = M_INV[6] * x + M_INV[7] * y + M_INV[8] * z

    return (linearChannelToSrgb(rl), linearChannelToSrgb(gl), linearChannelToSrgb(bl))
}

/// Euclidean distance in CIELAB (CIE76).
public func labDistance(_ a: Lab, _ b: Lab) -> Double {
    let dl = a.l - b.l
    let da = a.a - b.a
    let db = a.b - b.b
    return (dl * dl + da * da + db * db).squareRoot()
}

/// CIEDE2000 color difference (Sharma, Wu & Dalal 2005 reference implementation).
public func labDistance2000(_ l1: Lab, _ l2: Lab) -> Double {
    let L1 = l1.l, a1 = l1.a, b1 = l1.b
    let L2 = l2.l, a2 = l2.a, b2 = l2.b

    let C1 = (a1 * a1 + b1 * b1).squareRoot()
    let C2 = (a2 * a2 + b2 * b2).squareRoot()
    let Cbar = (C1 + C2) / 2

    let c7 = pow(Cbar, 7)
    let G = 0.5 * (1 - (c7 / (c7 + pow(25.0, 7))).squareRoot())

    let a1p = (1 + G) * a1
    let a2p = (1 + G) * a2
    let C1p = (a1p * a1p + b1 * b1).squareRoot()
    let C2p = (a2p * a2p + b2 * b2).squareRoot()

    func hue(_ ap: Double, _ b: Double) -> Double {
        if ap == 0 && b == 0 { return 0 }
        var deg = atan2(b, ap) * 180 / Double.pi
        if deg < 0 { deg += 360 }
        return deg
    }
    let h1p = hue(a1p, b1)
    let h2p = hue(a2p, b2)

    let dLp = L2 - L1
    let dCp = C2p - C1p

    var dhp = 0.0
    if C1p * C2p != 0 {
        let diff = h2p - h1p
        if abs(diff) <= 180 {
            dhp = diff
        } else if diff > 180 {
            dhp = diff - 360
        } else {
            dhp = diff + 360
        }
    }
    let dHp = 2 * (C1p * C2p).squareRoot() * sin(dhp / 2 * Double.pi / 180)

    let Lbp = (L1 + L2) / 2
    let Cbp = (C1p + C2p) / 2

    var hbp: Double
    if C1p * C2p == 0 {
        hbp = h1p + h2p
    } else if abs(h1p - h2p) <= 180 {
        hbp = (h1p + h2p) / 2
    } else if h1p + h2p < 360 {
        hbp = (h1p + h2p + 360) / 2
    } else {
        hbp = (h1p + h2p - 360) / 2
    }

    let rad = Double.pi / 180
    let T = 1 - 0.17 * cos((hbp - 30) * rad) + 0.24 * cos(2 * hbp * rad)
        + 0.32 * cos((3 * hbp + 6) * rad) - 0.20 * cos((4 * hbp - 63) * rad)
    let dTheta = 30 * exp(-pow((hbp - 275) / 25, 2))
    let cp7 = pow(Cbp, 7)
    let RC = 2 * (cp7 / (cp7 + pow(25.0, 7))).squareRoot()
    let SL = 1 + 0.015 * pow(Lbp - 50, 2) / (20 + pow(Lbp - 50, 2)).squareRoot()
    let SC = 1 + 0.045 * Cbp
    let SH = 1 + 0.015 * Cbp * T
    let RT = -sin(2 * dTheta * rad) * RC

    let tL = dLp / SL
    let tC = dCp / SC
    let tH = dHp / SH
    return (tL * tL + tC * tC + tH * tH + RT * tC * tH).squareRoot()
}

/// Lab tuple → '#rrggbb' lowercase hex.
public func labToHex(_ lab: Lab) -> String {
    let rgb = labToRgb(lab)
    func hexByte(_ v: Int) -> String {
        let s = String(max(0, min(255, v)), radix: 16)
        return s.count == 1 ? "0" + s : s
    }
    return "#" + hexByte(rgb.r) + hexByte(rgb.g) + hexByte(rgb.b)
}

/// '#rgb' | '#rrggbb' → (r, g, b) 0..255. Returns nil on malformed input.
public func hexToRgb(_ hex: String) -> (r: Int, g: Int, b: Int)? {
    var s = hex.trimmingCharacters(in: .whitespaces)
    if s.hasPrefix("#") { s.removeFirst() }
    guard s.range(of: "^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$", options: .regularExpression) != nil else { return nil }
    if s.count == 3 {
        s = s.map { "\($0)\($0)" }.joined()
    }
    guard let v = UInt32(s, radix: 16) else { return nil }
    return (Int((v >> 16) & 255), Int((v >> 8) & 255), Int(v & 255))
}

/// YIQ luminance heuristic: Y >= 128 → light color (dark digit).
public func yiqLuma(_ r: Double, _ g: Double, _ b: Double) -> Double {
    return 0.299 * r + 0.587 * g + 0.114 * b
}
