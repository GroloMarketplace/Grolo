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
import { usePromotions } from "./PromotionContext";

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
  const { user, isSuspended } = useAuth();
  const { getListingPricing } = usePromotions();
  const storageKey = `${STORAGE_KEY}-${user?.id ?? "anonymous"}`;
  const [listings, setListings] = useState([]);
  const [archivedListings, setArchivedListings] = useState([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadListings() {
      if (!isSupabaseConfigured) {
        setListings([]);
        setArchivedListings([]);
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
        const sellerListings = user?.id ? await getListings({ sellerId: user.id, includeArchived: true }) : [];
        if (!cancelled) {
          setListings(nextListings);
          setArchivedListings(sellerListings.filter((listing) => listing.status === "Archived"));
        }
      } catch (loadError) {
        if (!cancelled) {
          console.error("Unable to load listings", loadError);
          setError(loadError);
          setListings([]);
          setArchivedListings([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadListings();
    return () => { cancelled = true; };
  }, [storageKey, user?.id]);

  const addListing = async (listing) => {
    if (isSuspended) throw new Error("Your account is suspended and cannot create listings.");
    if (!user?.id) throw new Error("You must be signed in to create a listing.");
    const createdListing = await createListingRecord(listing, user.id);
    setListings((current) => [createdListing, ...current]);
    void refreshUserReputation(user.id, { eventKey: `listing-created:${createdListing?.databaseId ?? createdListing?.id}` });
    return createdListing;
  };

  const updateListing = async (listingId, updates) => {
    if (!user?.id) throw new Error("You must be signed in to update a listing.");
    const updatedListing = await updateListingRecord(listingId, updates, user.id);
    if (updatedListing.status === "Archived") {
      setListings((current) => current.filter((listing) => listing.id !== listingId && listing.databaseId !== updatedListing.databaseId));
      setArchivedListings((current) => [updatedListing, ...current.filter((listing) => listing.databaseId !== updatedListing.databaseId && listing.id !== updatedListing.id)]);
    } else {
      setListings((current) => current.map((listing) => (
        listing.id === listingId || listing.databaseId === updatedListing.databaseId ? updatedListing : listing
      )));
      setArchivedListings((current) => current.filter((listing) => listing.id !== listingId && listing.databaseId !== updatedListing.databaseId));
    }
    return updatedListing;
  };

  const removeListing = async (listingId) => {
    if (!user?.id) throw new Error("You must be signed in to delete a listing.");
    const result = await deleteListingRecord(listingId);
    setListings((current) => current.filter((listing) => listing.id !== listingId && listing.databaseId !== listingId));
    if (result?.archived && result.listing) setArchivedListings((current) => [result.listing, ...current.filter((listing) => listing.id !== result.listing.id)]);
    return result;
  };

  const restoreListing = async (listingId) => {
    const restoredListing = await updateListingRecord(listingId, { status: "Active", serviceStatus: "Accepting New Clients" }, user?.id);
    setArchivedListings((current) => current.filter((listing) => listing.id !== listingId && listing.databaseId !== listingId));
    setListings((current) => [restoredListing, ...current.filter((listing) => listing.id !== listingId && listing.databaseId !== listingId)]);
    return restoredListing;
  };

  const permanentlyDeleteListing = async (listingId) => {
    if (!user?.id) throw new Error("You must be signed in to delete a listing.");
    const result = await deleteListingRecord(listingId, { permanent: true });
    setArchivedListings((current) => current.filter((listing) => listing.id !== listingId && listing.databaseId !== listingId));
    setListings((current) => current.filter((listing) => listing.id !== listingId && listing.databaseId !== listingId));
    return result;
  };

  const searchListings = useCallback(async (query, options) => {
    if (!query?.trim()) return [];
    return searchListingRecords(query.trim(), options);
  }, []);

  const priceListings = useCallback((source) => source.map((listing) => {
    const pricing = getListingPricing(listing);
    return {
      ...listing,
      originalPrice: pricing.originalPrice,
      discountedPrice: pricing.discountedPrice,
      promotion: pricing.promotion,
      promotionId: pricing.promotion?.id ?? null,
      promotionTitle: pricing.promotion?.title ?? null,
      discountPercent: pricing.discountPercent,
    };
  }), [getListingPricing]);
  const pricedListings = useMemo(() => priceListings(listings), [listings, priceListings]);
  const pricedArchivedListings = useMemo(() => priceListings(archivedListings), [archivedListings, priceListings]);

  const value = useMemo(
    () => ({ listings: pricedListings, archivedListings: pricedArchivedListings, loading, error, addListing, updateListing, removeListing, restoreListing, permanentlyDeleteListing, searchListings }),
    [pricedListings, pricedArchivedListings, loading, error, addListing, updateListing, removeListing, restoreListing, permanentlyDeleteListing, searchListings],
  );
  return <ListingContext.Provider value={value}>{children}</ListingContext.Provider>;
}

export function useListings() {
  const context = useContext(ListingContext);
  if (!context) throw new Error("useListings must be used within a ListingProvider");
  return context;
}
