import { createContext, useContext, useMemo, useState } from "react";
import { chatMessages, messages as initialMessages } from "../data/mockData";

const MessageContext = createContext(null);
const MESSAGE_STORAGE_KEY = "grolo-messages";

function normalizeConversation(conversation) {
  const isTrading = conversation.tradeThread === true
    || conversation.conversationType === "trading"
    || conversation.category === "Trading";
  const messages = Array.isArray(conversation.messages)
    ? conversation.messages
    : isTrading
      ? conversation.threadMessages ?? []
      : chatMessages.map((message) => ({ ...message }));

  return {
    ...conversation,
    ...(isTrading ? { conversationType: "trading", category: "Trading", tradeThread: true } : {}),
    messages,
  };
}

function loadMessages() {
  try {
    const savedMessages = window.localStorage.getItem(MESSAGE_STORAGE_KEY);
    const parsedMessages = savedMessages ? JSON.parse(savedMessages) : initialMessages;
    return parsedMessages.map(normalizeConversation).filter((conversation) => (
      !["order", "trading"].includes(conversation.conversationType) || conversation.messages.length > 0
    ));
  } catch {
    return initialMessages.map(normalizeConversation);
  }
}

export function MessageProvider({ children }) {
  const [messages, setMessages] = useState(loadMessages);

  const saveMessages = (nextMessages) => {
    try {
      window.localStorage.setItem(MESSAGE_STORAGE_KEY, JSON.stringify(nextMessages));
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

  const value = useMemo(() => ({ messages, upsertConversation, appendMessage, createTradeConversation, createOrderConversation }), [messages]);
  return <MessageContext.Provider value={value}>{children}</MessageContext.Provider>;
}

export function useMessages() {
  const context = useContext(MessageContext);
  if (!context) throw new Error("useMessages must be used within a MessageProvider");
  return context;
}
