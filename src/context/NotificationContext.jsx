import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
} from "../lib/api/notifications";
import { isSupabaseConfigured } from "../lib/supabaseClient";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const PAGE_SIZE = 30;

  useEffect(() => {
    let cancelled = false;
    let channel;
    setNotifications([]);
    setHasMore(false);
    if (!user?.id || !isSupabaseConfigured) return undefined;
    setLoading(true);
    getNotifications(user.id, { limit: PAGE_SIZE })
      .then((rows) => { if (!cancelled) { setNotifications(rows); setHasMore(rows.length === PAGE_SIZE); } })
      .catch((error) => console.error("Unable to load notifications", error))
      .finally(() => { if (!cancelled) setLoading(false); });
    channel = subscribeToNotifications(user.id, (notification) => {
      setNotifications((current) => [notification, ...current.filter((item) => item.id !== notification.id)]);
    }, (status, error) => {
      console.info("realtime notification subscription status", {
        userId: user.id,
        status,
        error: error?.message ?? error ?? null,
      });
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
    try { await markNotificationRead(id); } catch (error) { console.error("Unable to mark notification read", error); }
  };

  const markAllRead = async () => {
    if (!user?.id) return;
    setNotifications((current) => current.map((item) => ({ ...item, read: true, isRead: true })));
    try { await markAllNotificationsRead(user.id); } catch (error) { console.error("Unable to mark all notifications read", error); }
  };

  const value = {
    notifications,
    unreadCount: notifications.filter((item) => !item.read).length,
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
