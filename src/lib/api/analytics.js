import { isSupabaseConfigured, supabase } from "../supabaseClient";

export async function getVendorAnalytics(sellerId, periodDays = 30) {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.rpc("get_vendor_analytics", {
    p_seller_id: sellerId,
    p_period_days: periodDays,
  });
  if (error) throw error;
  return data;
}
