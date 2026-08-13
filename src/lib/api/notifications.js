import { supabase, isSupabaseConfigured } from "../supabaseClient";

function requireSupabase() {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured. See .env.example.");
}

function normalizeNotification(row) {
  return {
    ...row,
    relatedId: row.related_id,
    isRead: Boolean(row.read),
    createdAt: row.created_at,
  };
}

export async function getNotifications(userId) {
  requireSupabase();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalizeNotification);
}

export async function getUnreadNotificationCount(userId) {
  requireSupabase();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) throw error;
  return count ?? 0;
}

export async function createNotification({ userId, recipientId, type, title, message, relatedId }) {
  requireSupabase();
  const { data, error } = await supabase
    .from("notifications")
    .insert({ user_id: userId ?? recipientId, type, title, message, related_id: relatedId ?? null })
    .select("*")
    .single();
  if (error) throw error;
  return normalizeNotification(data);
}

export async function markNotificationRead(id) {
  requireSupabase();
  const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId) {
  requireSupabase();
  const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
  if (error) throw error;
}

export function subscribeToNotifications(userId, onInsert) {
  requireSupabase();
  return supabase
    .channel(`notifications:${userId}`)
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "notifications",
      filter: `user_id=eq.${userId}`,
    }, (payload) => onInsert(normalizeNotification(payload.new)))
    .subscribe();
}
