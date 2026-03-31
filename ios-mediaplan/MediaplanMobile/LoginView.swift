import SwiftUI

struct LoginView: View {
    @ObservedObject var model: AppViewModel
    @State private var name = ""
    @State private var password = ""

    var body: some View {
        NavigationStack {
            Form {
                if let msg = model.banner {
                    Section {
                        Text(msg)
                            .foregroundStyle(.red)
                    }
                }
                Section {
                    TextField("Имя пользователя", text: $name)
                        .textContentType(.username)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    SecureField("Пароль", text: $password)
                        .textContentType(.password)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                }
                Section {
                    Button(model.isBusy ? "Проверка…" : "Войти") {
                        Task { await model.login(name: name, password: password) }
                    }
                    .disabled(model.isBusy || name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || password.isEmpty)
                }
                Section {
                    Text("При настроенном Supabase данные загружаются с сервера при входе. Имя можно вводить без учёта регистра.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Медиапланирование")
        }
    }
}
