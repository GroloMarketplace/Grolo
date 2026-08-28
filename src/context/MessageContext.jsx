import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { databaseMessageToLegacyMessage, getConversations, getMessages, isCanonicalUuid, markConversationMessagesRead, sendMessage, subscribeToMessages, upsertConversationInDatabase } from "../lib/api/messages";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { isUserBlocked } from "../lib/api/trustSafety";
import { createTradeProposalRecord, getTradeProposalByConversation, recordTradeProposalEvent, updateTradeProposalRecord, verifyTradeProposalDelivery } from "../lib/api/tradeProposals";
import { createNotification } from "../lib/api/notifications";

const MessageContext = createContext(null);
const CURRENT_BUYER_ID = "current-buyer";

function timestampValue(value) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function latestActivityAt(conversation, messages) {
  const latestMessageTime = messages.reduce((latest, message) => Math.max(
    latest,
    timestampValue(message.createdAt ?? message.created_at ?? message.timestamp),
  ), 0);
  if (latestMessageTime > 0) return new Date(latestMessageTime).toISOString();
  return conversation.createdAt ?? conversation.created_at ?? null;
}

export function sortConversations(conversations) {
  return [...conversations].sort((left, right) => (
    timestampValue(right.latestActivityAt) - timestampValue(left.latestActivityAt)
  ));
}

function proposalMessageText(value) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return value.content ?? value.text ?? "";
  return value == null ? "" : String(value);
}

function proposalOfferedListings(proposal) {
  const source = proposal && typeof proposal === "object" ? proposal : {};
  const items = source.offeredListings ?? source.offered_items ?? (source.offeredListing ? [source.offeredListing] : []);
  return Array.isArray(items) ? items.filter(Boolean) : [];
}

function normalizeTradeProposal(proposal) {
  const source = proposal && typeof proposal === "object" ? proposal : {};
  return {
    ...source,
    id: source.id ?? source.trade_proposal_id ?? null,
    offeredListings: proposalOfferedListings(source),
    message: proposalMessageText(source.message),
  };
}

function tradeProposalFromRow(row, fallback = {}) {
  const normalizedFallback = normalizeTradeProposal(fallback);
  if (!row) return normalizedFallback;
  return normalizeTradeProposal({
    ...normalizedFallback,
    id: row.id,
    buyerName: normalizedFallback.buyerName,
    requestedListing: row.requested_listing ?? normalizedFallback.requestedListing ?? {},
    offeredListings: row.offered_listings ?? normalizedFallback.offeredListings ?? [],
    offeredListing: null,
    message: row.message ?? normalizedFallback.message,
    photos: row.photos ?? normalizedFallback.photos ?? [],
    status: row.status,
    acceptedAt: row.accepted_at ?? null,
    acceptedBy: row.accepted_by ?? null,
    counterOffer: row.counter_offer ?? null,
  });
}

function normalizeConversation(input) {
  const conversation = input && typeof input === "object" ? input : {};
  const isTrading = conversation.tradeThread === true
    || conversation.conversationType === "trading"
    || conversation.conversationType === "trade_proposal"
    || conversation.metadata?.tradeThread === true
    || conversation.metadata?.conversationType === "trading"
    || conversation.metadata?.conversationType === "trade_proposal"
    || Boolean(conversation.tradeProposalId)
    || conversation.category === "Trading";
  const isService = conversation.conversationType === "service"
    || Boolean(conversation.serviceContext?.listingId);
  const messages = Array.isArray(conversation.messages)
    ? conversation.messages
    : Array.isArray(conversation.threadMessages)
      ? conversation.threadMessages
      : [];
  const normalizedMessages = messages.filter(Boolean);
  const latestMessage = normalizedMessages.reduce((latest, message) => (
    !latest || timestampValue(message.createdAt ?? message.created_at ?? message.timestamp) > timestampValue(latest.createdAt ?? latest.created_at ?? latest.timestamp) ? message : latest
  ), null);
  const normalizedTradeProposal = conversation.tradeProposal ? normalizeTradeProposal(conversation.tradeProposal) : null;

  return {
    ...conversation,
    ...(normalizedTradeProposal ? { tradeProposal: normalizedTradeProposal } : {}),
    createdAt: conversation.createdAt ?? conversation.created_at ?? null,
    latestActivityAt: latestActivityAt(conversation, normalizedMessages),
    preview: latestMessage?.text ?? latestMessage?.content ?? conversation.preview ?? "",
    timestamp: latestMessage?.timestamp ?? latestMessage?.createdAt ?? conversation.timestamp ?? conversation.updated_at ?? null,
    unread: normalizedMessages.some((message) => message.unread === true),
    ...(isTrading ? { conversationType: "trading", category: "Trading", tradeThread: true } : {}),
    ...(isService ? { conversationType: "service" } : {}),
    messages: normalizedMessages,
  };
}

export function MessageProvider({ children }) {
  const { user, isSuspended } = useAuth();
  const [messages, setMessages] = useState([]);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const ensureActiveAccount = () => {
    if (isSuspended) throw new Error("Your account is suspended and messaging is restricted.");
  };
  const pendingConversationWrites = useRef(new Map());
  const pendingMessageSends = useRef(new Set());
  const realtimeSubscriptions = useRef(new Map());
  const subscribeToConversationRef = useRef(null);

  const cleanupRealtimeSubscriptions = (reason = "unspecified") => {
    realtimeSubscriptions.current.forEach((channel, conversationId) => {
      channel.unsubscribe();
    });
    realtimeSubscriptions.current.clear();
  };

  const reconcileRealtimeSubscriptions = (conversationIds) => {
    const activeConversationIds = new Set(conversationIds.filter(isCanonicalUuid));
    activeConversationIds.forEach((conversationId) => subscribeToConversationRef.current?.(conversationId));
  };

  const subscribeToConversation = (conversationId) => {
    if (!isCanonicalUuid(conversationId) || realtimeSubscriptions.current.has(conversationId)) return;
    const channel = subscribeToMessages(conversationId, (payload) => {
      const incomingMessage = databaseMessageToLegacyMessage(payload, { currentUserId: user?.id });
      mergeRealtimeMessage(conversationId, incomingMessage);
    }, (status, error) => {
    }, (payload) => {
      const updatedMessage = databaseMessageToLegacyMessage(payload, { currentUserId: user?.id });
      mergeRealtimeMessage(conversationId, updatedMessage);
    });
    realtimeSubscriptions.current.set(conversationId, channel);
  };
  subscribeToConversationRef.current = subscribeToConversation;

  useEffect(() => {
    let cancelled = false;
    setMessages([]);


    if (!user?.id || !isSupabaseConfigured) {
      cleanupRealtimeSubscriptions("auth-user-missing-or-supabase-unconfigured");
      return () => {
        cancelled = true;
        cleanupRealtimeSubscriptions("effect-cleanup-without-authenticated-user");
      };
    }

    const loadSupabaseMessages = async () => {
      try {
        const conversations = await getConversations(user.id);
        const hydratedConversations = await Promise.all(conversations.map(async (conversation) => {
          const databaseConversationId = conversation.databaseId ?? conversation.id;
          if (!isCanonicalUuid(databaseConversationId)) return conversation;
          try {
            const threadMessages = await getMessages(databaseConversationId, user.id);
            let hydratedConversation = { ...conversation, messages: threadMessages };
            if (conversation.tradeThread || conversation.tradeProposalId || conversation.conversationType === "trading" || conversation.conversationType === "trade_proposal") {
              try {
                const persistedProposal = await getTradeProposalByConversation(databaseConversationId);
                if (persistedProposal) {
                  const tradeProposal = tradeProposalFromRow(persistedProposal, conversation.tradeProposal ?? {});
                  hydratedConversation = {
                    ...hydratedConversation,
                    tradeProposal,
                    tradeProposalSource: "trade_proposals",
                    tradeStatus: persistedProposal.status,
                    metadata: { ...(conversation.metadata ?? {}), tradeProposal, tradeStatus: persistedProposal.status },
                  };
                }
              } catch (error) {
              }
            }
            return hydratedConversation;
          } catch (error) {
            return conversation;
          }
        }));
        if (cancelled) return;

        const normalizedConversations = hydratedConversations.map((conversation) => normalizeConversation(conversation));
        const mappedMessages = normalizedConversations.filter((conversation) => conversation.id);
        const sortedMessages = sortConversations(mappedMessages);
        const messageCount = mappedMessages.reduce((count, conversation) => count + conversation.messages.length, 0);
        const hydrationRows = sortedMessages.flatMap((conversation) => conversation.messages.map((message) => ({
          conversationId: conversation.databaseId ?? conversation.id,
          messageId: message.databaseId ?? message.id,
          senderId: message.senderId,
          currentUserId: user.id,
          isIncoming: Boolean(message.senderId && user.id && message.senderId !== user.id),
          readAt: message.readAt ?? null,
          computedUnread: message.unread === true,
        })));
        console.table(hydrationRows);
        const unreadSummaryRows = sortedMessages.map((conversation) => {
          const unreadMessageIds = conversation.messages.filter((message) => message.unread === true).map((message) => message.databaseId ?? message.id);
          return {
            conversationId: conversation.databaseId ?? conversation.id,
            unreadMessageCount: unreadMessageIds.length,
            unreadMessageIds: unreadMessageIds.join(", "),
          };
        });
        console.table(unreadSummaryRows);
        setMessages(sortedMessages);
        const activeConversationIds = hydratedConversations.map((conversation) => conversation.databaseId ?? conversation.id);
        reconcileRealtimeSubscriptions(activeConversationIds);
      } catch (error) {
        if (cancelled) return;
        setMessages([]);
      }
    };

    loadSupabaseMessages();
    const refreshOnFocus = () => loadSupabaseMessages();
    window.addEventListener("focus", refreshOnFocus);
    const refreshTimer = window.setInterval(loadSupabaseMessages, 3000);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshOnFocus);
      window.clearInterval(refreshTimer);
      cleanupRealtimeSubscriptions("effect-cleanup-user-id-change-or-provider-unmount");
    };
  }, [user?.id]);

  const mergeRealtimeMessage = (conversationId, incomingMessage) => {
    if (!incomingMessage) return;
    const incomingDatabaseMessageId = incomingMessage.databaseId ?? incomingMessage.id;
    setMessages((current) => {
      const conversationIndex = current.findIndex((conversation) => (
        conversation.databaseId === conversationId || conversation.id === conversationId
      ));
      if (conversationIndex < 0) return current;
      const conversation = current[conversationIndex];
      const duplicate = conversation.messages?.some((message) => (
        (incomingDatabaseMessageId && (message.databaseId === incomingDatabaseMessageId || message.id === incomingDatabaseMessageId))
      ));
      if (duplicate) {
        const updatedMessages = (conversation.messages ?? []).map((message) => (
          message.databaseId === incomingDatabaseMessageId || message.id === incomingDatabaseMessageId
            ? { ...message, ...incomingMessage }
            : message
        ));
        const nextConversation = normalizeConversation({
          ...conversation,
          messages: updatedMessages,
        });
        const nextMessages = sortConversations(current.map((item, index) => index === conversationIndex ? nextConversation : item));
        return nextMessages;
      }
      const nextConversation = normalizeConversation({
        ...conversation,
        messages: [...(conversation.messages ?? []), incomingMessage],
        unread: incomingMessage.unread === true || conversation.unread === true,
        preview: incomingMessage.text,
        timestamp: incomingMessage.timestamp,
      });
      const nextMessages = sortConversations(current.map((item, index) => index === conversationIndex ? nextConversation : item));
      return nextMessages;
    });
  };

  const persistConversation = (conversation, { existing = false, throwOnError = false } = {}) => {
    const normalizedConversation = normalizeConversation(conversation);
    if (!user?.id) throw new Error("An authenticated user is required to create a conversation.");
    if (!isSupabaseConfigured) throw new Error("Supabase is not configured. Conversation creation is unavailable.");
    const databasePayloadConversation = normalizedConversation.tradeProposal
      ? { ...normalizedConversation, conversationType: "trade_proposal" }
      : normalizedConversation;
    const write = upsertConversationInDatabase(databasePayloadConversation, {
      buyerId: user.id,
      sellerId: normalizedConversation.sellerId ?? normalizedConversation.participantId,
      listingId: normalizedConversation.listingId,
      currentUserId: user.id,
    }).then((databaseConversation) => {
      if (!databaseConversation) return null;
      const mergedConversation = normalizeConversation({
        ...databaseConversation,
        ...normalizedConversation,
        metadata: { ...databaseConversation.metadata, ...normalizedConversation.metadata },
        messages: normalizedConversation.messages.length > 0
          ? normalizedConversation.messages
          : databaseConversation.messages,
      });
      subscribeToConversation(databaseConversation.databaseId);
      setMessages((current) => {
        const existing = current.find((item) => item.id === normalizedConversation.id)
          ?? current.find((item) => item.databaseId === databaseConversation.databaseId);
        const nextMessages = existing
          ? current.map((item) => item.id === existing.id ? { ...item, ...mergedConversation } : item)
          : [mergedConversation, ...current];
        return sortConversations(nextMessages);
      });
      return databaseConversation;
    }).catch((error) => {
      if (throwOnError) throw error;
      return null;
    });
    pendingConversationWrites.current.set(normalizedConversation.id, write);
    write.finally(() => {
      if (pendingConversationWrites.current.get(normalizedConversation.id) === write) {
        pendingConversationWrites.current.delete(normalizedConversation.id);
      }
    });
    return write;
  };

  const upsertConversation = (conversation) => {
    setMessages((current) => {
      const existing = current.find((message) => message.id === conversation.id);
      const nextConversation = normalizeConversation(conversation);
      const nextMessages = existing
        ? current.map((message) => (
          message.id === conversation.id ? { ...message, ...nextConversation } : message
        ))
        : [nextConversation, ...current];
      return sortConversations(nextMessages);
    });
  };

  const refreshConversationMessages = async (conversationId, expectedMessageId = null) => {
    if (!user?.id || !isSupabaseConfigured || !isCanonicalUuid(conversationId)) return;
    const refreshedMessages = await getMessages(conversationId, user.id);
    if (expectedMessageId && !refreshedMessages.some((message) => (
      message.databaseId === expectedMessageId || message.id === expectedMessageId
    ))) {
      throw new Error("Message insert was confirmed but the message was not visible after reload. Check messages SELECT RLS policy.");
    }
    setMessages((current) => sortConversations(current.map((conversation) => {
      if (conversation.databaseId !== conversationId && conversation.id !== conversationId) return conversation;
      const latestMessage = refreshedMessages[refreshedMessages.length - 1];
      return normalizeConversation({
        ...conversation,
        messages: refreshedMessages,
        ...(latestMessage ? { preview: latestMessage.text, timestamp: latestMessage.timestamp } : {}),
      });
    })));
    return refreshedMessages;
  };

  const appendMessage = (conversationId, message, pendingConversation) => {
    ensureActiveAccount();
    const existing = messages.find((conversation) => conversation.id === conversationId)
      ?? messages.find((conversation) => conversation.databaseId === conversationId);
    const baseConversation = existing ?? pendingConversation;
    if (!baseConversation) throw new Error("Conversation is not available. Please reopen the chat and try again.");

    const normalizedConversation = normalizeConversation(baseConversation);
    const requestedContent = message.text ?? message.content ?? "";
    const initialDatabaseConversationId = normalizedConversation.databaseId
      ?? (isCanonicalUuid(conversationId) ? conversationId : null);
    const sendKey = `${initialDatabaseConversationId ?? conversationId}:${requestedContent}`;
    if (pendingMessageSends.current.has(sendKey)) return;
    pendingMessageSends.current.add(sendKey);


    const updateState = (savedMessage) => {
      setMessages((current) => {
        const currentConversation = current.find((conversation) => conversation.id === conversationId)
          ?? current.find((conversation) => conversation.id === normalizedConversation.id)
          ?? current.find((conversation) => conversation.databaseId === normalizedConversation.databaseId)
          ?? normalizedConversation;
        const savedDatabaseMessageId = savedMessage.databaseId ?? (isCanonicalUuid(savedMessage.id) ? savedMessage.id : null);
        const duplicate = savedDatabaseMessageId && currentConversation.messages?.some((currentMessage) => (
          currentMessage.databaseId === savedDatabaseMessageId || currentMessage.id === savedDatabaseMessageId
        ));
        if (duplicate) {
          return current;
        }
        const threadMessages = [...(currentConversation.messages ?? []), savedMessage];
          const savedConversation = normalizeConversation({
          ...currentConversation,
          messages: threadMessages,
          preview: savedMessage.text ?? savedMessage.content ?? requestedContent,
          timestamp: savedMessage.timestamp ?? savedMessage.createdAt ?? message.timestamp,
        });
        const nextMessages = current.some((conversation) => conversation.id === currentConversation.id)
          ? current.map((conversation) => conversation.id === currentConversation.id ? savedConversation : conversation)
          : [savedConversation, ...current];
        return sortConversations(nextMessages);
      });
    };

    const send = async () => {
      let recipientId = null;
      try {
        let databaseConversationId = initialDatabaseConversationId;
        if (!databaseConversationId) {
          const pendingConversationWrite = pendingConversationWrites.current.get(normalizedConversation.id);
          const databaseConversation = pendingConversationWrite ? await pendingConversationWrite : null;
          databaseConversationId = databaseConversation?.databaseId ?? null;
        }

        if (!user?.id || !isSupabaseConfigured || !databaseConversationId) {
          throw new Error("A canonical conversation UUID and authenticated user are required.");
        }
        recipientId = normalizedConversation.buyerId === user.id
          ? normalizedConversation.sellerId
          : normalizedConversation.buyerId;
        if (!recipientId || !isCanonicalUuid(recipientId)) {
          throw new Error("A canonical recipient UUID is required.");
        }
        if (await isUserBlocked(user.id, recipientId)) {
          throw new Error("Messaging is unavailable because one of these users is blocked.");
        }

        const persistedMessage = await sendMessage({
          conversationId: databaseConversationId,
          senderId: user.id,
          recipientId,
          content: requestedContent,
        });
        const { messageDebug, ...savedMessage } = persistedMessage;
        updateState(savedMessage);
        await refreshConversationMessages(databaseConversationId, savedMessage.databaseId ?? savedMessage.id).catch((refreshError) => {
          const reloadError = refreshError instanceof Error ? refreshError : new Error(String(refreshError));
          reloadError.messageDebug = {
            ...messageDebug,
            messageInsertError: {
              message: reloadError.message,
              details: reloadError.details ?? null,
              hint: reloadError.hint ?? null,
              code: reloadError.code ?? null,
              status: reloadError.status ?? null,
            },
            fullSupabaseError: refreshError,
          };
          throw reloadError;
        });
        return { message: savedMessage, messageDebug };
      } catch (error) {
        throw error;
      } finally {
        pendingMessageSends.current.delete(sendKey);
      }
    };

    return send();
  };

  const ensureConversation = useCallback(async ({ conversationId, pendingConversation, participantId, listingId, conversationType = "standard" }) => {
    if (isSuspended) throw new Error("Your account is suspended and messaging is restricted.");
    if (!user?.id) throw new Error("User session missing");

    const routeParticipantId = participantId ?? pendingConversation?.participantId ?? pendingConversation?.sellerId ?? conversationId;
    const localConversation = messagesRef.current.find((item) => item.id === conversationId || item.databaseId === conversationId)
      ?? pendingConversation;
    const localDatabaseId = localConversation?.databaseId ?? null;
    if (localDatabaseId) {
      subscribeToConversation(localDatabaseId);
      return localDatabaseId;
    }

    const pendingWriteKey = localConversation?.id ?? pendingConversation?.id;
    const pendingWrite = pendingWriteKey ? pendingConversationWrites.current.get(pendingWriteKey) : null;
    if (pendingWrite) {
      const databaseConversation = await pendingWrite;
      if (databaseConversation?.databaseId) return databaseConversation.databaseId;
      throw new Error("Trade conversation persistence did not return a conversation UUID.");
    }

    if (!isCanonicalUuid(routeParticipantId)) {
      throw new Error("The other participant must have a valid account UUID.");
    }

    let existingConversation = null;
    try {
      const availableConversations = await getConversations(user.id);
      existingConversation = availableConversations.find((item) => {
        const sameParticipants = (String(item.buyerId) === String(user.id) && String(item.sellerId) === String(routeParticipantId))
          || (String(item.sellerId) === String(user.id) && String(item.buyerId) === String(routeParticipantId));
        const sameListing = !listingId || !item.listingId || String(item.listingId) === String(listingId);
        return sameParticipants && sameListing;
      }) ?? null;
    } catch (error) {
    }

    if (existingConversation?.databaseId) {
      const hydratedMessages = isCanonicalUuid(existingConversation.databaseId)
        ? await getMessages(existingConversation.databaseId, user.id)
        : existingConversation.messages ?? [];
      let hydratedConversation = normalizeConversation({ ...existingConversation, messages: hydratedMessages });
      if (hydratedConversation.tradeThread || hydratedConversation.conversationType === "trading" || hydratedConversation.conversationType === "trade_proposal") {
        try {
          const persistedProposal = await getTradeProposalByConversation(existingConversation.databaseId);
          if (persistedProposal) {
            const tradeProposal = tradeProposalFromRow(persistedProposal, hydratedConversation.tradeProposal ?? {});
            hydratedConversation = normalizeConversation({
              ...hydratedConversation,
              tradeProposal,
              tradeProposalSource: "trade_proposals",
              tradeStatus: persistedProposal.status,
            });
          }
        } catch (error) {
        }
      }
      setMessages((current) => sortConversations([hydratedConversation, ...current.filter((item) => item.databaseId !== existingConversation.databaseId && item.id !== hydratedConversation.id)]));
      subscribeToConversation(existingConversation.databaseId);
      return existingConversation.databaseId;
    }

    const currentUserIsSeller = String(pendingConversation?.sellerId) === String(user.id);
    const seed = normalizeConversation({
      ...(pendingConversation ?? {}),
      id: pendingConversation?.databaseId
        ?? (!isCanonicalUuid(pendingConversation?.id) ? pendingConversation?.id : null)
        ?? `conversation-${user.id}-${routeParticipantId}-${listingId ?? "general"}`,
      buyerId: currentUserIsSeller ? routeParticipantId : user.id,
      sellerId: currentUserIsSeller ? user.id : routeParticipantId,
      participantId: routeParticipantId,
      listingId: listingId ?? pendingConversation?.listingId,
      conversationType: pendingConversation?.conversationType ?? conversationType,
      messages: pendingConversation?.messages ?? [],
    });
    const databaseConversation = await persistConversation(seed, { throwOnError: true });
    if (!databaseConversation?.databaseId) throw new Error("Unable to create a conversation record. Please try again.");
    return databaseConversation.databaseId;
  }, [isSuspended, user?.id]);

  const createOrderConversation = ({ order, product, seller, fulfillmentMethod }) => {
    ensureActiveAccount();
    const existing = messages.find((conversation) => (
      conversation.conversationType === "order" && conversation.orderId === order.id
    ));
    const orderContext = {
      orderId: order.id,
      orderNumber: order.id.replace(/^ORD-/, "#"),
      productId: product.id,
      productImage: product.images?.[0] ?? product.image,
      productName: product.name,
      storeName: seller.name,
      quantity: order.quantity,
      fulfillmentMethod,
      status: order.status,
    };
    const draft = `Hi ${seller.name}.\n\nI have a question about my order ${orderContext.orderNumber}.`;
    if (existing) {
      const existingConversation = { ...existing, orderContext: existing.orderContext ?? orderContext };
      persistConversation(existingConversation, { existing: true });
      return {
        id: existing.id,
        draft: existing.messages?.length ? "" : draft,
        orderContext: existingConversation.orderContext,
      };
    }

    const conversation = {
      id: `order-${order.id}`,
      name: seller.name,
      sellerId: seller.id,
      buyerId: user?.id ?? CURRENT_BUYER_ID,
      participantId: seller.id,
      location: seller.location,
      timestamp: "Just now",
      preview: draft,
      unread: false,
      category: "Orders",
      conversationType: "order",
      orderId: order.id,
      orderContext,
      listingId: product.databaseId ?? product.id,
      messages: [],
    };
    persistConversation(conversation);
    return { id: conversation.id, draft, orderContext, conversation };
  };

  const createSellerConversation = ({ listing, seller, conversationType = listing.category === "Services" ? "service" : "standard" }) => {
    ensureActiveAccount();
    const buyerId = user?.id ?? CURRENT_BUYER_ID;
    const listingId = listing.databaseId ?? listing.id;
    const serviceContext = conversationType === "service" ? {
      listingId: listing.id,
      image: listing.images?.[0] ?? listing.image,
      title: listing.name,
      price: listing.price,
      pricingType: listing.pricingType,
      sellerName: seller.name,
    } : null;
    const existing = messages.find((conversation) => (
      String(conversation.buyerId) === String(buyerId)
      && String(conversation.sellerId) === String(seller.id)
      && (String(conversation.listingId) === String(listing.id) || String(conversation.listingId) === String(listingId))
      && (conversation.conversationType ?? "standard") === conversationType
    ));


    if (existing) {
      const updatedConversation = { ...existing, buyerId, listingId, conversationType, ...(serviceContext ? { serviceContext } : {}) };
      persistConversation(updatedConversation, { existing: true });
      setMessages((current) => sortConversations(current.map((conversation) => conversation.id === existing.id ? normalizeConversation(updatedConversation) : conversation)));
      return { id: existing.id, serviceContext, conversation: updatedConversation };
    }

    const conversation = {
      id: `listing-${buyerId}-${seller.id}-${listing.id}`,
      name: seller.name,
      sellerId: seller.id,
      buyerId,
      participantId: seller.id,
      location: seller.location,
      timestamp: "Just now",
      preview: "",
      unread: false,
      category: "Selling",
      conversationType,
      listingId,
      ...(serviceContext ? { serviceContext } : {}),
      messages: [],
    };
    persistConversation(conversation);
    setMessages((current) => {
      if (current.some((item) => item.id === conversation.id)) return current;
      return sortConversations([normalizeConversation(conversation), ...current]);
    });
    return { id: conversation.id, serviceContext, conversation };
  };

  const createTradeConversation = ({ listing, seller }) => {
    ensureActiveAccount();
    const id = `trade-${listing.id}-${Date.now()}`;
    const buyerId = user?.id ?? CURRENT_BUYER_ID;
    const tradePreferences = listing.desiredTradeItems?.trim() ?? "";
    const draft = tradePreferences
      ? `Hi ${seller.name}! I'd like to make a trade for your listing: ${listing.name}.\n\nI noticed you're looking for:\n${tradePreferences}\n\nLet me know if you're interested.`
      : `Hi ${seller.name}! I'd like to discuss a trade for your listing.`;
    const conversation = {
      id,
      name: seller.name,
      sellerId: seller.id,
      buyerId,
      participantId: seller.id,
      location: seller.location,
      timestamp: "Just now",
      preview: draft,
      unread: false,
      category: "Trading",
      conversationType: "trading",
      listingId: listing.databaseId ?? listing.id,
      tradePreferences,
      productContext: {
        id: listing.id,
        image: listing.images?.[0] ?? listing.image,
        title: listing.name,
        sellerName: seller.name,
        price: listing.price,
        quantityAvailable: listing.quantityAvailable,
        availableForTrade: listing.availableForTrade,
      },
      tradeThread: true,
    };
    persistConversation(conversation);
    return { id, draft, conversation };
  };

  const createTradeProposal = ({ listing, seller, buyerName, message, offeredListing, offeredListings, photos }) => {
    ensureActiveAccount();
    const sellerUserId = seller?.userId ?? seller?.user_id ?? seller?.accountId ?? seller?.id;
    const listingId = listing?.databaseId ?? listing?.id ?? null;
    const storeId = listing?.storeId ?? listing?.store_id ?? seller?.storeId ?? seller?.store_id ?? seller?.shopSlug ?? null;
    const sellerProfileId = seller?.databaseId ?? seller?.profileId ?? seller?.profile_id ?? seller?.id ?? null;
    if (!isCanonicalUuid(sellerUserId)) throw new Error("The seller account could not be resolved to a valid user UUID.");
    const id = `trade-${listing.id}-${Date.now()}`;
    const buyerId = user?.id ?? CURRENT_BUYER_ID;
    const proposalText = proposalMessageText(message);
    const tradeProposal = {
      id,
      buyerName: buyerName || "A buyer",
      requestedListing: {
        id: listing.databaseId ?? listing.id,
        name: listing.name,
        image: listing.images?.[0] ?? listing.image,
        quantity: listing.quantity ?? listing.quantityAvailable ?? 1,
      },
      offeredListings: (offeredListings ?? (offeredListing ? [offeredListing] : [])).map((offeredItem) => ({
        id: offeredItem.databaseId ?? offeredItem.id,
        listingId: offeredItem.databaseId ?? offeredItem.id,
        name: offeredItem.name,
        image: offeredItem.images?.[0] ?? offeredItem.image,
        price: offeredItem.price,
        quantity: offeredItem.quantity ?? offeredItem.quantityAvailable ?? 1,
      })),
      offeredListing: null,
      message: proposalText,
      photos: photos ?? [],
    };
    const firstMessage = {
      id: `${id}-1`,
      from: "me",
      text: proposalText || `I'd like to propose a trade for ${listing.name}.`,
      timestamp: "Just now",
    };
    const conversation = {
      id,
      name: seller.name,
      sellerId: sellerUserId,
      buyerId,
      participantId: sellerUserId,
      location: seller.location,
      timestamp: "Just now",
      preview: firstMessage.text,
      unread: false,
      category: "Trading",
      conversationType: "trading",
      listingId: listing.databaseId ?? listing.id,
      tradePreferences: listing.desiredTradeItems?.trim() ?? "",
      productContext: {
        id: listing.id,
        image: listing.images?.[0] ?? listing.image,
        title: listing.name,
        sellerName: seller.name,
        price: listing.price,
        quantityAvailable: listing.quantityAvailable,
        availableForTrade: listing.availableForTrade,
      },
      tradeThread: true,
      tradeProposal,
      tradeProposalSource: "pending_persistence",
      messages: [firstMessage],
    };
    const conversationWrite = persistConversation(conversation, { throwOnError: true });
    conversationWrite.then((databaseConversation) => {
      const conversationId = databaseConversation?.databaseId ?? databaseConversation?.id ?? null;
      if (!conversationId) return;
      return appendMessage(conversationId, { ...firstMessage, tradeProposal, metadata: { tradeProposal } }, { ...conversation, databaseId: conversationId, id: conversationId, messages: [] })
        .then(async (messageResult) => {
          const message = messageResult?.message ?? null;
          const proposalMessage = message?.text ?? message?.content ?? tradeProposal.message ?? "";
          if (!message) throw new Error("Trade proposal message creation returned no message object.");
          const messageId = message.databaseId ?? message.id ?? firstMessage.id;
          const [proposal, notification] = await Promise.all([
            createTradeProposalRecord({ id, buyerId, sellerId: sellerUserId, conversationId, requestedListing: tradeProposal.requestedListing, offeredListings: tradeProposal.offeredListings, message: proposalMessage, photos }),
            createNotification({ userId: sellerUserId, type: "trade_proposal", title: "New Trade Offer", message: `${buyerName || "A buyer"} sent you a trade offer.`, relatedId: id }),
          ]);
          const verification = await verifyTradeProposalDelivery({ tradeProposalId: id, buyerId, sellerId: sellerUserId, conversationId, messageId });
          if (proposal) {
            const persistedTradeProposal = tradeProposalFromRow(proposal, tradeProposal);
            setMessages((current) => current.map((item) => (
              item.id === conversation.id || item.databaseId === conversationId
                ? normalizeConversation({ ...item, tradeProposal: persistedTradeProposal, tradeProposalId: proposal.id, tradeProposalSource: "trade_proposals" })
                : item
            )));
          }
          return { message: messageResult, proposal, notification, verification };
        });
    }).catch((error) => {});
    setMessages((current) => {
      return sortConversations([normalizeConversation(conversation), ...current]);
    });
    return { id, conversation };
  };

  const respondToTradeProposal = async ({ conversationId, action }) => {
    ensureActiveAccount();
    const existing = messages.find((item) => item.id === conversationId || item.databaseId === conversationId);
    if (!existing?.tradeProposal) return null;
    const normalizedAction = action === "accept" ? "accepted" : "declined";
    const currentStatus = existing.tradeProposal.status ?? "pending";
    if (currentStatus !== "pending") return existing;
    const responseMessage = normalizedAction === "accepted" ? "Trade offer accepted." : "Trade offer declined.";
    const proposalId = existing.tradeProposal.id;
    const databaseConversationId = existing.databaseId ?? (isCanonicalUuid(conversationId) ? conversationId : null);
    const storeName = existing.name ?? existing.participantName ?? "The store";

    try {
      const persistedProposal = await updateTradeProposalRecord({ id: proposalId, status: normalizedAction, acceptedBy: normalizedAction === "accepted" ? user?.id ?? null : null });
      await recordTradeProposalEvent({ tradeProposalId: proposalId, actorId: user?.id, status: normalizedAction });
      const resolvedConversationId = persistedProposal?.conversation_id ?? databaseConversationId;
      const nextProposal = tradeProposalFromRow(persistedProposal, existing.tradeProposal);
      if (existing.buyerId) {
        await createNotification({
          userId: existing.buyerId,
          type: "trade_proposal",
          title: normalizedAction === "accepted" ? "Trade Accepted" : "Trade Declined",
          message: `${storeName} ${normalizedAction === "accepted" ? "accepted" : "declined"} your trade offer.`,
          relatedId: proposalId,
        });
      }
      const updatedConversation = normalizeConversation({
        ...existing,
        tradeProposal: nextProposal,
        tradeProposalSource: "trade_proposals",
        tradeStatus: normalizedAction,
        preview: responseMessage,
        messages: [...(existing.messages ?? []), { id: `${existing.id}-${normalizedAction}-${Date.now()}`, from: "me", text: responseMessage, timestamp: "Just now", tradeAction: normalizedAction }],
      });
      setMessages((current) => current.map((item) => item.id === existing.id || item.databaseId === existing.databaseId ? updatedConversation : item));
      return updatedConversation;
    } catch (error) {
      throw error;
    }
  };

  const markConversationRead = useCallback(async (conversationId) => {
    const authResult = isSupabaseConfigured && supabase
      ? await supabase.auth.getUser()
      : { data: { user: null }, error: null };
    const authCurrentUser = authResult.data?.user ?? null;
    const currentUserId = authCurrentUser?.id ?? user?.id ?? null;
    if (!currentUserId) {
      return { conversationId: conversationId ?? null, skipped: true, reason: "authenticated user unavailable" };
    }
    if (!conversationId) {
      return;
    }
    const readAt = new Date().toISOString();
    let unreadBefore = 0;
    let unreadAfter = 0;
    let idsMarkedRead = [];
    let idsRemainingUnread = [];
    setMessages((current) => {
      const nextMessages = current.map((conversation) => {
        if (conversation.id !== conversationId && conversation.databaseId !== conversationId) return conversation;
        const unreadBeforeMessages = (conversation.messages ?? []).filter((message) => message.unread === true);
        unreadBefore = unreadBeforeMessages.length;
        idsMarkedRead = unreadBeforeMessages.map((message) => message.databaseId ?? message.id);
        const nextConversation = normalizeConversation({
          ...conversation,
          unread: false,
          messages: (conversation.messages ?? []).map((message) => message.unread ? { ...message, unread: false, readAt } : message),
        });
        const unreadAfterMessages = nextConversation.messages.filter((message) => message.unread === true);
        unreadAfter = unreadAfterMessages.length;
        idsRemainingUnread = unreadAfterMessages.map((message) => message.databaseId ?? message.id);
        return nextConversation;
      });
      return sortConversations(nextMessages);
    });
    let persistedReadResult = null;
    let persistedReadError = null;
    if (isCanonicalUuid(conversationId) && isSupabaseConfigured) {
      try {
        const readResult = await markConversationMessagesRead(conversationId, user);
        persistedReadResult = readResult;
        setMessages((current) => sortConversations(current.map((conversation) => {
          if (conversation.id !== conversationId && conversation.databaseId !== conversationId) return conversation;
          const persistedReadState = new Map((readResult.messages ?? []).map((message) => [message.messageId, message]));
          const nextConversation = normalizeConversation({
            ...conversation,
            messages: (conversation.messages ?? []).map((message) => {
              const persisted = persistedReadState.get(message.databaseId ?? message.id);
              if (!persisted || !persisted.readAtAfter || persisted.senderId === readResult.currentUserId) return message;
              return { ...message, readAt: persisted.readAtAfter, unread: false };
            }),
          });
          const conversationUnreadCount = nextConversation.messages.filter((message) => message.unread).length;
          return nextConversation;
        })));
      } catch (error) {
        persistedReadError = error?.message ?? String(error);
      }
    }
    const auditResult = { conversationId, unreadBefore, unreadAfter, persistedReadResult, persistedReadError };
    return auditResult;
  }, [user?.id]);

  const unreadCount = messages.reduce((count, conversation) => count + (conversation.messages ?? []).filter((message) => message.unread).length, 0);
  const value = useMemo(() => ({ messages, unreadCount, upsertConversation, appendMessage, ensureConversation, markConversationRead, createSellerConversation, createTradeConversation, createTradeProposal, respondToTradeProposal, createOrderConversation }), [messages, unreadCount, markConversationRead]);
  return <MessageContext.Provider value={value}>{children}</MessageContext.Provider>;
}

export function useMessages() {
  const context = useContext(MessageContext);
  if (!context) throw new Error("useMessages must be used within a MessageProvider");
  return context;
}
