import { createContext, useContext, useState } from "react";

const ProfileModeContext = createContext(null);
const STORAGE_KEY = "grolo-profile-mode";
const ACTIVE_STORAGE_KEY = "grolo-active-profile";
const STORE_ACTIVE_KEY = "grolo-store-active";
const STORE_OPENED_AT_KEY = "grolo-store-opened-at";

function readStoreActive() {
  try {
    return localStorage.getItem(STORE_ACTIVE_KEY) === "true";
  } catch {
    return false;
  }
}

function readActiveProfile(storeActive) {
  if (!storeActive) return "buyer";
  try {
    return localStorage.getItem(ACTIVE_STORAGE_KEY) || "buyer";
  } catch {
    return "buyer";
  }
}

function readStoreOpenedAt(storeActive) {
  if (!storeActive) return 0;
  try {
    const saved = Number(localStorage.getItem(STORE_OPENED_AT_KEY));
    if (saved > 0) return saved;
    const openedAt = Date.now();
    localStorage.setItem(STORE_OPENED_AT_KEY, String(openedAt));
    return openedAt;
  } catch {
    return Date.now();
  }
}

export function ProfileModeProvider({ children }) {
  const [storeActive, setStoreActive] = useState(readStoreActive);
  const [storeOpenedAt, setStoreOpenedAt] = useState(() => readStoreOpenedAt(readStoreActive()));
  const [profileMode, setProfileModeState] = useState(() => readActiveProfile(readStoreActive()));
  const accountType = storeActive ? "both" : "buyer";

  const activateStore = () => {
    const openedAt = Date.now();
    setStoreActive(true);
    setStoreOpenedAt(openedAt);
    setProfileModeState("seller");
    localStorage.setItem(STORE_ACTIVE_KEY, "true");
    localStorage.setItem(STORE_OPENED_AT_KEY, String(openedAt));
    localStorage.setItem(STORAGE_KEY, "both");
    localStorage.setItem(ACTIVE_STORAGE_KEY, "seller");
  };

  const setProfileMode = (mode) => {
    if (mode === "seller" && !storeActive) return;
    setProfileModeState(mode);
    localStorage.setItem(ACTIVE_STORAGE_KEY, mode);
  };

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
