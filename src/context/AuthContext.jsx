import { createContext, useContext, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

const AuthContext = createContext(null);
const LEGACY_BUYER_KEY = "grolo-buyer-settings";
const LEGACY_SELLER_KEY = "grolo-seller-profiles";

function readLegacyJson(key) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasLegacyBuyerProfile(profile) {
  return Boolean(
    hasText(profile?.displayName)
      || hasText(profile?.username)
      || hasText(profile?.bio)
      || hasText(profile?.location)
      || profile?.avatar
      || profile?.banner
      || profile?.interests?.length,
  );
}

function hasLegacySellerProfile(profile) {
  return Boolean(
    hasText(profile?.name)
      || hasText(profile?.description)
      || hasText(profile?.location)
      || profile?.avatar
      || profile?.banner,
  );
}

function readLegacyProfile(userId) {
  const buyer = readLegacyJson(`${LEGACY_BUYER_KEY}-${userId}`);
  const sellerProfiles = readLegacyJson(`${LEGACY_SELLER_KEY}-${userId}`);
  const seller = sellerProfiles?.[userId] ?? sellerProfiles?.["current-user"] ?? null;
  const hasBuyer = hasLegacyBuyerProfile(buyer);
  const hasSeller = hasLegacySellerProfile(seller);
  if (!hasBuyer && !hasSeller) return null;

  const profile = {
    id: userId,
    onboarding_completed: true,
  };
  if (hasBuyer) {
    Object.assign(profile, {
      display_name: buyer.displayName,
      username: buyer.username,
      bio: buyer.bio,
      location: buyer.location,
      location_radius: buyer.locationRadius,
      latitude: buyer.latitude,
      longitude: buyer.longitude,
      city: buyer.city,
      province: buyer.province,
      location_permission: buyer.locationPermission,
      avatar_url: buyer.avatar,
      banner_url: buyer.banner,
      buyer_notifications: buyer.notifications,
      show_location_publicly: buyer.showLocationPublicly,
      interests: buyer.interests,
    });
  }
  if (hasSeller) {
    Object.assign(profile, {
      shop_name: seller.name,
      store_description: seller.description,
      store_location: seller.location,
      vacation_mode: seller.vacationMode,
      vacation_message: seller.vacationMessage,
      return_date: seller.returnDate,
      seller_notifications: seller.notifications,
      social_links: seller.socialLinks,
      seller_status: "active",
      store_onboarding_status: true,
    });
    if (!profile.avatar_url && seller.avatar) profile.avatar_url = seller.avatar;
    if (!profile.banner_url && seller.banner) profile.banner_url = seller.banner;
  }
  return { profile, buyerKey: `${LEGACY_BUYER_KEY}-${userId}`, sellerKey: `${LEGACY_SELLER_KEY}-${userId}` };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [profileStatus, setProfileStatus] = useState(isSupabaseConfigured ? "unknown" : "loaded");
  const [profileError, setProfileError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [onboardingComplete, setOnboardingComplete] = useState(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    let requestId = 0;

    async function resolveSession(nextSession) {
      const currentRequestId = ++requestId;
      setSession(nextSession);
      setLoading(true);
      setProfileStatus(nextSession ? "loading" : "loaded");
      setProfileError(null);
      setProfile(null);
      setOnboardingComplete(nextSession ? null : false);

      if (!nextSession?.user?.id) {
        if (!cancelled && currentRequestId === requestId) setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", nextSession.user.id)
        .maybeSingle();
      if (cancelled || currentRequestId !== requestId) return;
      if (error) {
        console.error("Unable to load authenticated profile", error);
        setProfileError(error);
        setProfileStatus("error");
        setOnboardingComplete(null);
        setLoading(false);
        return;
      }

      let resolvedProfile = data;
      const legacy = !resolvedProfile ? readLegacyProfile(nextSession.user.id) : null;
      if (legacy) {
        const migration = await supabase
          .from("profiles")
          .upsert(legacy.profile, { onConflict: "id" })
          .select("*")
          .single();
        if (cancelled || currentRequestId !== requestId) return;
        if (migration.error) {
          console.error("Unable to migrate legacy profile", migration.error);
          setProfileError(migration.error);
          setProfileStatus("error");
          setOnboardingComplete(null);
          setLoading(false);
          return;
        }
        resolvedProfile = migration.data;
        try {
          localStorage.removeItem(legacy.buyerKey);
          localStorage.removeItem(legacy.sellerKey);
        } catch {
          // The Supabase profile is authoritative even if legacy cleanup fails.
        }
      }

      const hasLegacyCompletedProfile = Boolean(resolvedProfile?.display_name?.trim() && resolvedProfile?.username?.trim() && resolvedProfile?.bio?.trim());
      const hasExistingProfile = Boolean(resolvedProfile?.id);
      setProfile(resolvedProfile ?? null);
      setOnboardingComplete(Boolean(resolvedProfile?.onboarding_completed || hasLegacyCompletedProfile || hasExistingProfile));
      setProfileStatus("loaded");
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error("Unable to restore auth session", error);
      return resolveSession(data?.session ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      resolveSession(nextSession);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signInWithEmail(email) {
    if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw error;
  }

  async function signInWithProvider(provider) {
    if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
    const { error } = await supabase.auth.signInWithOAuth({ provider });
    if (error) throw error;
  }

  async function updateEmail(email) {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.auth.updateUser({ email });
    if (error) throw error;
  }

  async function signOut() {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
  }

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    profile,
    profileStatus,
    profileLoading: profileStatus === "loading",
    profileLoaded: profileStatus === "loaded",
    profileError,
    onboardingComplete,
    isAuthenticated: Boolean(session),
    signInWithEmail,
    signInWithProvider,
    updateEmail,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
