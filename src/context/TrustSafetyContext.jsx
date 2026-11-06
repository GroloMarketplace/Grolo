import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { blockUser, getBlockedUsers, isUserBlocked, unblockUser } from "../lib/api/trustSafety";
import { getHiddenContent, hiddenContentKey, hideContent as persistHiddenContent, unhideContent as persistUnhiddenContent } from "../lib/api/hiddenContent";
import { isSupabaseConfigured } from "../lib/supabaseClient";

const TrustSafetyContext = createContext(null);

export function TrustSafetyProvider({ children }) {
  const { user } = useAuth();
  const [blockedUserIds, setBlockedUserIds] = useState(new Set());
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [explicitlyUnblockedUserIds, setExplicitlyUnblockedUserIds] = useState(new Set());
  const [lastBlockedUserId, setLastBlockedUserId] = useState(null);
  const [hiddenContentIds, setHiddenContentIds] = useState(new Set());

  useEffect(() => {
    let cancelled = false;
    if (!user?.id || !isSupabaseConfigured) {
      setBlockedUserIds(new Set());
      setBlockedUsers([]);
      setExplicitlyUnblockedUserIds(new Set());
      setLastBlockedUserId(null);
      setHiddenContentIds(new Set());
      return undefined;
    }
    setExplicitlyUnblockedUserIds(new Set());
    setLastBlockedUserId(null);
    getBlockedUsers(user.id)
      .then((rows) => { if (!cancelled) { setBlockedUsers(rows); setBlockedUserIds(new Set(rows.map((row) => String(row.blocked_id)))); } })
      .catch((error) => console.error("Unable to load blocked users", error));
    getHiddenContent(user.id)
      .then((keys) => { if (!cancelled) setHiddenContentIds(keys); })
      .catch((error) => console.error("Unable to load hidden content", error));
    return () => { cancelled = true; };
  }, [user?.id]);

  const refreshBlockedUsers = useCallback(async () => {
    if (!user?.id || !isSupabaseConfigured) return [];
    const rows = await getBlockedUsers(user.id);
    setBlockedUsers(rows);
    setBlockedUserIds(new Set(rows.map((row) => String(row.blocked_id))));
    return rows;
  }, [user?.id]);

  const isBlocked = useCallback((userId) => blockedUserIds.has(String(userId)), [blockedUserIds]);
  const checkBlocked = useCallback(async (userId) => {
    if (!user?.id || !userId || !isSupabaseConfigured) return false;
    if (explicitlyUnblockedUserIds.has(String(userId))) return false;
    return isUserBlocked(user.id, userId);
  }, [explicitlyUnblockedUserIds, user?.id]);
  const block = useCallback(async (userId) => {
    if (!user?.id) throw new Error("You must be signed in to block a user.");
    await blockUser(user.id, userId);
    setExplicitlyUnblockedUserIds((current) => {
      const next = new Set(current);
      next.delete(String(userId));
      return next;
    });
    setBlockedUserIds((current) => new Set([...current, String(userId)]));
    setBlockedUsers((current) => [...current, { blocked_id: userId, profile: { id: userId, avatar: null, name: "User", username: null } }]);
    setLastBlockedUserId(String(userId));
  }, [user?.id]);
  const unblock = useCallback(async (userId) => {
    if (!user?.id) return;
    await unblockUser(user.id, userId);
    setBlockedUserIds((current) => {
      const next = new Set(current);
      next.delete(String(userId));
      return next;
    });
    setBlockedUsers((current) => current.filter((item) => String(item.blocked_id) !== String(userId)));
    setExplicitlyUnblockedUserIds((current) => new Set([...current, String(userId)]));
    setLastBlockedUserId((current) => String(current) === String(userId) ? null : current);
  }, [user?.id]);

  const isHidden = useCallback((contentType, contentId) => hiddenContentIds.has(hiddenContentKey(contentType, contentId)), [hiddenContentIds]);
  const hideContent = useCallback(async (contentType, contentId) => {
    if (!user?.id) throw new Error("You must be signed in to hide content.");
    const key = hiddenContentKey(contentType, contentId);
    setHiddenContentIds((current) => new Set([...current, key]));
    try {
      await persistHiddenContent(user.id, contentType, contentId);
    } catch (error) {
      setHiddenContentIds((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
      throw error;
    }
  }, [user?.id]);
  const unhideContent = useCallback(async (contentType, contentId) => {
    if (!user?.id) return;
    const key = hiddenContentKey(contentType, contentId);
    setHiddenContentIds((current) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    });
    try {
      await persistUnhiddenContent(user.id, contentType, contentId);
    } catch (error) {
      setHiddenContentIds((current) => new Set([...current, key]));
      throw error;
    }
  }, [user?.id]);

  return <TrustSafetyContext.Provider value={{ blockedUserIds, blockedUsers, lastBlockedUserId, hiddenContentIds, isBlocked, checkBlocked, block, unblock, isHidden, hideContent, unhideContent, refreshBlockedUsers }}>{children}</TrustSafetyContext.Provider>;
}

export function useTrustSafety() {
  const context = useContext(TrustSafetyContext);
  if (!context) throw new Error("useTrustSafety must be used within a TrustSafetyProvider");
  return context;
}
