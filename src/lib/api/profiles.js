import { supabase, isSupabaseConfigured } from "../supabaseClient";

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. See .env.example.");
  }
}

export async function getProfile(userId) {
  requireSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function upsertProfile(profile) {
  requireSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .upsert(profile)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getShopBySlug(slug) {
  requireSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("shop_slug", slug)
    .single();
  if (error) throw error;
  return data;
}
