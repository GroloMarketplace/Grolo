import { isSupabaseConfigured, supabase } from "../supabaseClient";

export async function createTradeProposalRecord({ id, buyerId, sellerId, conversationId, requestedListing, offeredListings, message, photos }) {
  if (!isSupabaseConfigured) return null;
  const { data: rows, error } = await supabase
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
    .select("*");
  console.info("trade proposal persistence query", {
    trade_proposal_id: id,
    conversation_id: conversationId,
    raw_proposal_message: message,
    proposal_message_type: typeof message,
    offered_listing_ids: (offeredListings ?? []).map((item) => item?.id ?? item?.listingId ?? null),
    offered_listing_names: (offeredListings ?? []).map((item) => item?.name ?? null),
    offered_quantities: (offeredListings ?? []).map((item) => item?.quantity ?? null),
    query_result_count: rows?.length ?? 0,
    error: error?.message ?? null,
  });
  if (error) throw error;
  if (!rows?.length) throw new Error("Trade proposal insert returned no rows.");
  if (rows.length > 1) throw new Error(`Trade proposal insert returned ${rows.length} rows; expected one.`);
  const data = rows[0];
  console.info("trade proposal object audit", {
    trade_proposal_id: data?.id ?? id,
    trade_proposal_object: data ?? null,
    conversation_id: data?.conversation_id ?? conversationId,
  });
  console.info("trade proposal delivery", {
    trade_proposal_id: data.id,
    buyer_id: data.buyer_id,
    seller_id: data.seller_id,
    conversation_id: data.conversation_id,
  });
  const { error: conversationLinkError } = await supabase
    .from("conversations")
    .update({ trade_proposal_id: data.id })
    .eq("id", data.conversation_id);
  if (conversationLinkError) throw conversationLinkError;
  try {
    await recordTradeProposalEvent({ tradeProposalId: data.id, actorId: buyerId, status: data.status });
  } catch (eventError) {
    console.warn("trade proposal creation history failed", { trade_proposal_id: data.id, error: eventError?.message ?? String(eventError) });
  }
  try {
    await auditRecentTradeProposals();
  } catch (auditError) {
    console.warn("recent trade proposals audit failed", { error: auditError?.message ?? String(auditError) });
  }
  return data;
}

export async function auditRecentTradeProposals() {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from("trade_proposals")
    .select("id, buyer_id, seller_id, conversation_id, requested_listing, offered_listings, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);
  console.info("recent trade proposals canonical table audit", {
    source: "trade_proposals",
    row_count: data?.length ?? 0,
    rows: data ?? [],
    error: error?.message ?? null,
  });
  if (error) throw error;
  return data ?? [];
}

export async function getTradeProposalByConversation(conversationId) {
  if (!isSupabaseConfigured || !conversationId) return null;
  const { data, error } = await supabase
    .from("trade_proposals")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateTradeProposalRecord({ id, status, acceptedAt = null, acceptedBy = null, counterOffer = null }) {
  if (!isSupabaseConfigured) return null;
  const payload = {
    status,
    counter_offer: counterOffer,
    ...(status === "accepted" ? { accepted_at: acceptedAt ?? new Date().toISOString(), accepted_by: acceptedBy } : {}),
  };
  const { data, error } = await supabase
    .from("trade_proposals")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  console.info("trade proposal status persistence", {
    trade_proposal_id: id,
    requested_status: status,
    persisted_status: data?.status ?? null,
    accepted_at: data?.accepted_at ?? null,
    accepted_by: data?.accepted_by ?? null,
    error: error?.message ?? null,
  });
  if (error) throw error;
  return data;
}

export async function recordTradeProposalEvent({ tradeProposalId, actorId, status, counterOffer = null }) {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from("trade_proposal_events")
    .insert({ trade_proposal_id: tradeProposalId, actor_id: actorId, status, counter_offer: counterOffer })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function verifyTradeProposalDelivery({ tradeProposalId, buyerId, sellerId, conversationId, messageId }) {
  if (!isSupabaseConfigured) return { skipped: true };
  const [proposalResult, conversationResult, messageResult] = await Promise.all([
    supabase.from("trade_proposals").select("id, buyer_id, seller_id, conversation_id").eq("id", tradeProposalId),
    supabase.from("conversations").select("id, buyer_id, seller_id, updated_at, metadata").eq("id", conversationId),
    supabase.from("messages").select("id, conversation_id, sender_id").eq("id", messageId),
  ]);
  const errors = [proposalResult.error, conversationResult.error, messageResult.error].filter(Boolean);
  if (errors.length) throw errors[0];
  console.info("trade proposal verification object audit", {
    trade_proposal_id: tradeProposalId,
    trade_proposal_object: proposalResult.data?.[0] ?? null,
    conversation_id: conversationId,
    conversation_object: conversationResult.data?.[0] ?? null,
    message_id: messageId,
    message_object: messageResult.data?.[0] ?? null,
  });
  const verification = {
    trade_proposal_id: proposalResult.data?.[0]?.id ?? tradeProposalId,
    buyer_id: buyerId,
    seller_id: sellerId,
    conversation_id: conversationResult.data?.[0]?.id ?? conversationId,
    conversation_updated_at: conversationResult.data?.[0]?.updated_at ?? null,
    message_id: messageResult.data?.[0]?.id ?? messageId,
    proposal_query_result_count: proposalResult.data?.length ?? 0,
    conversation_query_result_count: conversationResult.data?.length ?? 0,
    message_query_result_count: messageResult.data?.length ?? 0,
    proposal_row_exists: Boolean(proposalResult.data?.length),
    conversation_row_exists: Boolean(conversationResult.data?.length),
    conversation_has_buyer: conversationResult.data?.[0]?.buyer_id === buyerId,
    conversation_has_seller: conversationResult.data?.[0]?.seller_id === sellerId,
    message_row_exists: Boolean(messageResult.data?.length),
    message_conversation_matches: messageResult.data?.[0]?.conversation_id === conversationId,
  };
  console.info("trade proposal delivery verified", verification);
  return verification;
}
