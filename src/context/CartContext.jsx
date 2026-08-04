import { createContext, useContext, useMemo, useState } from "react";
import { cartItems as initialCartItems } from "../data/mockData";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => initialCartItems.map((item) => ({ ...item })));

  const updateQuantity = (itemId, delta, available) => {
    setItems((current) => current.map((item) => {
      if (item.id !== itemId) return item;
      const max = Number.isFinite(available) ? available : Infinity;
      return { ...item, quantity: Math.min(max, Math.max(1, item.quantity + delta)) };
    }));
  };

  const addToCart = (product, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id);
      const nextQuantity = (existing?.quantity ?? 0) + quantity;
      const cappedQuantity = Math.min(product.quantityAvailable ?? 0, nextQuantity);
      if (cappedQuantity < 1) return current;
      if (existing) return current.map((item) => item.productId === product.id ? { ...item, quantity: cappedQuantity } : item);
      return [...current, { ...product, productId: product.id, id: `cart-${product.id}`, quantity: cappedQuantity }];
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
    <CartContext.Provider value={{ items, updateQuantity, addToCart, totalQuantity, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}
