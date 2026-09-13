import SwiftUI
import PaintEngine

/// Palette circle: color fill + symbol digit, contrast-aware digit color.
struct ColorSwatch: View {
    let entry: PaletteEntry
    let active: Bool

    private var digitIsDark: Bool {
        guard let rgb = hexToRgb(entry.hex) else { return true }
        return yiqLuma(Double(rgb.r), Double(rgb.g), Double(rgb.b)) >= 128
    }

    var body: some View {
        ZStack {
            Circle()
                .fill(Color(hex: entry.hex))
            Text(symbolFor(entry.index))
                .font(.system(size: 15, weight: .bold, design: .rounded))
                .foregroundColor(digitIsDark ? .black : .white)
        }
        .frame(width: 40, height: 40)
        .overlay(Circle().strokeBorder(.primary, lineWidth: active ? 3 : 0))
        .scaleEffect(active ? 1.15 : 1)
        .animation(.spring(duration: 0.25), value: active)
    }
}
