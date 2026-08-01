import { supabase, isSupabaseConfigured } from "../supabaseClient";

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. See .env.example.");
  }
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
  return data;
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
      (payload) => onInsert(payload.new),
    )
    .subscribe();
}
