import { createContext, useContext, useState } from "react";
import { sellers } from "../data/mockData";

const SellerSettingsContext = createContext(null);

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

export function SellerSettingsProvider({ children }) {
  const [profiles, setProfiles] = useState(initialProfiles);

  const getSellerProfile = (sellerId) => profiles[sellerId] ?? profiles["sarahs-backyard"];

  const updateSellerProfile = (sellerId, updates) => {
    setProfiles((current) => ({
      ...current,
      [sellerId]: {
        ...(current[sellerId] ?? initialProfiles["sarahs-backyard"]),
        ...updates,
        notifications: {
          ...(current[sellerId]?.notifications ?? defaultNotifications),
          ...(updates.notifications ?? {}),
        },
      },
    }));
  };

  return <SellerSettingsContext.Provider value={{ profiles, getSellerProfile, updateSellerProfile }}>{children}</SellerSettingsContext.Provider>;
}

export function useSellerSettings() {
  const context = useContext(SellerSettingsContext);
  if (!context) throw new Error("useSellerSettings must be used within a SellerSettingsProvider");
  return context;
}
