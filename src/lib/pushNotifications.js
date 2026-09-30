import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

let latestNativePushToken = null;

export function getLatestNativePushToken() {
  return latestNativePushToken;
}

export async function registerNativePushNotifications({ onToken, onAction } = {}) {
  if (!Capacitor.isNativePlatform()) return { enabled: false, reason: "web" };

  const permission = await PushNotifications.checkPermissions();
  if (permission.receive !== "granted") return { enabled: false, reason: permission.receive };

  const tokenHandle = await PushNotifications.addListener("registration", ({ value }) => {
    latestNativePushToken = value;
    onToken?.(value);
  });
  const actionHandle = await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => onAction?.(notification));
  await PushNotifications.register();

  return {
    enabled: true,
    token: latestNativePushToken,
    cleanup: async () => {
      await Promise.all([tokenHandle.remove(), actionHandle.remove()]);
    },
  };
}

export async function getNativePushPermissionStatus() {
  if (!Capacitor.isNativePlatform()) return "web";
  const permission = await PushNotifications.checkPermissions();
  return permission.receive === "prompt-with-rationale" ? "prompt" : permission.receive;
}

export function openAppNotificationSettings() {
  if (!Capacitor.isNativePlatform()) return false;
  const platform = Capacitor.getPlatform();
  const settingsUrl = platform === "ios"
    ? "app-settings:"
    : platform === "android"
      ? "intent:#Intent;action=android.settings.APP_NOTIFICATION_SETTINGS;S.android.provider.extra.APP_PACKAGE=ca.grolomarketplace.app;end"
      : null;
  if (!settingsUrl) return false;

  const opened = window.open(settingsUrl, "_system");
  if (!opened) window.location.href = settingsUrl;
  return true;
}

export async function requestNativePushPermission({ openSettingsOnDenied = false } = {}) {
  const status = await getNativePushPermissionStatus();
  if (status === "web" || status === "granted") return status;
  if (status === "denied") {
    if (openSettingsOnDenied) openAppNotificationSettings();
    return status;
  }
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive === "granted" && typeof window !== "undefined") {
    window.dispatchEvent(new Event("grolo:push-permission-changed"));
  }
  return permission.receive;
}
