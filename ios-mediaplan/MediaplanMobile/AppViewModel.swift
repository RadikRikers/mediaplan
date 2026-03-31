import Foundation
import SwiftUI

@MainActor
final class AppViewModel: ObservableObject {
    enum Phase {
        case needsConfig
        case loggedOut
        case loggedIn
    }

    @Published private(set) var phase: Phase = .loggedOut
    @Published private(set) var payload: RemoteStatePayload?
    @Published private(set) var currentUser: RemoteUser?
    @Published var banner: String?
    @Published var isBusy = false

    private let api: SupabaseStateClient?

    init() {
        do {
            let secrets = try AppSecrets.load()
            api = SupabaseStateClient(url: secrets.url, anonKey: secrets.anonKey)
            phase = .loggedOut
        } catch {
            api = nil
            phase = .needsConfig
        }
    }

    func login(name: String, password: String) async {
        guard let api else { return }
        banner = nil
        isBusy = true
        defer { isBusy = false }
        do {
            let remote = try await api.fetchPayload()
            if remote.users.isEmpty {
                banner =
                    "В Supabase ещё нет пользователей. Один раз войдите на сайт с тем же Supabase — учётки сохранятся в базу, после чего вход здесь будет работать."
                return
            }
            let match = remote.users.first { Self.credentialsMatch($0, name: name, password: password) }
            guard let user = match else {
                let hasUserWithSameName = remote.users.contains { WebLoginParity.nameMatches(storedName: $0.name, inputName: name) }
                #if targetEnvironment(simulator)
                if hasUserWithSameName,
                   let byName = remote.users.first(where: { WebLoginParity.nameMatches(storedName: $0.name, inputName: name) }) {
                    payload = remote
                    currentUser = byName
                    phase = .loggedIn
                    banner = "Вход выполнен в режиме симулятора (fallback по имени). На реальном устройстве пароль проверяется строго."
                    return
                }
                #endif
                if hasUserWithSameName {
                    banner =
                        "Имя найдено, но пароль не совпал. Загружено учётных записей: \(remote.users.count)."
                } else {
                    banner =
                        "Пользователь с таким именем не найден. Загружено учётных записей: \(remote.users.count)."
                }
                return
            }
            payload = remote
            currentUser = user
            phase = .loggedIn
        } catch {
            banner = "Не удалось загрузить данные с сервера: \(error.localizedDescription)"
        }
    }

    func logout() {
        currentUser = nil
        payload = nil
        phase = .loggedOut
        banner = nil
    }

    func refresh() async {
        guard let api, currentUser != nil else { return }
        isBusy = true
        defer { isBusy = false }
        do {
            let remote = try await api.fetchPayload()
            payload = remote
            if let id = currentUser?.id {
                if let refreshed = remote.users.first(where: { $0.id == id }) {
                    currentUser = refreshed
                } else {
                    currentUser = nil
                    payload = nil
                    phase = .loggedOut
                    banner = "Пользователь удалён в базе. Войдите снова."
                    return
                }
            }
            banner = nil
        } catch {
            banner = "Ошибка обновления: \(error.localizedDescription)"
        }
    }

    func toggleTaskCompleted(taskId: String, completed: Bool) async {
        await persistPayloadChanges { p in
            guard let idx = p.tasks.firstIndex(where: { $0.id == taskId }) else { return }
            let was = p.tasks[idx].completed
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if completed {
                p.tasks[idx].completed = true
                p.tasks[idx].completedAt = formatter.string(from: Date())
                if !was {
                    p.completedTasksLifetimeTotal += 1
                }
            } else {
                p.tasks[idx].completed = false
                p.tasks[idx].completedAt = nil
                if was {
                    p.completedTasksLifetimeTotal = max(0, p.completedTasksLifetimeTotal - 1)
                }
            }
        }
    }

    /// Имя сверяем как в вебе (`localeCompare`), пароль — устойчиво к невидимым символам ввода.
    private static func credentialsMatch(_ user: RemoteUser, name: String, password: String) -> Bool {
        let nameOk = WebLoginParity.nameMatches(storedName: user.name, inputName: name)
            || LoginNormalization.nameMatches(user.name, name)
        let passOk = LoginNormalization.passwordMatches(stored: user.password, input: password)
        return nameOk && passOk
    }

    func tasksForCurrentUser() -> [RemoteTask] {
        guard let uid = currentUser?.id, let p = payload else { return [] }
        return p.tasks
            .filter { $0.assignees.contains(uid) }
            .sorted { a, b in
                if a.completed != b.completed { return !a.completed && b.completed }
                let da = a.deadline ?? ""
                let db = b.deadline ?? ""
                return da < db
            }
    }

    func archiveTasksForCurrentUser() -> [RemoteTask] {
        guard let uid = currentUser?.id, let p = payload else { return [] }
        return p.tasks
            .filter { $0.assignees.contains(uid) && $0.completed }
            .sorted { ($0.completedAt ?? "") > ($1.completedAt ?? "") }
    }

    func allUsers() -> [RemoteUser] {
        payload?.users ?? []
    }

    func createTask(
        title: String,
        description: String,
        deadline: String?,
        assignees: [String],
        category: String
    ) async {
        let now = ISO8601DateFormatter().string(from: Date())
        let newTask = RemoteTask(
            id: "\(Date().timeIntervalSince1970)-\(Int.random(in: 1000...9999))",
            title: title,
            description: description,
            deadline: deadline,
            assignees: assignees,
            category: category,
            completed: false,
            completedAt: nil,
            recurrence: "none",
            dayOfWeek: nil,
            dayOfMonth: nil,
            monthOfQuarter: nil,
            dayOfQuarter: nil,
            kpiType: "none",
            kpiTarget: nil,
            channels: [],
            socialPlatform: nil,
            createdAt: now
        )
        await persistPayloadChanges { p in
            p.tasks.append(newTask)
        }
    }

    func updateTask(
        taskId: String,
        title: String,
        description: String,
        deadline: String?,
        assignees: [String],
        category: String
    ) async {
        await persistPayloadChanges { p in
            guard let idx = p.tasks.firstIndex(where: { $0.id == taskId }) else { return }
            p.tasks[idx].title = title
            p.tasks[idx].description = description
            p.tasks[idx].deadline = deadline
            p.tasks[idx].assignees = assignees
            p.tasks[idx].category = category
        }
    }

    func deleteTask(taskId: String) async {
        await persistPayloadChanges { p in
            p.tasks = p.tasks.filter { $0.id != taskId }
        }
    }

    func meetingsForCurrentUser() -> [RemoteMeeting] {
        guard let uid = currentUser?.id, let p = payload else { return [] }
        return p.meetings
            .filter { $0.participantIds.contains(uid) }
            .sorted { $0.startsAt < $1.startsAt }
    }

    private func persistPayload(_ p: RemoteStatePayload) async {
        guard let api else { return }
        isBusy = true
        defer { isBusy = false }
        do {
            try await api.savePayload(sanitizePayloadForSave(p))
            // Подтверждаем запись чтением с сервера — иначе UI может жить в локально-устаревшей копии.
            let confirmed = try await api.fetchPayload()
            payload = confirmed
            banner = nil
        } catch {
            banner = "Не удалось сохранить: \(error.localizedDescription)"
        }
    }

    private func persistPayloadChanges(_ mutate: (inout RemoteStatePayload) -> Void) async {
        guard let api else { return }
        isBusy = true
        defer { isBusy = false }
        do {
            var latest = try await api.fetchPayload()
            mutate(&latest)
            try await api.savePayload(sanitizePayloadForSave(latest))
            let confirmed = try await api.fetchPayload()
            payload = confirmed
            if let id = currentUser?.id, let refreshed = confirmed.users.first(where: { $0.id == id }) {
                currentUser = refreshed
            }
            banner = nil
        } catch {
            banner = "Не удалось синхронизировать задачи: \(error.localizedDescription)"
        }
    }

    private func sanitizePayloadForSave(_ payload: RemoteStatePayload) -> RemoteStatePayload {
        var next = payload
        next.completedTasksLifetimeTotal = max(0, next.completedTasksLifetimeTotal)
        next.tasks = payload.tasks.map { t in
            var task = t
            if let k = task.kpiTarget, !k.isFinite {
                task.kpiTarget = nil
            }
            if task.category.isEmpty {
                task.category = "federal"
            }
            if task.recurrence == nil || task.recurrence?.isEmpty == true {
                task.recurrence = "none"
            }
            return task
        }
        return next
    }
}
