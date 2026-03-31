import SwiftUI

struct MainTabView: View {
    @ObservedObject var model: AppViewModel

    var body: some View {
        TabView {
            TasksListView(model: model)
                .tabItem { Label("Задачи", systemImage: "checklist") }
            MeetingsListView(model: model)
                .tabItem { Label("Встречи", systemImage: "calendar") }
            ProfileView(model: model)
                .tabItem { Label("Профиль", systemImage: "person.circle") }
        }
    }
}

struct ProfileView: View {
    @ObservedObject var model: AppViewModel

    var body: some View {
        NavigationStack {
            Form {
                if let u = model.currentUser {
                    Section("Пользователь") {
                        LabeledContent("Имя", value: u.name)
                        LabeledContent("Роль", value: u.role)
                    }
                }
                Section {
                    Button("Выйти", role: .destructive) {
                        model.logout()
                    }
                }
            }
            .navigationTitle("Профиль")
        }
    }
}
