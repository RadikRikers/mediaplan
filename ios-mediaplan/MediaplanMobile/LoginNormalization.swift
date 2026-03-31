import Foundation

/// Резерв, если JS-движок недоступен; по возможности используется `WebLoginParity`.
enum LoginNormalization {
    private static let ru = Locale(identifier: "ru_RU")

    static func nameMatches(_ stored: String, _ input: String) -> Bool {
        key(stored) == key(input)
    }

    private static func key(_ raw: String) -> String {
        raw.trimmingCharacters(in: .whitespacesAndNewlines)
            .precomposedStringWithCanonicalMapping
            .folding(options: [.caseInsensitive, .diacriticInsensitive], locale: ru)
    }

    static func passwordNormalized(_ raw: String) -> String {
        raw.precomposedStringWithCanonicalMapping
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// Удаляем невидимые/служебные символы, которые иногда приходят из буфера или клавиатуры симулятора.
    static func canonicalPassword(_ raw: String) -> String {
        let normalized = raw.precomposedStringWithCanonicalMapping
        let cleanedScalars = normalized.unicodeScalars.filter { scalar in
            let p = scalar.properties
            if p.isWhitespace { return false }
            if p.generalCategory == .control || p.generalCategory == .format {
                return false
            }
            return true
        }
        return String(String.UnicodeScalarView(cleanedScalars))
    }

    static func passwordMatches(stored: String, input: String) -> Bool {
        if stored == input { return true }
        if stored.trimmingCharacters(in: .whitespacesAndNewlines) ==
            input.trimmingCharacters(in: .whitespacesAndNewlines) { return true }

        let sNorm = canonicalPassword(stored)
        let iNorm = canonicalPassword(input)
        if sNorm == iNorm { return true }

        // Симулятор часто вводит пароль в "не той" раскладке.
        let iRuToEn = canonicalPassword(convertKeyboardLayoutRuToEn(input))
        let iEnToRu = canonicalPassword(convertKeyboardLayoutEnToRu(input))
        if sNorm == iRuToEn || sNorm == iEnToRu { return true }

        return false
    }

    private static let ruToEnMap: [Character: Character] = {
        let ru = Array("йцукенгшщзхъфывапролджэячсмитьбю.ёЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮ,Ё")
        let en = Array("qwertyuiop[]asdfghjkl;'zxcvbnm,./`QWERTYUIOP{}ASDFGHJKL:\"ZXCVBNM<>?~")
        return Dictionary(uniqueKeysWithValues: zip(ru, en))
    }()

    private static let enToRuMap: [Character: Character] = {
        let en = Array("qwertyuiop[]asdfghjkl;'zxcvbnm,./`QWERTYUIOP{}ASDFGHJKL:\"ZXCVBNM<>?~")
        let ru = Array("йцукенгшщзхъфывапролджэячсмитьбю.ёЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮ,Ё")
        return Dictionary(uniqueKeysWithValues: zip(en, ru))
    }()

    private static func convertKeyboardLayoutRuToEn(_ s: String) -> String {
        String(s.map { ruToEnMap[$0] ?? $0 })
    }

    private static func convertKeyboardLayoutEnToRu(_ s: String) -> String {
        String(s.map { enToRuMap[$0] ?? $0 })
    }

    /// Дублирует сайт максимально близко: сравнение имени + пароль с обрезкой краёв (клавиатура).
    static func fallbackCredentialsMatch(userName: String, userPassword: String, inputName: String, inputPassword: String) -> Bool {
        let nameOk = nameMatches(userName, inputName)
        let passOk = passwordMatches(stored: userPassword, input: inputPassword)
        return nameOk && passOk
    }
}
