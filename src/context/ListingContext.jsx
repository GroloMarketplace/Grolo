import { createContext, useContext, useMemo, useState } from "react";
import { products as initialProducts } from "../data/mockData";

const ListingContext = createContext(null);
const STORAGE_KEY = "grolo-listings";

function readListings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function ListingProvider({ children }) {
  const [listings, setListings] = useState(() => readListings() ?? initialProducts.map((product, index) => ({
    ...product,
    createdAt: product.createdAt ?? new Date(0).getTime() + (initialProducts.length - index),
  })));

  const addListing = (listing) => {
    const createdListing = { ...listing, createdAt: listing.createdAt ?? Date.now() };
    setListings((current) => {
      const next = [createdListing, ...current];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    return createdListing;
  };

  const updateListing = (listingId, updates) => {
    setListings((current) => {
      const next = current.map((listing) => listing.id === listingId ? { ...listing, ...updates } : listing);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const removeListing = (listingId) => {
    setListings((current) => {
      const next = current.filter((listing) => listing.id !== listingId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const value = useMemo(() => ({ listings, addListing, updateListing, removeListing }), [listings]);
  return <ListingContext.Provider value={value}>{children}</ListingContext.Provider>;
}

export function useListings() {
  const context = useContext(ListingContext);
  if (!context) throw new Error("useListings must be used within a ListingProvider");
  return context;
}
