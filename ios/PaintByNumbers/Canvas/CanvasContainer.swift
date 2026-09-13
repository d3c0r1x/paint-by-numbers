import SwiftUI
import UIKit
import PencilKit
import PaintEngine

/// SwiftUI bridge for the layered canvas + zoom/pan scroll container.
struct CanvasContainer: UIViewRepresentable {
    let store: AppStore
    @Binding var activeColorIdx: Int?
    @Binding var activeCustom: String?
    @Binding var tool: ColoringScreen.Tool
    let brushSize: Double
    let opacity: Double
    let devPreview: Bool
    @Binding var customColors: [String]
    @Binding var savedFlash: Bool

    func makeUIView(context: Context) -> UIScrollView {
        let scroll = UIScrollView()
        scroll.minimumZoomScale = 0.5
        scroll.maximumZoomScale = 12
        scroll.delegate = context.coordinator

        let stack = CanvasStackView(frame: .zero)
        stack.canvasView.overrideUserInterfaceStyle = .light
        context.coordinator.stack = stack
        context.coordinator.scroll = scroll

        scroll.addSubview(stack)
        stack.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            stack.widthAnchor.constraint(equalTo: scroll.contentLayoutGuide.widthAnchor),
            stack.heightAnchor.constraint(equalTo: scroll.contentLayoutGuide.heightAnchor),
        ])

        // Route pencil interactions to screen actions.
        stack.onToggleTool = { [weak coordinator = context.coordinator] in
            coordinator?.toggleTool()
        }
        stack.onSqueeze = { [weak coordinator = context.coordinator] in
            coordinator?.showSqueezePalette()
        }

        // Notifications from the SwiftUI chrome.
        let nc = NotificationCenter.default
        nc.addObserver(context.coordinator, selector: #selector(Coordinator.undo),
                       name: .pbnUndo, object: nil)
        nc.addObserver(context.coordinator, selector: #selector(Coordinator.redo),
                       name: .pbnRedo, object: nil)
        nc.addObserver(context.coordinator, selector: #selector(Coordinator.fillAll),
                       name: .pbnFillAll, object: nil)

        if let result = store.result {
            stack.configure(result: result)
            context.coordinator.fit(scroll: scroll, result: result)
        }
        return scroll
    }

    func updateUIView(_ scroll: UIScrollView, context: Context) {
        guard let stack = context.coordinator.stack else { return }
        stack.setHighlight(colorIdx: activeCustom == nil ? activeColorIdx : nil)
        stack.setFillPreview(visible: devPreview)
        context.coordinator.applyTool(tool: tool, hex: activeHex, size: brushSize, opacity: opacity)

        if let result = store.result, context.coordinator.configuredResult == nil {
            stack.configure(result: result)
            context.coordinator.configuredResult = result
            context.coordinator.fit(scroll: scroll, result: result)
        }
    }

    private var activeHex: String {
        if let activeCustom { return activeCustom }
        if let i = activeColorIdx, let p = store.result?.palette[safe: i] { return p.hex }
        return "#000000"
    }

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    final class Coordinator: NSObject, UIScrollViewDelegate {
        var parent: CanvasContainer
        weak var stack: CanvasStackView?
        weak var scroll: UIScrollView?
        var configuredResult: PipelineResult?
        private var undoStack: [PKDrawing] = []
        private var redoStack: [PKDrawing] = []

        init(_ parent: CanvasContainer) { self.parent = parent }

        func viewForZooming(in scrollView: UIScrollView) -> UIView? { stack }

        func fit(scroll: UIScrollView, result: PipelineResult) {
            let size = CGSize(width: result.width, height: result.height)
            scroll.contentSize = size
            DispatchQueue.main.async {
                guard let container = scroll.superview else { return }
                let scale = min(
                    container.bounds.width / size.width,
                    container.bounds.height / size.height,
                    1)
                scroll.zoomScale = scale
                scroll.contentOffset = CGPoint(
                    x: max(0, (size.width * scale - scroll.bounds.width) / 2),
                    y: max(0, (size.height * scale - scroll.bounds.height) / 2))
            }
        }

        func applyTool(tool: ColoringScreen.Tool, hex: String, size: Double, opacity: Double) {
            guard let canvas = stack?.canvasView else { return }
            switch tool {
            case .brush:
                canvas.tool = PKInkingTool(.pen, color: UIColor(hex: hex) ?? .black, width: CGFloat(size))
            case .eraser:
                canvas.tool = PKEraserTool(.bitmap)
            }
            canvas.isOpaque = false
            _ = opacity // PKInkingTool embeds opacity via color alpha
        }

        func toggleTool() {
            parent.tool = parent.tool == .brush ? .eraser : .brush
        }

        /// Pencil Pro squeeze: palette strip anchored near the nib.
        func showSqueezePalette() {
            guard let root = UIApplication.keyRoot else { return }
            let vc = UIHostingController(rootView: SqueezePaletteView(parent: parent))
            vc.modalPresentationStyle = .popover
            if let pop = vc.popoverPresentationController {
                pop.sourceView = stack
                pop.sourceRect = CGRect(x: stack?.bounds.midX ?? 0, y: 0, width: 1, height: 1)
                pop.permittedArrowDirections = .any
            }
            root.presentedViewController == nil ? root.present(vc, animated: true) : root.dismiss(animated: true)
        }

        @objc func undo() {
            guard let canvas = stack?.canvasView else { return }
            let drawing = canvas.drawing
            guard drawing.strokes.count > 0 || undoStack.isEmpty == false else { return }
            undoStack.append(drawing)
            if let last = drawing.strokes.last {
                let reduced = PKDrawing(strokes: drawing.strokes.dropLast())
                canvas.drawing = reduced
                _ = last
            }
            redoStack = []
        }

        @objc func redo() {
            guard let canvas = stack?.canvasView, let prev = undoStack.popLast() else { return }
            redoStack.append(canvas.drawing)
            canvas.drawing = prev
        }

        @objc func fillAll() {
            stack?.applyFillAll()
        }
    }
}

/// Compact palette popover for the Pencil Pro squeeze gesture.
struct SqueezePaletteView: View {
    var parent: CanvasContainer
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 10) {
            ForEach(parent.store.result?.palette ?? [], id: \.index) { entry in
                Circle()
                    .fill(Color(hex: entry.hex))
                    .frame(width: 34, height: 34)
                    .onTapGesture {
                        parent.activeColorIdx = entry.index
                        parent.activeCustom = nil
                        dismiss()
                        UISelectionFeedbackGenerator().selectionChanged()
                    }
            }
        }
        .padding(12)
    }
}
