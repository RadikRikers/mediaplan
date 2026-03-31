import Foundation
import JavaScriptCore

/// Та же логика, что в `store.ts`: `credentialsMatch` (localeCompare base + пароль ===).
enum WebLoginParity {
    private static func makeContext() -> JSContext? {
        guard let ctx = JSContext() else { return nil }
        ctx.exceptionHandler = { _, _ in }
        return ctx
    }

    private static func evaluate(_ script: String, args: [Any], fallback: () -> Bool) -> Bool {
        guard let ctx = makeContext(),
              let fn = ctx.evaluateScript(script)
        else {
            return fallback()
        }
        let result = fn.call(withArguments: args)
        guard let result, !result.isUndefined, !result.isNull else {
            return fallback()
        }
        return result.toBool()
    }

    static func nameMatches(storedName: String, inputName: String) -> Bool {
        let script = """
        (function(storedName, inputName) {
          return storedName.trim().localeCompare(inputName.trim(), 'ru', { sensitivity: 'base' }) === 0;
        })
        """
        return evaluate(script, args: [storedName, inputName]) {
            LoginNormalization.nameMatches(storedName, inputName)
        }
    }

    static func credentialsMatch(userName: String, userPassword: String, inputName: String, inputPassword: String) -> Bool {
        let script = """
        (function(userName, inputName, userPassword, inputPassword) {
          var nameOk = userName.trim().localeCompare(inputName.trim(), 'ru', { sensitivity: 'base' }) === 0;
          var stripInvisible = function(s) {
            return String(s).replace(/[\\u200B-\\u200D\\uFEFF]/g, '');
          };
          var p1 = String(userPassword);
          var p2 = String(inputPassword);
          var p1n = stripInvisible(p1).normalize('NFC');
          var p2n = stripInvisible(p2).normalize('NFC');
          var passOk =
            p1 === p2 ||
            p1.trim() === p2.trim() ||
            p1n === p2n ||
            p1n.trim() === p2n.trim();
          return nameOk && passOk;
        })
        """
        return evaluate(script, args: [userName, inputName, userPassword, inputPassword]) {
            return LoginNormalization.fallbackCredentialsMatch(
                userName: userName,
                userPassword: userPassword,
                inputName: inputName,
                inputPassword: inputPassword
            )
        }
    }
}
