import { createContext, useContext, useMemo, useState } from "react";
import { products as initialProducts } from "../data/mockData";

const ListingContext = createContext(null);

export function ListingProvider({ children }) {
  const [listings, setListings] = useState(() => initialProducts.map((product, index) => ({
    ...product,
    createdAt: product.createdAt ?? new Date(0).getTime() + (initialProducts.length - index),
  })));

  const addListing = (listing) => {
    const createdListing = { ...listing, createdAt: listing.createdAt ?? Date.now() };
    setListings((current) => [createdListing, ...current]);
    return createdListing;
  };

  const updateListing = (listingId, updates) => {
    setListings((current) => current.map((listing) => (
      listing.id === listingId ? { ...listing, ...updates } : listing
    )));
  };

  const removeListing = (listingId) => {
    setListings((current) => current.filter((listing) => listing.id !== listingId));
  };

  const value = useMemo(() => ({ listings, addListing, updateListing, removeListing }), [listings]);
  return <ListingContext.Provider value={value}>{children}</ListingContext.Provider>;
}

export function useListings() {
  const context = useContext(ListingContext);
  if (!context) throw new Error("useListings must be used within a ListingProvider");
  return context;
}
