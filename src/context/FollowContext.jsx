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
    console.log("FOLLOWER COUNT RPC RESULT", {
      data,
      error,
      errorDetails: error ? {
        name: error.name ?? null,
        message: error.message ?? null,
        code: error.code ?? null,
        details: error.details ?? null,
        hint: error.hint ?? null,
      } : null,
    });
    console.log("FOLLOWER COUNT RPC RAW", data);
    const targetSellerId = "33000873-0178-46fc-be96-038cfc464f8e";
    const targetCountRow = (data ?? []).find((row) => normalizeSellerKey(row.seller_id) === targetSellerId);
    console.log("FOLLOWER COUNT RPC TARGET RECORD", {
      sellerId: targetSellerId,
      record: targetCountRow ?? null,
      found: Boolean(targetCountRow),
    });
    if (error) {
      console.error("Unable to load follower counts", error);
      return;
    }
    const counts = (data ?? []).reduce((result, row) => {
      const sellerId = normalizeSellerKey(row.seller_id);
      if (sellerId) result[sellerId] = Number(row.follower_count) || 0;
      return result;
    }, {});
    console.log("FOLLOWER COUNT MAP", counts);
    console.info("follower counts source audit", {
      source: "get_follower_counts",
      rpc_rows: data ?? [],
      follower_counts: counts,
      follower_count_keys: Object.keys(counts),
      target_seller_id: targetSellerId,
      target_count: counts[targetSellerId] ?? null,
    });
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
      console.log("RAW USER_FOLLOWS REHYDRATION QUERY", {
        userId: user.id,
        data,
        error,
        cachedFollowedSellerIdsBeforeReplacement: followedSellersRef.current,
      });
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
        console.info("following rows source audit", {
          source: "user_follows",
          profile_source: "profiles.id",
          follower_id: user.id,
          following_row_count: uniqueFollowed.length,
          followed_store_ids: uniqueFollowed,
          relationship_seller_ids: relationshipSellerIds,
          resolved_profile_ids: [...followedProfileIds],
          relationship_profile_matches: uuidSellerIds.map((sellerId) => ({
            seller_id: sellerId,
            profile_id_match: followedProfileIds.has(sellerId),
          })),
        });
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
    console.info("follow store mutation audit", {
      currentUserId: user?.id ?? null,
      sellerProfileId: sellerId && typeof sellerId === "object" ? sellerId.id ?? null : sellerId,
      normalizedSellerId: sellerKey,
      validationResult,
      isSupabaseConfigured,
    });
    if (isSuspended) throw new Error("Your account is suspended and cannot follow sellers.");
    if (!sellerKey) {
      console.log("FOLLOW BEFORE INVALID SELLER RETURN", { currentUserId: user?.id ?? null, sellerId, normalizedSellerId: sellerKey });
      throw new Error("A valid seller profile id is required to follow a store.");
    }
    if (followedSellersRef.current.some((id) => normalizeSellerKey(id) === sellerKey)) {
      console.log("FOLLOW BEFORE ALREADY FOLLOWING RETURN", { currentUserId: user?.id ?? null, sellerId: sellerKey });
      console.info("follow store mutation skipped", { reason: "already-following", currentUserId: user?.id ?? null, normalizedSellerId: sellerKey });
      return true;
    }
    if (await checkBlocked(sellerId)) {
      console.log("FOLLOW BEFORE BLOCKED RETURN", { currentUserId: user?.id ?? null, sellerId: sellerKey });
      console.warn("Follow blocked by trust and safety", { sellerId });
      return false;
    }
    const previous = followedSellersRef.current;
    const next = [...previous, sellerKey];
    setFollowedSellers(next);
    setFollowerCounts((current) => ({ ...current, [sellerKey]: (current[sellerKey] ?? 0) + 1 }));
    persistFollowing(userKey, next);

    console.log("FOLLOW BEFORE LOOKUP", {
      currentUserId: user?.id ?? null,
      sellerId: sellerKey,
      isSupabaseConfigured,
    });
    if (!isSupabaseConfigured || !user?.id) {
      console.log("FOLLOW BEFORE LOCAL/UNAUTHENTICATED RETURN", { currentUserId: user?.id ?? null, sellerId: sellerKey });
      return true;
    }
    const { data: existingRows, error: lookupError } = await supabase
      .from("user_follows")
      .select("follower_id, seller_id, created_at")
      .eq("follower_id", user.id)
      .eq("seller_id", sellerKey);
    const existingRow = existingRows?.[0] ?? null;
    console.log("FOLLOW EXISTING ROW CHECK", existingRow);
    console.info("follow row lookup audit", {
      follower_id: user.id,
      store_id: sellerKey,
      user_id: user.id,
      existing_row: existingRow,
      lookup_error: lookupError?.message ?? null,
    });
    if (lookupError) throw lookupError;
    if (!existingRows?.length) {
      console.log("FOLLOW BEFORE INSERT", {
        currentUserId: user.id,
        sellerId: sellerKey,
      });
      const { data: insertData, error: insertError } = await supabase
        .from("user_follows")
        .insert({ follower_id: user.id, seller_id: sellerKey })
        .select("follower_id, seller_id, created_at");
      console.log("FOLLOW INSERT RESULT", {
        insertData,
        insertError,
        currentUserId: user.id,
        sellerId: sellerKey,
      });
      console.info("follow store Supabase insert response", {
        currentUserId: user.id,
        sellerProfileId: sellerId,
        normalizedSellerId: sellerKey,
        insertedSellerId: sellerKey,
        supabaseData: insertData ?? null,
        supabaseError: insertError ?? null,
        insertedRowCount: insertData?.length ?? 0,
      });
      if (insertError && insertError.code !== "23505") throw insertError;
    } else {
      console.info("follow store Supabase insert response", {
        currentUserId: user.id,
        sellerProfileId: sellerId,
        normalizedSellerId: sellerKey,
        insertedSellerId: null,
        supabaseData: null,
        supabaseError: null,
        skipped: "existing user_follows row",
      });
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
      const { data: remainingRows } = await supabase.from("user_follows").select("follower_id, seller_id").eq("follower_id", user.id).eq("seller_id", sellerId);
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
    const sellerKey = normalizeSellerKey(sellerId);
    const alreadyFollowing = followedSellersRef.current.some((id) => normalizeSellerKey(id) === sellerKey);
    console.log("FOLLOW CLICK START", {
      currentUserId: user?.id ?? null,
      sellerId,
      normalizedSellerId: sellerKey,
      alreadyFollowing,
    });
    if (alreadyFollowing) {
      console.log("FOLLOW BEFORE UNFOLLOW RETURN", { currentUserId: user?.id ?? null, sellerId: sellerKey });
      return unfollowSeller(sellerId);
    }
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
    console.log("FOLLOWER COUNT LOOKUP", {
      requestedSellerId: sellerId,
      normalizedSellerId: sellerKey,
      followerCounts,
      valueReadFromMap: count,
    });
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
