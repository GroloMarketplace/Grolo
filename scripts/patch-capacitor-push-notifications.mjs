import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const handlerPath = path.join(projectRoot, "node_modules", "@capacitor", "push-notifications", "ios", "Sources", "PushNotificationsPlugin", "PushNotificationsHandler.swift");
const source = await readFile(handlerPath, "utf8");

const withoutUnavailableConfigApi = source.replace(
  /        if let optionsArray = self\.plugin\?\.getConfig\(\)\.getArray\("presentationOptions"\) as\? \[String\] \{[\s\S]*?        return \[\]\n/,
  "        return [.banner, .list, .badge, .sound]\n",
);
const patched = withoutUnavailableConfigApi.replace(
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

if (patched === source && (source.includes("getArray(\"presentationOptions\")") || source.includes("coerceDictionaryToJSObject"))) {
  throw new Error(`Unable to patch ${handlerPath}`);
}
if (patched !== source) await writeFile(handlerPath, patched);
