import SwiftUI

struct CatalogScreen: View {
    @EnvironmentObject private var store: AppStore
    @State private var deleteTarget: ProjectSummary?

    private let columns = [GridItem(.adaptive(minimum: 160), spacing: 16)]

    var body: some View {
        NavigationStack {
            ScrollView {
                if store.projects.isEmpty {
                    Text(store.localized("home.noProjects"))
                        .foregroundStyle(.secondary)
                        .padding(.top, 60)
                } else {
                    LazyVGrid(columns: columns, spacing: 16) {
                        ForEach(store.projects) { project in
                            card(project)
                        }
                    }
                    .padding(16)
                }
            }
            .navigationTitle(store.localized("home.myProjects"))
        }
    }

    private func card(_ project: ProjectSummary) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            ProjectThumbnail(projectId: project.id)
                .aspectRatio(1, contentMode: .fit)
                .clipShape(RoundedRectangle(cornerRadius: 14))
            Text(project.name)
                .font(.subheadline.bold())
                .lineLimit(1)
            Text("\(project.colorCount) · \(project.regionCount)")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .contentShape(Rectangle())
        .onTapGesture { store.openProject(id: project.id) }
        .contextMenu {
            Button(role: .destructive) { deleteTarget = project } label: {
                Label(store.localized("common.delete"), systemImage: "trash")
            }
        }
        .alert(store.localized("common.confirmDelete"), isPresented: Binding(
            get: { deleteTarget != nil },
            set: { if !$0 { deleteTarget = nil } })) {
            Button(store.localized("common.delete"), role: .destructive) {
                if let target = deleteTarget { store.deleteProject(id: target.id) }
                deleteTarget = nil
            }
            Button(store.localized("common.cancel"), role: .cancel) { deleteTarget = nil }
        }
    }
}

/// Loads thumb.png from the project folder asynchronously.
struct ProjectThumbnail: View {
    let projectId: String
    @State private var image: UIImage?

    var body: some View {
        ZStack {
            Color(.systemGray6)
            if let image {
                Image(uiImage: image).resizable().scaledToFill()
            } else {
                Image(systemName: "photo").foregroundStyle(.tertiary)
            }
        }
        .onAppear {
            let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            let url = docs.appendingPathComponent("Projects/\(projectId)/image.png")
            DispatchQueue.global(qos: .utility).async {
                let loaded = UIImage(contentsOfFile: url.path)
                DispatchQueue.main.async { image = loaded }
            }
        }
    }
}
