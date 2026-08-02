import { createContext, useCallback, useContext, useState } from "react";

const SavedContext = createContext(null);
const STORAGE_KEY = "grolo-saved-items";

function readSavedItems() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

function writeSavedItems(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function SavedProvider({ children }) {
  const [savedItems, setSavedItems] = useState(() => readSavedItems());
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
      writeSavedItems(next);
      showToast(saved ? "Removed from Saved Items" : "Saved to Saved Items");
    },
    [savedItems, showToast],
  );

  return (
    <SavedContext.Provider value={{ savedItems, isSaved, toggleSaved }}>
      {children}
      {toast && (
        <div className="fixed bottom-20 left-1/2 z-[100] -translate-x-1/2 rounded-full bg-[#1E1E1E] px-4 py-2 text-[13px] font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </SavedContext.Provider>
  );
}

export function useSavedItems() {
  const context = useContext(SavedContext);
  if (!context) throw new Error("useSavedItems must be used within a SavedProvider");
  return context;
}
