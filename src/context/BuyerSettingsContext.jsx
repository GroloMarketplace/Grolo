import { createContext, useContext, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "./AuthContext";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { isTemporaryImageSource, uploadImageSource } from "../lib/imageStorage";

const BuyerSettingsContext = createContext(null);

const initialSettings = {
  displayName: "",
  bio: "",
  location: "",
  locationRadius: 25,
  latitude: null,
  longitude: null,
  neighborhood: "",
  city: "",
  province: "",
  country: "",
  postalCode: "",
  locationPermission: "unknown",
  avatar: "",
  banner: "",
  notifications: {
    newMessages: true,
    newOrders: true,
    orderAccepted: true,
    orderCompleted: true,
    newFollowers: true,
    regrows: true,
    communityActivity: true,
    eventReminders: true,
    savedEventUpdates: true,
    reviewsReceived: true,
    productUpdates: true,
    groloAnnouncements: true,
    eventUpdates: true,
    tradeRequests: true,
    orderUpdates: true,
  },
  showLocationPublicly: false,
  username: "",
  email: "",
  interests: [],
};

function settingsFromProfile(profile, user) {
  const metadata = user?.user_metadata ?? {};
  return {
    ...initialSettings,
    displayName: profile?.display_name ?? metadata.display_name ?? metadata.name ?? "",
    username: profile?.username ?? metadata.username ?? "",
    bio: profile?.bio ?? "",
    location: profile?.location ?? "",
    locationRadius: profile?.location_radius ?? 25,
    latitude: profile?.latitude ?? null,
    longitude: profile?.longitude ?? null,
    neighborhood: profile?.neighborhood ?? "",
    city: profile?.city ?? "",
    province: profile?.province ?? "",
    country: profile?.country ?? "",
    postalCode: profile?.postal_code ?? "",
    locationPermission: profile?.location_permission ?? "unknown",
    avatar: profile?.avatar_url ?? metadata.avatar_url ?? "",
    banner: profile?.banner_url ?? "",
    notifications: {
      ...initialSettings.notifications,
      ...(profile?.buyer_notifications ?? {}),
    },
    showLocationPublicly: profile?.show_location_publicly ?? false,
    interests: Array.isArray(profile?.interests) ? profile.interests : [],
    onboardingCompleted: Boolean(profile?.onboarding_completed),
    email: user?.email ?? "",
  };
}

const OPTIONAL_LOCATION_COLUMNS = new Set(["location", "location_radius", "latitude", "longitude", "neighborhood", "city", "province", "country", "postal_code"]);

function missingProfileColumn(error) {
  const message = error?.message ?? "";
  const match = message.match(/Could not find the '([^']+)' column of 'profiles'/i);
  return match?.[1] ?? null;
}

async function upsertProfileWithLocationFallback(userId, payload) {
  const remaining = { ...payload };
  for (;;) {
    const { data, error } = await supabase
      .from("profiles")
      .upsert(remaining, { onConflict: "id" })
      .select("*")
      .single();
    if (!error) return data;

    const missingColumn = missingProfileColumn(error);
    if (!missingColumn || !OPTIONAL_LOCATION_COLUMNS.has(missingColumn) || !(missingColumn in remaining)) throw error;
    delete remaining[missingColumn];
  }
}

function profileUpdates(updates) {
  const next = {};
  const fields = {
    displayName: "display_name",
    username: "username",
    bio: "bio",
    location: "location",
    locationRadius: "location_radius",
    latitude: "latitude",
    longitude: "longitude",
    neighborhood: "neighborhood",
    city: "city",
    province: "province",
    country: "country",
    postalCode: "postal_code",
    locationPermission: "location_permission",
    avatar: "avatar_url",
    banner: "banner_url",
    showLocationPublicly: "show_location_publicly",
    interests: "interests",
    onboardingCompleted: "onboarding_completed",
  };
  Object.entries(fields).forEach(([key, column]) => {
    if (updates[key] !== undefined) next[column] = updates[key];
  });
  if (updates.notifications !== undefined) next.buyer_notifications = updates.notifications;
  return next;
}

export function BuyerSettingsProvider({ children }) {
  const { user, profile: authenticatedProfile, refreshProfile } = useAuth();
  const [settings, setSettings] = useState(() => settingsFromProfile(authenticatedProfile, user));
  const [profileLoading, setProfileLoading] = useState(Boolean(user?.id && isSupabaseConfigured));
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileFound, setProfileFound] = useState(false);
  const [profileError, setProfileError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setProfileError(null);
      setProfileFound(false);
      if (!user?.id) {
        setSettings(settingsFromProfile(null, null));
        setProfileLoading(false);
        setProfileLoaded(true);
        return;
      }
      if (!isSupabaseConfigured) {
        setSettings(settingsFromProfile(null, user));
        setProfileLoading(false);
        setProfileLoaded(true);
        return;
      }
      if (authenticatedProfile?.id === user.id) {
        setSettings(settingsFromProfile(authenticatedProfile, user));
        setProfileFound(true);
        setProfileLoaded(true);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      setProfileLoaded(false);
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) {
        console.error("Unable to load buyer profile", error);
        if (!cancelled) {
          setProfileError(error);
          setProfileLoading(false);
          setProfileLoaded(false);
        }
        return;
      }
      const migratedImages = {};
      for (const [field, column, kind] of [["avatar_url", "avatar_url", "avatar"], ["banner_url", "banner_url", "banner"]]) {
        if (isTemporaryImageSource(data?.[field])) {
          try {
            const uploaded = await uploadImageSource(data[field], { userId: user.id, kind, folder: "profiles" });
            if (uploaded) migratedImages[column] = uploaded.url;
          } catch (migrationError) {
            console.error(`Unable to migrate ${kind} image`, migrationError);
          }
        }
      }
      if (Object.keys(migratedImages).length) {
        const { error: migrationError } = await supabase.from("profiles").update(migratedImages).eq("id", user.id);
        if (migrationError) console.error("Unable to persist migrated profile images", migrationError);
        else Object.assign(data, migratedImages);
      }
      if (!cancelled) {
        setSettings(settingsFromProfile(data, user));
        setProfileFound(Boolean(data));
        setProfileLoaded(true);
        setProfileLoading(false);
      }
    }

    loadProfile();
    return () => { cancelled = true; };
  }, [user?.id, user, authenticatedProfile]);

  const updateSettings = async (updates) => {
    if (!user?.id || !isSupabaseConfigured) {
      throw new Error("Supabase is not configured or the user is not signed in.");
    }

    const current = settings;
    const oldAvatarUrl = current.avatar ?? null;
    const next = {
      ...current,
      ...updates,
      notifications: {
        ...current.notifications,
        ...(updates.notifications ?? {}),
      },
    };
    const data = await upsertProfileWithLocationFallback(user.id, { id: user.id, ...profileUpdates(next) });
    setSettings(settingsFromProfile(data, user));
    setProfileFound(true);
    setProfileLoaded(true);
    setProfileLoading(false);
    setProfileError(null);
    const refreshedProfile = await refreshProfile(user.id);
    return true;
  };

  const refreshLocation = async () => {
    const isNative = Capacitor.isNativePlatform();
    console.log("[Location] refreshLocation() called", {
      isNative,
      platform: Capacitor.getPlatform(),
    });
    const savePermissionState = async (locationPermission) => {
      try {
        await updateSettings({ locationPermission });
      } catch (error) {
        return error.message;
      }
      return null;
    };
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      const saveError = await savePermissionState("unsupported");
      return { ok: false, error: saveError || "Location services are not available on this device." };
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          const next = { latitude: coords.latitude, longitude: coords.longitude, locationPermission: "enabled" };
          try {
            await updateSettings(next);
            resolve({ ok: true, ...next });
          } catch (error) {
            resolve({ ok: false, error: error.message });
          }
        },
        async (error) => {
          const locationPermission = error.code === 1 ? "denied" : "unavailable";
          const saveError = await savePermissionState(locationPermission);
          resolve({ ok: false, error: saveError || error.message || "We couldn't determine your location." });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
      );
    });
  };

  return <BuyerSettingsContext.Provider value={{ settings, updateSettings, refreshLocation, profileLoading, profileLoaded, profileFound, profileError }}>{children}</BuyerSettingsContext.Provider>;
}

export function useBuyerSettings() {
  const context = useContext(BuyerSettingsContext);
  if (!context) throw new Error("useBuyerSettings must be used within a BuyerSettingsProvider");
  return context;
}
