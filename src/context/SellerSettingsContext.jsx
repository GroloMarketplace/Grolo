import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

const SellerSettingsContext = createContext(null);
const CURRENT_USER_SELLER_ID = "current-user";

const defaultNotifications = {
  newOrders: true,
  newMessages: true,
  newFollowers: true,
  reviews: true,
  eventInteractions: true,
};

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
  sellerStatus: "buyer",
  storeOnboardingStatus: false,
};

function sellerProfileFromRow(row) {
  if (!row) return emptyProfile;
  return {
    ...emptyProfile,
    id: row.id,
    name: row.shop_name ?? "",
    description: row.store_description ?? row.bio ?? "",
    location: row.store_location ?? row.location ?? "",
    avatar: row.avatar_url ?? "",
    banner: row.banner_url ?? "",
    vacationMode: row.vacation_mode ?? false,
    vacationMessage: row.vacation_message ?? "",
    returnDate: row.return_date ?? "",
    notifications: {
      ...defaultNotifications,
      ...(row.seller_notifications ?? {}),
    },
    sellerStatus: row.seller_status ?? "buyer",
    storeOnboardingStatus: Boolean(row.store_onboarding_status),
    storeOpenedAt: row.store_opened_at ?? null,
    socialLinks: row.social_links ?? "",
  };
}

function sellerUpdates(updates) {
  const next = {};
  const fields = {
    name: "shop_name",
    description: "store_description",
    location: "store_location",
    avatar: "avatar_url",
    banner: "banner_url",
    vacationMode: "vacation_mode",
    vacationMessage: "vacation_message",
    returnDate: "return_date",
    socialLinks: "social_links",
    sellerStatus: "seller_status",
    storeOnboardingStatus: "store_onboarding_status",
    storeOpenedAt: "store_opened_at",
  };
  Object.entries(fields).forEach(([key, column]) => {
    if (updates[key] !== undefined) next[column] = updates[key];
  });
  if (updates.notifications !== undefined) next.seller_notifications = updates.notifications;
  return next;
}

export function SellerSettingsProvider({ children }) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState({});

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!user?.id) {
        setProfiles({});
        return;
      }
      if (!isSupabaseConfigured) {
        setProfiles({ [user.id]: emptyProfile });
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, shop_name, bio, avatar_url, banner_url, store_description, store_location, vacation_mode, vacation_message, return_date, social_links, seller_status, store_onboarding_status, store_opened_at")
        .order("created_at", { ascending: true });
      if (error) {
        console.error("Unable to load seller profiles", error);
        return;
      }
      if (!cancelled) {
        setProfiles(Object.fromEntries((data ?? []).map((row) => [row.id, sellerProfileFromRow(row)])));
      }
    }

    loadProfile();
    return () => { cancelled = true; };
  }, [user?.id]);

  const resolveUserId = (sellerId) => sellerId === CURRENT_USER_SELLER_ID ? user?.id : sellerId;

  const getSellerProfile = (sellerId) => {
    const resolvedId = resolveUserId(sellerId);
    return profiles[resolvedId] ?? emptyProfile;
  };

  const updateSellerProfile = async (sellerId, updates) => {
    const resolvedId = resolveUserId(sellerId);
    if (!user?.id || !isSupabaseConfigured) {
      throw new Error("Supabase is not configured or the user is not signed in.");
    }
    if (resolvedId !== user.id) {
      throw new Error("Users can only edit their own seller profile.");
    }

    const current = getSellerProfile(sellerId);
    const next = {
      ...current,
      ...updates,
      notifications: {
        ...current.notifications,
        ...(updates.notifications ?? {}),
      },
    };
    const { data, error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, ...sellerUpdates(next) }, { onConflict: "id" })
      .select("*")
      .single();
    if (error) throw error;
    setProfiles((current) => ({ ...current, [user.id]: sellerProfileFromRow(data) }));
    return true;
  };

  return <SellerSettingsContext.Provider value={{ profiles, getSellerProfile, updateSellerProfile }}>{children}</SellerSettingsContext.Provider>;
}

export function useSellerSettings() {
  const context = useContext(SellerSettingsContext);
  if (!context) throw new Error("useSellerSettings must be used within a SellerSettingsProvider");
  return context;
}
