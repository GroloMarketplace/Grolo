import { supabase, isSupabaseConfigured } from "../supabaseClient";

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. See .env.example.");
  }
}

export async function getListings({ category, limit = 20 } = {}) {
  requireSupabase();
  let query = supabase
    .from("listings")
    .select("*, profiles(shop_name, shop_slug)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (category) query = query.eq("category", category);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getListingById(id) {
  requireSupabase();
  const { data, error } = await supabase
    .from("listings")
    .select("*, profiles(shop_name, shop_slug)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function searchListings(query) {
  requireSupabase();
  const { data, error } = await supabase
    .from("listings")
    .select("*, profiles(shop_name, shop_slug)")
    .textSearch("search_vector", query, { type: "websearch" });
  if (error) throw error;
  return data;
}

export async function getCategories() {
  requireSupabase();
  const { data, error } = await supabase.from("categories").select("*");
  if (error) throw error;
  return data;
}
