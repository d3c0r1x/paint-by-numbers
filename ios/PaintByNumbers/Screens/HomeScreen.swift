import SwiftUI
import PhotosUI

struct HomeScreen: View {
    @EnvironmentObject private var store: AppStore
    @State private var pickerItem: PhotosPickerItem?

    var body: some View {
        NavigationStack {
            VStack(spacing: 28) {
                Spacer()
                Image(systemName: "paintpalette.fill")
                    .font(.system(size: 64))
                    .foregroundStyle(Color.accentColor)
                Text(store.localized("app.title"))
                    .font(.largeTitle.bold())

                PhotosPicker(selection: $pickerItem, matching: .images) {
                    Label(store.localized("home.pickImage"), systemImage: "photo.on.rectangle.angled")
                        .font(.title3.bold())
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                }
                .buttonStyle(.borderedProminent)
                .padding(.horizontal, 32)

                Text(store.localized("home.pickHint"))
                    .font(.footnote)
                    .foregroundStyle(.secondary)

                Spacer()

                if !store.projects.isEmpty {
                    NavigationLink(value: "") {
                        Label(store.localized("home.myProjects"), systemImage: "square.grid.2x2")
                    }
                    .simultaneousGesture(TapGesture().onStoreScreen(store))
                    .padding(.bottom, 24)
                }
            }
            .navigationTitle("")
            .onChange(of: pickerItem) { item in
                guard let item else { return }
                Task {
                    if let data = try? await item.loadTransferable(type: Data.self),
                       let image = UIImage(data: data) {
                        store.startConversion(image: image, name: "photo")
                    }
                }
                pickerItem = nil
            }
            .onAppear { store.loadStoredProjects() }
        }
    }
}

private extension TapGesture {
    func onStoreScreen(_ store: AppStore) -> _EndedGesture<TapGesture> {
        onTapGesture { store.screen = .catalog }
    }
}

import UIKit
import PaintEngine
