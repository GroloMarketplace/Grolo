import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { useNotifications } from "../context/NotificationContext";
import { useProfileMode } from "../context/ProfileModeContext";
import { useAuth } from "../context/AuthContext";

const SELLER_ACTIVITY_TYPES = new Set([
  "new_follower",
  "new_message",
  "message_received",
  "order_received",
  "promotion_updated",
  "listing_updated",
  "listing_update",
  "account_alert",
  "spotlight_expiration",
  "spotlight_expiration_notice",
]);

const NOTIFICATION_PILLS = [
  { id: "highlights", label: "✨ Highlights" },
  { id: "store", label: "🏪 Store Activity" },
  { id: "reviews", label: "⭐ Reviews" },
  { id: "messages", label: "💬 Messages" },
  { id: "orders", label: "📦 Orders" },
];

function notificationMatches(notification, category) {
  if (category === "highlights") return !SELLER_ACTIVITY_TYPES.has(notification.type);
  if (category === "store") return SELLER_ACTIVITY_TYPES.has(notification.type);
  if (category === "reviews") return notification.type === "review_received";
  if (category === "messages") return ["new_message", "message_received"].includes(notification.type);
  if (category === "orders") return ["order_received", "order_created", "order_status"].includes(notification.type);
  return false;
}

function formatRelativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 172800) return "Yesterday";
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function dateGroup(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Earlier";
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  if (startOfDate === startOfToday) return "Today";
  if (startOfDate === startOfToday - 86400000) return "Yesterday";
  return "Earlier";
}

function notificationAvatar(notification, storeAvatar = "") {
  return notification.actorAvatarUrl || notification.actor_avatar_url || notification.avatar_url || notification.avatar || notification.storeImageUrl || notification.store_image_url || notification.image || storeAvatar;
}

function notificationInitial(notification) {
  return (notification.actorUsername || notification.actor_name || notification.name || notification.title || "G").trim().charAt(0).toUpperCase();
}

function actorName(notification) {
  return notification.actorName || notification.actor_name || notification.actorUsername || notification.actor_username || notification.name || "Someone";
}

function listingName(notification) {
  const match = notification.message?.match(/[“"]([^”"]+)[”"]/);
  return notification.subjectTitle || notification.subject_title || notification.listingName || notification.listing_name || match?.[1] || "your listing";
}

function activityCopy(notification) {
  const person = actorName(notification);
  if (notification.type === "new_follower") return `${person} started following your store`;
  if (notification.type === "listing_favorited") return `${person} favorited ${listingName(notification)}`;
  if (notification.type === "review_received") return `${person} left a review on your listing`;
  if (notification.type === "new_message" || notification.type === "message_received") return `${person} sent you a message`;
  if (notification.type === "order_received") return "You received a new order";
  return notification.title || "New community activity";
}

function notificationActions(notification) {
  if (notification.type === "new_follower") return [{ label: "View Profile", path: notification.relatedId ? `/profile/${notification.relatedId}` : null }];
  if (notification.type === "listing_favorited" || notification.type === "new_listing") return [{ label: "View Listing", path: notification.relatedId ? `/product/${notification.relatedId}` : null }];
  if (notification.type === "review_received") return [{ label: "View Review", path: "/my-shop/reviews" }, { label: "View Store", path: "/shop" }];
  if (notification.type === "new_message" || notification.type === "message_received") return [{ label: "Reply", path: notification.relatedId ? `/messages/${notification.relatedId}` : "/messages" }];
  if (notification.type === "order_received" || notification.type === "order_status") return [{ label: "View Store", path: notification.relatedId ? `/orders/${encodeURIComponent(notification.relatedId)}` : "/shop" }];
  return [];
}

function notificationPath(notification) {
  if (!notification.relatedId) return null;
  if (notification.type === "order_received" || notification.type === "order_status") return `/orders/${encodeURIComponent(notification.relatedId)}`;
  if (notification.type === "review_received") return `/my-shop/reviews`;
  if (notification.type === "new_listing" || notification.type === "listing_favorited") return `/product/${notification.relatedId}`;
  if (notification.type === "promotion_created") return `/promotions/${notification.relatedId}`;
  if (notification.type === "new_message" || notification.type === "message_received") return `/messages/${notification.relatedId}`;
  if (notification.type === "new_follower") return `/profile/${notification.relatedId}`;
  return null;
}

export default function NotificationCenter() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { storeActive } = useProfileMode();
  const storeAvatar = profile?.store_avatar_url || profile?.shop_avatar_url || profile?.avatar_url || profile?.avatar || "";
  const { notifications, loading, loadingMore, hasMore, loadMore, markRead } = useNotifications();
  const [activeTab, setActiveTab] = useState("highlights");
  const visibleTab = storeActive ? activeTab : "highlights";
  const visibleNotifications = useMemo(
    () => notifications.filter((notification) => notificationMatches(notification, visibleTab)),
    [notifications, visibleTab],
  );
  const groupedNotifications = useMemo(
    () => ["Today", "Yesterday", "Earlier"].map((group) => ({
      group,
      items: visibleNotifications.filter((notification) => dateGroup(notification.created_at) === group),
    })).filter((section) => section.items.length),
    [visibleNotifications],
  );

  const openNotification = async (notification) => {
    if (!notification.read) await markRead(notification.id);
    const path = notificationPath(notification);
    if (path) navigate(path);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Header title="Notifications" onBack={() => navigate(-1)} />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="mb-4 -mx-1 overflow-x-auto px-1 pb-1 no-scrollbar">
          <div className="flex w-max gap-2" role="tablist" aria-label="Notification categories">
            {NOTIFICATION_PILLS.filter((pill) => storeActive || pill.id === "highlights").map((pill) => (
              <button
                key={pill.id}
                type="button"
                role="tab"
                aria-selected={visibleTab === pill.id}
                onClick={() => setActiveTab(pill.id)}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-semibold transition-all ${visibleTab === pill.id ? "border-[#D5E7DB] bg-[#EAF5ED] text-[#2F5E47] shadow-[0_3px_10px_rgba(73,132,103,0.16)]" : "border-[#E7E7E7] bg-white text-[#777]"}`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>
        {loading && <p className="py-8 text-center text-[14px] text-[#777]">Loading notifications...</p>}
        {!loading && !visibleNotifications.length && (
          <div className="rounded-2xl border border-dashed border-[#DDE6E0] px-4 py-8 text-center">
            <p className="text-[17px] font-semibold">No {visibleTab === "store" ? "store activity" : visibleTab} yet</p>
            <p className="mt-1 text-[13px] text-[#777]">We&apos;ll keep you updated when something happens.</p>
          </div>
        )}
        <div className="flex flex-col gap-5">
          {groupedNotifications.map(({ group, items }) => (
            <section key={group} aria-labelledby={`notification-group-${group}`}>
              <h2 id={`notification-group-${group}`} className="mb-2 px-1 text-[12px] font-bold uppercase tracking-[0.12em] text-[#8A8A8A]">{group}</h2>
              <div className="flex flex-col gap-2">
                {items.map((notification) => {
                  const avatar = notificationAvatar(notification, storeAvatar);
                  const subjectImage = notification.subjectImageUrl || notification.subject_image_url || "";
                  const storeImage = notification.storeImageUrl || notification.store_image_url || storeAvatar;
                  const storeUpdate = visibleTab === "store" || SELLER_ACTIVITY_TYPES.has(notification.type);
                  const actions = notificationActions(notification);
                  return (
                    <article key={notification.id} className={`rounded-2xl border px-3 py-3 transition-all ${notification.read ? "border-[#ECECEC] bg-white" : "border-[#D5E7DB] bg-[#F7FCF8]"}`}>
                      <button type="button" onClick={() => openNotification(notification)} className="w-full text-left active:scale-[0.99]">
                        <div className="flex items-center gap-3">
                          <div className={`relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full ${storeUpdate ? "bg-[#EAF0EC]" : "bg-[#F1E9DE]"}`}>
                            {avatar ? <img src={avatar} alt={`${actorName(notification)} avatar`} className="h-full w-full object-cover" /> : <span className="text-[15px] font-bold text-[#498467]">{storeUpdate ? "▣" : notificationInitial(notification)}</span>}
                            {!notification.read && <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#498467]" aria-label="Unread" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-[14px] font-semibold leading-5 text-[#292929]">{activityCopy(notification)}</p>
                              <time className="shrink-0 pt-0.5 text-[11px] font-medium text-[#999]">{formatRelativeTime(notification.created_at)}</time>
                            </div>
                            <p className="mt-0.5 text-[13px] leading-5 text-[#666]">{notification.message}</p>
                          </div>
                          {(subjectImage || (storeUpdate && storeImage && storeImage !== avatar)) && (
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white bg-[#F2F2F2] shadow-sm">
                              <img src={subjectImage || storeImage} alt="" className="h-full w-full object-cover" />
                            </div>
                          )}
                        </div>
                      </button>
                      {actions.length > 0 && (
                        <div className="ml-14 mt-2 flex flex-wrap gap-2">
                          {actions.map((action) => (
                            <button
                              key={action.label}
                              type="button"
                              disabled={!action.path}
                              onClick={() => {
                                if (!notification.read) markRead(notification.id);
                                if (action.path) navigate(action.path);
                              }}
                              className="rounded-full border border-[#CFE1D5] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#397354] transition-colors hover:bg-[#EDF7F0] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
        {hasMore && <button type="button" onClick={loadMore} disabled={loadingMore} className="mt-4 w-full rounded-lg border border-[#498467] py-3 text-[14px] font-medium text-[#498467] disabled:opacity-50">{loadingMore ? "Loading…" : "Load more"}</button>}
      </div>
    </div>
  );
}
