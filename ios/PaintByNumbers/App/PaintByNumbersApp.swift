import SwiftUI

enum Screen: Equatable {
    case home
    case processing
    case coloring
    case catalog
}

@main
struct PaintByNumbersApp: App {
    @StateObject private var store = AppStore()

    var body: some Scene {
        WindowGroup {
            switch store.screen {
            case .home: HomeScreen()
            case .processing: ProcessingScreen()
            case .coloring: ColoringScreen()
            case .catalog: CatalogScreen()
            }
        }
        .environmentObject(store)
    }
}
