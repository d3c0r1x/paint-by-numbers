// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "PaintEngine",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "PaintEngine", targets: ["PaintEngine"])
    ],
    targets: [
        .target(name: "PaintEngine"),
        .testTarget(name: "PaintEngineTests", dependencies: ["PaintEngine"]),
    ]
)
