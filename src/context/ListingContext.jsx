import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";

const ListingContext = createContext(null);
const STORAGE_KEY = "grolo-listings";

function readListings(storageKey) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function ListingProvider({ children }) {
  const { user } = useAuth();
  const storageKey = `${STORAGE_KEY}-${user?.id ?? "anonymous"}`;
  const [listings, setListings] = useState(() => readListings(storageKey) ?? []);

  useEffect(() => {
    setListings(readListings(storageKey) ?? []);
  }, [storageKey]);

  const addListing = (listing) => {
    const createdListing = { ...listing, createdAt: listing.createdAt ?? Date.now() };
    setListings((current) => {
      const next = [createdListing, ...current];
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
    return createdListing;
  };

  const updateListing = (listingId, updates) => {
    setListings((current) => {
      const next = current.map((listing) => listing.id === listingId ? { ...listing, ...updates } : listing);
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const removeListing = (listingId) => {
    setListings((current) => {
      const next = current.filter((listing) => listing.id !== listingId);
      localStorage.setItem(storageKey, JSON.stringify(next));
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
