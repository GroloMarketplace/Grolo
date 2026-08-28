import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { useBuyerSettings } from "./BuyerSettingsContext";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { isTemporaryImageSource, uploadImageSource } from "../lib/imageStorage";
import { sellerProfileUpdates } from "../utils/profileActivation";

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
  pickupLocation: "",
  neighborhood: "",
  city: "",
  province: "",
  country: "",
  postalCode: "",
  latitude: null,
  longitude: null,
  avatar: "",
  banner: "",
  vacationMode: false,
  vacationMessage: "",
  returnDate: "",
  notifications: { ...defaultNotifications },
  sellerStatus: "buyer",
  storeOnboardingStatus: false,
  socialLinks: "",
  instagram: "",
  facebook: "",
  x: "",
  website: "",
  phone: "",
  email: "",
};

function isFoundingYearStore(value) {
  const date = value ? new Date(value) : null;
  return Boolean(date && !Number.isNaN(date.getTime()) && date.getUTCFullYear() === 2026);
}

function sellerProfileFromRow(row) {
  if (!row) return emptyProfile;
  return {
    ...emptyProfile,
    id: row.id,
    createdAt: row.created_at ?? row.createdAt ?? null,
    name: row.shop_name ?? "",
    description: row.store_description ?? row.bio ?? "",
    location: row.location ?? "",
    pickupLocation: row.store_location ?? row.location ?? "",
    neighborhood: row.neighborhood ?? "",
    city: row.city ?? "",
    province: row.province ?? "",
    country: row.country ?? "",
    postalCode: row.postal_code ?? "",
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
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
    foundingMember: Boolean(row.founding_member ?? row.foundingMember) || isFoundingYearStore(row.store_opened_at ?? row.storeOpenedAt),
    socialLinks: row.social_links ?? "",
    instagram: row.instagram_handle ?? "",
    facebook: row.facebook_handle ?? "",
    x: row.x_handle ?? "",
    website: row.seller_website ?? "",
    phone: row.seller_phone ?? "",
    email: row.seller_email ?? "",
  };
}

export function SellerSettingsProvider({ children }) {
  const { user, refreshProfile } = useAuth();
  const { settings: primaryLocation, updateSettings: updatePrimaryLocation } = useBuyerSettings();
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
        .select("*")
        .order("created_at", { ascending: true });
      if (error) {
        console.error("Unable to load seller profiles", error);
        return;
      }
      const { data: ownProfile, error: ownProfileError } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (ownProfileError) console.error("Unable to load own seller profile", ownProfileError);
      const rows = (data ?? []).map((row) => row.id === user.id && ownProfile ? ownProfile : row);
      const migratedImages = {};
      for (const [field, kind] of [["avatar_url", "avatar"], ["banner_url", "banner"]]) {
        if (isTemporaryImageSource(ownProfile?.[field])) {
          try {
            const uploaded = await uploadImageSource(ownProfile[field], { userId: user.id, kind, folder: "profiles" });
            if (uploaded) migratedImages[field] = uploaded.url;
          } catch (migrationError) {
            console.error(`Unable to migrate ${kind} image`, migrationError);
          }
        }
      }
      if (Object.keys(migratedImages).length) {
        const { error: migrationError } = await supabase.from("profiles").update(migratedImages).eq("id", user.id);
        if (migrationError) console.error("Unable to persist migrated seller images", migrationError);
        else Object.assign(ownProfile, migratedImages);
      }
      if (!cancelled) {
        const finalRows = rows.map((row) => row.id === user.id && ownProfile ? ownProfile : row);
        setProfiles(Object.fromEntries(finalRows.map((row) => [row.id, sellerProfileFromRow(row)])));
      }
    }

    loadProfile();
    return () => { cancelled = true; };
  }, [user?.id]);

  const resolveUserId = (sellerId) => sellerId === CURRENT_USER_SELLER_ID ? user?.id : sellerId;
  const currentUserProfile = profiles[user?.id] ?? emptyProfile;
  const currentUserSellerProfile = useMemo(() => ({
    ...currentUserProfile,
    location: primaryLocation.location,
    neighborhood: primaryLocation.neighborhood,
    city: primaryLocation.city,
    province: primaryLocation.province,
    country: primaryLocation.country,
    postalCode: primaryLocation.postalCode,
    latitude: primaryLocation.latitude,
    longitude: primaryLocation.longitude,
  }), [currentUserProfile, primaryLocation]);

  const getSellerProfile = (sellerId) => {
    const resolvedId = resolveUserId(sellerId);
    return resolvedId === user?.id ? currentUserSellerProfile : profiles[resolvedId] ?? emptyProfile;
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
    const oldAvatarUrl = current.avatar ?? null;
    const sharedLocationFields = ["location", "neighborhood", "city", "province", "country", "postalCode", "latitude", "longitude"];
    const locationUpdates = Object.fromEntries(sharedLocationFields
      .filter((field) => updates[field] !== undefined)
      .map((field) => [field, updates[field]]));
    if (Object.keys(locationUpdates).length) await updatePrimaryLocation(locationUpdates);
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
      .upsert({ id: user.id, ...sellerProfileUpdates(next) }, { onConflict: "id" })
      .select("*")
      .single();
    if (error) throw error;
    setProfiles((current) => ({ ...current, [user.id]: sellerProfileFromRow(data) }));
    await refreshProfile(user.id);
    return true;
  };

  return <SellerSettingsContext.Provider value={{ profiles, getSellerProfile, updateSellerProfile }}>{children}</SellerSettingsContext.Provider>;
}

export function useSellerSettings() {
  const context = useContext(SellerSettingsContext);
  if (!context) throw new Error("useSellerSettings must be used within a SellerSettingsProvider");
  return context;
}
