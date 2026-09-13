import UIKit
import PaintEngine

struct ProjectSummary: Identifiable, Codable {
    var id: String
    var name: String
    var createdAt: Date
    var updatedAt: Date
    var colorCount: Int
    var regionCount: Int
}

/// Saved project bundle: everything needed to restore the coloring session.
struct StoredProject: Codable {
    var id: String
    var name: String
    var createdAt: Date
    var updatedAt: Date
    var result: PipelineResult
    var strokesJSON: Data
    var customColors: [String]
    var progressDone: Int
    var progressTotal: Int
}

/// Projects live in Documents/<uuid>/ with meta.json, image.png, thumb.png.
final class ProjectStore {
    private let dir: URL

    init() {
        let base = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        dir = base.appendingPathComponent("Projects", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    }

    private func projectDir(_ id: String) -> URL {
        dir.appendingPathComponent(id, isDirectory: true)
    }

    func save(id: String?, name: String, image: UIImage, result: PipelineResult,
              strokesJSON: Data, customColors: [String]) async -> String {
        let pid = id ?? UUID().uuidString
        let target = projectDir(pid)
        try? FileManager.default.createDirectory(at: target, withIntermediateDirectories: true)

        let existing = try? load(id: pid)
        let project = StoredProject(
            id: pid, name: name,
            createdAt: existing?.createdAt ?? Date(),
            updatedAt: Date(),
            result: result,
            strokesJSON: strokesJSON,
            customColors: customColors,
            progressDone: 0, progressTotal: result.regions.count)

        if let data = try? JSONEncoder().encode(project) {
            try? data.write(to: target.appendingPathComponent("meta.json"), options: .atomic)
        }
        if let png = image.pngData() {
            try? png.write(to: target.appendingPathComponent("image.png"), options: .atomic)
        }
        await MainActor.run { self.rebuildIndex() }
        return pid
    }

    func load(id: String, completion: @escaping (StoredProject?) -> Void) {
        let meta = projectDir(id).appendingPathComponent("meta.json")
        let image = projectDir(id).appendingPathComponent("image.png")
        DispatchQueue.global(qos: .userInitiated).async {
            guard let data = try? Data(contentsOf: meta),
                  var project = try? JSONDecoder().decode(StoredProject.self, from: data) else {
                DispatchQueue.main.async { completion(nil) }
                return
            }
            if let imgData = try? Data(contentsOf: image), let img = UIImage(data: imgData) {
                project.image = img
            }
            DispatchQueue.main.async { completion(project) }
        }
    }

    func delete(id: String) {
        try? FileManager.default.removeItem(at: projectDir(id))
        rebuildIndex()
    }

    /// Index scan: lightweight summaries without decoding full results.
    func list(completion: @escaping ([ProjectSummary]) -> Void) {
        let dir = self.dir
        DispatchQueue.global(qos: .userInitiated).async {
            var items: [ProjectSummary] = []
            let ids = (try? FileManager.default.contentsOfDirectory(atPath: dir.path)) ?? []
            for id in ids {
                let meta = dir.appendingPathComponent(id).appendingPathComponent("meta.json")
                guard let data = try? Data(contentsOf: meta),
                      let project = try? JSONDecoder().decode(StoredProject.self, from: data) else { continue }
                items.append(ProjectSummary(
                    id: project.id, name: project.name,
                    createdAt: project.createdAt, updatedAt: project.updatedAt,
                    colorCount: project.result.palette.count,
                    regionCount: project.result.regions.count))
            }
            items.sort { $0.updatedAt > $1.updatedAt }
            DispatchQueue.main.async { completion(items) }
        }
    }

    private func rebuildIndex() {
        list { _ in }
    }
}

extension StoredProject {
    private static let imageKey = CodingUserInfoKey(rawValue: "image")!

    enum CodingKeys: String, CodingKey {
        case id, name, createdAt, updatedAt, result, strokesJSON, customColors, progressDone, progressTotal
    }

    var image: UIImage? {
        get { objc_getAssociatedObject(self, &Self.imageKey) as? UIImage }
        set { objc_setAssociatedObject(self, &Self.imageKey, newValue, .OBJC_ASSOCIATION_RETAIN) }
    }
}
