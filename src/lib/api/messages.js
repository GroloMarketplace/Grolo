import { supabase, isSupabaseConfigured } from "../supabaseClient";

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. See .env.example.");
  }
}

// Canonical identity contract: participants use profiles/auth UUIDs;
// conversations, messages, orders, and listings use their database UUIDs.
const CONVERSATION_TYPE_MAP = {
  standard: "standard",
  service: "service",
  order: "order",
  trading: "trading",
  trade_proposal: "trade_proposal",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCanonicalUuid(value) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function canonicalId(value, fieldName, required = false) {
  if (value == null || value === "") {
    if (required) throw new Error(`${fieldName} must be a canonical Supabase UUID.`);
    return null;
  }
  if (!isCanonicalUuid(value)) {
    throw new Error(`${fieldName} must be a canonical Supabase UUID.`);
  }
  return value;
}

function metadataFor(row) {
  return row?.metadata && typeof row.metadata === "object" ? row.metadata : {};
}

function databaseConversationType(row) {
  const metadata = metadataFor(row);
  const localType = row?.conversation_type ?? row?.conversationType ?? metadata.conversationType;
  if (localType === "trading" && (row?.trade_proposal || metadata.tradeProposal || metadata.tradeContext?.proposal)) {
    return "trade_proposal";
  }
  return CONVERSATION_TYPE_MAP[localType] ?? "standard";
}

function legacyConversationType(databaseType) {
  return databaseType === "trade_proposal" ? "trading" : databaseType;
}

function conversationCategory(type) {
  if (type === "order") return "Orders";
  if (type === "service") return "Selling";
  if (type === "trading" || type === "trade_proposal") return "Trading";
  return "Selling";
}

function profileFor(row, role) {
  return row?.[`${role}_profile`]
    ?? row?.[role]
    ?? row?.profiles?.[role]
    ?? {};
}

function timestampForDatabase(value) {
  if (value == null || value === "") return null;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

export function databaseMessageToLegacyMessage(row, { currentUserId } = {}) {
  if (!row) return null;
  const databaseId = row.id ?? row.databaseId;
  const createdAt = row.created_at ?? row.createdAt;
  const senderId = row.sender_id ?? row.senderId;
  return {
    ...row,
    id: row.legacy_id ?? row.legacyId ?? databaseId,
    databaseId,
    conversationId: row.conversation_id ?? row.conversationId,
    senderId,
    from: row.from ?? (currentUserId && senderId === currentUserId ? "me" : "them"),
    text: row.content ?? row.text ?? "",
    timestamp: row.timestamp ?? createdAt,
    createdAt,
  };
}

export function databaseConversationToLegacyConversation(row, { currentUserId } = {}) {
  if (!row) return null;
  const metadata = metadataFor(row);
  const databaseId = row.id ?? row.databaseId;
  const legacyId = row.legacy_id ?? row.legacyId ?? metadata.legacyId ?? null;
  const databaseType = databaseConversationType(row);
  const conversationType = legacyConversationType(databaseType);
  const buyerId = row.buyer_id ?? row.buyerId;
  const sellerId = row.seller_id ?? row.sellerId;
  const participantId = currentUserId === buyerId ? sellerId : currentUserId === sellerId ? buyerId : sellerId;
  const sellerProfile = profileFor(row, "seller");
  const rawMessages = Array.isArray(row.messages) ? row.messages : [];
  const mappedMessages = rawMessages.map((message) => databaseMessageToLegacyMessage(message, { currentUserId })).filter(Boolean);
  const latestMessage = mappedMessages[mappedMessages.length - 1];
  const orderId = row.order_id ?? row.orderId ?? metadata.orderId ?? null;
  const listingId = row.listing_id ?? row.listingId ?? metadata.listingId ?? null;
  const orderContext = metadata.orderContext
    ? { ...metadata.orderContext, ...(orderId ? { orderId } : {}) }
    : null;
  const tradeContext = row.trade_context ?? metadata.tradeContext ?? metadata.tradeProposal ?? null;
  const serviceContext = row.service_context ?? metadata.serviceContext ?? null;
  const tradeProposal = row.trade_proposal ?? metadata.tradeProposal ?? null;
  const productContext = row.product_context ?? metadata.productContext ?? null;

  return {
    ...row,
    id: legacyId ?? databaseId,
    databaseId,
    legacyId,
    name: row.name ?? sellerProfile.display_name ?? sellerProfile.shop_name ?? sellerProfile.name ?? "User",
    sellerId,
    participantId,
    buyerId,
    location: row.location ?? sellerProfile.location,
    timestamp: row.updated_at ?? row.updatedAt ?? row.created_at ?? row.createdAt,
    preview: row.preview ?? latestMessage?.text ?? "",
    unread: Boolean(row.unread),
    category: row.category ?? conversationCategory(databaseType),
    conversationType,
    orderId,
    listingId,
    orderContext,
    tradeContext,
    tradeProposal,
    productContext,
    serviceContext,
    messages: mappedMessages,
    ...(conversationType === "trading" ? { tradeThread: true } : {}),
  };
}

export function legacyConversationToDatabasePayload(conversation, { buyerId, sellerId, listingId, orderId } = {}) {
  const source = conversation && typeof conversation === "object" ? conversation : {};
  const resolvedBuyerId = canonicalId(buyerId ?? source.buyerId, "buyerId", true);
  const resolvedSellerId = canonicalId(sellerId ?? source.sellerId ?? source.participantId, "sellerId", true);
  const resolvedListingId = canonicalId(listingId ?? source.listingId, "listingId");
  const resolvedOrderId = canonicalId(orderId ?? source.orderId, "orderId");
  const localType = source.conversationType ?? (source.tradeProposal ? "trade_proposal" : "standard");
  const conversationType = CONVERSATION_TYPE_MAP[localType] ?? "standard";
  const databaseId = canonicalId(
    source.databaseId ?? (isCanonicalUuid(source.id) ? source.id : null),
    "conversationId",
  );
  const metadata = {
    ...(source.metadata && typeof source.metadata === "object" ? source.metadata : {}),
    ...(source.legacyId ? { legacyId: source.legacyId } : {}),
    ...(source.orderContext ? { orderContext: source.orderContext } : {}),
    ...(source.tradeContext ? { tradeContext: source.tradeContext } : {}),
    ...(source.tradeProposal ? { tradeProposal: source.tradeProposal } : {}),
    ...(source.productContext ? { productContext: source.productContext } : {}),
    ...(source.serviceContext ? { serviceContext: source.serviceContext } : {}),
    ...(source.preview ? { preview: source.preview } : {}),
    ...(source.unread != null ? { unread: Boolean(source.unread) } : {}),
  };

  return {
    ...(databaseId ? { id: databaseId } : {}),
    buyer_id: resolvedBuyerId,
    seller_id: resolvedSellerId,
    ...(resolvedListingId ? { listing_id: resolvedListingId } : {}),
    ...(resolvedOrderId ? { order_id: resolvedOrderId } : {}),
    conversation_type: conversationType,
    metadata,
  };
}

export function legacyMessageToDatabasePayload(message, { conversationId, senderId } = {}) {
  const source = message && typeof message === "object" ? message : {};
  const resolvedConversationId = canonicalId(conversationId ?? source.conversationId, "conversationId", true);
  const resolvedSenderId = canonicalId(senderId ?? source.senderId, "senderId", true);
  const createdAt = timestampForDatabase(source.createdAt ?? source.timestamp);
  const payload = {
    conversation_id: resolvedConversationId,
    sender_id: resolvedSenderId,
    content: source.text ?? source.content ?? "",
    ...(createdAt ? { created_at: createdAt } : {}),
  };
  const databaseId = canonicalId(
    source.databaseId ?? (isCanonicalUuid(source.id) ? source.id : null),
    "messageId",
  );
  return databaseId ? { id: databaseId, ...payload } : payload;
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
