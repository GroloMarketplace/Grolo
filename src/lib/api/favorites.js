import { supabase, isSupabaseConfigured } from "../supabaseClient";

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. See .env.example.");
  }
}

export async function getFavorites(userId) {
  requireSupabase();
  const { data, error } = await supabase
    .from("favorites")
    .select("listing_id, listings(*)")
    .eq("user_id", userId);
  if (error) throw error;
  return data;
}

export async function addFavorite(userId, listingId) {
  requireSupabase();
  const { error } = await supabase
    .from("favorites")
    .insert({ user_id: userId, listing_id: listingId });
  if (error) throw error;
}

export async function removeFavorite(userId, listingId) {
  requireSupabase();
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("listing_id", listingId);
  if (error) throw error;
}
