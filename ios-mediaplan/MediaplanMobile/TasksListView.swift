import SwiftUI

struct TasksListView: View {
    @ObservedObject var model: AppViewModel
    @State private var confirmComplete: RemoteTask?
    @State private var isCreateOpen = false
    @State private var editingTask: RemoteTask?
    @State private var mode: TaskMode = .active

    var body: some View {
        let items = mode == .active ? model.tasksForCurrentUser() : model.archiveTasksForCurrentUser()
        NavigationStack {
            List {
                if let msg = model.banner {
                    Section {
                        Text(msg)
                            .foregroundStyle(.orange)
                    }
                }
                if items.isEmpty {
                    Section {
                        emptyRow(icon: "tray", text: mode == .active ? "Нет задач" : "Архив пуст")
                    }
                } else {
                    ForEach(items) { task in
                        TaskRow(
                            task: task,
                            model: model,
                            mode: mode,
                            confirmComplete: $confirmComplete,
                            onEdit: { editingTask = task },
                            onDelete: {
                                Task { await model.deleteTask(taskId: task.id) }
                            }
                        )
                    }
                }
            }
            .navigationTitle("Мои задачи")
            .safeAreaInset(edge: .top) {
                Picker("Режим", selection: $mode) {
                    Text("Активные").tag(TaskMode.active)
                    Text("Архив").tag(TaskMode.archive)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)
                .padding(.top, 6)
                .padding(.bottom, 4)
                .background(.ultraThinMaterial)
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        isCreateOpen = true
                    } label: {
                        Image(systemName: "plus")
                    }
                    .disabled(model.isBusy)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task { await model.refresh() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                    .disabled(model.isBusy)
                }
            }
            .refreshable {
                await model.refresh()
            }
            .confirmationDialog(
                "Подтвердите, что задача действительно выполнена. Она будет перенесена в архив на сайте.",
                isPresented: Binding(
                    get: { confirmComplete != nil },
                    set: { if !$0 { confirmComplete = nil } }
                ),
                titleVisibility: .visible
            ) {
                Button("Выполнено") {
                    if let t = confirmComplete {
                        Task { await model.toggleTaskCompleted(taskId: t.id, completed: true) }
                    }
                    confirmComplete = nil
                }
                Button("Отмена", role: .cancel) {
                    confirmComplete = nil
                }
            }
            .sheet(isPresented: $isCreateOpen) {
                TaskEditorView(
                    model: model,
                    task: nil
                )
            }
            .sheet(item: $editingTask) { task in
                TaskEditorView(
                    model: model,
                    task: task
                )
            }
        }
    }
}

private enum TaskMode: Hashable {
    case active
    case archive
}

@ViewBuilder
private func emptyRow(icon: String, text: String) -> some View {
    VStack(spacing: 10) {
        Image(systemName: icon)
            .font(.largeTitle)
            .foregroundStyle(.tertiary)
        Text(text)
            .font(.body)
            .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 24)
    .listRowSeparator(.hidden)
    .listRowBackground(Color.clear)
}

private struct TaskRow: View {
    let task: RemoteTask
    @ObservedObject var model: AppViewModel
    let mode: TaskMode
    @Binding var confirmComplete: RemoteTask?
    let onEdit: () -> Void
    let onDelete: () -> Void

    private var categoryTitle: String {
        RemoteStatePayload.categoryLabels[task.category] ?? task.category
    }

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Button {
                if task.completed {
                    Task { await model.toggleTaskCompleted(taskId: task.id, completed: false) }
                } else {
                    confirmComplete = task
                }
            } label: {
                Image(systemName: task.completed ? "checkmark.circle.fill" : "circle")
                    .font(.title2)
                    .foregroundStyle(task.completed ? Color.green : Color.secondary)
            }
            .buttonStyle(.plain)

            VStack(alignment: .leading, spacing: 6) {
                Text(task.title.isEmpty ? "Без названия" : task.title)
                    .font(.headline)
                    .strikethrough(task.completed)
                    .foregroundStyle(task.completed ? Color.secondary : Color.primary)
                Text(categoryTitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                if let d = task.deadline, !d.isEmpty {
                    Text("Дедлайн: \(safePrefix(d, 10))")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
                if !task.description.isEmpty {
                    Text(task.description)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(3)
                }
            }
        }
        .padding(.vertical, 4)
        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
            if mode == .active {
                Button("Изменить") { onEdit() }
                    .tint(.blue)
            }
            Button("Удалить", role: .destructive) { onDelete() }
        }
    }
}

/// Безопасный префикс: избегаем странных индексов при нестандартных Unicode-символах.
private func safePrefix(_ s: String, _ maxLen: Int) -> String {
    guard maxLen > 0 else { return "" }
    if s.count <= maxLen { return s }
    let idx = s.index(s.startIndex, offsetBy: maxLen)
    return String(s[..<idx])
}

struct MeetingsListView: View {
    @ObservedObject var model: AppViewModel

    var body: some View {
        let items = model.meetingsForCurrentUser()
        NavigationStack {
            List {
                if items.isEmpty {
                    Section {
                        emptyRow(icon: "calendar", text: "Нет встреч")
                    }
                } else {
                    ForEach(items) { m in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(m.title.isEmpty ? "Без названия" : m.title)
                                .font(.headline)
                            Text(m.startsAt)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            if !m.location.isEmpty {
                                Text(m.location)
                                    .font(.caption)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
            .navigationTitle("Встречи")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task { await model.refresh() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                    .disabled(model.isBusy)
                }
            }
            .refreshable {
                await model.refresh()
            }
        }
    }
}

private struct TaskEditorView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var model: AppViewModel
    let task: RemoteTask?

    @State private var title = ""
    @State private var details = ""
    @State private var deadlineEnabled = false
    @State private var deadline = Date()
    @State private var category = "federal"
    @State private var assignees: Set<String> = []

    private var isEditing: Bool { task != nil }

    var body: some View {
        NavigationStack {
            Form {
                Section("Основное") {
                    TextField("Название", text: $title)
                    TextField("Описание", text: $details, axis: .vertical)
                        .lineLimit(2...6)
                    Picker("Категория", selection: $category) {
                        ForEach(RemoteStatePayload.categoryLabels.keys.sorted(), id: \.self) { key in
                            Text(RemoteStatePayload.categoryLabels[key] ?? key).tag(key)
                        }
                    }
                }
                Section("Дедлайн") {
                    Toggle("Указать дедлайн", isOn: $deadlineEnabled)
                    if deadlineEnabled {
                        DatePicker("Дата", selection: $deadline, displayedComponents: [.date, .hourAndMinute])
                    }
                }
                Section("Исполнители") {
                    ForEach(model.allUsers()) { u in
                        MultipleSelectionRow(
                            title: u.name,
                            isSelected: assignees.contains(u.id),
                            toggle: {
                                if assignees.contains(u.id) {
                                    assignees.remove(u.id)
                                } else {
                                    assignees.insert(u.id)
                                }
                            }
                        )
                    }
                }
            }
            .navigationTitle(isEditing ? "Изменить задачу" : "Новая задача")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Сохранить") {
                        Task {
                            await save()
                            dismiss()
                        }
                    }
                    .disabled(title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || assignees.isEmpty)
                }
            }
            .onAppear(perform: populateFromTask)
        }
    }

    private func populateFromTask() {
        guard let task else { return }
        title = task.title
        details = task.description
        category = task.category
        assignees = Set(task.assignees)
        if let d = task.deadline, let dt = ISO8601DateFormatter().date(from: d) {
            deadlineEnabled = true
            deadline = dt
        }
    }

    private func save() async {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let deadlineISO = deadlineEnabled ? formatter.string(from: deadline) : nil
        if let task {
            await model.updateTask(
                taskId: task.id,
                title: title.trimmingCharacters(in: .whitespacesAndNewlines),
                description: details.trimmingCharacters(in: .whitespacesAndNewlines),
                deadline: deadlineISO,
                assignees: Array(assignees),
                category: category
            )
        } else {
            await model.createTask(
                title: title.trimmingCharacters(in: .whitespacesAndNewlines),
                description: details.trimmingCharacters(in: .whitespacesAndNewlines),
                deadline: deadlineISO,
                assignees: Array(assignees),
                category: category
            )
        }
    }
}

private struct MultipleSelectionRow: View {
    let title: String
    let isSelected: Bool
    let toggle: () -> Void

    var body: some View {
        Button(action: toggle) {
            HStack {
                Text(title)
                Spacer()
                if isSelected {
                    Image(systemName: "checkmark")
                        .foregroundStyle(.blue)
                }
            }
        }
        .buttonStyle(.plain)
    }
}
