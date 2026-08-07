import { supabase, isSupabaseConfigured } from "../supabaseClient";
import { createReplyNotifications } from "./notifications";

function requireSupabase() {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured. See .env.example.");
}

function normalizeComment(comment) {
  return {
    ...comment,
    authorId: comment.author_id,
    contentType: comment.content_type,
    contentId: comment.content_id,
    parentCommentId: comment.parent_comment_id,
  };
}

export async function getComments(contentType, contentId) {
  requireSupabase();
  const { data, error } = await supabase
    .from("comments")
    .select("*, profiles(display_name, avatar_url)")
    .eq("content_type", contentType)
    .eq("content_id", String(contentId))
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map(normalizeComment);
}

export async function createComment({ contentType, contentId, parentCommentId, body, authorId, actorUsername, actorAvatarUrl, recipientIds, mentionedUserIds, thumbnailUrl }) {
  requireSupabase();
  const { data, error } = await supabase
    .from("comments")
    .insert({
      content_type: contentType,
      content_id: String(contentId),
      parent_comment_id: parentCommentId ?? null,
      body,
      author_id: authorId,
    })
    .select("*, profiles(display_name, avatar_url)")
    .single();
  if (error) throw error;
  const comment = normalizeComment(data);
  if (parentCommentId) {
    const [{ data: parent }, { data: siblingReplies }] = await Promise.all([
      supabase.from("comments").select("author_id").eq("id", parentCommentId).maybeSingle(),
      supabase.from("comments").select("author_id").eq("parent_comment_id", parentCommentId),
    ]);
    await createReplyNotifications({
      postId: contentType === "post" ? contentId : null,
      parentCommentId,
      replyId: comment.id,
      quote: body,
      actorUserId: authorId,
      actorUsername,
      actorAvatarUrl,
      recipientIds: [parent?.author_id, ...(siblingReplies ?? []).map((reply) => reply.author_id), ...(recipientIds ?? [])],
      mentionedUserIds,
      thumbnailUrl,
    });
  }
  return comment;
}
