import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { useTrustSafety } from "./TrustSafetyContext";

const FollowContext = createContext(null);
const STORAGE_KEY = "grolo-following";

function readStoredFollowing(userKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) return [];
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

export function FollowProvider({ children }) {
  const { user, isSuspended } = useAuth();
  const { checkBlocked } = useTrustSafety();
  const userKey = user?.id ?? "current-user";
  const [followedSellers, setFollowedSellers] = useState(() => readStoredFollowing(userKey));
  const [followerCounts, setFollowerCounts] = useState({});

  const refreshFollowerCounts = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data, error } = await supabase.rpc("get_follower_counts");
    if (error) {
      console.error("Unable to load follower counts", error);
      return;
    }
    setFollowerCounts(Object.fromEntries((data ?? []).map((row) => [String(row.seller_id), Number(row.follower_count) || 0])));
  }, []);

  useEffect(() => {
    setFollowedSellers(readStoredFollowing(userKey));
  }, [userKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadFollowRelationships() {
      if (!isSupabaseConfigured) return;
      const relationshipQuery = user?.id
        ? supabase.from("user_follows").select("seller_id").eq("follower_id", user.id)
        : Promise.resolve({ data: [], error: null });
      const [{ data, error }, countsResult] = await Promise.all([
        relationshipQuery,
        supabase.rpc("get_follower_counts"),
      ]);
      if (error || countsResult.error || cancelled) return;

      setFollowerCounts(Object.fromEntries((countsResult.data ?? []).map((row) => [String(row.seller_id), Number(row.follower_count) || 0])));
      if (user?.id) {
        const uniqueFollowed = [...new Set((data ?? []).map((row) => row.seller_id))];
        setFollowedSellers(uniqueFollowed);
        persistFollowing(userKey, uniqueFollowed);
      }
    }

    loadFollowRelationships();
    return () => {
      cancelled = true;
    };
  }, [user?.id, userKey]);

  const followSeller = async (sellerId) => {
    if (isSuspended) throw new Error("Your account is suspended and cannot follow sellers.");
    if (followedSellers.includes(sellerId)) return true;
    if (await checkBlocked(sellerId)) {
      console.warn("Follow blocked by trust and safety", { sellerId });
      return false;
    }
    const previous = followedSellers;
    const next = [...previous, sellerId];
    setFollowedSellers(next);
    setFollowerCounts((current) => ({ ...current, [sellerId]: (current[sellerId] ?? 0) + 1 }));
    persistFollowing(userKey, next);

    if (!isSupabaseConfigured || !user?.id) return true;
    const { error } = await supabase
      .from("user_follows")
      .insert({ follower_id: user.id, seller_id: sellerId });
    if (error && error.code !== "23505") {
      setFollowedSellers(previous);
      setFollowerCounts((current) => ({ ...current, [sellerId]: Math.max((current[sellerId] ?? 1) - 1, 0) }));
      persistFollowing(userKey, previous);
      console.error("Unable to persist follow", error);
      return false;
    }
    await refreshFollowerCounts();
    return true;
  };

  const unfollowSeller = (sellerId) => {
    if (!followedSellers.includes(sellerId)) return;
    const next = followedSellers.filter((id) => id !== sellerId);
    setFollowedSellers(next);
    setFollowerCounts((current) => ({ ...current, [sellerId]: Math.max((current[sellerId] ?? 1) - 1, 0) }));
    persistFollowing(userKey, next);

    if (isSupabaseConfigured && user?.id) {
      supabase.from("user_follows").delete().eq("follower_id", user.id).eq("seller_id", sellerId).then(({ error }) => {
        if (error) {
          setFollowedSellers((current) => [...new Set([...current, sellerId])]);
          setFollowerCounts((current) => ({ ...current, [sellerId]: (current[sellerId] ?? 0) + 1 }));
          persistFollowing(userKey, [...new Set([...next, sellerId])]);
          console.error("Unable to persist unfollow", error);
          return;
        }
        void refreshFollowerCounts();
      });
    }
  };

  const toggleFollow = (sellerId) => {
    if (followedSellers.includes(sellerId)) unfollowSeller(sellerId);
    else followSeller(sellerId);
  };

  const isFollowing = (sellerId) => followedSellers.includes(sellerId);
  const getFollowerCount = (sellerId) => followerCounts[String(sellerId)] ?? 0;

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
