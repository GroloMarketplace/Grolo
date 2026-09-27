import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginRoot = path.join(projectRoot, "node_modules", "@capacitor", "push-notifications", "ios", "Sources", "PushNotificationsPlugin");
const handlerPath = path.join(pluginRoot, "PushNotificationsHandler.swift");
const pluginPath = path.join(pluginRoot, "PushNotificationsPlugin.swift");
const source = await readFile(handlerPath, "utf8");
const pluginSource = await readFile(pluginPath, "utf8");

const withoutUnavailableConfigApi = source.replace(
  /        if let optionsArray = self\.plugin\?\.getConfig\(\)\.getArray\("presentationOptions"\) as\? \[String\] \{[\s\S]*?        return \[\]\n/,
  "        return [.banner, .list, .badge, .sound]\n",
);
const withoutExistingHelpers = withoutUnavailableConfigApi.replace(
  /    private func jsValue\(_ value: Any\) -> JSValue\? \{\n        switch value \{\n        case let value as String: return value\n        case let value as Bool: return value\n        case let value as Int: return value\n        case let value as Double: return value\n        case let value as NSNumber: return value\n        case let value as NSNull: return value\n        case let value as \[Any\]: return value\.compactMap\(jsValue\)\n        case let value as \[AnyHashable: Any\]:\n            return value\.reduce\(into: JSObject\(\)\) \{ result, item in\n                if let key = item\.key as\? String, let value = jsValue\(item\.value\) \{ result\[key\] = value \}\n            \}\n        default: return nil\n        \}\n    \}\n/g,
  "",
);
const patchedHandler = withoutExistingHelpers.replace(
  /    func makeNotificationRequestJSObject\(_ request: UNNotificationRequest\) -> JSObject \{[\s\S]*?\n    \}\n\}/,
  `    private func jsValue(_ value: Any) -> JSValue? {
        switch value {
        case let value as String: return value
        case let value as Bool: return value
        case let value as Int: return value
        case let value as Double: return value
        case let value as NSNumber: return value
        case let value as NSNull: return value
        case let value as [Any]: return value.compactMap(jsValue)
        case let value as [AnyHashable: Any]:
            return value.reduce(into: JSObject()) { result, item in
                if let key = item.key as? String, let value = jsValue(item.value) { result[key] = value }
            }
        default: return nil
        }
    }

    func makeNotificationRequestJSObject(_ request: UNNotificationRequest) -> JSObject {
        var userInfo = JSObject()
        request.content.userInfo.forEach { key, value in
            if let key = key as? String, let value = jsValue(value) { userInfo[key] = value }
        }

        return [
            "id": request.identifier,
            "title": request.content.title,
            "subtitle": request.content.subtitle,
            "badge": request.content.badge ?? 1,
            "body": request.content.body,
            "data": userInfo
        ]
    }
}`,
);

const patchedPlugin = pluginSource
  .replaceAll("call.reject(", "call.unimplemented(")
  .replace("guard let notifications = call.getArray(\"notifications\", JSObject.self) else {", "guard let notifications = call.getArray(\"notifications\")?.compactMap({ $0 as? JSObject }) else {")
  .replace("let ret = notifications.map({ (notification) -> [String: Any] in", "let ret = notifications.map({ (notification) -> JSObject in");

if (patchedHandler === source && (source.includes("getArray(\"presentationOptions\")") || source.includes("coerceDictionaryToJSObject"))) {
  throw new Error(`Unable to patch ${handlerPath}`);
}
if (patchedHandler !== source) await writeFile(handlerPath, patchedHandler);
if (patchedPlugin !== pluginSource) await writeFile(pluginPath, patchedPlugin);
if (patchedPlugin !== pluginSource) await writeFile(pluginPath, patchedPlugin);
