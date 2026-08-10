import { createContext, useCallback, useContext, useState } from "react";
import { useAuth } from "./AuthContext";

const SavedForLaterContext = createContext(null);
const STORAGE_KEY = "grolo-saved-for-later";

function readSavedForLater(storageKey) {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) ?? [];
  } catch {
    return [];
  }
}

function writeSavedForLater(storageKey, items) {
  localStorage.setItem(storageKey, JSON.stringify(items));
}

export function SavedForLaterProvider({ children }) {
  const { user } = useAuth();
  const storageKey = `${STORAGE_KEY}-${user?.id ?? "anonymous"}`;
  const [items, setItems] = useState(() => readSavedForLater(storageKey));

  const addItems = useCallback((itemsToAdd) => {
    setItems((current) => {
      const next = [
        ...current,
        ...itemsToAdd.filter((item) => !current.some((savedItem) => savedItem.id === item.id)),
      ];
      writeSavedForLater(storageKey, next);
      return next;
    });
  }, []);

  const removeItems = useCallback((itemsToRemove) => {
    const itemIds = new Set(itemsToRemove.map((item) => item.id));
    setItems((current) => {
      const next = current.filter((item) => !itemIds.has(item.id));
      writeSavedForLater(storageKey, next);
      return next;
    });
  }, []);

  return (
    <SavedForLaterContext.Provider value={{ items, addItems, removeItems }}>
      {children}
    </SavedForLaterContext.Provider>
  );
}

export function useSavedForLater() {
  const context = useContext(SavedForLaterContext);
  if (!context) throw new Error("useSavedForLater must be used within a SavedForLaterProvider");
  return context;
}
