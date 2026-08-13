import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import {
  createListing as createListingRecord,
  deleteListing as deleteListingRecord,
  getListings,
  importLegacyListings,
  searchListings as searchListingRecords,
  updateListing as updateListingRecord,
} from "../lib/api/listings";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { refreshUserReputation } from "../lib/api/reputation";

const ListingContext = createContext(null);
const STORAGE_KEY = "grolo-listings";

function readLegacyListings(storageKey) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function clearLegacyListings(storageKey) {
  try {
    localStorage.removeItem(storageKey);
  } catch {
  }
}

export function ListingProvider({ children }) {
  const { user } = useAuth();
  const storageKey = `${STORAGE_KEY}-${user?.id ?? "anonymous"}`;
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadListings() {
      if (!isSupabaseConfigured) {
        setListings([]);
        setLoading(false);
        setError(new Error("Supabase is not configured."));
        return;
      }

      setLoading(true);
      setError(null);
      try {
        if (user?.id) {
          const legacyListings = readLegacyListings(storageKey);
          if (legacyListings.length) {
            await importLegacyListings(legacyListings, user.id);
            clearLegacyListings(storageKey);
          }
        }
        const nextListings = await getListings();
        if (!cancelled) setListings(nextListings);
      } catch (loadError) {
        if (!cancelled) {
          console.error("Unable to load listings", loadError);
          setError(loadError);
          setListings([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadListings();
    return () => { cancelled = true; };
  }, [storageKey, user?.id]);

  const addListing = async (listing) => {
    if (!user?.id) throw new Error("You must be signed in to create a listing.");
    const createdListing = await createListingRecord(listing, user.id);
    setListings((current) => [createdListing, ...current]);
    void refreshUserReputation(user.id, { eventKey: `listing-created:${createdListing?.databaseId ?? createdListing?.id}` });
    return createdListing;
  };

  const updateListing = async (listingId, updates) => {
    if (!user?.id) throw new Error("You must be signed in to update a listing.");
    const updatedListing = await updateListingRecord(listingId, updates, user.id);
    setListings((current) => current.map((listing) => (
      listing.id === listingId || listing.databaseId === updatedListing.databaseId ? updatedListing : listing
    )));
    return updatedListing;
  };

  const removeListing = async (listingId) => {
    if (!user?.id) throw new Error("You must be signed in to delete a listing.");
    await deleteListingRecord(listingId);
    setListings((current) => current.filter((listing) => listing.id !== listingId && listing.databaseId !== listingId));
  };

  const searchListings = useCallback(async (query) => {
    if (!query?.trim()) return [];
    return searchListingRecords(query.trim());
  }, []);

  const value = useMemo(
    () => ({ listings, loading, error, addListing, updateListing, removeListing, searchListings }),
    [listings, loading, error, searchListings],
  );
  return <ListingContext.Provider value={value}>{children}</ListingContext.Provider>;
}

export function useListings() {
  const context = useContext(ListingContext);
  if (!context) throw new Error("useListings must be used within a ListingProvider");
  return context;
}
