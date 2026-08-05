import { useMemo } from "react";
import { useSavedItems } from "../context/SavedContext";

export function useFavorites() {
  const { savedItems, toggleSaved } = useSavedItems();
  const favoriteIds = useMemo(
    () => savedItems
      .filter((item) => item.type === "listing")
      .map((item) => item.sourceId ?? item.id.replace(/^listing:/, "")),
    [savedItems],
  );

  const isFavorite = (listingId) => favoriteIds.includes(listingId);
  const toggleFavorite = (listingId) => toggleSaved([{
    id: `listing:${listingId}`,
    type: "listing",
    sourceId: listingId,
  }]);

  return { favoriteIds, isFavorite, toggleFavorite };
}
