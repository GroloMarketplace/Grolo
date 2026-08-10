import { createContext, useContext, useState } from "react";

const BuyerSettingsContext = createContext(null);
const STORAGE_KEY = "grolo-buyer-settings";

function readStoredSettings(initialSettings) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return initialSettings;
    const parsed = JSON.parse(stored);
    const safeSettings = parsed && typeof parsed === "object" ? parsed : {};
    return { ...initialSettings, ...safeSettings, notifications: { ...initialSettings.notifications, ...(safeSettings.notifications && typeof safeSettings.notifications === "object" ? safeSettings.notifications : {}) } };
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
  locationRadius: 25,
  latitude: null,
  longitude: null,
  city: "",
  province: "",
  locationPermission: "unknown",
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

  const refreshLocation = () => new Promise((resolve) => {
    if (!navigator.geolocation) {
      updateSettings({ locationPermission: "unsupported" });
      resolve({ ok: false, error: "Location services are not available on this device." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const next = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          locationPermission: "enabled",
        };
        updateSettings(next);
        resolve({ ok: true, ...next });
      },
      (error) => {
        updateSettings({ locationPermission: error.code === 1 ? "denied" : "unavailable" });
        resolve({ ok: false, error: error.message });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  });

  return <BuyerSettingsContext.Provider value={{ settings, updateSettings, refreshLocation }}>{children}</BuyerSettingsContext.Provider>;
}

export function useBuyerSettings() {
  const context = useContext(BuyerSettingsContext);
  if (!context) throw new Error("useBuyerSettings must be used within a BuyerSettingsProvider");
  return context;
}
