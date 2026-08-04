import { createContext, useCallback, useContext, useState } from "react";

const SavedForLaterContext = createContext(null);
const STORAGE_KEY = "grolo-saved-for-later";

function readSavedForLater() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

function writeSavedForLater(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function SavedForLaterProvider({ children }) {
  const [items, setItems] = useState(() => readSavedForLater());

  const addItems = useCallback((itemsToAdd) => {
    setItems((current) => {
      const next = [
        ...current,
        ...itemsToAdd.filter((item) => !current.some((savedItem) => savedItem.id === item.id)),
      ];
      writeSavedForLater(next);
      return next;
    });
  }, []);

  const removeItems = useCallback((itemsToRemove) => {
    const itemIds = new Set(itemsToRemove.map((item) => item.id));
    setItems((current) => {
      const next = current.filter((item) => !itemIds.has(item.id));
      writeSavedForLater(next);
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
