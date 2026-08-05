import { createContext, useContext, useMemo, useState } from "react";
import { cartItems as initialCartItems } from "../data/mockData";

const CartContext = createContext(null);
const INVENTORY_STORAGE_KEY = "grolo-inventory";
const CART_STORAGE_KEY = "grolo-cart";

function loadCart() {
  try {
    const savedCart = window.localStorage.getItem(CART_STORAGE_KEY);
    return savedCart ? JSON.parse(savedCart) : initialCartItems.map((item) => ({ ...item }));
  } catch {
    return initialCartItems.map((item) => ({ ...item }));
  }
}

function persistCart(nextItems) {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextItems));
  } catch {
  }
}

function getStoredAvailable(productId, fallback) {
  try {
    const savedInventory = window.localStorage.getItem(INVENTORY_STORAGE_KEY);
    const inventory = savedInventory ? JSON.parse(savedInventory) : null;
    return inventory?.[productId] ?? fallback;
  } catch {
    return fallback;
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);

  const updateQuantity = (itemId, delta, available) => {
    setItems((current) => {
      const nextItems = current.map((item) => {
        if (item.id !== itemId) return item;
        const normalizedAvailable = Number(available);
        const max = Number.isFinite(normalizedAvailable) ? normalizedAvailable : Infinity;
        return { ...item, quantity: Math.min(max, Math.max(1, item.quantity + delta)) };
      });
      persistCart(nextItems);
      return nextItems;
    });
  };

  const addToCart = (product, quantity = 1, availableOverride) => {
    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id);
      const available = Number.isFinite(availableOverride)
        ? availableOverride
        : getStoredAvailable(product.id, product.quantityAvailable ?? 0);
      const nextQuantity = (existing?.quantity ?? 0) + quantity;
      const cappedQuantity = Math.min(available, nextQuantity);
      if (cappedQuantity < 1) return current;
      const nextItems = existing
        ? current.map((item) => item.productId === product.id ? { ...item, quantity: cappedQuantity } : item)
        : [...current, { ...product, productId: product.id, id: `cart-${product.id}`, quantity: cappedQuantity }];
      persistCart(nextItems);
      return nextItems;
    });
  };

  const removeItems = (itemsToRemove) => {
    const itemIds = new Set(itemsToRemove.map((item) => item.id));
    setItems((current) => {
      const nextItems = current.filter((item) => !itemIds.has(item.id));
      persistCart(nextItems);
      return nextItems;
    });
  };

  const restoreItems = (itemsToRestore) => {
    setItems((current) => {
      const existingIds = new Set(current.map((item) => item.id));
      const nextItems = [...current, ...itemsToRestore.filter((item) => !existingIds.has(item.id))];
      persistCart(nextItems);
      return nextItems;
    });
  };

  const totalQuantity = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );

  return (
    <CartContext.Provider value={{ items, updateQuantity, addToCart, removeItems, restoreItems, totalQuantity, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}
