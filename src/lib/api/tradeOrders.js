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
  console.info("trade order persistence payload audit", {
    requested_listing_id: payload.requested_listing?.id ?? null,
    requested_listing_name: payload.requested_listing?.name ?? null,
    offered_listing_ids: payload.offered_listings.map((item) => item?.id ?? item?.listingId ?? null),
    offered_listing_names: payload.offered_listings.map((item) => item?.name ?? null),
    offered_listing_images: payload.offered_listings.map((item) => item?.image ?? null),
    offered_quantities: payload.offered_listings.map((item) => item?.quantity ?? null),
    accepted_trade_order_payload: payload,
  });
  const { data, error } = await supabase
    .from("trade_orders")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  console.info("trade order persistence response audit", {
    trade_order_id: data.id,
    requested_listing: data.requested_listing,
    offered_listings: data.offered_listings,
  });
  return {
    id: data.id,
    type: "trade",
    status: data.status,
    buyerReceives: data.requested_listing ?? {},
    sellerReceives: Array.isArray(data.offered_listings) ? data.offered_listings : [],
    createdAt: data.created_at,
  };
}
