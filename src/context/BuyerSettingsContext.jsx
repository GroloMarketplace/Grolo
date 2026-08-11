import { createContext, useContext, useEffect, useState } from "react";
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
  city: "",
  province: "",
  locationPermission: "unknown",
  avatar: "",
  banner: "",
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
    city: profile?.city ?? "",
    province: profile?.province ?? "",
    locationPermission: profile?.location_permission ?? "unknown",
    avatar: profile?.avatar_url ?? metadata.avatar_url ?? "",
    banner: profile?.banner_url ?? "",
    notifications: {
      ...initialSettings.notifications,
      ...(profile?.buyer_notifications ?? {}),
    },
    showLocationPublicly: profile?.show_location_publicly ?? false,
    interests: Array.isArray(profile?.interests) ? profile.interests : [],
    email: user?.email ?? "",
  };
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
    city: "city",
    province: "province",
    locationPermission: "location_permission",
    avatar: "avatar_url",
    banner: "banner_url",
    showLocationPublicly: "show_location_publicly",
    interests: "interests",
  };
  Object.entries(fields).forEach(([key, column]) => {
    if (updates[key] !== undefined) next[column] = updates[key];
  });
  if (updates.notifications !== undefined) next.buyer_notifications = updates.notifications;
  return next;
}

export function BuyerSettingsProvider({ children }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState(() => settingsFromProfile(null, user));

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!user?.id) {
        setSettings(settingsFromProfile(null, null));
        return;
      }
      if (!isSupabaseConfigured) {
        setSettings(settingsFromProfile(null, user));
        return;
      }

      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) {
        console.error("Unable to load buyer profile", error);
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
      if (!cancelled) setSettings(settingsFromProfile(data, user));
    }

    loadProfile();
    return () => { cancelled = true; };
  }, [user?.id, user]);

  const updateSettings = async (updates) => {
    if (!user?.id || !isSupabaseConfigured) {
      throw new Error("Supabase is not configured or the user is not signed in.");
    }

    const current = settings;
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
      .upsert({ id: user.id, ...profileUpdates(next) }, { onConflict: "id" })
      .select("*")
      .single();
    if (error) throw error;
    setSettings(settingsFromProfile(data, user));
    return true;
  };

  const refreshLocation = () => new Promise((resolve) => {
    if (!navigator.geolocation) {
      updateSettings({ locationPermission: "unsupported" })
        .then(() => resolve({ ok: false, error: "Location services are not available on this device." }))
        .catch((error) => resolve({ ok: false, error: error.message }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const next = { latitude: coords.latitude, longitude: coords.longitude, locationPermission: "enabled" };
        updateSettings(next)
          .then(() => resolve({ ok: true, ...next }))
          .catch((error) => resolve({ ok: false, error: error.message }));
      },
      (error) => {
        const locationPermission = error.code === 1 ? "denied" : "unavailable";
        updateSettings({ locationPermission })
          .then(() => resolve({ ok: false, error: error.message }))
          .catch((updateError) => resolve({ ok: false, error: updateError.message }));
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
