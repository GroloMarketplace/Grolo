import { createContext, useContext, useState } from "react";
import { sellers } from "../data/mockData";

const SellerSettingsContext = createContext(null);
const STORAGE_KEY = "grolo-seller-profiles";

const defaultNotifications = {
  newOrders: true,
  newMessages: true,
  newFollowers: true,
  reviews: true,
  eventInteractions: true,
};

const initialProfiles = Object.fromEntries(
  Object.values(sellers).map((seller) => [seller.id, {
    name: seller.name,
    description: seller.description ?? "",
    location: seller.location ?? "",
    avatar: seller.avatar,
    banner: seller.banner,
    vacationMode: false,
    vacationMessage: "",
    returnDate: "",
    notifications: { ...defaultNotifications },
  }]),
);

function readStoredProfiles() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...initialProfiles, ...JSON.parse(stored) } : initialProfiles;
  } catch {
    return initialProfiles;
  }
}

function storeProfiles(profiles) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    return true;
  } catch {
    return false;
  }
}

export function SellerSettingsProvider({ children }) {
  const [profiles, setProfiles] = useState(readStoredProfiles);

  const getSellerProfile = (sellerId) => profiles[sellerId] ?? profiles["sarahs-backyard"];

  const updateSellerProfile = (sellerId, updates) => {
    let saved = true;
    setProfiles((current) => {
      const next = {
        ...current,
        [sellerId]: {
          ...(current[sellerId] ?? initialProfiles["sarahs-backyard"]),
          ...updates,
          notifications: {
            ...(current[sellerId]?.notifications ?? defaultNotifications),
            ...(updates.notifications ?? {}),
          },
        },
      };
      saved = storeProfiles(next);
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
