import { createContext, useContext, useState } from "react";

const BuyerSettingsContext = createContext(null);

const initialSettings = {
  displayName: "remi",
  bio: "Discovering local makers, businesses, and community moments around Calgary.",
  location: "",
  avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&q=80",
  notifications: {
    newMessages: true,
    newFollowers: true,
    productUpdates: true,
    eventUpdates: true,
    tradeRequests: true,
    orderUpdates: true,
    communityActivity: true,
  },
  showLocationPublicly: false,
};

export function BuyerSettingsProvider({ children }) {
  const [settings, setSettings] = useState(initialSettings);

  const updateSettings = (updates) => {
    setSettings((current) => ({
      ...current,
      ...updates,
      notifications: {
        ...current.notifications,
        ...(updates.notifications ?? {}),
      },
    }));
  };

  return <BuyerSettingsContext.Provider value={{ settings, updateSettings }}>{children}</BuyerSettingsContext.Provider>;
}

export function useBuyerSettings() {
  const context = useContext(BuyerSettingsContext);
  if (!context) throw new Error("useBuyerSettings must be used within a BuyerSettingsProvider");
  return context;
}
