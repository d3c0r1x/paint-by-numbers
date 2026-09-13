import SwiftUI
import UIKit
import PencilKit
import PaintEngine

/// UIKit layer stack wrapped for SwiftUI:
///   (1) white background, (2) vector contours + numbers (CALayer under the
///   paint — eraser never touches them), (3) active-color highlight,
///   (4) PKCanvasView paint (Pencil with pressure/tilt/roll),
///   (5) dev reference-fill overlay (pointer-events none).
final class CanvasStackView: UIView, PKCanvasViewDelegate, UIPencilInteractionDelegate {
    private let bgLayer = CALayer()
    private let lineLayer = CALayer()
    private let highlightLayer = CALayer()
    private let fillPreviewLayer = CALayer()
    let canvasView = PKCanvasView()

    /// Set by the view controller; forwards drawing changes.
    var onDrawingChanged: (() -> Void)?
    /// Double-tap Pencil action: toggle brush/eraser.
    var onToggleTool: (() -> Void)?
    /// Squeeze (Pencil Pro): show palette popover at the nib.
    var onSqueeze: (() -> Void)?

    private var result: PipelineResult?
    private var pathsByRegion: [Int: UIBezierPath] = [:]

    override init(frame: CGRect) {
        super.init(frame: frame)
        layer.addSublayer(bgLayer)
        layer.addSublayer(lineLayer)
        layer.addSublayer(highlightLayer)
        layer.addSublayer(fillPreviewLayer)

        canvasView.delegate = self
        canvasView.drawingPolicy = .anyInput
        canvasView.backgroundColor = .clear
        canvasView.isOpaque = false
        addSubview(canvasView)

        // Pencil Pro squeeze (iOS 17.5+).
        let squeeze = UIPencilInteraction()
        squeeze.delegate = self
        canvasView.addInteraction(squeeze)

        // Hover: ring cursor before the Pencil touches down.
        let hover = UIHoverGestureRecognizer(target: self, action: #selector(handleHover(_:)))
        addGestureRecognizer(hover)

        // Double-tap: brush↔eraser toggle (system default is fine, we also
        // surface it to the tool state).
        NotificationCenter.default.addObserver(
            self, selector: #selector(pencilSettingsChanged),
            name: .PKCanvasViewDrawingDidChange, object: canvasView)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    override func layoutSubviews() {
        super.layoutSubviews()
        for l in [bgLayer, lineLayer, highlightLayer, fillPreviewLayer] {
            l.frame = bounds
        }
        canvasView.frame = bounds
    }

    // MARK: - Setup

    func configure(result: PipelineResult) {
        self.result = result
        let w = CGFloat(result.width)
        let h = CGFloat(result.height)
        for l in [bgLayer, lineLayer, highlightLayer, fillPreviewLayer] {
            l.contentsScale = UIScreen.main.scale
            l.contentsGravity = .resize
        }
        bgLayer.contents = renderBackground(w, h)
        lineLayer.contents = renderLines(w, h)
    }

    private func renderBackground(_ w: CGFloat, _ h: CGFloat) -> CGImage? {
        let size = CGSize(width: w, height: h)
        return UIGraphicsImageRenderer(size: size).image { ctx in
            UIColor.white.setFill()
            ctx.fill(CGRect(origin: .zero, size: size))
        }.cgImage
    }

    /// Vector contours (Douglas–Peucker → Chaikin polylines from PaintEngine)
    /// stroked with round joins + number glyphs.
    private func renderLines(_ w: CGFloat, _ h: CGFloat) -> CGImage? {
        guard let result else { return nil }
        let size = CGSize(width: w, height: h)
        let polysByRegion = traceRegionBoundaries(result.labels, result.width, result.height)
        let image = UIGraphicsImageRenderer(size: size).image { ctx in
            let cg = ctx.cgContext
            cg.setStrokeColor(UIColor.black.cgColor)
            cg.setLineWidth(2)
            cg.setLineJoin(.round)
            cg.setLineCap(.round)
            for (rid, polys) in polysByRegion {
                for smoothed in smoothPolys(polys) {
                    let path = bezier(from: smoothed.pts)
                    pathsByRegion[rid] = path
                    cg.addPath(path.cgPath)
                    cg.strokePath()
                }
            }
            // Numbers: dark gray, size from the region heuristic.
            for r in result.regions {
                let text = symbolFor(r.colorIdx)
                let font = UIFont.systemFont(ofSize: CGFloat(r.fontSize), weight: .medium)
                let attrs: [NSAttributedString.Key: Any] = [
                    .font: font, .foregroundColor: UIColor(white: 0.2, alpha: 1),
                ]
                let str = NSAttributedString(string: text, attributes: attrs)
                let sz = str.size()
                str.draw(at: CGPoint(x: CGFloat(r.labelX) - sz.width / 2, y: CGFloat(r.labelY) - sz.height / 2))
            }
        }
        return image.cgImage
    }

    private func bezier(from pts: [Double]) -> UIBezierPath {
        let path = UIBezierPath()
        guard pts.count >= 6 else { return path }
        path.move(to: CGPoint(x: pts[0], y: pts[1]))
        for i in 1..<(pts.count / 2) {
            path.addLine(to: CGPoint(x: pts[i * 2], y: pts[i * 2 + 1]))
        }
        path.close()
        return path
    }

    // MARK: - Highlight + dev preview

    func setHighlight(colorIdx: Int?) {
        guard let result else { return }
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        highlightLayer.contents = nil
        if let idx = colorIdx, idx < result.palette.count {
            let hex = result.palette[idx].hex
            let color = UIColor(hex: hex) ?? .black
            let ids = regionIdsByColorIndex(result.regions)[idx] ?? []
            let size = CGSize(width: result.width, height: result.height)
            highlightLayer.contents = UIGraphicsImageRenderer(size: size).image { ctx in
                ctx.cgContext.setFillColor(color.withAlphaComponent(0.35).cgColor)
                for id in ids {
                    if let path = pathsByRegion[id] { ctx.cgContext.addPath(path.cgPath); ctx.cgContext.fillPath() }
                }
            }.cgImage
        }
        CATransaction.commit()
    }

    func setFillPreview(visible: Bool) {
        guard let result else { return }
        guard visible else { fillPreviewLayer.contents = nil; return }
        let size = CGSize(width: result.width, height: result.height)
        let px = buildFillPixels(result.labels, result.regions, result.palette, result.width, result.height)
        var rgba = px
        for i in stride(from: 3, to: rgba.count, by: 4) { rgba[i] = 255 }
        let ctx = CGContext(data: &rgba, width: result.width, height: result.height,
                            bitsPerComponent: 8, bytesPerRow: result.width * 4,
                            space: CGColorSpaceCreateDeviceRGB(),
                            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
        fillPreviewLayer.contents = ctx?.makeImage()
    }

    // MARK: - "Finish for me"

    func applyFillAll() {
        guard let result, let drawing = try? PKDrawing(rgba: nil) else { return }
        _ = drawing // placeholder; real implementation composites fill under strokes
        compositeFillUnderStrokes()
    }

    private func compositeFillUnderStrokes() {
        guard let result else { return }
        let size = CGSize(width: result.width, height: result.height)
        let fill = UIGraphicsImageRenderer(size: size).image { ctx in
            let px = buildFillPixels(result.labels, result.regions, result.palette, result.width, result.height)
            var rgba = px
            for i in stride(from: 3, to: rgba.count, by: 4) { rgba[i] = 255 }
            if let cg = CGContext(data: &rgba, width: result.width, height: result.height,
                                  bitsPerComponent: 8, bytesPerRow: result.width * 4,
                                  space: CGColorSpaceCreateDeviceRGB(),
                                  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue),
               let img = cg.makeImage() {
                ctx.cgContext.draw(img, in: CGRect(origin: .zero, size: size))
            }
        }
        // Render current strokes, then composite fill beneath them.
        let strokesImage = canvasView.drawing.image(from: canvasView.bounds, scale: 1)
        let merged = UIGraphicsImageRenderer(size: size).image { ctx in
            ctx.cgContext.draw(fill.cgImage ?? CGImage(), in: CGRect(origin: .zero, size: size))
            ctx.cgContext.draw(strokesImage.cgImage ?? CGImage(), in: CGRect(origin: .zero, size: size))
        }
        canvasView.drawing = PKDrawing(image: merged)
    }

    // MARK: - Pencil interactions

    func pencilInteraction(_ interaction: UIPencilInteraction, didReceive tap: UIPencilInteraction.Tap) {
        // Double-tap Pencil: brush↔eraser.
        onToggleTool?()
        UISelectionFeedbackGenerator().selectionChanged()
    }

    /// Pencil Pro squeeze: palette popover at the nib + haptic.
    func pencilDidSqueeze(_ interaction: UIPencilInteraction, didReceive squeeze: UIPencilInteraction.Squeeze) {
        onSqueeze?()
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    }

    @objc private func handleHover(_ g: UIHoverGestureRecognizer) {
        // System already renders the Pencil hover effect on supported hardware;
        // we could add a brush-size ring here.
        switch g.state {
        case .began, .changed:
            canvasView.overrideUserInterfaceStyle = .unspecified
        default: break
        }
    }

    @objc private func pencilSettingsChanged() { onDrawingChanged?() }

    func canvasViewDrawingDidChange(_ canvasView: PKCanvasView) { onDrawingChanged?() }
}

extension UIColor {
    convenience init?(hex: String) {
        var s = hex.trimmingCharacters(in: .whitespaces)
        if s.hasPrefix("#") { s.removeFirst() }
        guard s.count == 6, let v = UInt32(s, radix: 16) else { return nil }
        self.init(red: CGFloat((v >> 16) & 255) / 255,
                  green: CGFloat((v >> 8) & 255) / 255,
                  blue: CGFloat(v & 255) / 255, alpha: 1)
    }
}
