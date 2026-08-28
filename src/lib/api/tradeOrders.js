import { isSupabaseConfigured, supabase } from "../supabaseClient";

export async function createTradeOrder({ buyerId, sellerId, requestedListing, offeredListings }) {
  if (!isSupabaseConfigured) return null;
  const offeredItems = Array.isArray(offeredListings) ? offeredListings.filter(Boolean) : [];
  const payload = {
    buyer_id: buyerId,
    seller_id: sellerId,
    requested_listing: requestedListing ?? {},
    offered_listings: offeredItems,
    status: "accepted",
  };
  const { data, error } = await supabase
    .from("trade_orders")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    type: "trade",
    status: data.status,
    buyerReceives: data.requested_listing ?? {},
    sellerReceives: Array.isArray(data.offered_listings) ? data.offered_listings : [],
    createdAt: data.created_at,
  };
}
