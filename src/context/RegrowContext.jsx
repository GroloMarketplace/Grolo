import { createContext, useCallback, useContext, useRef, useState } from "react";

const RegrowContext = createContext(null);
const STORAGE_KEY = "grolo-regrown-items";

function readRegrownIds() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

function writeRegrownIds(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function RegrowProvider({ children }) {
  const [regrownIds, setRegrownIds] = useState(() => readRegrownIds());
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
      writeRegrownIds(next);
      return next;
    });
    showToast(message);
  }, [showToast]);

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
