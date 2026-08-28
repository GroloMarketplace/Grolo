import { supabase, isSupabaseConfigured } from "../supabaseClient";
function requireSupabase() {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured. See .env.example.");
}

function normalizeComment(comment) {
  const profile = comment.profiles ?? comment.profile ?? null;
  return {
    ...comment,
    authorId: comment.author_id,
    contentType: comment.content_type,
    contentId: comment.content_id,
    parentCommentId: comment.parent_comment_id,
    text: comment.body ?? "",
    username: profile?.display_name ?? profile?.username ?? "Community member",
    avatar: profile?.avatar_url ?? "",
    timestamp: comment.created_at ? new Date(comment.created_at).toLocaleString() : "Just now",
  };
}

function logComment(operation, comment, extra = {}) {
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
  const comments = (data ?? []).map(normalizeComment);
  return comments;
}

export async function createComment({ contentType, contentId, parentCommentId, body, authorId }) {
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
  if (error) {
    console.error("comments insert failed", {
      parent_type: contentType,
      parent_id: String(contentId),
      author_id: authorId ?? null,
      error: error?.message ?? String(error),
    });
    throw error;
  }
  const comment = normalizeComment(data);
  logComment("insert succeeded", data);
  return comment;
}
