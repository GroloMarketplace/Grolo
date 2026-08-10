import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";

const MessageContext = createContext(null);
const MESSAGE_STORAGE_KEY = "grolo-messages";
const CURRENT_BUYER_ID = "current-buyer";

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
    ...(isTrading ? { conversationType: "trading", category: "Trading", tradeThread: true } : {}),
    ...(isService ? { conversationType: "service" } : {}),
    messages: normalizedMessages,
  };
}

function loadMessages(storageKey) {
  try {
    const parsedMessages = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
    const conversations = Array.isArray(parsedMessages) ? parsedMessages : [];
    return conversations.map((conversation) => normalizeConversation(conversation ?? {})).filter((conversation) => (
      conversation.id && (!["order", "trading"].includes(conversation.conversationType) || conversation.messages.length > 0)
    ));
  } catch {
    return [];
  }
}

export function MessageProvider({ children }) {
  const { user } = useAuth();
  const storageKey = `${MESSAGE_STORAGE_KEY}-${user?.id ?? "anonymous"}`;
  const [messages, setMessages] = useState(() => loadMessages(storageKey));

  useEffect(() => {
    setMessages(loadMessages(storageKey));
  }, [storageKey]);

  const saveMessages = (nextMessages) => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(nextMessages));
    } catch {
    }
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
      saveMessages(nextMessages);
      return nextMessages;
    });
  };

  const appendMessage = (conversationId, message, pendingConversation) => {
    setMessages((current) => {
      const existing = current.find((conversation) => conversation.id === conversationId);
      const baseConversation = existing ?? pendingConversation;
      if (!baseConversation) return current;
      const threadMessages = [...(baseConversation.messages ?? []), message];
      console.info("Message saved", {
        conversationId,
        messageId: message.id,
        firstMessageSaved: threadMessages.length === 1,
      });
      const savedConversation = {
        ...normalizeConversation(baseConversation),
        messages: threadMessages,
        preview: message.text,
        timestamp: message.timestamp,
      };
      const nextMessages = existing
        ? current.map((conversation) => conversation.id === conversationId ? savedConversation : conversation)
        : [savedConversation, ...current];
      saveMessages(nextMessages);
      return nextMessages;
    });
  };

  const createOrderConversation = ({ order, product, seller, fulfillmentMethod }) => {
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
      return {
        id: existing.id,
        draft: existing.messages?.length ? "" : draft,
        orderContext: existing.orderContext ?? orderContext,
      };
    }

    const conversation = {
      id: `order-${order.id}`,
      name: seller.name,
      sellerId: seller.id,
      participantId: seller.id,
      location: seller.location,
      timestamp: "Just now",
      preview: draft,
      unread: false,
      category: "Orders",
      conversationType: "order",
      orderId: order.id,
      orderContext,
      messages: [],
    };
    return { id: conversation.id, draft, orderContext, conversation };
  };

  const createSellerConversation = ({ listing, seller }) => {
    const serviceContext = {
      listingId: listing.id,
      image: listing.images?.[0] ?? listing.image,
      title: listing.name,
      price: listing.price,
      pricingType: listing.pricingType,
      sellerName: seller.name,
    };
    const existing = messages.find((conversation) => (
      conversation.buyerId === CURRENT_BUYER_ID
      && conversation.sellerId === seller.id
      && conversation.listingId === listing.id
      && conversation.conversationType === "service"
    ));

    console.info("Service conversation lookup", {
      buyerId: CURRENT_BUYER_ID,
      sellerId: seller.id,
      serviceListingId: listing.id,
      matchedConversationId: existing?.id ?? null,
      conversationType: existing?.conversationType ?? null,
      messageCount: existing?.messages?.length ?? 0,
    });

    if (existing) {
      const updatedConversation = { ...existing, buyerId: CURRENT_BUYER_ID, listingId: listing.id, conversationType: "service", serviceContext };
      setMessages((current) => {
        const nextMessages = current.map((conversation) => conversation.id === existing.id ? updatedConversation : conversation);
        saveMessages(nextMessages);
        return nextMessages;
      });
      return { id: existing.id, serviceContext, conversation: updatedConversation };
    }

    const conversation = {
      id: `service-${CURRENT_BUYER_ID}-${seller.id}-${listing.id}`,
      name: seller.name,
      sellerId: seller.id,
      buyerId: CURRENT_BUYER_ID,
      participantId: seller.id,
      location: seller.location,
      timestamp: "Just now",
      preview: "",
      unread: false,
      category: "Selling",
      conversationType: "service",
      listingId: listing.id,
      serviceContext,
      messages: [],
    };
    setMessages((current) => {
      if (current.some((item) => item.id === conversation.id)) return current;
      const nextMessages = [conversation, ...current];
      saveMessages(nextMessages);
      return nextMessages;
    });
    return { id: conversation.id, serviceContext, conversation };
  };

  const createTradeConversation = ({ listing, seller }) => {
    const id = `trade-${listing.id}-${Date.now()}`;
    const tradePreferences = listing.desiredTradeItems?.trim() ?? "";
    const draft = tradePreferences
      ? `Hi ${seller.name}! I'd like to make a trade for your listing: ${listing.name}.\n\nI noticed you're looking for:\n${tradePreferences}\n\nLet me know if you're interested.`
      : `Hi ${seller.name}! I'd like to discuss a trade for your listing.`;
    const conversation = {
      id,
      name: seller.name,
      sellerId: seller.id,
      participantId: seller.id,
      location: seller.location,
      timestamp: "Just now",
      preview: draft,
      unread: false,
      category: "Trading",
      conversationType: "trading",
      listingId: listing.id,
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
    return { id, draft, conversation };
  };

  const value = useMemo(() => ({ messages, upsertConversation, appendMessage, createSellerConversation, createTradeConversation, createOrderConversation }), [messages]);
  return <MessageContext.Provider value={value}>{children}</MessageContext.Provider>;
}

export function useMessages() {
  const context = useContext(MessageContext);
  if (!context) throw new Error("useMessages must be used within a MessageProvider");
  return context;
}
