import { isSupabaseConfigured, supabase } from "../supabaseClient";

function requireSupabase() {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
}

export const hiddenContentKey = (contentType, contentId) => `${contentType}:${contentId}`;

export async function getHiddenContent(userId) {
  requireSupabase();
  const { data, error } = await supabase
    .from("hidden_content")
    .select("content_type, content_id")
    .eq("user_id", userId);
  if (error) throw error;
  return new Set((data ?? []).map((row) => hiddenContentKey(row.content_type, row.content_id)));
}

export async function hideContent(userId, contentType, contentId) {
  requireSupabase();
  const { error } = await supabase
    .from("hidden_content")
    .insert({ user_id: userId, content_type: contentType, content_id: String(contentId) });
  if (error && error.code !== "23505") throw error;
}

export async function unhideContent(userId, contentType, contentId) {
  requireSupabase();
  const { error } = await supabase
    .from("hidden_content")
    .delete()
    .eq("user_id", userId)
    .eq("content_type", contentType)
    .eq("content_id", String(contentId));
  if (error) throw error;
}
