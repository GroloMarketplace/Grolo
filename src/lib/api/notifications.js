import { supabase, isSupabaseConfigured } from "../supabaseClient";

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. See .env.example.");
  }
}

function normalizeNotification(notification) {
  return {
    ...notification,
    actorUserId: notification.actor_user_id,
    actorUsername: notification.actor_username ?? notification.actor_name,
    thumbnailUrl: notification.thumbnail_url,
    postId: notification.post_id,
    commentId: notification.comment_id,
    notificationType: notification.notification_type,
  };
}

export async function getNotifications(userId, type) {
  requireSupabase();
  let query = supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false });
  if (type) query = query.eq("type", type);
  const { data, error } = await query;
  if (error) throw error;
  return data.map(normalizeNotification);
}

export async function createNotification({
  recipientId,
  actorUserId,
  actorUsername,
  actorName,
  actorAvatarUrl,
  type,
  action,
  quote,
  thumbnailUrl,
  postId,
  commentId,
  notificationType,
}) {
  requireSupabase();
  const isPostNotification = /post|comment|reply|mention/i.test(notificationType ?? "");
  const isCommentNotification = /comment|reply|mention/i.test(notificationType ?? "");
  if (isPostNotification && postId == null) {
    throw new Error("Post notifications require postId.");
  }
  if (isCommentNotification && commentId == null) {
    throw new Error("Comment notifications require commentId.");
  }
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      recipient_id: recipientId,
      actor_user_id: actorUserId == null ? null : String(actorUserId),
      actor_username: actorUsername ?? actorName,
      actor_name: actorName ?? actorUsername,
      actor_avatar_url: actorAvatarUrl,
      type,
      action,
      quote,
      thumbnail_url: thumbnailUrl,
      post_id: postId == null ? null : String(postId),
      comment_id: commentId == null ? null : String(commentId),
      notification_type: notificationType ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return {
    ...data,
    actorUserId: data.actor_user_id,
    actorUsername: data.actor_username ?? data.actor_name,
    postId: data.post_id,
    commentId: data.comment_id,
    notificationType: data.notification_type,
  };
}

export async function markNotificationRead(id) {
  requireSupabase();
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id);
  if (error) throw error;
}

export function subscribeToNotifications(userId, onInsert) {
  requireSupabase();
  return supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `recipient_id=eq.${userId}`,
      },
      (payload) => onInsert(normalizeNotification(payload.new)),
    )
    .subscribe();
}
