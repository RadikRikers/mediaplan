import SwiftUI

struct RootView: View {
    @StateObject private var model = AppViewModel()

    var body: some View {
        Group {
            switch model.phase {
            case .needsConfig:
                ConfigHelpView()
            case .loggedOut:
                LoginView(model: model)
            case .loggedIn:
                MainTabView(model: model)
            }
        }
    }
}

struct ConfigHelpView: View {
    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                Text("Подключение к Supabase")
                    .font(.title2.weight(.semibold))
                Text(
                    "Откройте в Xcode файл MediaplanMobile/Secrets.plist и вставьте те же значения, что в веб-проекте в .env: SUPABASE_URL как VITE_SUPABASE_URL, SUPABASE_ANON_KEY как VITE_SUPABASE_ANON_KEY."
                )
                .foregroundStyle(.secondary)
                Text("После сохранения перезапустите приложение.")
                    .font(.subheadline)
                    .foregroundStyle(.tertiary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(24)
            .navigationTitle("Настройка")
        }
    }
}

#Preview {
    RootView()
}
