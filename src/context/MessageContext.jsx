import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { databaseMessageToLegacyMessage, getConversations, getMessages, isCanonicalUuid, markConversationMessagesRead, sendMessage, subscribeToMessages, upsertConversationInDatabase } from "../lib/api/messages";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { isUserBlocked } from "../lib/api/trustSafety";
import { createTradeOrder } from "../lib/api/tradeOrders";
import { createTradeProposalRecord } from "../lib/api/tradeProposals";
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

function normalizeConversation(input) {
  const conversation = input && typeof input === "object" ? input : {};
  const isTrading = conversation.tradeThread === true
    || conversation.conversationType === "trading"
    || conversation.category === "Trading";
  const isService = conversation.conversationType === "service"
    || Boolean(conversation.serviceContext?.listingId);
  const messages = Array.isArray(conversation.messages)
    ? conversation.messages
    : Array.isArray(conversation.threadMessages)
      ? conversation.threadMessages
      : [];
  const normalizedMessages = messages.filter(Boolean);

  return {
    ...conversation,
    createdAt: conversation.createdAt ?? conversation.created_at ?? null,
    latestActivityAt: latestActivityAt(conversation, normalizedMessages),
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
    console.info("realtime subscription cleanup triggered", {
      reason,
      currentUserId: user?.id ?? null,
      activeConversationIds: [...realtimeSubscriptions.current.keys()],
    });
    realtimeSubscriptions.current.forEach((channel, conversationId) => {
      channel.unsubscribe();
      console.info("realtime subscription removed", { conversationId, reason });
    });
    realtimeSubscriptions.current.clear();
  };

  const reconcileRealtimeSubscriptions = (conversationIds) => {
    const activeConversationIds = new Set(conversationIds.filter(isCanonicalUuid));
    activeConversationIds.forEach((conversationId) => subscribeToConversationRef.current?.(conversationId));
    console.info("realtime subscriptions kept active", {
      activeConversationIds: [...realtimeSubscriptions.current.keys()],
    });
  };

  const subscribeToConversation = (conversationId) => {
    if (!isCanonicalUuid(conversationId) || realtimeSubscriptions.current.has(conversationId)) return;
    const channel = subscribeToMessages(conversationId, (payload) => {
      const incomingMessage = databaseMessageToLegacyMessage(payload, { currentUserId: user?.id });
      console.info("realtime message received", {
        conversationId,
        messageId: incomingMessage?.databaseId ?? incomingMessage?.id,
        senderId: incomingMessage?.senderId,
      });
      mergeRealtimeMessage(conversationId, incomingMessage);
    }, (status, error) => {
      console.info("realtime message subscription status", {
        conversationId,
        currentUserId: user?.id ?? null,
        status,
        error: error?.message ?? error ?? null,
      });
    }, (payload) => {
      const updatedMessage = databaseMessageToLegacyMessage(payload, { currentUserId: user?.id });
      mergeRealtimeMessage(conversationId, updatedMessage);
    });
    realtimeSubscriptions.current.set(conversationId, channel);
    console.info("realtime subscription created", {
      conversationId,
      currentUserId: user?.id ?? null,
      channel: `messages:${conversationId}`,
    });
  };
  subscribeToConversationRef.current = subscribeToConversation;

  useEffect(() => {
    let cancelled = false;
    setMessages([]);

    console.info("realtime subscription dependency change", {
      dependency: "user.id",
      currentUserId: user?.id ?? null,
      supabaseConfigured: isSupabaseConfigured,
    });

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
            return { ...conversation, messages: threadMessages };
          } catch (error) {
            console.warn("Unable to retrieve conversation messages", {
              conversationId: databaseConversationId,
              buyerId: conversation.buyerId ?? null,
              sellerId: conversation.sellerId ?? null,
              currentUserId: user.id,
              error: error?.message ?? String(error),
            });
            return conversation;
          }
        }));
        if (cancelled) return;

        const normalizedConversations = hydratedConversations.map((conversation) => normalizeConversation(conversation));
        const mappedMessages = normalizedConversations.filter((conversation) => conversation.id);
        const sortedMessages = sortConversations(mappedMessages);
        const messageCount = mappedMessages.reduce((count, conversation) => count + conversation.messages.length, 0);
        console.info("Message source: supabase", {
          totalConversationsLoaded: conversations.length,
          conversationsAfterNormalization: normalizedConversations.length,
          conversationsAfterIdFiltering: mappedMessages.length,
          conversationsAfterSorting: sortedMessages.length,
          conversationsMissingLatestActivityAt: sortedMessages.filter((conversation) => !conversation.latestActivityAt).length,
          messageCount,
        });
        const hydrationRows = sortedMessages.flatMap((conversation) => conversation.messages.map((message) => ({
          conversationId: conversation.databaseId ?? conversation.id,
          messageId: message.databaseId ?? message.id,
          senderId: message.senderId,
          currentUserId: user.id,
          isIncoming: Boolean(message.senderId && user.id && message.senderId !== user.id),
          readAt: message.readAt ?? null,
          computedUnread: message.unread === true,
        })));
        console.info("HYDRATED MESSAGE READ STATE");
        console.table(hydrationRows);
        const unreadSummaryRows = sortedMessages.map((conversation) => {
          const unreadMessageIds = conversation.messages.filter((message) => message.unread === true).map((message) => message.databaseId ?? message.id);
          return {
            conversationId: conversation.databaseId ?? conversation.id,
            unreadMessageCount: unreadMessageIds.length,
            unreadMessageIds: unreadMessageIds.join(", "),
          };
        });
        console.info("UNREAD MESSAGE IDS FOR CONVERSATION");
        console.table(unreadSummaryRows);
        setMessages(sortedMessages);
        const activeConversationIds = hydratedConversations.map((conversation) => conversation.databaseId ?? conversation.id);
        console.info("realtime subscription reconciliation", {
          currentUserId: user.id,
          activeConversationIds,
        });
        reconcileRealtimeSubscriptions(activeConversationIds);
      } catch (error) {
        if (cancelled) return;
        setMessages([]);
        console.warn("Message source: supabase read failed", {
          error: error?.message ?? String(error),
        });
      }
    };

    loadSupabaseMessages();
    return () => {
      cancelled = true;
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
        console.info("realtime message state merged", {
          conversationId,
          messageId: incomingDatabaseMessageId,
          readAt: incomingMessage.readAt ?? null,
          unreadMessageCount: nextConversation.messages.filter((message) => message.unread).length,
        });
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
      console.info("realtime message merged", {
        conversationId,
        messageId: incomingDatabaseMessageId,
        senderId: incomingMessage.senderId,
      });
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
      console.info(existing ? "Conversation found existing" : "Conversation created", {
        databaseConversationId: databaseConversation.databaseId,
        conversationType: mergedConversation.conversationType,
        conversationId: mergedConversation.id,
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
      console.warn("Conversation persistence failed", {
        conversationId: normalizedConversation.id,
        conversationType: normalizedConversation.conversationType,
        buyerId: normalizedConversation.buyerId ?? user?.id ?? null,
        sellerId: normalizedConversation.sellerId ?? normalizedConversation.participantId ?? null,
        listingId: normalizedConversation.listingId ?? null,
        error: error?.message ?? String(error),
      });
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
    console.info("Message list refreshed after insert", {
      conversationId,
      messageCount: refreshedMessages.length,
    });
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

    console.info("Message send requested", {
      conversationId: initialDatabaseConversationId ?? conversationId,
      messageId: message.id,
      senderId: user?.id ?? null,
    });

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
          console.info("realtime duplicate skipped", {
            conversationId: initialDatabaseConversationId ?? conversationId,
            messageId: savedDatabaseMessageId,
            senderId: savedMessage.senderId ?? user?.id,
          });
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
        console.info("Message recipient resolved", {
          conversationId: databaseConversationId,
          senderId: user.id,
          recipientId,
        });
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
        console.info("Message send succeeded", {
          conversationId: databaseConversationId,
          messageId: savedMessage?.databaseId ?? savedMessage?.id,
          senderId: user.id,
          recipientId,
        });
        updateState(savedMessage);
        await refreshConversationMessages(databaseConversationId, savedMessage.databaseId ?? savedMessage.id).catch((refreshError) => {
          console.warn("Message list refresh after insert failed", {
            conversationId: databaseConversationId,
            senderId: user.id,
            recipientId,
            error: refreshError?.message ?? String(refreshError),
          });
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
        console.warn("Message send failed", {
          conversationId: initialDatabaseConversationId ?? conversationId,
          messageId: message.id,
          senderId: user?.id ?? null,
          recipientId,
          error: error?.message ?? String(error),
        });
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
      console.warn("Conversation lookup before creation failed", {
        participantId: routeParticipantId,
        currentUserId: user.id,
        error: error?.message ?? String(error),
      });
    }

    if (existingConversation?.databaseId) {
      const hydratedMessages = isCanonicalUuid(existingConversation.databaseId)
        ? await getMessages(existingConversation.databaseId, user.id)
        : existingConversation.messages ?? [];
      const hydratedConversation = normalizeConversation({ ...existingConversation, messages: hydratedMessages });
      setMessages((current) => sortConversations([hydratedConversation, ...current.filter((item) => item.databaseId !== existingConversation.databaseId && item.id !== hydratedConversation.id)]));
      subscribeToConversation(existingConversation.databaseId);
      console.info("Conversation recovered before chat send", {
        conversationId: existingConversation.databaseId,
        senderId: user.id,
        recipientId: routeParticipantId,
      });
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
    console.info("Conversation initialized before chat send", {
      conversationId: databaseConversation.databaseId,
      senderId: user.id,
      recipientId: routeParticipantId,
    });
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

    console.info("Listing conversation lookup", {
      buyerId,
      sellerId: seller.id,
      listingId,
      conversationType,
      matchedConversationId: existing?.id ?? null,
      messageCount: existing?.messages?.length ?? 0,
    });

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
    const id = `trade-${listing.id}-${Date.now()}`;
    const buyerId = user?.id ?? CURRENT_BUYER_ID;
    const tradeProposal = {
      buyerName: buyerName || "A buyer",
      requestedListing: {
        id: listing.id,
        name: listing.name,
        image: listing.images?.[0] ?? listing.image,
      },
      offeredListings: (offeredListings ?? (offeredListing ? [offeredListing] : [])).map((offeredItem) => ({
        id: offeredItem.id,
        name: offeredItem.name,
        image: offeredItem.images?.[0] ?? offeredItem.image,
        price: offeredItem.price,
      })),
      offeredListing: null,
      message,
      photos: photos ?? [],
    };
    const firstMessage = {
      id: `${id}-1`,
      from: "me",
      text: message || `I'd like to propose a trade for ${listing.name}.`,
      timestamp: "Just now",
    };
    const conversation = {
      id,
      name: seller.name,
      sellerId: seller.id,
      buyerId,
      participantId: seller.id,
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
      messages: [firstMessage],
    };
    const conversationWrite = persistConversation(conversation);
    conversationWrite.then((databaseConversation) => {
      const conversationId = databaseConversation?.databaseId ?? databaseConversation?.id ?? null;
      console.info("trade proposal delivery audit", {
        trade_proposal_id: id,
        buyer_id: buyerId,
        seller_id: seller.id,
        conversation_id: conversationId,
        message_id: firstMessage.id,
      });
      if (!conversationId) return;
      return Promise.allSettled([
        appendMessage(conversationId, firstMessage, { ...conversation, databaseId: conversationId, id: conversationId, messages: [] }),
        createTradeProposalRecord({ id, buyerId, sellerId: seller.id, conversationId, requestedListing: tradeProposal.requestedListing, offeredListings: tradeProposal.offeredListings, message, photos }),
        createNotification({ userId: seller.id, type: "trade_proposal", title: "New Trade Offer", message: `${buyerName || "A buyer"} sent you a trade offer.`, relatedId: id }),
      ]).then(([messageResult, proposalResult, notificationResult]) => console.info("trade proposal delivery verified", {
        trade_proposal_id: id,
        buyer_id: buyerId,
        seller_id: seller.id,
        conversation_id: conversationId,
        message_id: messageResult.status === "fulfilled" ? messageResult.value?.databaseId ?? messageResult.value?.id ?? firstMessage.id : null,
        proposal_row_created: proposalResult.status === "fulfilled" && Boolean(proposalResult.value),
        notification_created: notificationResult.status === "fulfilled" && Boolean(notificationResult.value),
      }));
    }).catch((error) => console.warn("trade proposal delivery failed", { trade_proposal_id: id, buyer_id: buyerId, seller_id: seller.id, error: error?.message ?? String(error) }));
    setMessages((current) => {
      return sortConversations([normalizeConversation(conversation), ...current]);
    });
    return { id, conversation };
  };

  const respondToTradeProposal = ({ conversationId, action, counterMessage = "" }) => {
    ensureActiveAccount();
    const existing = messages.find((item) => item.id === conversationId || item.databaseId === conversationId);
    if (!existing?.tradeProposal) return null;
    const normalizedAction = action === "accept" ? "accepted" : action === "counter" ? "countered" : "declined";
    const offeredListings = existing.tradeProposal.offeredListings ?? (existing.tradeProposal.offeredListing ? [existing.tradeProposal.offeredListing] : []);
    const responseMessage = normalizedAction === "accepted"
      ? "Trade offer accepted."
      : normalizedAction === "countered"
        ? counterMessage || "I would like to make a counter offer."
        : "Trade offer declined.";
    const tradeOrder = normalizedAction === "accepted" ? {
      id: `TRADE-${Date.now()}`,
      type: "trade",
      status: "Accepted",
      buyerReceives: existing.tradeProposal.requestedListing,
      sellerReceives: offeredListings,
      createdAt: new Date().toISOString(),
    } : existing.tradeOrder ?? null;
    const response = { id: `${existing.id}-${normalizedAction}-${Date.now()}`, from: "me", text: responseMessage, timestamp: "Just now", tradeAction: normalizedAction };
    const updatedConversation = normalizeConversation({
      ...existing,
      tradeStatus: normalizedAction,
      tradeOrder,
      preview: responseMessage,
      messages: [...(existing.messages ?? []), response],
    });
    setMessages((current) => current.map((item) => item.id === existing.id || item.databaseId === existing.databaseId ? updatedConversation : item));
    if (normalizedAction === "accepted" && tradeOrder) {
      void createTradeOrder({
        buyerId: existing.buyerId,
        sellerId: existing.sellerId,
        requestedListing: existing.tradeProposal.requestedListing,
        offeredListings,
      }).then((persistedTradeOrder) => {
        if (!persistedTradeOrder) return;
        setMessages((current) => current.map((item) => item.id === existing.id || item.databaseId === existing.databaseId ? { ...updatedConversation, tradeOrder: persistedTradeOrder } : item));
      }).catch((error) => console.warn("Trade order persistence failed", { conversationId, error: error?.message ?? String(error) }));
    }
    return updatedConversation;
  };

  const markConversationRead = useCallback(async (conversationId) => {
    const authResult = isSupabaseConfigured && supabase
      ? await supabase.auth.getUser()
      : { data: { user: null }, error: null };
    const authCurrentUser = authResult.data?.user ?? null;
    const currentUserId = authCurrentUser?.id ?? user?.id ?? null;
    console.info("markConversationRead entered", {
      conversationId: conversationId ?? null,
      user: user ? { id: user.id, email: user.email ?? null } : null,
      userId: user?.id ?? null,
      authCurrentUser: authCurrentUser ? { id: authCurrentUser.id, email: authCurrentUser.email ?? null } : null,
      currentUserId,
      authError: authResult.error?.message ?? null,
    });
    if (!currentUserId) {
      console.warn("markConversationRead deferred until authenticated user is available", {
        conversationId: conversationId ?? null,
        currentUserId: null,
      });
      return { conversationId: conversationId ?? null, skipped: true, reason: "authenticated user unavailable" };
    }
    if (!conversationId) {
      console.warn("markConversationRead exited without conversation ID");
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
      console.info("conversation unread state recalculated", {
        conversationId,
        unreadBefore,
        unreadAfter,
        idsMarkedRead,
        idsRemainingUnread,
        readAt,
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
          console.info("conversation unread count after persisted read", {
            conversationId,
            conversationUnreadCount,
            unreadBefore: readResult.unreadBefore,
            unreadAfter: readResult.unreadAfter,
          });
          return nextConversation;
        })));
        console.info("conversation read_at updates persisted", { conversationId, ...readResult });
      } catch (error) {
        persistedReadError = error?.message ?? String(error);
        console.warn("Unable to mark conversation messages read", { conversationId, error: persistedReadError });
      }
    }
    const auditResult = { conversationId, unreadBefore, unreadAfter, persistedReadResult, persistedReadError };
    console.info("markConversationRead audit completed", auditResult);
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
