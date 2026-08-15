import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { useNotifications } from "../context/NotificationContext";

function formatTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function notificationPath(notification) {
  if (!notification.relatedId) return null;
  if (notification.type === "order_received" || notification.type === "order_status") return `/orders/${encodeURIComponent(notification.relatedId)}`;
  if (notification.type === "review_received") return `/my-shop/reviews`;
  if (notification.type === "new_listing" || notification.type === "listing_favorited") return `/product/${notification.relatedId}`;
  if (notification.type === "promotion_created") return `/promotions/${notification.relatedId}`;
  if (notification.type === "new_follower") return `/profile/${notification.relatedId}`;
  return null;
}

export default function NotificationCenter() {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, loadingMore, hasMore, loadMore, markRead, markAllRead } = useNotifications();

  const openNotification = async (notification) => {
    if (!notification.read) await markRead(notification.id);
    const path = notificationPath(notification);
    if (path) navigate(path);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Header title="Notifications" onBack={() => navigate(-1)} />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[14px] text-[#666]">{unreadCount} unread</p>
          <button type="button" onClick={markAllRead} disabled={!unreadCount} className="text-[14px] font-medium text-[#498467] disabled:text-[#aaa]">
            Mark all read
          </button>
        </div>
        {loading && <p className="py-10 text-center text-[14px] text-[#777]">Loading notifications...</p>}
        {!loading && !notifications.length && (
          <div className="rounded-xl border border-[#E6E6E6] px-4 py-12 text-center">
            <p className="text-[18px] font-semibold">No notifications yet</p>
            <p className="mt-2 text-[14px] text-[#777]">We&apos;ll keep you updated when something happens.</p>
          </div>
        )}
        <div className="flex flex-col gap-3">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => openNotification(notification)}
              className={`w-full rounded-xl border p-4 text-left transition-colors ${notification.read ? "border-[#E6E6E6] bg-white" : "border-[#B8D7C5] bg-[#F2F9F4]"}`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${notification.read ? "bg-[#D0D0D0]" : "bg-[#498467]"}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold">{notification.title}</p>
                    <time className="shrink-0 text-[11px] text-[#777]">{formatTimestamp(notification.created_at)}</time>
                  </div>
                  <p className="mt-1 text-[14px] leading-5 text-[#555]">{notification.message}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
        {hasMore && <button type="button" onClick={loadMore} disabled={loadingMore} className="mt-4 w-full rounded-lg border border-[#498467] py-3 text-[14px] font-medium text-[#498467] disabled:opacity-50">{loadingMore ? "Loading…" : "Load more"}</button>}
      </div>
    </div>
  );
}
