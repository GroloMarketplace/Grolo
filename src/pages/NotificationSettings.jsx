import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { useBuyerSettings } from "../context/BuyerSettingsContext";
import { useSellerSettings } from "../context/SellerSettingsContext";
import { useProfileMode } from "../context/ProfileModeContext";
import { requestNativePushPermission } from "../lib/pushNotifications";

const BUYER_OPTIONS = [
  ["newMessages", "New Messages", "Messaging"],
  ["newFollowers", "New Followers", "Community"],
  ["productUpdates", "Product Updates", "Marketing"],
  ["eventUpdates", "Event Reminders and Saved Event Updates", "Events"],
  ["tradeRequests", "Trade Activity", "Community"],
  ["orderUpdates", "Order Updates", "Orders"],
  ["communityActivity", "Regrows and Community Activity", "Community"],
];

const SELLER_OPTIONS = [
  ["newMessages", "New Messages", "Messaging"],
  ["newOrders", "New Orders", "Orders"],
  ["newFollowers", "New Followers", "Community"],
  ["reviews", "Review Received", "Reviews"],
  ["eventInteractions", "Event Activity", "Events"],
];

export default function NotificationSettings() {
  const navigate = useNavigate();
  const { profileMode } = useProfileMode();
  const { settings, updateSettings } = useBuyerSettings();
  const { getSellerProfile, updateSellerProfile } = useSellerSettings();
  const sellerProfile = getSellerProfile("current-user");
  const [permissionStatus, setPermissionStatus] = useState("");
  const isSeller = profileMode === "seller";
  const options = isSeller ? SELLER_OPTIONS : BUYER_OPTIONS;
  const notifications = isSeller ? sellerProfile.notifications : settings.notifications;

  const toggle = async (key) => {
    const next = { ...notifications, [key]: !notifications[key] };
    if (isSeller) await updateSellerProfile("current-user", { notifications: next });
    else await updateSettings({ notifications: next });
  };

  const requestPermission = async () => {
    const permission = await requestNativePushPermission();
    setPermissionStatus(permission === "granted" ? "Push notifications enabled." : permission === "denied" ? "Permission denied. Enable notifications in system settings." : "Push notifications are available in the mobile app.");
  };

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
        <div className="mt-5 rounded-lg bg-[#F5FFF6] p-4"><div className="flex items-center justify-between gap-3"><div><h2 className="text-[14px] font-semibold">Mobile push notifications</h2><p className="mt-1 text-[12px] text-[#4F4F4F]">Receive alerts even when Grolo is closed.</p></div><button type="button" onClick={requestPermission} className="rounded-lg border border-[#498467] px-3 py-2 text-[12px] font-medium text-[#498467]">Enable</button></div>{permissionStatus && <p className="mt-2 text-[12px] text-[#4F4F4F]">{permissionStatus}</p>}</div>
      </div>
    </MobileScreenLayout>
  );
}
