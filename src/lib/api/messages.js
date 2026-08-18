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
    readAt: row.read_at ?? row.readAt ?? null,
    unread: Boolean(row.sender_id && currentUserId && row.sender_id !== currentUserId && !row.read_at && !row.readAt),
  };
}

export function databaseConversationToLegacyConversation(row, { currentUserId } = {}) {
  if (!row) return null;
  const databaseId = row.id ?? row.databaseId;
  const buyerId = row.buyer_id ?? row.buyerId;
  const sellerId = row.seller_id ?? row.sellerId;
  const participantId = currentUserId === buyerId ? sellerId : currentUserId === sellerId ? buyerId : sellerId;
  const sellerProfile = profileFor(row, "seller");
  const buyerProfile = profileFor(row, "buyer");
  const isCurrentUserBuyer = currentUserId === buyerId;
  const otherProfile = isCurrentUserBuyer ? sellerProfile : currentUserId === sellerId ? buyerProfile : sellerProfile;
  const participantName = isCurrentUserBuyer
    ? otherProfile.shop_name ?? otherProfile.display_name ?? otherProfile.username ?? otherProfile.name ?? "Store"
    : otherProfile.display_name ?? otherProfile.username ?? otherProfile.name ?? "Buyer";
  const participantProfile = {
    ...otherProfile,
    id: otherProfile.id ?? (currentUserId === buyerId ? sellerId : buyerId),
    name: participantName,
    avatar: otherProfile.avatar_url ?? otherProfile.avatar ?? "",
  };
  const rawMessages = Array.isArray(row.messages) ? row.messages : [];
  const mappedMessages = rawMessages.map((message) => databaseMessageToLegacyMessage(message, { currentUserId })).filter(Boolean);

  return {
    ...row,
    id: databaseId,
    databaseId,
    createdAt: row.created_at ?? row.createdAt ?? row.updated_at ?? row.updatedAt ?? null,
    name: row.name ?? participantName,
    category: row.category ?? (currentUserId === buyerId ? "Buying" : "Selling"),
    participantName,
    participantProfile,
    sellerId,
    participantId,
    buyerId,
    location: row.location ?? otherProfile.location,
    timestamp: row.updated_at ?? row.updatedAt,
    listingId: row.listing_id ?? row.listingId ?? null,
    messages: mappedMessages,
    unread: mappedMessages.some((message) => message.unread),
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

async function attachParticipantProfiles(conversations) {
  const participantIds = [...new Set(conversations.flatMap((conversation) => [conversation.buyer_id, conversation.seller_id]).filter(Boolean))];
  if (participantIds.length === 0) return conversations;

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, display_name, username, shop_name, avatar_url, location")
    .in("id", participantIds);
  if (error) {
    console.warn("Participant profile hydration failed; preserving conversations", {
      participantIds,
      error: databaseErrorDetails(error),
    });
    return conversations;
  }

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
  const select = "id, buyer_id, seller_id, listing_id, updated_at";
  const [buyerResult, sellerResult] = await Promise.all([
    supabase.from("conversations").select(select).eq("buyer_id", authenticatedUserId).order("updated_at", { ascending: false }),
    supabase.from("conversations").select(select).eq("seller_id", authenticatedUserId).order("updated_at", { ascending: false }),
  ]);
  const queryErrors = [buyerResult.error, sellerResult.error].filter(Boolean);
  if (queryErrors.length === 2) {
    console.warn("Seller/buyer conversation retrieval failed for both participant queries", {
      authenticatedUserId,
      buyerQueryError: databaseErrorDetails(buyerResult.error),
      sellerQueryError: databaseErrorDetails(sellerResult.error),
    });
    throw queryErrors[0];
  }
  const rowsById = new Map([...(buyerResult.data ?? []), ...(sellerResult.data ?? [])].map((conversation) => [conversation.id, conversation]));
  const data = [...rowsById.values()].sort((left, right) => new Date(right.updated_at ?? 0).getTime() - new Date(left.updated_at ?? 0).getTime());
  console.info("Conversation retrieval diagnostics", {
    authenticatedUserId,
    buyerQueryCount: buyerResult.data?.length ?? 0,
    sellerQueryCount: sellerResult.data?.length ?? 0,
    mergedConversationCount: data.length,
    buyerQueryError: buyerResult.error ? databaseErrorDetails(buyerResult.error) : null,
    sellerQueryError: sellerResult.error ? databaseErrorDetails(sellerResult.error) : null,
    conversationIdentities: data.map((conversation) => ({
      conversationId: conversation.id,
      buyerId: conversation.buyer_id,
      sellerId: conversation.seller_id,
      listingId: conversation.listing_id,
    })),
  });

  const conversations = await attachParticipantProfiles((data ?? []).map((conversation) => ({
    ...conversation,
    messages: [],
  })));
  const mappedConversations = conversations
    .map((conversation) => databaseConversationToLegacyConversation(conversation, { currentUserId: authenticatedUserId }))
    .filter(Boolean);

  console.info("Supabase conversation read", {
    authenticatedUserId,
    conversationReadCount: conversations.length,
    mappedConversationCount: mappedConversations.length,
  });
  return mappedConversations;
}

export async function getMessages(conversationId, userId) {
  requireSupabase();
  const authenticatedUserId = await getAuthenticatedUserId(userId);
  const directResult = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, content, created_at, read_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  let data = directResult.data ?? [];
  let source = "direct-select";
  let fallbackError = null;

  if (directResult.error || data.length === 0) {
    const fallbackResult = await supabase.rpc("get_conversation_messages", { p_conversation_id: conversationId });
    fallbackError = fallbackResult.error ?? null;
    if (!fallbackResult.error) {
      data = fallbackResult.data ?? [];
      source = "participant-validated-rpc";
    }
  }

  console.info("Message hydration diagnostics", {
    conversationId,
    currentUserId: authenticatedUserId,
    directReturnedMessageCount: directResult.data?.length ?? 0,
    directRetrievalError: directResult.error ? databaseErrorDetails(directResult.error) : null,
    fallbackReturnedMessageCount: source === "participant-validated-rpc" ? data.length : null,
    fallbackRetrievalError: fallbackError ? databaseErrorDetails(fallbackError) : null,
    source,
    rlsResult: directResult.error ? "direct-select-error" : directResult.data?.length ? "direct-select-visible" : "direct-select-empty",
  });

  if (directResult.error && fallbackError) throw directResult.error;
  if (fallbackError && !directResult.error) {
    console.warn("Message hydration fallback unavailable; preserving direct result", {
      conversationId,
      currentUserId: authenticatedUserId,
      error: databaseErrorDetails(fallbackError),
    });
    data = directResult.data ?? [];
  }

  const mappedMessages = data
    .map((message) => databaseMessageToLegacyMessage(message, { currentUserId: authenticatedUserId }))
    .filter(Boolean);
  return mappedMessages;
}

export async function markConversationMessagesRead(conversationId) {
  requireSupabase();
  const resolvedConversationId = canonicalId(conversationId, "conversationId", true);
  const { error } = await supabase.rpc("mark_conversation_messages_read", { p_conversation_id: resolvedConversationId });
  if (error) throw error;
  return resolvedConversationId;
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

export function subscribeToMessages(conversationId, onInsert, onStatus) {
  requireSupabase();
  const channelName = `messages:${conversationId}`;
  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        console.info("realtime INSERT event received", {
          channel: channelName,
          conversationId,
          messageId: payload.new?.id ?? null,
          senderId: payload.new?.sender_id ?? null,
        });
        onInsert(payload.new);
      },
    );
  channel.subscribe((status, error) => {
    console.info("realtime channel status", {
      channel: channelName,
      conversationId,
      status,
      error: error?.message ?? error ?? null,
    });
    onStatus?.(status, error);
  });
  return channel;
}
