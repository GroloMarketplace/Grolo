import { supabase, isSupabaseConfigured } from "../supabaseClient";

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. See .env.example.");
  }
}

// Canonical identity contract: participants use profiles/auth UUIDs;
// conversations, messages, orders, and listings use their database UUIDs.
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
  const databaseId = row.id ?? row.databaseId;
  const buyerId = row.buyer_id ?? row.buyerId;
  const sellerId = row.seller_id ?? row.sellerId;
  const participantId = currentUserId === buyerId ? sellerId : currentUserId === sellerId ? buyerId : sellerId;
  const sellerProfile = profileFor(row, "seller");
  const rawMessages = Array.isArray(row.messages) ? row.messages : [];
  const mappedMessages = rawMessages.map((message) => databaseMessageToLegacyMessage(message, { currentUserId })).filter(Boolean);

  return {
    ...row,
    id: databaseId,
    databaseId,
    name: row.name ?? sellerProfile.display_name ?? sellerProfile.shop_name ?? sellerProfile.name ?? "User",
    sellerId,
    participantId,
    buyerId,
    location: row.location ?? sellerProfile.location,
    timestamp: row.updated_at ?? row.updatedAt,
    listingId: row.listing_id ?? row.listingId ?? null,
    messages: mappedMessages,
  };
}

export function legacyConversationToDatabasePayload(conversation, { buyerId, sellerId, listingId } = {}) {
  const source = conversation && typeof conversation === "object" ? conversation : {};
  const resolvedBuyerId = canonicalId(buyerId ?? source.buyerId, "buyerId", true);
  const resolvedSellerId = canonicalId(sellerId ?? source.sellerId ?? source.participantId, "sellerId", true);
  const resolvedListingId = canonicalId(listingId ?? source.listingId, "listingId");
  const databaseId = canonicalId(
    source.databaseId ?? (isCanonicalUuid(source.id) ? source.id : null),
    "conversationId",
  );

  return {
    ...(databaseId ? { id: databaseId } : {}),
    buyer_id: resolvedBuyerId,
    seller_id: resolvedSellerId,
    ...(resolvedListingId ? { listing_id: resolvedListingId } : {}),
  };
}

const CONVERSATION_SELECT = "id, buyer_id, seller_id, listing_id, updated_at";

function databaseErrorDetails(error) {
  return {
    message: error?.message ?? String(error),
    details: error?.details ?? null,
    hint: error?.hint ?? null,
    code: error?.code ?? null,
    status: error?.status ?? null,
  };
}

function attachConversationDebug(error, debug) {
  const enrichedError = error instanceof Error ? error : new Error(error?.message ?? String(error));
  enrichedError.conversationDebug = debug;
  return enrichedError;
}

export async function upsertConversationInDatabase(conversation, { buyerId, sellerId, listingId, currentUserId } = {}) {
  requireSupabase();
  const { data: { user: authenticatedUser } = {}, error: authError } = await supabase.auth.getUser();
  const authenticatedUserId = authenticatedUser?.id ?? null;
  const source = conversation && typeof conversation === "object" ? conversation : {};
  const baseDebug = {
    authenticatedUserId,
    buyerId: buyerId ?? source.buyerId ?? null,
    sellerId: sellerId ?? source.sellerId ?? source.participantId ?? null,
    listingId: listingId ?? source.listingId ?? null,
  };
  if (authError) throw attachConversationDebug(authError, { ...baseDebug, error: databaseErrorDetails(authError), fullSupabaseError: databaseErrorDetails(authError), supabaseError: authError });
  if (!authenticatedUserId) {
    const sessionError = new Error("User session missing");
    throw attachConversationDebug(sessionError, { ...baseDebug, error: databaseErrorDetails(sessionError), fullSupabaseError: databaseErrorDetails(sessionError), supabaseError: null });
  }
  const payload = legacyConversationToDatabasePayload(conversation, { buyerId, sellerId, listingId });
  const requestDetails = {
    authenticatedUserId,
    targetUserId: payload.seller_id,
    buyerId: payload.buyer_id,
    sellerId: payload.seller_id,
    listingId: payload.listing_id ?? null,
    conversationId: payload.id ?? null,
    operation: payload.id ? "update" : "insert",
  };
  console.info("Conversation table creation attempt", requestDetails);
  let row;
  let error;
  if (payload.id) {
    ({ data: row, error } = await supabase
      .from("conversations")
      .update({
        buyer_id: payload.buyer_id,
        seller_id: payload.seller_id,
        listing_id: payload.listing_id ?? null,
      })
      .eq("id", payload.id)
      .select(CONVERSATION_SELECT)
      .single());
  } else {
    let existingQuery = supabase
      .from("conversations")
      .select(CONVERSATION_SELECT)
      .eq("buyer_id", payload.buyer_id)
      .eq("seller_id", payload.seller_id);
    existingQuery = payload.listing_id
      ? existingQuery.eq("listing_id", payload.listing_id)
      : existingQuery.is("listing_id", null);
    const existingResult = await existingQuery.limit(1).maybeSingle();
    if (existingResult.error) {
      console.warn("Conversation table lookup failed", {
        ...requestDetails,
        error: databaseErrorDetails(existingResult.error),
        supabaseError: existingResult.error,
      });
      throw attachConversationDebug(existingResult.error, {
        ...requestDetails,
        error: databaseErrorDetails(existingResult.error),
        fullSupabaseError: databaseErrorDetails(existingResult.error),
        supabaseError: existingResult.error,
      });
    }
    if (existingResult.data) {
      row = existingResult.data;
      console.info("Conversation table existing row recovered", {
        ...requestDetails,
        conversationUuid: row.id,
        committed: true,
      });
    } else {
      ({ data: row, error } = await supabase
        .from("conversations")
        .insert({
          buyer_id: payload.buyer_id,
          seller_id: payload.seller_id,
          listing_id: payload.listing_id ?? null,
        })
        .select(CONVERSATION_SELECT)
        .single());
    }
  }

  if (error) {
    console.warn("Conversation table insert/update failed", {
      ...requestDetails,
      error: databaseErrorDetails(error),
      supabaseError: error,
    });
    throw attachConversationDebug(error, {
      ...requestDetails,
      error: databaseErrorDetails(error),
      fullSupabaseError: databaseErrorDetails(error),
      supabaseError: error,
    });
  }
  console.info("Conversation table insert response", {
    ...requestDetails,
    conversationUuid: row?.id ?? null,
    committed: Boolean(row?.id),
  });
  if (!row?.id) throw new Error("Conversation table did not return a conversation UUID.");
  return databaseConversationToLegacyConversation(row, { currentUserId: currentUserId ?? buyerId });
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

async function getAuthenticatedUserId(requestedUserId) {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const authenticatedUserId = data.user?.id;
  if (!authenticatedUserId) {
    throw new Error("Authentication is required to read conversations.");
  }
  if (requestedUserId && requestedUserId !== authenticatedUserId) {
    throw new Error("Conversation reads must use the authenticated user.");
  }
  return authenticatedUserId;
}

function sortMessages(messages) {
  return [...(Array.isArray(messages) ? messages : [])].sort((left, right) => {
    const leftTime = new Date(left.created_at ?? 0).getTime();
    const rightTime = new Date(right.created_at ?? 0).getTime();
    return leftTime - rightTime || String(left.id ?? "").localeCompare(String(right.id ?? ""));
  });
}

async function attachParticipantProfiles(conversations) {
  const participantIds = [...new Set(conversations.flatMap((conversation) => [conversation.buyer_id, conversation.seller_id]).filter(Boolean))];
  if (participantIds.length === 0) return conversations;

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, display_name, username, shop_name, avatar_url, location")
    .in("id", participantIds);
  if (error) throw error;

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  return conversations.map((conversation) => ({
    ...conversation,
    buyer_profile: profilesById.get(conversation.buyer_id) ?? null,
    seller_profile: profilesById.get(conversation.seller_id) ?? null,
  }));
}

export async function getConversations(userId) {
  requireSupabase();
  const authenticatedUserId = await getAuthenticatedUserId(userId);
  const { data, error } = await supabase
    .from("conversations")
    .select("id, buyer_id, seller_id, listing_id, updated_at, messages(id, conversation_id, sender_id, content, created_at)")
    .or(`buyer_id.eq.${authenticatedUserId},seller_id.eq.${authenticatedUserId}`)
    .order("updated_at", { ascending: false });
  if (error) throw error;

  const conversations = await attachParticipantProfiles((data ?? []).map((conversation) => ({
    ...conversation,
    messages: sortMessages(conversation.messages),
  })));
  const messageReadCount = conversations.reduce((count, conversation) => count + conversation.messages.length, 0);
  const mappedConversations = conversations
    .map((conversation) => databaseConversationToLegacyConversation(conversation, { currentUserId: authenticatedUserId }))
    .filter(Boolean);

  console.info("Supabase conversation read", {
    conversationReadCount: conversations.length,
    messageReadCount,
    mappedConversationCount: mappedConversations.length,
  });
  return mappedConversations;
}

export async function getMessages(conversationId, userId) {
  requireSupabase();
  const authenticatedUserId = await getAuthenticatedUserId(userId);
  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const mappedMessages = (data ?? [])
    .map((message) => databaseMessageToLegacyMessage(message, { currentUserId: authenticatedUserId }))
    .filter(Boolean);
  console.info("Supabase message read", {
    conversationId,
    messageReadCount: data?.length ?? 0,
    mappedMessageCount: mappedMessages.length,
  });
  return mappedMessages;
}

function attachMessageDebug(error, debug) {
  const enrichedError = error instanceof Error ? error : new Error(error?.message ?? String(error));
  enrichedError.messageDebug = debug;
  return enrichedError;
}

export async function sendMessage({ conversationId, senderId, recipientId, content }) {
  requireSupabase();
  const authenticatedUserId = await getAuthenticatedUserId(senderId);
  const resolvedConversationId = canonicalId(conversationId, "conversationId", true);
  const resolvedRecipientId = canonicalId(recipientId, "recipientId", true);
  const normalizedContent = typeof content === "string" ? content.trim() : "";
  if (!resolvedConversationId) throw new Error("conversation_id is required to send a message.");
  if (!authenticatedUserId) throw new Error("sender_id is required to send a message.");
  if (!normalizedContent) throw new Error("Message content cannot be empty.");
  const insertPayload = {
    conversation_id: resolvedConversationId,
    sender_id: authenticatedUserId,
    content: normalizedContent,
  };
  const debug = {
    authUserId: authenticatedUserId,
    conversationUuid: resolvedConversationId,
    senderId: authenticatedUserId,
    recipientId: resolvedRecipientId,
    messageContent: content,
    messageInsertPayload: insertPayload,
  };
  console.info("Message database insert attempt", debug);
  const { data, error } = await supabase
    .from("messages")
    .insert(insertPayload)
    .select("id, conversation_id, sender_id, content, created_at")
    .maybeSingle();
  if (error) {
    const errorDetails = databaseErrorDetails(error);
    const failedDebug = { ...debug, messageInsertResponse: null, messageInsertError: errorDetails, fullSupabaseError: error, messagesRowCreated: false };
    console.warn("Message database insert failed", failedDebug);
    throw attachMessageDebug(error, failedDebug);
  }
  if (!data) {
    const noRowError = new Error("Message insert returned no row. Verify messages SELECT RLS policy and Supabase response permissions.");
    const failedDebug = {
      ...debug,
      messageInsertResponse: null,
      messageInsertError: databaseErrorDetails(noRowError),
      fullSupabaseError: null,
      messagesRowCreated: false,
    };
    console.warn("Message database insert returned no row", failedDebug);
    throw attachMessageDebug(noRowError, failedDebug);
  }
  const message = databaseMessageToLegacyMessage(data, { currentUserId: authenticatedUserId });
  const successDebug = {
    ...debug,
    messageInsertResponse: data,
    messageInsertError: null,
    fullSupabaseError: null,
    messagesRowCreated: true,
  };
  console.info("Message database insert response", successDebug);
  return { ...message, messageDebug: successDebug };
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
