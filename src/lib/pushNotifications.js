import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

export async function registerNativePushNotifications({ onToken, onAction } = {}) {
  if (!Capacitor.isNativePlatform()) return { enabled: false, reason: "web" };

  const permission = await PushNotifications.checkPermissions();
  const nextPermission = permission.receive === "prompt"
    ? await PushNotifications.requestPermissions()
    : permission;
  if (nextPermission.receive !== "granted") return { enabled: false, reason: "denied" };

  const tokenHandle = await PushNotifications.addListener("registration", ({ value }) => onToken?.(value));
  const actionHandle = await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => onAction?.(notification));
  await PushNotifications.register();

  return {
    enabled: true,
    cleanup: async () => {
      await Promise.all([tokenHandle.remove(), actionHandle.remove()]);
    },
  };
}

export async function requestNativePushPermission() {
  if (!Capacitor.isNativePlatform()) return "web";
  const permission = await PushNotifications.requestPermissions();
  return permission.receive;
}
