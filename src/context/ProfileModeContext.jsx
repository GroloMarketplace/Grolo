import { createContext, useContext, useState } from "react";

const ProfileModeContext = createContext(null);
const STORAGE_KEY = "grolo-profile-mode";
const ACTIVE_STORAGE_KEY = "grolo-active-profile";

function readMode() {
  try {
    return localStorage.getItem(STORAGE_KEY) || "seller";
  } catch {
    return "seller";
  }
}

function readActiveProfile(accountType) {
  if (accountType === "buyer") return "buyer";
  if (accountType === "seller") return "seller";
  try {
    return localStorage.getItem(ACTIVE_STORAGE_KEY) || "seller";
  } catch {
    return "seller";
  }
}

export const PROFILE_MODES = [
  { value: "buyer", label: "Buyer Only" },
  { value: "seller", label: "Seller Only" },
  { value: "both", label: "Both" },
];

export function ProfileModeProvider({ children }) {
  const [accountType, setAccountTypeState] = useState(readMode);
  const [profileMode, setProfileModeState] = useState(() => readActiveProfile(accountType));

  const setAccountType = (type) => {
    setAccountTypeState(type);
    setProfileModeState(type === "buyer" ? "buyer" : "seller");
    localStorage.setItem(STORAGE_KEY, type);
    localStorage.setItem(ACTIVE_STORAGE_KEY, type === "buyer" ? "buyer" : "seller");
  };

  const setProfileMode = (mode) => {
    setProfileModeState(mode);
    localStorage.setItem(ACTIVE_STORAGE_KEY, mode);
  };

  const canBuyer = accountType === "buyer" || accountType === "both";
  const canSeller = accountType === "seller" || accountType === "both";

  return (
    <ProfileModeContext.Provider value={{ accountType, setAccountType, profileMode, setProfileMode, canBuyer, canSeller }}>
      {children}
    </ProfileModeContext.Provider>
  );
}

export function useProfileMode() {
  const context = useContext(ProfileModeContext);
  if (!context) throw new Error("useProfileMode must be used within a ProfileModeProvider");
  return context;
}
