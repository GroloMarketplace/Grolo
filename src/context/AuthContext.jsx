import { createContext, useContext, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    let profileRequest = 0;

    async function loadProfileStatus(currentSession) {
      const requestId = ++profileRequest;
      if (!currentSession?.user?.id) {
        if (!cancelled) setOnboardingComplete(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentSession.user.id)
        .maybeSingle();
      if (cancelled || requestId !== profileRequest) return;
      if (error) {
        console.error("Unable to load authenticated profile", error);
        setOnboardingComplete(false);
        return;
      }

      const hasLegacyCompletedProfile = Boolean(data?.display_name?.trim() && data?.username?.trim() && data?.bio?.trim());
      const hasExistingProfile = Boolean(data?.id);
      setOnboardingComplete(Boolean(data?.onboarding_completed || hasLegacyCompletedProfile || hasExistingProfile));
    }

    async function initialize() {
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;
      if (error) console.error("Unable to restore auth session", error);
      setSession(data.session);
      await loadProfileStatus(data.session);
      if (!cancelled) setLoading(false);
    }

    initialize();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      loadProfileStatus(newSession).finally(() => {
        if (!cancelled) setLoading(false);
      });
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
