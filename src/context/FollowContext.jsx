import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
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

function normalizeSellerKey(value) {
  const sellerId = value && typeof value === "object"
    ? value.id ?? value.seller_id ?? value.sellerId ?? value.databaseId
    : value;
  return sellerId == null ? "" : String(sellerId).trim().toLowerCase();
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
  const followedSellersRef = useRef(followedSellers);
  const followOperationsRef = useRef(new Map());
  followedSellersRef.current = followedSellers;

  const refreshFollowerCounts = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data, error } = await supabase.rpc("get_follower_counts");
    if (error) {
      console.error("Unable to load follower counts", error);
      return;
    }
    const counts = (data ?? []).reduce((result, row) => {
      const sellerId = normalizeSellerKey(row.seller_id);
      if (sellerId) result[sellerId] = Number(row.follower_count) || 0;
      return result;
    }, {});
    console.info("follower counts source audit", {
      source: "get_follower_counts",
      rpc_rows: data ?? [],
      follower_counts: counts,
      follower_count_keys: Object.keys(counts),
    });
    setFollowerCounts(counts);
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
      const { data, error } = await relationshipQuery;
      if (error || cancelled) {
        if (error) console.error("Unable to load following rows", error);
        return;
      }
      await refreshFollowerCounts();
      if (cancelled) return;
      if (user?.id) {
        const uniqueFollowed = [...new Set((data ?? []).map((row) => String(row.seller_id)))];
        console.info("following rows source audit", {
          source: "user_follows",
          follower_id: user.id,
          following_row_count: uniqueFollowed.length,
          followed_store_ids: uniqueFollowed,
        });
        setFollowedSellers(uniqueFollowed);
        persistFollowing(userKey, uniqueFollowed);
      }
    }

    loadFollowRelationships();
    return () => {
      cancelled = true;
    };
  }, [refreshFollowerCounts, user?.id, userKey]);

  const enqueueFollowOperation = (sellerId, operation) => {
    const key = String(sellerId);
    const previousOperation = followOperationsRef.current.get(key) ?? Promise.resolve();
    const nextOperation = previousOperation.catch(() => {}).then(operation);
    followOperationsRef.current.set(key, nextOperation);
    void nextOperation.then(() => {
      if (followOperationsRef.current.get(key) === nextOperation) followOperationsRef.current.delete(key);
    }, () => {
      if (followOperationsRef.current.get(key) === nextOperation) followOperationsRef.current.delete(key);
    });
    return nextOperation;
  };

  const followSeller = (sellerId) => enqueueFollowOperation(sellerId, async () => {
    if (isSuspended) throw new Error("Your account is suspended and cannot follow sellers.");
    if (followedSellersRef.current.includes(sellerId)) return true;
    if (await checkBlocked(sellerId)) {
      console.warn("Follow blocked by trust and safety", { sellerId });
      return false;
    }
    const previous = followedSellersRef.current;
    const next = [...previous, sellerId];
    setFollowedSellers(next);
    const sellerKey = normalizeSellerKey(sellerId);
    setFollowerCounts((current) => ({ ...current, [sellerKey]: (current[sellerKey] ?? 0) + 1 }));
    persistFollowing(userKey, next);

    if (!isSupabaseConfigured || !user?.id) return true;
    const { data: existingRows, error: lookupError } = await supabase
      .from("user_follows")
      .select("id, follower_id, seller_id, created_at")
      .eq("follower_id", user.id)
      .eq("seller_id", sellerId);
    console.info("follow row lookup audit", {
      follower_id: user.id,
      store_id: sellerId,
      user_id: user.id,
      existing_row: existingRows?.[0] ?? null,
      lookup_error: lookupError?.message ?? null,
    });
    if (lookupError) throw lookupError;
    if (!existingRows?.length) {
      const { data: insertedRows, error } = await supabase
        .from("user_follows")
        .insert({ follower_id: user.id, seller_id: sellerId })
        .select("id, follower_id, seller_id, created_at");
      console.info("follow row persistence audit", {
        follower_id: user.id,
        followed_store_id: sellerId,
        followed_user_id: sellerId,
        created_at: insertedRows?.[0]?.created_at ?? null,
        inserted_follow_row: insertedRows?.[0] ?? null,
        error: error?.message ?? null,
      });
      if (error && error.code !== "23505") throw error;
    }
    await refreshFollowerCounts();
    return true;
  });

  const unfollowSeller = (sellerId) => enqueueFollowOperation(sellerId, async () => {
    if (!followedSellersRef.current.includes(sellerId)) return false;
    const previous = followedSellersRef.current;
    const next = previous.filter((id) => id !== sellerId);
    setFollowedSellers(next);
    const sellerKey = normalizeSellerKey(sellerId);
    setFollowerCounts((current) => ({ ...current, [sellerKey]: Math.max((current[sellerKey] ?? 1) - 1, 0) }));
    persistFollowing(userKey, next);

    if (isSupabaseConfigured && user?.id) {
      const { data: existingRows, error: lookupError } = await supabase
        .from("user_follows")
        .select("id, follower_id, seller_id, created_at")
        .eq("follower_id", user.id)
        .eq("seller_id", sellerId);
      console.info("unfollow row lookup audit", {
        follower_id: user.id,
        store_id: sellerId,
        user_id: user.id,
        follower_row_exists_before: Boolean(existingRows?.length),
        existing_row: existingRows?.[0] ?? null,
        lookup_error: lookupError?.message ?? null,
      });
      if (lookupError) throw lookupError;
      const { error } = await supabase.from("user_follows").delete().eq("follower_id", user.id).eq("seller_id", sellerId);
      const { data: remainingRows } = await supabase.from("user_follows").select("id").eq("follower_id", user.id).eq("seller_id", sellerId);
      console.info("unfollow row persistence audit", {
        follower_id: user.id,
        store_id: sellerId,
        row_deleted: !remainingRows?.length,
        remaining_row_count: remainingRows?.length ?? 0,
        error: error?.message ?? null,
      });
      if (error) throw error;
      await refreshFollowerCounts();
    }
    return true;
  });

  const toggleFollow = (sellerId) => {
    if (followedSellersRef.current.includes(sellerId)) return unfollowSeller(sellerId);
    return followSeller(sellerId);
  };

  const isFollowing = (sellerId) => {
    const exactMatch = followedSellers.includes(sellerId);
    const normalizedSellerId = sellerId == null ? null : String(sellerId).trim();
    const normalizedFollowedSellers = followedSellers.map((value) => String(value).trim());
    const normalizedMatch = normalizedSellerId != null && normalizedFollowedSellers.includes(normalizedSellerId);
    console.info("isFollowing identity audit", {
      sellerId,
      sellerIdType: typeof sellerId,
      normalizedSellerId,
      followedSellers,
      followedSellerTypes: followedSellers.map((value) => typeof value),
      exactMatch,
      normalizedMatch,
      source: "FollowContext",
    });
    return normalizedMatch;
  };
  const getFollowerCount = (sellerId) => {
    const sellerKey = normalizeSellerKey(sellerId);
    const count = followerCounts[sellerKey] ?? 0;
    console.info("follower count render lookup", {
      requestedSellerId: sellerId,
      requestedSellerIdType: typeof sellerId,
      normalizedSellerKey: sellerKey,
      followerCount: count,
      followerCountKeys: Object.keys(followerCounts),
    });
    return count;
  };

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
