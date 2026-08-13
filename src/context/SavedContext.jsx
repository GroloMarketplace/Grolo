import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { addFavorite, getFavorites, removeFavorite } from "../lib/api/favorites";
import { getListingById } from "../lib/api/listings";
import { isSupabaseConfigured } from "../lib/supabaseClient";

const SavedContext = createContext(null);
const STORAGE_KEY = "grolo-saved-items";

function readSavedItems(storageKey) {
  try {
    const savedItems = JSON.parse(localStorage.getItem(storageKey)) ?? [];
    return savedItems;
  } catch {
    return [];
  }
}

function writeSavedItems(storageKey, items) {
  localStorage.setItem(storageKey, JSON.stringify(items));
}

function savedListingFromFavorite(row) {
  const listing = row.listings ?? {};
  const legacyId = listing.legacy_id ?? row.listing_id;
  return {
    id: `listing:${legacyId}`,
    type: "listing",
    sourceId: legacyId,
    databaseId: row.listing_id,
    name: listing.name ?? listing.title ?? "Saved listing",
    title: listing.title ?? listing.name ?? "Saved listing",
    description: listing.description ?? "",
    image: listing.image_url ?? "",
    shop: listing.profiles?.shop_name ?? "",
    createdAt: row.created_at,
  };
}

export function SavedProvider({ children }) {
  const { user } = useAuth();
  const storageKey = `${STORAGE_KEY}-${user?.id ?? "anonymous"}`;
  const [savedItems, setSavedItems] = useState(() => readSavedItems(storageKey));

  useEffect(() => {
    let cancelled = false;
    const localItems = readSavedItems(storageKey);
    setSavedItems(localItems);
    if (!isSupabaseConfigured || !user?.id) return () => { cancelled = true; };
    getFavorites(user.id).then((rows) => {
      if (cancelled) return;
      const backendListings = (rows ?? []).map(savedListingFromFavorite);
      const nonListings = localItems.filter((item) => item.type !== "listing");
      setSavedItems([...backendListings, ...nonListings]);
    }).catch((error) => console.error("Unable to load favorites", error));
    return () => { cancelled = true; };
  }, [storageKey, user?.id]);

  const [toast, setToast] = useState("");

  const showToast = useCallback((message) => {
    setToast(message);
    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => setToast(""), 2200);
  }, []);

  const isSaved = useCallback(
    (id) => savedItems.some((item) => item.id === id),
    [savedItems],
  );

  const toggleSaved = useCallback(
    (items) => {
      const saved = savedItems.some((item) => item.id === items[0].id);
      const next = saved
        ? savedItems.filter((item) => !items.some((nextItem) => nextItem.id === item.id))
        : [...savedItems, ...items.filter((item) => !savedItems.some((current) => current.id === item.id))];
      setSavedItems(next);
      writeSavedItems(storageKey, next);
      showToast(saved ? "Removed from Saved Items" : "Saved to Saved Items");

      const listingItem = items[0]?.type === "listing" ? items[0] : null;
      if (isSupabaseConfigured && user?.id && listingItem) {
        const persist = (listingId) => (saved ? removeFavorite(user.id, listingId) : addFavorite(user.id, listingId))
          .catch((error) => console.error("Unable to persist favorite", error));
        const listingId = listingItem.databaseId ?? listingItem.listingId;
        if (listingId) persist(listingId);
        else if (listingItem.sourceId) getListingById(listingItem.sourceId).then((listing) => {
          if (listing?.databaseId) return persist(listing.databaseId);
          return null;
        }).catch((error) => console.error("Unable to resolve favorite listing", error));
      }
    },
    [savedItems, showToast, storageKey, user?.id],
  );

  return (
    <SavedContext.Provider value={{ savedItems, isSaved, toggleSaved, toast }}>
      {children}
    </SavedContext.Provider>
  );
}

export function useSavedItems() {
  const context = useContext(SavedContext);
  if (!context) throw new Error("useSavedItems must be used within a SavedProvider");
  return context;
}
