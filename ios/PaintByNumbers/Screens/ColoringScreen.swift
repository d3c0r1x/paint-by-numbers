import SwiftUI
import PencilKit
import PaintEngine

struct ColoringScreen: View {
    @EnvironmentObject private var store: AppStore
    @State private var activeColorIdx: Int? = 0
    @State private var customColors: [String] = []
    @State private var activeCustom: String?
    @State private var tool: Tool = .brush
    @State private var brushSize: Double = 18
    @State private var opacity: Double = 1
    @State private var settingsOpen = false
    @State private var finishOpen = false
    @State private var devPreview = false
    @State private var savedFlash = false

    enum Tool { case brush, eraser }

    var body: some View {
        VStack(spacing: 0) {
            topBar
            CanvasContainer(
                store: store,
                activeColorIdx: $activeColorIdx,
                activeCustom: $activeCustom,
                tool: $tool,
                brushSize: brushSize,
                opacity: opacity,
                devPreview: devPreview,
                customColors: $customColors,
                savedFlash: $savedFlash
            )
            paletteBar
        }
        .sheet(isPresented: $settingsOpen) { settingsSheet }
        .sheet(isPresented: $finishOpen) { finishSheet }
    }

    // MARK: - Top bar

    private var topBar: some View {
        HStack(spacing: 14) {
            Button { undoLatest() } label: { Image(systemName: "arrow.uturn.backward") }
            Button { redoLatest() } label: { Image(systemName: "arrow.uturn.forward") }
            if ProcessInfo.processInfo.environment["PBN_DEV"] != nil || isDebug {
                Button { devPreview.toggle() } label: { Image(systemName: "eye") }
                    .tint(devPreview ? .accentColor : .primary)
            }
            Spacer()
            Button { save() } label: { Image(systemName: "square.and.arrow.down") }
            Button { exportSheet() } label: { Image(systemName: "square.and.arrow.up") }
            Button { settingsOpen = true } label: { Image(systemName: "slider.horizontal.3") }
            Button { store.screen = .home } label: { Image(systemName: "house") }
        }
        .font(.system(size: 17, weight: .medium))
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .overlay(alignment: .top) {
            if savedFlash {
                Text(store.localized("coloring.saved"))
                    .font(.caption.bold())
                    .padding(.horizontal, 12).padding(.vertical, 6)
                    .background(Capsule().fill(.black.opacity(0.8)))
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
    }

    private var isDebug: Bool {
        #if DEBUG
        return true
        #endif
        return false
    }

    // MARK: - Palette

    private var paletteBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(store.result?.palette ?? [], id: \.index) { entry in
                    ColorSwatch(
                        entry: entry,
                        active: activeCustom == nil && activeColorIdx == entry.index)
                    .onTapGesture {
                        activeColorIdx = entry.index
                        activeCustom = nil
                        tool = .brush
                        UISelectionFeedbackGenerator().selectionChanged()
                    }
                }
                ForEach(customColors, id: \.self) { hex in
                    Circle()
                        .fill(Color(hex: hex))
                        .frame(width: 40, height: 40)
                        .overlay(Circle().strokeBorder(.primary, lineWidth: activeCustom == hex ? 3 : 0))
                        .onTapGesture {
                            activeCustom = hex
                            activeColorIdx = nil
                            tool = .brush
                        }
                }
                ColorPicker("", selection: Binding(
                    get: { Color(hex: customColors.last ?? "#808080") },
                    set: { ui in
                        let hex = ui.toHex() ?? "#808080"
                        if !customColors.contains(hex) { customColors.append(hex) }
                        activeCustom = hex
                        activeColorIdx = nil
                    }), supportsOpacity: false)
                    .labelsHidden()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .background(.bar)
    }

    // MARK: - Sheets

    private var settingsSheet: some View {
        NavigationStack {
            Form {
                Picker(store.localized("coloring.tool.brush"), selection: $tool) {
                    Text(store.localized("coloring.tool.brush")).tag(Tool.brush)
                    Text(store.localized("coloring.tool.eraser")).tag(Tool.eraser)
                }
                .pickerStyle(.segmented)
                VStack {
                    HStack { Text(store.localized("coloring.brushSize")); Spacer(); Text("\(Int(brushSize))px") }
                    Slider(value: $brushSize, in: 2...60)
                }
                VStack {
                    HStack { Text(store.localized("coloring.opacity")); Spacer(); Text("\(Int(opacity * 100))%") }
                    Slider(value: $opacity, in: 0.1...1)
                }
                Toggle("Только Apple Pencil", isOn: .constant(true))
            }
            .navigationTitle(store.localized("coloring.settingsTitle"))
            .toolbar { Button(store.localized("common.close")) { settingsOpen = false } }
        }
        .presentationDetents([.medium])
    }

    private var finishSheet: some View {
        VStack(spacing: 18) {
            Text(store.localized("coloring.finishTitle")).font(.headline)
            Text(store.localized("coloring.finishText"))
                .font(.subheadline).foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            HStack(spacing: 12) {
                Button(store.localized("common.cancel")) { finishOpen = false }
                    .buttonStyle(.bordered)
                Button { finishForMe() } label: {
                    Label(store.localized("coloring.finishGo"), systemImage: "wand.and.stars")
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding(24)
        .presentationDetents([.medium])
    }

    private func exportSheet() {
        guard let result = store.result, let image = exportImage(result: result) else { return }
        let activity = UIActivityViewController(activityItems: [image], applicationActivities: nil)
        UIApplication.shared.connectedScenes
            .compactMap { ($0 as? UIWindowScene)?.keyWindow?.rootViewController }
            .first?.present(activity, animated: true)
    }

    // MARK: - Actions

    private var activeHex: String {
        if let activeCustom { return activeCustom }
        if let i = activeColorIdx, let p = store.result?.palette[safe: i] { return p.hex }
        return "#000000"
    }

    private func save() {
        Task {
            await store.persistCurrent(strokesJSON: Data(), customColors: customColors)
            withAnimation { savedFlash = true }
            try? await Task.sleep(for: .seconds(1.5))
            withAnimation { savedFlash = false }
        }
    }

    private func undoLatest() { NotificationCenter.default.post(name: .pbnUndo, object: nil) }
    private func redoLatest() { NotificationCenter.default.post(name: .pbnRedo, object: nil) }

    private func finishForMe() {
        finishOpen = false
        NotificationCenter.default.post(name: .pbnFillAll, object: nil)
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    }

    private func exportImage(result: PipelineResult) -> UIImage? {
        guard let source = store.sourceImage else { return nil }
        let size = CGSize(width: result.width, height: result.height)
        return UIGraphicsImageRenderer(size: size).image { ctx in
            source.draw(in: CGRect(origin: .zero, size: size))
        }
    }
}

extension Collection {
    subscript(safe i: Index?) -> Element? {
        guard let i, startIndex <= i, i < endIndex else { return nil }
        return self[i]
    }
}

extension Color {
    init(hex: String) {
        var s = hex.trimmingCharacters(in: .whitespaces)
        if s.hasPrefix("#") { s.removeFirst() }
        let v = UInt32(s, radix: 16) ?? 0
        self.init(red: Double((v >> 16) & 255) / 255,
                  green: Double((v >> 8) & 255) / 255,
                  blue: Double(v & 255) / 255)
    }
}

extension UIColor {
    func toHex() -> String? {
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        getRed(&r, green: &g, blue: &b, alpha: &a)
        return String(format: "#%02x%02x%02x", Int(r * 255), Int(g * 255), Int(b * 255))
    }
}

extension UIApplication {
    static var keyRoot: UIViewController? {
        connectedScenes
            .compactMap { ($0 as? UIWindowScene)?.keyWindow?.rootViewController }
            .first
    }
}

import UIKit

let pbnUndo = Notification.Name("pbnUndo")
let pbnRedo = Notification.Name("pbnRedo")
let pbnFillAll = Notification.Name("pbnFillAll")
