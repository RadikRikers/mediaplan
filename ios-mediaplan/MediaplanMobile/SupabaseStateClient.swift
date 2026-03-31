import Foundation
import Supabase

/// Тот же контракт, что и `src/app/api/backend.ts`: таблица `mediaplan_app_state`, id `main`.
final class SupabaseStateClient {
    private let client: SupabaseClient
    private let table = "mediaplan_app_state"
    private let rowId = "main"

    init(url: URL, anonKey: String) {
        client = SupabaseClient(
            supabaseURL: url,
            supabaseKey: anonKey,
            options: SupabaseClientOptions(
                auth: .init(emitLocalSessionAsInitialSession: true)
            )
        )
    }

    func fetchPayload() async throws -> RemoteStatePayload {
        let row: PayloadRow = try await client
            .from(table)
            .select("payload")
            .eq("id", value: rowId)
            .single()
            .execute()
            .value
        return row.payload
    }

    func savePayload(_ payload: RemoteStatePayload) async throws {
        struct UpsertBody: Encodable {
            let id: String
            let payload: RemoteStatePayload
            let updated_at: String
        }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let stamp = formatter.string(from: Date())
        let body = UpsertBody(id: rowId, payload: payload, updated_at: stamp)
        try await client
            .from(table)
            .upsert(body, onConflict: "id")
            .execute()
    }
}

private struct PayloadRow: Decodable {
    let payload: RemoteStatePayload
}
