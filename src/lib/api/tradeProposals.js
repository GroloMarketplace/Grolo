import { isSupabaseConfigured, supabase } from "../supabaseClient";

export async function createTradeProposalRecord({ id, buyerId, sellerId, conversationId, requestedListing, offeredListings, message, photos }) {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from("trade_proposals")
    .insert({
      id,
      buyer_id: buyerId,
      seller_id: sellerId,
      conversation_id: conversationId,
      requested_listing: requestedListing ?? {},
      offered_listings: offeredListings ?? [],
      message: message ?? "",
      photos: photos ?? [],
      status: "pending",
    })
    .select("*")
    .single();
  if (error) throw error;
  console.info("trade proposal delivery", {
    trade_proposal_id: data.id,
    buyer_id: data.buyer_id,
    seller_id: data.seller_id,
    conversation_id: data.conversation_id,
  });
  return data;
}
