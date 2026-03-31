import Foundation

enum AppSecrets {
    struct MissingSecretsError: LocalizedError {
        var errorDescription: String? {
            "Скопируйте в Secrets.plist значения VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY из веб-проекта (.env)."
        }
    }

    static func load() throws -> (url: URL, anonKey: String) {
        guard let plistURL = Bundle.main.url(forResource: "Secrets", withExtension: "plist"),
              let data = try? Data(contentsOf: plistURL),
              let dict = try? PropertyListSerialization.propertyList(from: data, format: nil) as? [String: Any],
              let urlString = dict["SUPABASE_URL"] as? String,
              let url = URL(string: urlString.trimmingCharacters(in: .whitespacesAndNewlines)),
              let key = dict["SUPABASE_ANON_KEY"] as? String
        else {
            throw MissingSecretsError()
        }
        let trimmedKey = key.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedKey.isEmpty, url.scheme == "https" || url.scheme == "http" else {
            throw MissingSecretsError()
        }
        if urlString.contains("YOUR_PROJECT") || trimmedKey == "YOUR_ANON_KEY" {
            throw MissingSecretsError()
        }
        return (url, trimmedKey)
    }
}
