import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

const ProfileModeContext = createContext(null);

function profileIsSeller(profile) {
  return Boolean(profile?.store_onboarding_status)
    || ["active", "seller", "both"].includes(profile?.seller_status);
}

export function ProfileModeProvider({ children }) {
  const { user } = useAuth();
  const [storeActive, setStoreActive] = useState(false);
  const [storeOpenedAt, setStoreOpenedAt] = useState(0);
  const [profileMode, setProfileModeState] = useState("buyer");
  const profileModeRequestRef = useRef(0);

  useEffect(() => {
    const requestId = ++profileModeRequestRef.current;
    let cancelled = false;

    async function loadProfileMode() {
      if (!user?.id) {
        setStoreActive(false);
        setStoreOpenedAt(0);
        setProfileModeState("buyer");
        return;
      }
      if (!isSupabaseConfigured) {
        setStoreActive(false);
        setStoreOpenedAt(0);
        setProfileModeState("buyer");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("seller_status, store_onboarding_status, store_opened_at")
        .eq("id", user.id)
        .maybeSingle();
      if (error) {
        console.error("Unable to load profile mode", error);
        return;
      }
      if (cancelled || requestId !== profileModeRequestRef.current) return;
      const active = profileIsSeller(data);
      setStoreActive(active);
      setStoreOpenedAt(data?.store_opened_at ? new Date(data.store_opened_at).getTime() : 0);
      setProfileModeState(active ? "seller" : "buyer");
    }

    loadProfileMode();
    return () => { cancelled = true; };
  }, [user?.id]);

  const activateStore = async () => {
    if (!user?.id || !isSupabaseConfigured) {
      throw new Error("Supabase is not configured or the user is not signed in.");
    }
    const requestId = ++profileModeRequestRef.current;
    const openedAt = new Date().toISOString();
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        seller_status: "active",
        store_onboarding_status: true,
        store_opened_at: openedAt,
      }, { onConflict: "id" });
    if (error) throw error;
    if (requestId !== profileModeRequestRef.current) return true;
    setStoreActive(true);
    setStoreOpenedAt(new Date(openedAt).getTime());
    setProfileModeState("seller");
    return true;
  };

  const setProfileMode = (mode) => {
    if (mode === "seller" && !storeActive) return;
    setProfileModeState(mode);
  };

  const accountType = storeActive ? "both" : "buyer";
  const canBuyer = true;
  const canSeller = storeActive;

  return (
    <ProfileModeContext.Provider value={{ accountType, profileMode, setProfileMode, canBuyer, canSeller, storeActive, storeOpenedAt, activateStore }}>
      {children}
    </ProfileModeContext.Provider>
  );
}

export function useProfileMode() {
  const context = useContext(ProfileModeContext);
  if (!context) throw new Error("useProfileMode must be used within a ProfileModeProvider");
  return context;
}
