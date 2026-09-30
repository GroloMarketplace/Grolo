import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { useBuyerSettings } from "../context/BuyerSettingsContext";
import { useSellerSettings } from "../context/SellerSettingsContext";
import { useProfileMode } from "../context/ProfileModeContext";
import { useAuth } from "../context/AuthContext";
import { openAppNotificationSettings, registerNativePushNotifications } from "../lib/pushNotifications";
import { savePushToken } from "../lib/api/pushTokens";

const BUYER_OPTIONS = [
  ["newMessages", "New Messages", "Messages"],
  ["newOrders", "New Orders", "Orders"],
  ["orderAccepted", "Order Accepted", "Orders"],
  ["orderCompleted", "Order Completed", "Orders"],
  ["newFollowers", "Followers", "Community"],
  ["regrows", "Regrows", "Community"],
  ["communityActivity", "Community Activity", "Community"],
  ["eventReminders", "Event Reminders", "Events"],
  ["savedEventUpdates", "Saved Event Updates", "Events"],
  ["reviewsReceived", "Reviews Received", "Reviews"],
  ["productUpdates", "Product Updates", "Marketing"],
  ["groloAnnouncements", "Grolo Announcements", "Marketing"],
];

const SELLER_OPTIONS = [...BUYER_OPTIONS];

function normalizedPermission(receive) {
  return receive === "prompt-with-rationale" ? "prompt" : receive;
}

export default function NotificationSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profileMode } = useProfileMode();
  const { settings, updateSettings } = useBuyerSettings();
  const { getSellerProfile, updateSellerProfile } = useSellerSettings();
  const sellerProfile = getSellerProfile("current-user");
  const [permissionStatus, setPermissionStatus] = useState("prompt");
  const [isRequesting, setIsRequesting] = useState(false);
  const [diagnostics, setDiagnostics] = useState([]);
  const registrationCleanup = useRef(null);
  const registrationActive = useRef(false);
  const isSeller = profileMode === "seller";
  const options = isSeller ? SELLER_OPTIONS : BUYER_OPTIONS;
  const notifications = isSeller ? sellerProfile.notifications : settings.notifications;

  const addDiagnostic = (message) => {
    setDiagnostics((current) => [...current, `${new Date().toLocaleTimeString()} ${message}`].slice(-12));
  };

  const registerIfGranted = async () => {
    if (registrationActive.current || !user?.id || !Capacitor.isNativePlatform()) return;
    try {
      const registration = await registerNativePushNotifications({
        onToken: async (token) => {
          addDiagnostic("Registration callback fired");
          try {
            const result = await savePushToken({ userId: user.id, token, platform: Capacitor.getPlatform() });
            addDiagnostic(`Token saved: ${result.platform}, project ${result.projectReference ?? "unknown"}`);
          } catch (error) {
            addDiagnostic(`Token save error: ${error?.message ?? String(error)}`);
          }
        },
      });
      if (!registration.enabled) {
        addDiagnostic(`Registration skipped: ${registration.reason}`);
        return;
      }
      registrationActive.current = true;
      registrationCleanup.current = registration.cleanup;
      addDiagnostic("Registration success");
    } catch (error) {
      addDiagnostic(`Registration error: ${error?.message ?? String(error)}`);
    }
  };

  const refreshPermission = async () => {
    const platform = Capacitor.getPlatform();
    addDiagnostic(`Current platform: ${platform}`);
    if (!Capacitor.isNativePlatform()) {
      setPermissionStatus("web");
      return;
    }
    try {
      const result = await PushNotifications.checkPermissions();
      const status = normalizedPermission(result.receive);
      addDiagnostic(`Permission check: ${result.receive}`);
      setPermissionStatus(status);
      if (status === "granted") await registerIfGranted();
    } catch (error) {
      addDiagnostic(`Permission check error: ${error?.message ?? String(error)}`);
    }
  };

  useEffect(() => {
    refreshPermission();
    const refreshOnForeground = () => {
      if (document.visibilityState === "visible") refreshPermission();
    };
    window.addEventListener("focus", refreshOnForeground);
    document.addEventListener("visibilitychange", refreshOnForeground);
    return () => {
      window.removeEventListener("focus", refreshOnForeground);
      document.removeEventListener("visibilitychange", refreshOnForeground);
      registrationCleanup.current?.();
    };
  }, []);

  const toggle = async (key) => {
    const next = { ...notifications, [key]: !notifications[key] };
    if (isSeller) await updateSellerProfile("current-user", { notifications: next });
    else await updateSettings({ notifications: next });
  };

  const requestPermission = async () => {
    addDiagnostic("Enable button pressed");
    setIsRequesting(true);
    try {
      const platform = Capacitor.getPlatform();
      addDiagnostic(`Current platform: ${platform}`);
      if (!Capacitor.isNativePlatform()) {
        setPermissionStatus("web");
        addDiagnostic("Native push is unavailable on web");
        return;
      }

      const before = await PushNotifications.checkPermissions();
      addDiagnostic(`Permission before request: ${before.receive}`);
      const beforeStatus = normalizedPermission(before.receive);
      if (beforeStatus === "denied") {
        setPermissionStatus("denied");
        addDiagnostic("Permission denied; opening Grolo notification settings");
        if (!openAppNotificationSettings()) addDiagnostic("Unable to open system notification settings");
        return;
      }

      let afterStatus = beforeStatus;
      if (beforeStatus !== "granted") {
        const after = await PushNotifications.requestPermissions();
        afterStatus = normalizedPermission(after.receive);
        addDiagnostic(`Permission after request: ${after.receive}`);
      } else {
        addDiagnostic("Permission after request: granted (already granted)");
      }
      setPermissionStatus(afterStatus);
      if (afterStatus === "granted") await registerIfGranted();
      else addDiagnostic(`Registration skipped: permission ${afterStatus}`);
    } catch (error) {
      addDiagnostic(`Permission error: ${error?.message ?? String(error)}`);
    } finally {
      setIsRequesting(false);
    }
  };

  const permissionLabel = permissionStatus === "granted" ? "Enabled" : permissionStatus === "denied" ? "Disabled" : permissionStatus === "prompt" ? "Not Determined" : "Unavailable on web";

  return (
    <MobileScreenLayout>
      <Header title="Notification Settings" onBack={() => navigate(-1)} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-5">
        <p className="text-[14px] leading-[140%] text-[#4F4F4F]">Choose which activity can notify you. These preferences apply to in-app and push notifications.</p>
        <div className="mt-5 flex flex-col gap-4">
          {[...new Set(options.map(([, , category]) => category))].map((category) => (
            <section key={category} className="rounded-lg border border-[#E6E6E6] bg-white p-4">
              <h2 className="text-[12px] font-semibold uppercase tracking-wide text-[#498467]">{category}</h2>
              <div className="mt-2 flex flex-col divide-y divide-[#F0F0F0]">
                {options.filter(([, , optionCategory]) => optionCategory === category).map(([key, label]) => <label key={key} className="flex items-center justify-between gap-3 py-3 text-[14px]"><span>{label}</span><input type="checkbox" checked={notifications?.[key] ?? true} onChange={() => toggle(key)} className="h-4 w-4 accent-[#498467]" /></label>)}
              </div>
            </section>
          ))}
        </div>
        <div className="mt-5 rounded-lg bg-[#F5FFF6] p-4">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-[14px] font-semibold">Mobile push notifications</h2><p className="mt-1 text-[12px] text-[#4F4F4F]">Receive alerts even when Grolo is closed.</p><p className="mt-1 text-[12px] font-medium text-[#498467]">Status: {permissionLabel}</p></div><button type="button" disabled={isRequesting} onClick={requestPermission} className="rounded-lg border border-[#498467] px-3 py-2 text-[12px] font-medium text-[#498467] disabled:opacity-50">{isRequesting ? "Checking..." : permissionStatus === "denied" ? "Open Settings" : "Enable"}</button></div>
          <div className="mt-3 rounded border border-[#D7E8DA] bg-white p-2 text-[10px] text-[#4F4F4F]" role="status" aria-live="polite"><p className="font-semibold">Push diagnostics</p>{diagnostics.length ? diagnostics.map((entry) => <p key={entry}>{entry}</p>) : <p>Waiting for diagnostics...</p>}</div>
        </div>
      </div>
    </MobileScreenLayout>
  );
}
