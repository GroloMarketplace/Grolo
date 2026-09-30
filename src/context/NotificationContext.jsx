import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { registerNativePushNotifications } from "../lib/pushNotifications";
import { savePushToken } from "../lib/api/pushTokens";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
} from "../lib/api/notifications";
import { isSupabaseConfigured } from "../lib/supabaseClient";

const NotificationContext = createContext(null);

function routeForPushNotification(notification) {
  const data = notification?.data ?? {};
  if (data.route) return data.route;
  const relatedId = data.relatedId ?? data.related_id;
  const type = String(data.type ?? notification?.title ?? "").toLowerCase();
  if (type.includes("message")) return relatedId ? `/messages/${encodeURIComponent(relatedId)}` : "/messages";
  if (type.includes("order")) return relatedId ? `/orders/${encodeURIComponent(relatedId)}` : "/orders";
  if (type.includes("review")) return "/my-shop/reviews";
  if (type.includes("event")) return relatedId ? `/event/${encodeURIComponent(relatedId)}` : "/notifications";
  if (type.includes("trade")) return relatedId ? `/messages/${encodeURIComponent(relatedId)}` : "/messages";
  if (type.includes("follow")) return data.actorId ? `/profile/${encodeURIComponent(data.actorId)}` : "/notifications";
  return "/notifications";
}

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const PAGE_SIZE = 30;

  useEffect(() => {
    let cancelled = false;
    let cleanup;
    if (!user?.id) return undefined;

    const register = () => registerNativePushNotifications({
      onToken: async (token) => {
        console.info("[PushDiagnostics] registration callback fired", { platform: Capacitor.getPlatform(), userId: user.id });
        try {
          const result = await savePushToken({ userId: user.id, token, platform: Capacitor.getPlatform() });
          console.info("[PushDiagnostics] token saved", result);
        } catch (error) {
          console.error("[PushDiagnostics] token save failed", error);
        }
      },
      onAction: (notification) => navigate(routeForPushNotification(notification)),
    }).then((registration) => {
      if (cancelled) registration.cleanup?.();
      else {
        cleanup?.();
        cleanup = registration.cleanup;
      }
    }).catch((error) => console.error("Unable to register push notifications", error));

    register();
    window.addEventListener("grolo:push-permission-changed", register);
    return () => {
      cancelled = true;
      window.removeEventListener("grolo:push-permission-changed", register);
      cleanup?.();
    };
  }, [navigate, user?.id]);

  useEffect(() => {
    let cancelled = false;
    let channel;
    setNotifications([]);
    setHasMore(false);
    setUnreadCount(0);
    if (!user?.id || !isSupabaseConfigured) return undefined;
    setLoading(true);
    Promise.all([
      getNotifications(user.id, { limit: PAGE_SIZE }),
      getUnreadNotificationCount(user.id),
    ])
      .then(([rows, count]) => {
        if (!cancelled) {
          setNotifications(rows);
          setHasMore(rows.length === PAGE_SIZE);
          setUnreadCount(count);
        }
      })
      .catch((error) => console.error("Unable to load notifications", error))
      .finally(() => { if (!cancelled) setLoading(false); });
    channel = subscribeToNotifications(user.id, (notification) => {
      setNotifications((current) => [notification, ...current.filter((item) => item.id !== notification.id)]);
      if (!notification.read) setUnreadCount((current) => current + 1);
    }, () => {
    });
    return () => {
      cancelled = true;
      channel?.unsubscribe();
    };
  }, [user?.id]);

  const loadMore = useCallback(async () => {
    if (!user?.id || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const rows = await getNotifications(user.id, { limit: PAGE_SIZE, offset: notifications.length });
      setNotifications((current) => [...current, ...rows.filter((row) => !current.some((item) => item.id === row.id))]);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (error) {
      console.error("Unable to load more notifications", error);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, notifications.length, user?.id]);

  const markRead = async (id) => {
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, read: true, isRead: true } : item));
    setUnreadCount((current) => Math.max(0, current - 1));
    try { await markNotificationRead(id); } catch (error) { console.error("Unable to mark notification read", error); }
  };

  const markAllRead = async () => {
    if (!user?.id) return;
    setNotifications((current) => current.map((item) => ({ ...item, read: true, isRead: true })));
    setUnreadCount(0);
    try { await markAllNotificationsRead(user.id); } catch (error) { console.error("Unable to mark all notifications read", error); }
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    markRead,
    markAllRead,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within a NotificationProvider");
  return context;
}
