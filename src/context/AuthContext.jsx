import { createContext, useContext, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

const AuthContext = createContext(null);
const LEGACY_BUYER_KEY = "grolo-buyer-settings";
const LEGACY_SELLER_KEY = "grolo-seller-profiles";
const PENDING_EMAIL_KEY = "grolo-pending-email";

function readLegacyJson(key) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function readPendingVerificationEmail() {
  try {
    return localStorage.getItem(PENDING_EMAIL_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isEmailVerified(user) {
  return Boolean(user?.email_confirmed_at || user?.confirmed_at);
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

function profileHasCompletedOnboarding(profile) {
  return Boolean(
    profile?.onboarding_completed
      || (hasText(profile?.display_name) && hasText(profile?.username) && hasText(profile?.bio)),
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
      location: profile.location ?? seller.location,
      neighborhood: profile.neighborhood ?? seller.neighborhood,
      city: profile.city ?? seller.city,
      province: profile.province ?? seller.province,
      country: profile.country ?? seller.country,
      postal_code: profile.postal_code ?? seller.postalCode,
      latitude: profile.latitude ?? seller.latitude,
      longitude: profile.longitude ?? seller.longitude,
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
  const [authInitialized, setAuthInitialized] = useState(!isSupabaseConfigured);
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
        if (!cancelled && currentRequestId === requestId) {
          setAuthInitialized(true);
          setLoading(false);
        }
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
        setAuthInitialized(true);
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
          setAuthInitialized(true);
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

      setProfile(resolvedProfile ?? null);
      setOnboardingComplete(profileHasCompletedOnboarding(resolvedProfile));
      setProfileStatus("loaded");
      setAuthInitialized(true);
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

  useEffect(() => {
    if (!isSupabaseConfigured || !session?.user?.id) return undefined;
    let cancelled = false;
    const userId = session.user.id;
    const refreshSuspensionStatus = async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (cancelled || error || !data) return;
      setProfile((current) => ({ ...current, ...data }));
    };
    const channel = supabase
      .channel(`profile-status:${userId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` }, (payload) => {
        setProfile((current) => ({ ...current, ...payload.new }));
      })
      .subscribe();
    const interval = window.setInterval(refreshSuspensionStatus, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      channel.unsubscribe();
    };
  }, [session?.user?.id]);

  async function refreshProfile(profileUserId = session?.user?.id) {
    if (!isSupabaseConfigured || !profileUserId) return null;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profileUserId)
      .maybeSingle();
    if (error) {
      console.error("Unable to refresh authenticated profile", error);
      setProfileError(error);
      setProfileStatus("error");
      setOnboardingComplete(null);
      throw error;
    }
    const nextOnboardingComplete = profileHasCompletedOnboarding(data);
    setProfile(data ?? null);
    setOnboardingComplete(nextOnboardingComplete);
    setProfileStatus("loaded");
    setProfileError(null);
    return data;
  }

  async function acceptTerms() {
    if (!isSupabaseConfigured || !session?.user?.id) throw new Error("You must be signed in to accept the terms.");
    const acceptedTermsAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("profiles")
      .upsert({ id: session.user.id, accepted_terms: true, accepted_terms_at: acceptedTermsAt }, { onConflict: "id" })
      .select("*")
      .single();
    if (error) throw error;
    setProfile((current) => ({ ...(current ?? {}), ...data }));
    setProfileStatus("loaded");
    return data;
  }

  async function signInWithPassword(email, password) {
    if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function resendVerificationEmail(emailOverride) {
    const email = emailOverride?.trim() || session?.user?.email;
    if (!isSupabaseConfigured || !email) throw new Error("Unable to determine the account email.");
    const configuredOrigin = import.meta.env.VITE_APP_URL?.trim().replace(/\/$/, "");
    const redirectOrigin = configuredOrigin && !/^https?:\/\/localhost(?::\d+)?$/i.test(configuredOrigin) ? configuredOrigin : window.location.origin;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${redirectOrigin}/confirm-email` },
    });
    if (error) throw error;
  }

  async function refreshSession() {
    if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return data;
  }

  async function signUpWithPassword(email, password, name) {
    if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
    const configuredOrigin = import.meta.env.VITE_APP_URL?.trim().replace(/\/$/, "");
    const redirectOrigin = configuredOrigin && !/^https?:\/\/localhost(?::\d+)?$/i.test(configuredOrigin) ? configuredOrigin : "https://grolomarketplace.ca";
    const emailRedirectTo = `${redirectOrigin}/confirm-email`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: { display_name: name.trim(), full_name: name.trim() },
      },
    });
    if (error) throw error;
    return data;
  }

  async function sendPasswordReset(email) {
    if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  }

  async function updatePassword(password) {
    if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    return data;
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
    try {
      localStorage.removeItem(PENDING_EMAIL_KEY);
    } catch {
    }
    await supabase.auth.signOut();
  }

  const value = {
    session,
    user: session?.user ?? null,
    authInitialized,
    loading,
    profile,
    profileStatus,
    profileLoading: profileStatus === "loading",
    profileLoaded: profileStatus === "loaded",
    profileError,
    refreshProfile,
    isSuspended: Boolean(profile?.suspended_at),
    onboardingComplete,
    acceptedTerms: Boolean(profile?.accepted_terms),
    emailVerified: isEmailVerified(session?.user),
    isAuthenticated: Boolean(session),
    signInWithPassword,
    acceptTerms,
    resendVerificationEmail,
    refreshSession,
    signUpWithPassword,
    sendPasswordReset,
    updatePassword,
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
