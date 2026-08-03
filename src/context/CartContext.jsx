import { createContext, useContext, useMemo, useState } from "react";
import { cartItems as initialCartItems } from "../data/mockData";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => initialCartItems.map((item) => ({ ...item })));

  const updateQuantity = (itemId, delta) => {
    setItems((current) => current.map((item) => (
      item.id === itemId
        ? { ...item, quantity: Math.max(1, item.quantity + delta) }
        : item
    )));
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
    <CartContext.Provider value={{ items, updateQuantity, totalQuantity, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}
