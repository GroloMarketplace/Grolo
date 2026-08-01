import { createContext, useContext, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      },
    );

    return () => listener.subscription.unsubscribe();
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

  async function signOut() {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
  }

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    isAuthenticated: Boolean(session),
    signInWithEmail,
    signInWithProvider,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
