import { isSupabaseConfigured, supabase } from "../supabaseClient";

export async function savePushToken({ userId, token, platform }) {
  if (!isSupabaseConfigured || !userId || !token) return false;
  const { error } = await supabase.from("push_tokens").upsert({
    user_id: userId,
    token,
    platform,
    updated_at: new Date().toISOString(),
  }, { onConflict: "token" });
  if (error) throw error;
  return true;
}
