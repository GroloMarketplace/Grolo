import { isSupabaseConfigured, supabase } from "../supabaseClient";

export async function createTradeOrder({ buyerId, sellerId, requestedListing, offeredListings }) {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from("trade_orders")
    .insert({
      buyer_id: buyerId,
      seller_id: sellerId,
      requested_listing: requestedListing ?? {},
      offered_listings: offeredListings ?? [],
      status: "accepted",
    })
    .select("*")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    type: "trade",
    status: data.status,
    buyerReceives: data.requested_listing,
    sellerReceives: data.offered_listings,
    createdAt: data.created_at,
  };
}
