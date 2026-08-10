import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";

const RegrowContext = createContext(null);
const STORAGE_KEY = "grolo-regrown-items";

function readRegrownIds(storageKey) {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) ?? [];
  } catch {
    return [];
  }
}

function writeRegrownIds(storageKey, ids) {
  localStorage.setItem(storageKey, JSON.stringify(ids));
}

export function RegrowProvider({ children }) {
  const { user } = useAuth();
  const storageKey = `${STORAGE_KEY}-${user?.id ?? "anonymous"}`;
  const [regrownIds, setRegrownIds] = useState(() => readRegrownIds(storageKey));

  useEffect(() => {
    setRegrownIds(readRegrownIds(storageKey));
  }, [storageKey]);

  const [toast, setToast] = useState(null);
  const hideTimer = useRef(null);
  const clearTimer = useRef(null);

  const isRegrown = useCallback(
    (id) => regrownIds.includes(id),
    [regrownIds],
  );

  const showToast = useCallback((message) => {
    window.clearTimeout(hideTimer.current);
    window.clearTimeout(clearTimer.current);
    setToast({ message, visible: true });
    hideTimer.current = window.setTimeout(() => {
      setToast((current) => (current ? { ...current, visible: false } : current));
    }, 4700);
    clearTimer.current = window.setTimeout(() => setToast(null), 5000);
  }, []);

  const toggleRegrow = useCallback((id, message) => {
    setRegrownIds((current) => {
      const active = current.includes(id);
      const next = active ? current.filter((itemId) => itemId !== id) : [...current, id];
      writeRegrownIds(storageKey, next);
      return next;
    });
    showToast(message);
  }, [showToast, storageKey]);

  return (
    <RegrowContext.Provider value={{ isRegrown, toggleRegrow, toast }}>
      {children}
    </RegrowContext.Provider>
  );
}

export function useRegrow() {
  const context = useContext(RegrowContext);
  if (!context) throw new Error("useRegrow must be used within a RegrowProvider");
  return context;
}
