import { useMemo } from "react";
import { useSavedItems } from "../context/SavedContext";
import { useListings } from "../context/ListingContext";

export function useFavorites() {
  const { savedItems, toggleSaved } = useSavedItems();
  const { listings } = useListings();
  const favoriteIds = useMemo(
    () => savedItems
      .filter((item) => item.type === "listing")
      .map((item) => item.sourceId ?? item.id.replace(/^listing:/, "")),
    [savedItems],
  );

  const isFavorite = (listingId) => favoriteIds.includes(listingId);
  const toggleFavorite = (listingId) => {
    const listing = listings.find((item) => item.id === listingId || item.databaseId === listingId || item.legacyId === listingId);
    return toggleSaved([{
      id: `listing:${listing?.id ?? listingId}`,
      type: "listing",
      sourceId: listing?.id ?? listingId,
      databaseId: listing?.databaseId,
    }]);
  };

  return { favoriteIds, isFavorite, toggleFavorite };
}
