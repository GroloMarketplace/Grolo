import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

const BuyerSettingsContext = createContext(null);
const STORAGE_KEY = "grolo-buyer-settings";

function readStoredSettings(storageKey, initialSettings) {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return initialSettings;
    const parsed = JSON.parse(stored);
    const safeSettings = parsed && typeof parsed === "object" ? parsed : {};
    return { ...initialSettings, ...safeSettings, notifications: { ...initialSettings.notifications, ...(safeSettings.notifications && typeof safeSettings.notifications === "object" ? safeSettings.notifications : {}) } };
  } catch {
    return initialSettings;
  }
}

function persistSettings(storageKey, settings) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

const initialSettings = {
  displayName: "",
  bio: "",

  location: "",
  locationRadius: 25,
  latitude: null,
  longitude: null,
  city: "",
  province: "",
  locationPermission: "unknown",
  avatar: "",
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
  username: "",
  email: "",
  interests: [],
};

export function BuyerSettingsProvider({ children }) {
  const { user } = useAuth();
  const storageKey = `${STORAGE_KEY}-${user?.id ?? "anonymous"}`;
  const [settings, setSettings] = useState(() => readStoredSettings(storageKey, initialSettings));

  useEffect(() => {
    setSettings(readStoredSettings(storageKey, initialSettings));
  }, [storageKey]);

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
      saved = persistSettings(storageKey, next);
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
