import { supabase, isSupabaseConfigured } from "../supabaseClient";

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. See .env.example.");
  }
}

export async function getConversations(userId) {
  requireSupabase();
  const { data, error } = await supabase
    .from("conversations")
    .select("*, messages(content, created_at)")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getMessages(conversationId) {
  requireSupabase();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function sendMessage({ conversationId, senderId, content }) {
  requireSupabase();
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, content })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function subscribeToMessages(conversationId, onInsert) {
  requireSupabase();
  return supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onInsert(payload.new),
    )
    .subscribe();
}
