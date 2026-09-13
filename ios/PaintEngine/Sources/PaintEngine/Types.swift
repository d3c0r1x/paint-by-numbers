/// Shared engine + pipeline types (port of src/engine/types.ts).

public struct Lab: Equatable, Sendable {
    public var l: Double
    public var a: Double
    public var b: Double

    public init(_ l: Double, _ a: Double, _ b: Double) {
        self.l = l
        self.a = a
        self.b = b
    }
}

public struct PaletteEntry: Equatable, Sendable {
    public var index: Int
    public var lab: Lab
    public var hex: String
    public var pixelCount: Int

    public init(index: Int, lab: Lab, hex: String, pixelCount: Int) {
        self.index = index
        self.lab = lab
        self.hex = hex
        self.pixelCount = pixelCount
    }
}

public struct RegionInfo: Equatable, Sendable {
    public var colorIdx: Int
    public var area: Int
    public var labelX: Double
    public var labelY: Double
    public var fontSize: Int

    public init(colorIdx: Int, area: Int, labelX: Double, labelY: Double, fontSize: Int) {
        self.colorIdx = colorIdx
        self.area = area
        self.labelX = labelX
        self.labelY = labelY
        self.fontSize = fontSize
    }
}

/// Result of the smart pipeline: region id per pixel; regions[i].colorIdx
/// indexes into `palette`.
public struct PipelineResult: Sendable {
    public var width: Int
    public var height: Int
    public var labels: [UInt32]
    public var palette: [PaletteEntry]
    public var regions: [RegionInfo]

    public init(width: Int, height: Int, labels: [UInt32], palette: [PaletteEntry], regions: [RegionInfo]) {
        self.width = width
        self.height = height
        self.labels = labels
        self.palette = palette
        self.regions = regions
    }
}

/// Steps of the smart pipeline (for progress reporting).
public enum PipelineStep: String, Sendable {
    case analyze, palette, regions, merge, contours, numbers
}
