import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { addFavorite, removeFavorite, getFavorites } from "../lib/api/favorites";

const STORAGE_KEY = "my-shop-favorites";

function readLocalFavorites() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

function writeLocalFavorites(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function useFavorites() {
  const { user, isAuthenticated } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState(() => readLocalFavorites());

  useEffect(() => {
    if (!isSupabaseConfigured || !isAuthenticated) return;
    getFavorites(user.id)
      .then((rows) => setFavoriteIds(rows.map((r) => r.listing_id)))
      .catch(() => {});
  }, [isAuthenticated, user]);

  const isFavorite = useCallback(
    (listingId) => favoriteIds.includes(listingId),
    [favoriteIds],
  );

  const toggleFavorite = useCallback(
    async (listingId) => {
      const alreadyFavorite = favoriteIds.includes(listingId);
      const next = alreadyFavorite
        ? favoriteIds.filter((id) => id !== listingId)
        : [...favoriteIds, listingId];
      setFavoriteIds(next);
      writeLocalFavorites(next);

      if (isSupabaseConfigured && isAuthenticated) {
        try {
          if (alreadyFavorite) {
            await removeFavorite(user.id, listingId);
          } else {
            await addFavorite(user.id, listingId);
          }
        } catch {
          setFavoriteIds(favoriteIds);
          writeLocalFavorites(favoriteIds);
        }
      }
    },
    [favoriteIds, isAuthenticated, user],
  );

  return { favoriteIds, isFavorite, toggleFavorite };
}
