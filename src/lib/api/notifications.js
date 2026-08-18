import { supabase, isSupabaseConfigured } from "../supabaseClient";

function requireSupabase() {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured. See .env.example.");
}

function normalizeNotification(row) {
  const normalized = {
    ...row,
    relatedId: row.related_id,
    actorId: row.actor_id,
    actorName: row.actor_name ?? row.actorName ?? row.actor_display_name ?? row.actor_username ?? null,
    actorAvatarUrl: row.actor_avatar ?? row.actor_avatar_url ?? row.actorAvatarUrl ?? null,
    subjectTitle: row.subject_title,
    subjectImageUrl: row.subject_image_url,
    storeImageUrl: row.store_image_url,
    isRead: Boolean(row.read),
    createdAt: row.created_at,
  };
  console.info("notification actor audit", {
    notificationId: normalized.id ?? null,
    notificationType: normalized.type ?? null,
    actorId: normalized.actorId ?? null,
    actorName: normalized.actorName ?? null,
    actorAvatar: normalized.actorAvatarUrl ?? null,
  });
  return normalized;
}

export async function getNotifications(userId, { limit = 30, offset = 0 } = {}) {
  requireSupabase();
  const { data, error } = await supabase
    .from("notifications")
    .select("id,user_id,type,title,message,related_id,read,created_at,actor_id,actor_name,actor_avatar,subject_title,subject_image_url,store_image_url")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
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

export function subscribeToNotifications(userId, onInsert, onStatus) {
  requireSupabase();
  const channelName = `notifications:${userId}`;
  const channel = supabase
    .channel(channelName)
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "notifications",
      filter: `user_id=eq.${userId}`,
    }, (payload) => {
      console.info("realtime notification INSERT event received", {
        channel: channelName,
        userId,
        notificationId: payload.new?.id ?? null,
        type: payload.new?.type ?? null,
      });
      onInsert(normalizeNotification(payload.new));
    });
  channel.subscribe((status, error) => {
    console.info("realtime notification channel status", {
      channel: channelName,
      userId,
      status,
      error: error?.message ?? error ?? null,
    });
    onStatus?.(status, error);
  });
  return channel;
}
