import SwiftUI
import PaintEngine

struct ProcessingScreen: View {
    @EnvironmentObject private var store: AppStore

    private var stepName: String {
        switch store.progress.step {
        case .analyze: return store.localized("processing.step.analyze")
        case .palette: return store.localized("processing.step.palette")
        case .regions: return store.localized("processing.step.regions")
        case .merge: return store.localized("processing.step.merge")
        case .contours, .numbers: return store.localized("processing.step.numbers")
        }
    }

    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            ProgressView(value: Double(store.progress.percent), total: 100)
                .progressViewStyle(.linear)
                .padding(.horizontal, 48)
            Text(stepName)
                .font(.headline)
            Text("\(store.progress.percent)%")
                .font(.subheadline.monospacedDigit())
                .foregroundStyle(.secondary)
            Spacer()
            Button(store.localized("processing.back")) { store.cancelConversion() }
                .buttonStyle(.bordered)
                .padding(.bottom, 32)
        }
        .navigationTitle("")
    }
}
