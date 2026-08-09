import { createContext, useContext, useState } from "react";

const BuyerSettingsContext = createContext(null);
const STORAGE_KEY = "grolo-buyer-settings";

function readStoredSettings(initialSettings) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return initialSettings;
    const parsed = JSON.parse(stored);
    return { ...initialSettings, ...parsed, notifications: { ...initialSettings.notifications, ...(parsed.notifications ?? {}) } };
  } catch {
    return initialSettings;
  }
}

function persistSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

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
  username: "remi",
  email: "",
  interests: [],
};

export function BuyerSettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => readStoredSettings(initialSettings));

  const updateSettings = (updates) => {
    let saved = true;
    setSettings((current) => {
      const next = {
        ...current,
        ...updates,
        notifications: {
          ...current.notifications,
          ...(updates.notifications ?? {}),
        },
      };
      saved = persistSettings(next);
      return next;
    });
    return saved;
  };

  return <BuyerSettingsContext.Provider value={{ settings, updateSettings }}>{children}</BuyerSettingsContext.Provider>;
}

export function useBuyerSettings() {
  const context = useContext(BuyerSettingsContext);
  if (!context) throw new Error("useBuyerSettings must be used within a BuyerSettingsProvider");
  return context;
}
