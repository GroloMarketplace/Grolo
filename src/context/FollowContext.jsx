import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { useTrustSafety } from "./TrustSafetyContext";
import { useActivity } from "./ActivityContext";

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

function isUuid(value) {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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
  const { recordActivity } = useActivity();
  const userKey = user?.id ?? "current-user";
  const [followedSellers, setFollowedSellers] = useState(() => readStoredFollowing(userKey));
  const [followerCounts, setFollowerCounts] = useState({});
  const [followsLoaded, setFollowsLoaded] = useState(false);
  const followedSellersRef = useRef(followedSellers);
  const followOperationsRef = useRef(new Map());
  followedSellersRef.current = followedSellers;

  const refreshFollowerCounts = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data, error } = await supabase.rpc("get_follower_counts");
    const targetSellerId = "33000873-0178-46fc-be96-038cfc464f8e";
    const targetCountRow = (data ?? []).find((row) => normalizeSellerKey(row.seller_id) === targetSellerId);
    if (error) {
      console.error("Unable to load follower counts", error);
      return;
    }
    const counts = (data ?? []).reduce((result, row) => {
      const sellerId = normalizeSellerKey(row.seller_id);
      if (sellerId) result[sellerId] = Number(row.follower_count) || 0;
      return result;
    }, {});
    setFollowerCounts(counts);
  }, []);

  useEffect(() => {
    setFollowedSellers(readStoredFollowing(userKey));
  }, [userKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadFollowRelationships() {
      setFollowsLoaded(false);
      if (!isSupabaseConfigured) {
        setFollowsLoaded(true);
        return;
      }
      if (!user?.id) return;
      const { data, error } = await supabase
        .from("user_follows")
        .select("*")
        .eq("follower_id", user.id);
      if (error || cancelled) {
        if (error) {
          console.error("Unable to load following rows", error);
          followedSellersRef.current = [];
          setFollowedSellers([]);
          persistFollowing(userKey, []);
        }
        if (!cancelled) setFollowsLoaded(true);
        return;
      }
      await refreshFollowerCounts();
      if (cancelled) return;
      if (user?.id) {
        const relationshipSellerIds = [...new Set((data ?? [])
          .map((row) => normalizeSellerKey(row.seller_id))
          .filter(Boolean))];
        const uuidSellerIds = relationshipSellerIds.filter(isUuid);
        const { data: profiles, error: profilesError } = uuidSellerIds.length
          ? await supabase.from("profiles").select("id").in("id", uuidSellerIds)
          : { data: [], error: null };
        if (cancelled) return;
        if (profilesError) console.error("Unable to resolve followed seller profiles", profilesError);
        const followedProfileIds = new Set((profiles ?? []).map((profile) => normalizeSellerKey(profile.id)));
        const uniqueFollowed = uuidSellerIds;
        setFollowedSellers(uniqueFollowed);
        persistFollowing(userKey, uniqueFollowed);
      }
      if (!cancelled) setFollowsLoaded(true);
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
    const sellerKey = normalizeSellerKey(sellerId);
    const expectedSellerId = "33000873-0178-46fc-be96-038cfc464f8e";
    const validationResult = {
      isUuid: isUuid(sellerKey),
      accepted: Boolean(sellerKey),
      expectedSellerId,
      matchesExpectedSellerId: sellerKey === expectedSellerId,
    };
    if (isSuspended) throw new Error("Your account is suspended and cannot follow sellers.");
    if (!sellerKey) {
      throw new Error("A valid seller profile id is required to follow a store.");
    }
    if (followedSellersRef.current.some((id) => normalizeSellerKey(id) === sellerKey)) {
      return true;
    }
    if (await checkBlocked(sellerId)) {
      return false;
    }
    const previous = followedSellersRef.current;
    const next = [...previous, sellerKey];
    setFollowedSellers(next);
    setFollowerCounts((current) => ({ ...current, [sellerKey]: (current[sellerKey] ?? 0) + 1 }));
    recordActivity({ id: `follow:${sellerKey}`, type: "Follow store", label: "Followed a store", entityId: sellerKey });
    persistFollowing(userKey, next);

    if (!isSupabaseConfigured || !user?.id) {
      return true;
    }
    const { data: existingRows, error: lookupError } = await supabase
      .from("user_follows")
      .select("follower_id, seller_id, created_at")
      .eq("follower_id", user.id)
      .eq("seller_id", sellerKey);
    const existingRow = existingRows?.[0] ?? null;
    if (lookupError) throw lookupError;
    if (!existingRows?.length) {
      const { data: insertData, error: insertError } = await supabase
        .from("user_follows")
        .insert({ follower_id: user.id, seller_id: sellerKey })
        .select("follower_id, seller_id, created_at");
      if (insertError && insertError.code !== "23505") throw insertError;
    } else {
    }
    await refreshFollowerCounts();
    return true;
  });

  const unfollowSeller = (sellerId) => enqueueFollowOperation(sellerId, async () => {
    const sellerKey = normalizeSellerKey(sellerId);
    if (!followedSellersRef.current.some((id) => normalizeSellerKey(id) === sellerKey)) return false;
    const previous = followedSellersRef.current;
    const next = previous.filter((id) => normalizeSellerKey(id) !== sellerKey);
    setFollowedSellers(next);
    setFollowerCounts((current) => ({ ...current, [sellerKey]: Math.max((current[sellerKey] ?? 1) - 1, 0) }));
    persistFollowing(userKey, next);

    if (isSupabaseConfigured && user?.id) {
      const { data: existingRows, error: lookupError } = await supabase
        .from("user_follows")
        .select("follower_id, seller_id, created_at")
        .eq("follower_id", user.id)
        .eq("seller_id", sellerId);
      if (lookupError) throw lookupError;
      const { error } = await supabase.from("user_follows").delete().eq("follower_id", user.id).eq("seller_id", sellerId);
      const { data: remainingRows } = await supabase.from("user_follows").select("follower_id, seller_id").eq("follower_id", user.id).eq("seller_id", sellerId);
      if (error) throw error;
      await refreshFollowerCounts();
    }
    return true;
  });

  const toggleFollow = (sellerId) => {
    const sellerKey = normalizeSellerKey(sellerId);
    const alreadyFollowing = followedSellersRef.current.some((id) => normalizeSellerKey(id) === sellerKey);
    if (alreadyFollowing) {
      return unfollowSeller(sellerId);
    }
    return followSeller(sellerId);
  };

  const isFollowing = (sellerId) => {
    const exactMatch = followedSellers.includes(sellerId);
    const normalizedSellerId = sellerId == null ? null : String(sellerId).trim();
    const normalizedFollowedSellers = followedSellers.map((value) => String(value).trim());
    const normalizedMatch = normalizedSellerId != null && normalizedFollowedSellers.includes(normalizedSellerId);
    return normalizedMatch;
  };
  const getFollowerCount = (sellerId) => {
    const sellerKey = normalizeSellerKey(sellerId);
    const count = followerCounts[sellerKey] ?? 0;
    return count;
  };

  return (
    <FollowContext.Provider value={{
      followedSellers,
      followsLoaded,
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
