import Foundation

/// Совпадает с `RemoteStatePayload` / JSON в Supabase (`mediaplan_app_state.payload`).
struct RemoteStatePayload: Codable, Equatable {
    var users: [RemoteUser]
    var tasks: [RemoteTask]
    var channels: [RemoteChannel]
    var meetings: [RemoteMeeting]
    var staffBlocks: [RemoteStaffBlock]
    var jobPositions: [RemoteJobPosition]
    var notificationsShown: [String]
    var pushNotificationsEnabled: Bool
    /// Совпадает с веб `completedTasksLifetimeTotal`: число завершений, не уменьшается при удалении из архива.
    var completedTasksLifetimeTotal: Int

    enum CodingKeys: String, CodingKey {
        case users, tasks, channels, meetings, staffBlocks, jobPositions, notificationsShown, pushNotificationsEnabled,
            completedTasksLifetimeTotal
    }

    init(
        users: [RemoteUser] = [],
        tasks: [RemoteTask] = [],
        channels: [RemoteChannel] = [],
        meetings: [RemoteMeeting] = [],
        staffBlocks: [RemoteStaffBlock] = [],
        jobPositions: [RemoteJobPosition] = [],
        notificationsShown: [String] = [],
        pushNotificationsEnabled: Bool = false,
        completedTasksLifetimeTotal: Int = 0
    ) {
        self.users = users
        self.tasks = tasks
        self.channels = channels
        self.meetings = meetings
        self.staffBlocks = staffBlocks
        self.jobPositions = jobPositions
        self.notificationsShown = notificationsShown
        self.pushNotificationsEnabled = pushNotificationsEnabled
        self.completedTasksLifetimeTotal = completedTasksLifetimeTotal
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        users = try c.decodeIfPresent([RemoteUser].self, forKey: .users) ?? []
        tasks = try c.decodeIfPresent([RemoteTask].self, forKey: .tasks) ?? []
        channels = try c.decodeIfPresent([RemoteChannel].self, forKey: .channels) ?? []
        meetings = try c.decodeIfPresent([RemoteMeeting].self, forKey: .meetings) ?? []
        staffBlocks = try c.decodeIfPresent([RemoteStaffBlock].self, forKey: .staffBlocks) ?? []
        jobPositions = try c.decodeIfPresent([RemoteJobPosition].self, forKey: .jobPositions) ?? []
        notificationsShown = try c.decodeIfPresent([String].self, forKey: .notificationsShown) ?? []
        pushNotificationsEnabled = try c.decodeIfPresent(Bool.self, forKey: .pushNotificationsEnabled) ?? false
        let rawLifetime = try c.decodeIfPresent(Int.self, forKey: .completedTasksLifetimeTotal) ?? 0
        let completedInTasks = tasks.filter(\.completed).count
        completedTasksLifetimeTotal = max(rawLifetime, completedInTasks)
    }
}

struct RemoteUser: Codable, Equatable, Identifiable {
    var id: String
    var name: String
    var password: String
    var role: String
    var createdAt: String
    var permissionLevel: String?
    var blockId: String?
    var positionId: String?
    var taskTypeLabel: String?

    init(id: String, name: String, password: String, role: String, createdAt: String, permissionLevel: String?, blockId: String?, positionId: String?, taskTypeLabel: String?) {
        self.id = id
        self.name = name
        self.password = password
        self.role = role
        self.createdAt = createdAt
        self.permissionLevel = permissionLevel
        self.blockId = blockId
        self.positionId = positionId
        self.taskTypeLabel = taskTypeLabel
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = Self.flexString(c, key: .id)
        name = Self.flexString(c, key: .name)
        password = Self.flexString(c, key: .password)
        role = {
            let r = Self.flexString(c, key: .role)
            return r.isEmpty ? "smm-specialist" : r
        }()
        createdAt = {
            let t = Self.flexString(c, key: .createdAt)
            return t.isEmpty ? ISO8601DateFormatter().string(from: Date()) : t
        }()
        permissionLevel = Self.flexStringOptional(c, key: .permissionLevel)
        blockId = Self.flexStringOptional(c, key: .blockId)
        positionId = Self.flexStringOptional(c, key: .positionId)
        taskTypeLabel = Self.flexStringOptional(c, key: .taskTypeLabel)
    }

    /// Из JSON иногда приходят числа (id и т.д.) — на сайте всё приводится к строке.
    private static func flexString(_ c: KeyedDecodingContainer<CodingKeys>, key: CodingKeys) -> String {
        if let s = try? c.decode(String.self, forKey: key) { return s }
        if let i = try? c.decode(Int.self, forKey: key) { return String(i) }
        if let d = try? c.decode(Double.self, forKey: key) { return d.truncatingRemainder(dividingBy: 1) == 0 ? String(Int(d)) : String(d) }
        if let b = try? c.decode(Bool.self, forKey: key) { return b ? "true" : "false" }
        return ""
    }

    private static func flexStringOptional(_ c: KeyedDecodingContainer<CodingKeys>, key: CodingKeys) -> String? {
        let s = flexString(c, key: key)
        return s.isEmpty ? nil : s
    }

    private enum CodingKeys: String, CodingKey {
        case id, name, password, role, createdAt, permissionLevel, blockId, positionId, taskTypeLabel
    }
}

struct RemoteTask: Codable, Equatable, Identifiable {
    var id: String
    var title: String
    var description: String
    var deadline: String?
    var assignees: [String]
    var category: String
    var completed: Bool
    var completedAt: String?
    var recurrence: String?
    var dayOfWeek: Int?
    var dayOfMonth: Int?
    var monthOfQuarter: Int?
    var dayOfQuarter: Int?
    var kpiType: String?
    var kpiTarget: Double?
    var channels: [String]?
    var socialPlatform: String?
    var createdAt: String?

    init(
        id: String,
        title: String,
        description: String,
        deadline: String?,
        assignees: [String],
        category: String,
        completed: Bool,
        completedAt: String?,
        recurrence: String?,
        dayOfWeek: Int?,
        dayOfMonth: Int?,
        monthOfQuarter: Int?,
        dayOfQuarter: Int?,
        kpiType: String?,
        kpiTarget: Double?,
        channels: [String]?,
        socialPlatform: String?,
        createdAt: String?
    ) {
        self.id = id
        self.title = title
        self.description = description
        self.deadline = deadline
        self.assignees = assignees
        self.category = category
        self.completed = completed
        self.completedAt = completedAt
        self.recurrence = recurrence
        self.dayOfWeek = dayOfWeek
        self.dayOfMonth = dayOfMonth
        self.monthOfQuarter = monthOfQuarter
        self.dayOfQuarter = dayOfQuarter
        self.kpiType = kpiType
        self.kpiTarget = kpiTarget
        self.channels = channels
        self.socialPlatform = socialPlatform
        self.createdAt = createdAt
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decodeIfPresent(String.self, forKey: .id) ?? ""
        title = try c.decodeIfPresent(String.self, forKey: .title) ?? ""
        description = try c.decodeIfPresent(String.self, forKey: .description) ?? ""
        deadline = try c.decodeIfPresent(String.self, forKey: .deadline).flatMap { $0.isEmpty ? nil : $0 }
        assignees = try c.decodeIfPresent([String].self, forKey: .assignees) ?? []
        category = try c.decodeIfPresent(String.self, forKey: .category) ?? "federal"
        completed = try c.decodeIfPresent(Bool.self, forKey: .completed) ?? false
        completedAt = try c.decodeIfPresent(String.self, forKey: .completedAt)
        recurrence = try c.decodeIfPresent(String.self, forKey: .recurrence)
        dayOfWeek = try c.decodeIfPresent(Int.self, forKey: .dayOfWeek)
        dayOfMonth = try c.decodeIfPresent(Int.self, forKey: .dayOfMonth)
        monthOfQuarter = try c.decodeIfPresent(Int.self, forKey: .monthOfQuarter)
        dayOfQuarter = try c.decodeIfPresent(Int.self, forKey: .dayOfQuarter)
        kpiType = try c.decodeIfPresent(String.self, forKey: .kpiType)
        kpiTarget = Self.decodeKpiTarget(from: c)
        channels = try c.decodeIfPresent([String].self, forKey: .channels)
        socialPlatform = try c.decodeIfPresent(String.self, forKey: .socialPlatform)
        createdAt = try c.decodeIfPresent(String.self, forKey: .createdAt)
    }

    private static func decodeKpiTarget(from c: KeyedDecodingContainer<CodingKeys>) -> Double? {
        if let d = try? c.decodeIfPresent(Double.self, forKey: .kpiTarget) { return d }
        if let i = try? c.decodeIfPresent(Int.self, forKey: .kpiTarget) { return Double(i) }
        return nil
    }

    private enum CodingKeys: String, CodingKey {
        case id, title, description, deadline, assignees, category, completed, completedAt, recurrence
        case dayOfWeek, dayOfMonth, monthOfQuarter, dayOfQuarter, kpiType, kpiTarget, channels, socialPlatform, createdAt
    }
}

struct RemoteChannel: Codable, Equatable, Identifiable {
    var id: String
    var name: String
    var createdAt: String?
    var kind: String?
    var ownerUserId: String?
}

struct RemoteMeeting: Codable, Equatable, Identifiable {
    var id: String
    var title: String
    var startsAt: String
    var endsAt: String
    var location: String
    var preparation: String?
    var participantIds: [String]
    var createdBy: String?
    var createdAt: String?

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decodeIfPresent(String.self, forKey: .id) ?? ""
        title = try c.decodeIfPresent(String.self, forKey: .title) ?? ""
        startsAt = try c.decodeIfPresent(String.self, forKey: .startsAt) ?? ISO8601DateFormatter().string(from: Date())
        endsAt = try c.decodeIfPresent(String.self, forKey: .endsAt) ?? ""
        location = try c.decodeIfPresent(String.self, forKey: .location) ?? ""
        preparation = try c.decodeIfPresent(String.self, forKey: .preparation)
        participantIds = try c.decodeIfPresent([String].self, forKey: .participantIds) ?? []
        createdBy = try c.decodeIfPresent(String.self, forKey: .createdBy)
        createdAt = try c.decodeIfPresent(String.self, forKey: .createdAt)
    }

    private enum CodingKeys: String, CodingKey {
        case id, title, startsAt, endsAt, location, preparation, participantIds, createdBy, createdAt
    }
}

struct RemoteStaffBlock: Codable, Equatable, Identifiable {
    var id: String
    var name: String
    var createdAt: String?
    var parentBlockId: String?
    var taskVisibility: String?
    var taskVisibilityExtraUserIds: [String]?
    var leadershipScope: Bool?
}

struct RemoteJobPosition: Codable, Equatable, Identifiable {
    var id: String
    var name: String
    var blockId: String
    var defaultRole: String
    var createdAt: String?
    var taskTypeLabel: String?
}

extension RemoteStatePayload {
    static let categoryLabels: [String: String] = [
        "federal": "Федеральные",
        "regional": "Региональные",
        "pfo": "ПФО",
        "spk-mailings": "СПК рассылки",
        "bloggers": "Блогеры",
        "reports": "Отчёты",
    ]
}
