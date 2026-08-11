import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { products } from "../data/mockData";

const InventoryContext = createContext(null);
const INVENTORY_STORAGE_KEY = "grolo-inventory";
const INVENTORY_EVENT = "grolo-inventory-updated";

function initialInventory() {
  return products.reduce((result, product) => {
    result[product.id] = product.quantityAvailable ?? 0;
    return result;
  }, {});
}

function loadInventory() {
  try {
    const savedInventory = window.localStorage.getItem(INVENTORY_STORAGE_KEY);
    return savedInventory ? JSON.parse(savedInventory) : initialInventory();
  } catch {
    return initialInventory();
  }
}

function persistInventory(nextInventory) {
  try {
    window.localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(nextInventory));
  } catch {
  }
}

export function InventoryProvider({ children }) {
  const [inventory, setInventory] = useState(loadInventory);

  // `OrderContext` restores inventory on cancellation by writing straight to
  // localStorage and dispatching this event (it can't call this provider's
  // hooks directly due to provider ordering) — that's the only source of
  // this event, so only listen here; never dispatch it from below.
  useEffect(() => {
    const handleInventoryUpdate = (event) => setInventory(event.detail);
    window.addEventListener(INVENTORY_EVENT, handleInventoryUpdate);
    return () => window.removeEventListener(INVENTORY_EVENT, handleInventoryUpdate);
  }, []);

  // Persisting here (rather than inside the setInventory updater below) keeps
  // every updater a pure function of its input. An updater that also writes
  // to localStorage and re-dispatches an event that this same provider
  // listens to would let React's Strict Mode double-invocation of updaters
  // compound: the first invocation's side effect could change `inventory`
  // before the second invocation ran, silently applying a reduction twice.
  useEffect(() => {
    persistInventory(inventory);
  }, [inventory]);

  const getAvailable = useCallback((productId) => inventory[productId] ?? 0, [inventory]);

  const updateAvailable = useCallback((productId, quantity) => {
    const normalized = Number.isInteger(Number(quantity)) && Number(quantity) >= 0
      ? Number(quantity)
      : 0;
    setInventory((current) => ({ ...current, [productId]: normalized }));
  }, []);

  const reduceAvailable = useCallback((items, operationId) => {
    const operationKey = operationId ? `grolo-inventory-reduction:${operationId}` : null;
    if (operationKey && window.sessionStorage.getItem(operationKey) === "done") return;
    if (operationKey) window.sessionStorage.setItem(operationKey, "done");
    setInventory((current) => {
      const next = { ...current };
      items.forEach((item) => {
        const productId = item.productId ?? item.id;
        const available = next[productId] ?? 0;
        next[productId] = Math.max(0, available - item.quantity);
      });
      return next;
    });
  }, []);

  const restoreAvailable = useCallback((items) => {
    setInventory((current) => {
      const next = { ...current };
      items.forEach((item) => {
        const productId = item.productId ?? item.id;
        next[productId] = (next[productId] ?? 0) + (Number(item.quantity) || 0);
      });
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ inventory, getAvailable, updateAvailable, reduceAvailable, restoreAvailable }),
    [inventory, getAvailable, updateAvailable, reduceAvailable, restoreAvailable],
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) throw new Error("useInventory must be used within an InventoryProvider");
  return context;
}
