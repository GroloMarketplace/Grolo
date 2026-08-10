import { createContext, useContext, useState } from "react";
import { useAuth } from "./AuthContext";

const SellerSettingsContext = createContext(null);
const STORAGE_KEY = "grolo-seller-profiles";

const defaultNotifications = {
  newOrders: true,
  newMessages: true,
  newFollowers: true,
  reviews: true,
  eventInteractions: true,
};

const initialProfiles = {};
const emptyProfile = {
  name: "",
  description: "",
  location: "",
  avatar: "",
  banner: "",
  vacationMode: false,
  vacationMessage: "",
  returnDate: "",
  notifications: { ...defaultNotifications },
};

function readStoredProfiles(storageKey) {
  try {
    const stored = localStorage.getItem(storageKey);
    return stored ? { ...initialProfiles, ...JSON.parse(stored) } : initialProfiles;
  } catch {
    return initialProfiles;
  }
}

function storeProfiles(storageKey, profiles) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(profiles));
    return true;
  } catch {
    return false;
  }
}

export function SellerSettingsProvider({ children }) {
  const { user } = useAuth();
  const storageKey = `${STORAGE_KEY}-${user?.id ?? "anonymous"}`;
  const [profiles, setProfiles] = useState(() => readStoredProfiles(storageKey));

  const getSellerProfile = (sellerId) => profiles[sellerId] ?? emptyProfile;

  const updateSellerProfile = (sellerId, updates) => {
    let saved = true;
    setProfiles((current) => {
      const next = {
        ...current,
        [sellerId]: {
          ...(current[sellerId] ?? emptyProfile),
          ...updates,
          notifications: {
            ...(current[sellerId]?.notifications ?? defaultNotifications),
            ...(updates.notifications ?? {}),
          },
        },
      };
      saved = storeProfiles(storageKey, next);
      return next;
    });
    return saved;
  };

  return <SellerSettingsContext.Provider value={{ profiles, getSellerProfile, updateSellerProfile }}>{children}</SellerSettingsContext.Provider>;
}

export function useSellerSettings() {
  const context = useContext(SellerSettingsContext);
  if (!context) throw new Error("useSellerSettings must be used within a SellerSettingsProvider");
  return context;
}
