import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { hasRepairableStoreProfile } from "../utils/profileActivation";

const ProfileModeContext = createContext(null);
const PROFILE_MODE_STORAGE_PREFIX = "grolo-profile-mode";

function profileIsSeller(profile) {
  return Boolean(profile?.store_onboarding_status)
    || ["active", "seller", "both"].includes(profile?.seller_status);
}

function modeStorageKey(userId) {
  return userId ? `${PROFILE_MODE_STORAGE_PREFIX}:${userId}` : null;
}

function readStoredMode(userId) {
  const key = modeStorageKey(userId);
  if (!key || typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(key);
    return stored === "buyer" || stored === "seller" ? stored : null;
  } catch {
    return null;
  }
}

function writeStoredMode(userId, mode) {
  const key = modeStorageKey(userId);
  if (!key || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, mode);
  } catch {
    return;
  }
}

export function ProfileModeProvider({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const [storeActive, setStoreActive] = useState(false);
  const [storeOpenedAt, setStoreOpenedAt] = useState(0);
  const [profileMode, setProfileModeState] = useState("buyer");
  const profileModeRequestRef = useRef(0);

  const repairStoreActivation = useCallback(async () => {
    if (!user?.id || !isSupabaseConfigured) {
      throw new Error("Supabase is not configured or the user is not signed in.");
    }
    const { data, error } = await supabase
      .from("profiles")
      .update({ seller_status: "active", store_onboarding_status: true })
      .eq("id", user.id)
      .select("seller_status, store_onboarding_status, store_opened_at")
      .single();
    if (error) throw error;
    setStoreActive(true);
    setStoreOpenedAt(data?.store_opened_at ? new Date(data.store_opened_at).getTime() : 0);
    setProfileModeState("seller");
    writeStoredMode(user.id, "seller");
    return true;
  }, [user?.id]);

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
        .select("shop_name, seller_status, store_onboarding_status, store_opened_at")
        .eq("id", user.id)
        .maybeSingle();
      if (error) {
        console.error("Unable to load profile mode", error);
        return;
      }
      if (cancelled || requestId !== profileModeRequestRef.current) return;
      if (!profileIsSeller(data) && hasRepairableStoreProfile(data)) {
        try {
          await repairStoreActivation();
          return;
        } catch (repairError) {
          console.error("Unable to repair seller activation", repairError);
        }
      }
      const active = profileIsSeller(data);
      const storedMode = readStoredMode(user.id);
      setStoreActive(active);
      setStoreOpenedAt(data?.store_opened_at ? new Date(data.store_opened_at).getTime() : 0);
      setProfileModeState(active ? storedMode ?? "seller" : "buyer");
    }

    loadProfileMode();
    return () => { cancelled = true; };
  }, [user?.id, repairStoreActivation]);

  useEffect(() => {
    const isBuyerRoute = location.pathname === "/profile" || location.pathname === "/buyer-profile";
    const isSellerRoute = location.pathname === "/shop" || location.pathname === "/seller-profile";
    if (isBuyerRoute) {
      setProfileModeState("buyer");
      writeStoredMode(user?.id, "buyer");
    } else if (isSellerRoute && storeActive) {
      setProfileModeState("seller");
      writeStoredMode(user?.id, "seller");
    }
  }, [location.pathname, storeActive, user?.id]);

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
    writeStoredMode(user.id, "seller");
    return { openedAt };
  };

  const setProfileMode = (mode) => {
    if (!["buyer", "seller"].includes(mode) || (mode === "seller" && !storeActive)) return false;
    setProfileModeState(mode);
    writeStoredMode(user?.id, mode);
    return true;
  };

  const accountType = storeActive ? "both" : "buyer";
  const canBuyer = true;
  const canSeller = storeActive;

  return (
    <ProfileModeContext.Provider value={{ accountType, profileMode, setProfileMode, canBuyer, canSeller, storeActive, storeOpenedAt, activateStore, repairStoreActivation }}>
      {children}
    </ProfileModeContext.Provider>
  );
}

export function useProfileMode() {
  const context = useContext(ProfileModeContext);
  if (!context) throw new Error("useProfileMode must be used within a ProfileModeProvider");
  return context;
}
