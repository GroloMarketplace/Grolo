import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

const SavedContext = createContext(null);
const STORAGE_KEY = "grolo-saved-items";

function readSavedItems(storageKey) {
  try {
    const savedItems = JSON.parse(localStorage.getItem(storageKey)) ?? [];
    return savedItems;
  } catch {
    return [];
  }
}

function writeSavedItems(storageKey, items) {
  localStorage.setItem(storageKey, JSON.stringify(items));
}

export function SavedProvider({ children }) {
  const { user } = useAuth();
  const storageKey = `${STORAGE_KEY}-${user?.id ?? "anonymous"}`;
  const [savedItems, setSavedItems] = useState(() => readSavedItems(storageKey));

  useEffect(() => {
    setSavedItems(readSavedItems(storageKey));
  }, [storageKey]);

  const [toast, setToast] = useState("");

  const showToast = useCallback((message) => {
    setToast(message);
    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => setToast(""), 2200);
  }, []);

  const isSaved = useCallback(
    (id) => savedItems.some((item) => item.id === id),
    [savedItems],
  );

  const toggleSaved = useCallback(
    (items) => {
      const saved = savedItems.some((item) => item.id === items[0].id);
      const next = saved
        ? savedItems.filter((item) => !items.some((nextItem) => nextItem.id === item.id))
        : [...savedItems, ...items.filter((item) => !savedItems.some((current) => current.id === item.id))];
      setSavedItems(next);
      writeSavedItems(storageKey, next);
      showToast(saved ? "Removed from Saved Items" : "Saved to Saved Items");
    },
    [savedItems, showToast, storageKey],
  );

  return (
    <SavedContext.Provider value={{ savedItems, isSaved, toggleSaved, toast }}>
      {children}
    </SavedContext.Provider>
  );
}

export function useSavedItems() {
  const context = useContext(SavedContext);
  if (!context) throw new Error("useSavedItems must be used within a SavedProvider");
  return context;
}
