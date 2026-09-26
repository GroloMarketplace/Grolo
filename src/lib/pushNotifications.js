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

export async function getNativePushPermissionStatus() {
  if (!Capacitor.isNativePlatform()) return "web";
  const permission = await PushNotifications.checkPermissions();
  return permission.receive;
}

export function openAppNotificationSettings() {
  if (!Capacitor.isNativePlatform()) return false;
  const platform = Capacitor.getPlatform();
  if (platform === "ios") {
    window.location.href = "app-settings:";
    return true;
  }
  if (platform === "android") {
    const packageName = "ca.grolomarketplace.app";
    window.location.href = `intent:#Intent;action=android.settings.APP_NOTIFICATION_SETTINGS;S.android.provider.extra.APP_PACKAGE=${packageName};end`;
    return true;
  }
  return false;
}

export async function requestNativePushPermission({ openSettingsOnDenied = false } = {}) {
  const status = await getNativePushPermissionStatus();
  if (status === "web" || status === "granted") return status;
  if (status === "denied") {
    if (openSettingsOnDenied) openAppNotificationSettings();
    return status;
  }
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive === "denied" && openSettingsOnDenied) openAppNotificationSettings();
  return permission.receive;
}
