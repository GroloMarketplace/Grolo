import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

const FollowContext = createContext(null);
const STORAGE_KEY = "grolo-following";

function readStoredFollowing(userKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) return [...new Set(saved)];
    return [...new Set(saved?.users?.[userKey] ?? [])];
  } catch {
    return [];
  }
}

function persistFollowing(userKey, followedSellers) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const users = Array.isArray(saved) ? {} : (saved?.users ?? {});
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      users: { ...users, [userKey]: [...new Set(followedSellers)] },
    }));
  } catch {
  }
}

function getFollowerCounts(rows) {
  return rows.reduce((counts, row) => ({
    ...counts,
    [row.seller_id]: (counts[row.seller_id] ?? 0) + 1,
  }), {});
}

export function FollowProvider({ children }) {
  const { user } = useAuth();
  const userKey = user?.id ?? "current-user";
  const [followedSellers, setFollowedSellers] = useState(() => readStoredFollowing(userKey));
  const [followerCounts, setFollowerCounts] = useState({});

  useEffect(() => {
    setFollowedSellers(readStoredFollowing(userKey));
  }, [userKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadFollowRelationships() {
      if (!isSupabaseConfigured) return;
      const { data, error } = await supabase
        .from("user_follows")
        .select("follower_id, seller_id");
      if (error || cancelled) return;

      const rows = data ?? [];
      setFollowerCounts(getFollowerCounts(rows));
      if (user?.id) {
        const followed = rows.filter((row) => row.follower_id === user.id).map((row) => row.seller_id);
        const uniqueFollowed = [...new Set(followed)];
        setFollowedSellers(uniqueFollowed);
        persistFollowing(userKey, uniqueFollowed);
      }
    }

    loadFollowRelationships();
    return () => {
      cancelled = true;
    };
  }, [user?.id, userKey]);

  const followSeller = (sellerId) => {
    if (followedSellers.includes(sellerId)) return;
    const next = [...followedSellers, sellerId];
    setFollowedSellers(next);
    setFollowerCounts((current) => ({ ...current, [sellerId]: (current[sellerId] ?? 0) + 1 }));
    persistFollowing(userKey, next);

    if (isSupabaseConfigured && user?.id) {
      supabase.from("user_follows").insert({ follower_id: user.id, seller_id: sellerId }).then(({ error }) => {
        if (error && error.code !== "23505") console.error("Unable to persist follow", error);
      });
    }
  };

  const unfollowSeller = (sellerId) => {
    if (!followedSellers.includes(sellerId)) return;
    const next = followedSellers.filter((id) => id !== sellerId);
    setFollowedSellers(next);
    setFollowerCounts((current) => ({ ...current, [sellerId]: Math.max((current[sellerId] ?? 1) - 1, 0) }));
    persistFollowing(userKey, next);

    if (isSupabaseConfigured && user?.id) {
      supabase.from("user_follows").delete().eq("follower_id", user.id).eq("seller_id", sellerId).then(({ error }) => {
        if (error) console.error("Unable to persist unfollow", error);
      });
    }
  };

  const toggleFollow = (sellerId) => {
    if (followedSellers.includes(sellerId)) unfollowSeller(sellerId);
    else followSeller(sellerId);
  };

  const isFollowing = (sellerId) => followedSellers.includes(sellerId);
  const getFollowerCount = (sellerId) => followerCounts[sellerId] ?? 0;

  return (
    <FollowContext.Provider value={{
      followedSellers,
      followingCount: followedSellers.length,
      getFollowerCount,
      followSeller,
      unfollowSeller,
      toggleFollow,
      isFollowing,
    }}>
      {children}
    </FollowContext.Provider>
  );
}

export function useFollow() {
  const context = useContext(FollowContext);
  if (!context) throw new Error("useFollow must be used within a FollowProvider");
  return context;
}
