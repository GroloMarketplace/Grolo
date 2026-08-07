import { supabase, isSupabaseConfigured } from "../supabaseClient";

export async function toggleCommentLike({
  commentId,
  userId,
  commentOwnerId,
  actorUsername,
  actorAvatarUrl,
  postId,
  quote,
  thumbnailUrl,
}) {
  if (!isSupabaseConfigured) return null;

  const { data: existing, error: lookupError } = await supabase
    .from("comment_likes")
    .select("comment_id")
    .eq("comment_id", String(commentId))
    .eq("user_id", userId)
    .maybeSingle();
  if (lookupError) throw lookupError;

  if (existing) {
    const { error } = await supabase
      .from("comment_likes")
      .delete()
      .eq("comment_id", String(commentId))
      .eq("user_id", userId);
    if (error) throw error;
    return { liked: false };
  }

  const { error: insertError } = await supabase
    .from("comment_likes")
    .insert({ comment_id: String(commentId), user_id: userId });
  if (insertError) {
    if (insertError.code === "23505") return { liked: true };
    throw insertError;
  }

  if (commentOwnerId && String(commentOwnerId) !== String(userId)) {
    const notification = {
      recipient_id: commentOwnerId,
      actor_user_id: String(userId),
      actor_username: actorUsername,
      actor_name: actorUsername,
      actor_avatar_url: actorAvatarUrl,
      type: "highlight",
      action: "liked your comment",
      quote,
      thumbnail_url: thumbnailUrl,
      post_id: postId == null ? null : String(postId),
      comment_id: String(commentId),
      notification_type: "comment_like",
    };
    const { error: notificationError } = await supabase
      .from("notifications")
      .upsert(notification, { onConflict: "recipient_id,actor_user_id,comment_id,notification_type" });
    if (notificationError) throw notificationError;
  }

  return { liked: true };
}
