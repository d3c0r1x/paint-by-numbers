import SwiftUI
import PaintEngine
import UniformTypeIdentifiers

/// Central observable state: navigation + the current conversion + projects.
@MainActor
final class AppStore: ObservableObject {
    @Published var screen: Screen = .home
    @Published var sourceImage: UIImage?
    @Published var sourceName: String = ""
    @Published var result: PipelineResult?
    @Published var progress: Progress = Progress(step: .analyze, percent: 0)
    @Published var conversionError: String?
    @Published var projectId: String?
    @Published var projects: [ProjectSummary] = []
    @Published var lang: String = Locale.preferredLanguages.first?.hasPrefix("ru") == true ? "ru" : "en"

    private let projects = ProjectStore()
    private var convertTask: Task<Void, Never>?

    func localized(_ key: String) -> String {
        let path = Bundle.main.path(forResource: lang, ofType: "lproj")
        let bundle = path.map { Bundle(path: $0) } ?? Bundle.main
        return bundle.localizedString(forKey: key, value: key, table: nil)
    }

    func loadStoredProjects() {
        projects.list { [weak self] items in
            Task { @MainActor in self?.projects = items }
        }
    }

    /// Import a photo and start the smart conversion pipeline off-main.
    func startConversion(image: UIImage, name: String) {
        sourceImage = image
        sourceName = name
        projectId = nil
        conversionError = nil
        result = nil
        screen = .processing

        guard let rgba = image.pixelBufferRGBA() else {
            conversionError = localized("processing.error")
            screen = .home
            return
        }
        let w = image.pixelWidth
        let h = image.pixelHeight

        convertTask = Task { [weak self] in
            guard let self else { return }
            let result = await Task.detached(priority: .userInitiated) { () -> PipelineResult in
                runPipeline(rgba, w, h) { p in
                    Task { @MainActor in
                        self.progress = p
                    }
                }
            }.value
            if Task.isCancelled { return }
            self.result = result
            self.screen = .coloring
        }
    }

    func cancelConversion() {
        convertTask?.cancel()
        screen = .home
    }

    func persistCurrent(strokesJSON: Data, customColors: [String]) async {
        guard let image = sourceImage, let result else { return }
        let id = await projects.save(
            id: projectId,
            name: sourceName.isEmpty ? localized("app.title") : sourceName,
            image: image,
            result: result,
            strokesJSON: strokesJSON,
            customColors: customColors)
        projectId = id
    }

    func openProject(id: String) {
        projects.load(id: id) { [weak self] project in
            Task { @MainActor in
                guard let self, let project else { return }
                self.sourceImage = project.image
                self.sourceName = project.name
                self.result = project.result
                self.projectId = project.id
                self.screen = .coloring
                NotificationCenter.default.post(
                    name: .openProjectCompleted, object: nil,
                    userInfo: ["strokes": project.strokesJSON, "custom": project.customColors])
            }
        }
    }

    func deleteProject(id: String) {
        projects.delete(id: id)
        loadStoredProjects()
    }
}

extension Notification.Name {
    static let openProjectCompleted = Notification.Name("openProjectCompleted")
}

extension UIImage {
    var pixelWidth: Int { Int(size.width * scale) }
    var pixelHeight: Int { Int(size.height * scale) }

    /// RGBA byte buffer (r,g,b,a per pixel) for the engine.
    func pixelBufferRGBA() -> [UInt8]? {
        let w = pixelWidth
        let h = pixelHeight
        guard w > 0, h > 0, w * h <= 40_000_000 else { return nil }
        var data = [UInt8](repeating: 0, count: w * h * 4)
        let ok = data.withUnsafeMutableBytes { ptr -> Bool in
            guard let ctx = CGContext(
                data: ptr.baseAddress,
                width: w, height: h,
                bitsPerComponent: 8, bytesPerRow: w * 4,
                space: CGColorSpaceCreateDeviceRGB(),
                bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue),
                let cg = self.cgImage else { return false }
            ctx.draw(cg, in: CGRect(x: 0, y: 0, width: w, height: h))
            return true
        }
        return ok ? data : nil
    }
}
