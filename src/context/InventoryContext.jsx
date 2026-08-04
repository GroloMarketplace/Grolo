import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { products } from "../data/mockData";

const InventoryContext = createContext(null);

export function InventoryProvider({ children }) {
  const [inventory, setInventory] = useState(() =>
    products.reduce((result, product) => {
      result[product.id] = product.quantityAvailable ?? 0;
      return result;
    }, {}),
  );

  const getAvailable = useCallback((productId) => inventory[productId] ?? 0, [inventory]);

  const updateAvailable = useCallback((productId, quantity) => {
    const normalized = Number.isInteger(Number(quantity)) && Number(quantity) >= 0
      ? Number(quantity)
      : 0;
    setInventory((current) => ({ ...current, [productId]: normalized }));
  }, []);

  const reduceAvailable = useCallback((items) => {
    setInventory((current) => {
      const next = { ...current };
      items.forEach((item) => {
        const available = next[item.productId ?? item.id] ?? 0;
        next[item.productId ?? item.id] = Math.max(0, available - item.quantity);
      });
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ inventory, getAvailable, updateAvailable, reduceAvailable }),
    [inventory, getAvailable, updateAvailable, reduceAvailable],
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) throw new Error("useInventory must be used within an InventoryProvider");
  return context;
}
