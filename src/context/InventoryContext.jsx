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

  useEffect(() => {
    const handleInventoryUpdate = (event) => setInventory(event.detail);
    window.addEventListener(INVENTORY_EVENT, handleInventoryUpdate);
    return () => window.removeEventListener(INVENTORY_EVENT, handleInventoryUpdate);
  }, []);

  const getAvailable = useCallback((productId) => inventory[productId] ?? 0, [inventory]);

  const updateInventory = useCallback((updater) => {
    setInventory((current) => {
      const next = updater(current);
      persistInventory(next);
      window.dispatchEvent(new CustomEvent(INVENTORY_EVENT, { detail: next }));
      return next;
    });
  }, []);

  const updateAvailable = useCallback((productId, quantity) => {
    const normalized = Number.isInteger(Number(quantity)) && Number(quantity) >= 0
      ? Number(quantity)
      : 0;
    updateInventory((current) => ({ ...current, [productId]: normalized }));
  }, [updateInventory]);

  const reduceAvailable = useCallback((items, operationId) => {
    const operationKey = operationId ? `grolo-inventory-reduction:${operationId}` : null;
    if (operationKey && window.sessionStorage.getItem(operationKey) === "done") return;
    if (operationKey) window.sessionStorage.setItem(operationKey, "done");
    updateInventory((current) => {
      const next = { ...current };
      items.forEach((item) => {
        const productId = item.productId ?? item.id;
        const available = next[productId] ?? 0;
        next[productId] = Math.max(0, available - item.quantity);
      });
      return next;
    });
  }, [updateInventory]);

  const restoreAvailable = useCallback((items) => {
    updateInventory((current) => {
      const next = { ...current };
      items.forEach((item) => {
        const productId = item.productId ?? item.id;
        next[productId] = (next[productId] ?? 0) + (Number(item.quantity) || 0);
      });
      return next;
    });
  }, [updateInventory]);

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
