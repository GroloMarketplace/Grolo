import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { useListings } from "./ListingContext";
import { usePromotions } from "./PromotionContext";
import { trackAnalyticsEvent } from "../lib/api/analytics";

const CartContext = createContext(null);
const CART_STORAGE_KEY = "grolo-cart";

function loadCart(storageKey) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistCart(storageKey, nextItems) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(nextItems));
  } catch {
  }
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const { listings } = useListings();
  const { getListingPricing } = usePromotions();
  const storageKey = `${CART_STORAGE_KEY}-${user?.id ?? "anonymous"}`;
  const [items, setItems] = useState(() => loadCart(storageKey));

  useEffect(() => {
    setItems(loadCart(storageKey));
  }, [storageKey]);

  const updateQuantity = (itemId, delta, available) => {
    setItems((current) => {
      const nextItems = current.map((item) => {
        if (item.id !== itemId) return item;
        const normalizedAvailable = Number(available);
        const max = Number.isFinite(normalizedAvailable) ? normalizedAvailable : Infinity;
        return { ...item, quantity: Math.min(max, Math.max(1, item.quantity + delta)) };
      });
      persistCart(storageKey, nextItems);
      return nextItems;
    });
  };

  const addToCart = (product, quantity = 1, availableOverride, selectedVariant = null) => {
    setItems((current) => {
      const variantName = selectedVariant?.name ?? product.variantName ?? null;
      const variantPrice = selectedVariant?.price ?? product.variantPrice ?? null;
      const existing = current.find((item) => item.productId === product.id && (item.variantName ?? null) === variantName);
      const listing = listings.find((item) => item.id === product.id || item.databaseId === product.id) ?? product;
      const pricedListing = variantPrice != null ? { ...listing, price: Number(variantPrice) } : listing;
      const available = Number.isFinite(availableOverride)
        ? availableOverride
        : Number(listing.quantityAvailable) || 0;
      const nextQuantity = (existing?.quantity ?? 0) + quantity;
      const cappedQuantity = Math.min(available, nextQuantity);
      if (cappedQuantity < 1) return current;
      const pricing = getListingPricing(pricedListing);
      const pricedFields = {
        originalPrice: pricing.originalPrice,
        discountedPrice: pricing.discountedPrice,
        promotionId: pricing.promotion?.id ?? null,
        promotionTitle: pricing.promotion?.title ?? null,
      };
      const nextItems = existing
        ? current.map((item) => item.productId === product.id && (item.variantName ?? null) === variantName
          ? { ...item, ...pricedFields, variantName, variantPrice, quantity: cappedQuantity }
          : item)
        : [...current, {
          ...product,
          ...pricedFields,
          price: pricing.discountedPrice,
          productId: product.id,
          listingId: listing.databaseId ?? listing.id,
          variantName,
          variantPrice,
          id: `cart-${product.id}-${variantName ?? "default"}`,
          quantity: cappedQuantity,
        }];
      persistCart(storageKey, nextItems);
      if (listing.databaseId && listing.sellerId) {
        void trackAnalyticsEvent("add_to_cart", {
          sellerId: listing.sellerId,
          listingId: listing.databaseId,
          promotionId: pricedFields.promotionId,
        });
      }
      return nextItems;
    });
  };

  const removeItems = (itemsToRemove) => {
    const itemIds = new Set(itemsToRemove.map((item) => item.id));
    setItems((current) => {
      const nextItems = current.filter((item) => !itemIds.has(item.id));
      persistCart(storageKey, nextItems);
      return nextItems;
    });
  };

  const restoreItems = (itemsToRestore) => {
    setItems((current) => {
      const existingIds = new Set(current.map((item) => item.id));
      const nextItems = [...current, ...itemsToRestore.filter((item) => !existingIds.has(item.id))];
      persistCart(storageKey, nextItems);
      return nextItems;
    });
  };

  const getItemPricing = useCallback((item) => {
    const listing = listings.find((candidate) => candidate.id === item.productId || candidate.databaseId === item.productId) ?? item;
    const pricedListing = item.variantPrice != null ? { ...listing, price: Number(item.variantPrice) } : listing;
    return getListingPricing(pricedListing);
  }, [listings, getListingPricing]);

  const totalQuantity = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + getItemPricing(item).discountedPrice * item.quantity, 0),
    [items, getItemPricing],
  );

  return (
    <CartContext.Provider value={{ items, updateQuantity, addToCart, getItemPricing, removeItems, restoreItems, totalQuantity, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}
