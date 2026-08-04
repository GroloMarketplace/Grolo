import { createContext, useContext, useMemo, useState } from "react";
import { messages as initialMessages } from "../data/mockData";

const MessageContext = createContext(null);

export function MessageProvider({ children }) {
  const [messages, setMessages] = useState(() => initialMessages.map((message) => ({ ...message })));

  const upsertConversation = (conversation) => {
    setMessages((current) => {
      const existing = current.find((message) => message.id === conversation.id);
      if (existing) {
        return current.map((message) => (
          message.id === conversation.id ? { ...message, ...conversation } : message
        ));
      }
      return [conversation, ...current];
    });
  };

  const value = useMemo(() => ({ messages, upsertConversation }), [messages]);
  return <MessageContext.Provider value={value}>{children}</MessageContext.Provider>;
}

export function useMessages() {
  const context = useContext(MessageContext);
  if (!context) throw new Error("useMessages must be used within a MessageProvider");
  return context;
}
