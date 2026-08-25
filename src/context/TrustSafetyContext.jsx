import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { blockUser, getBlockedUsers, isUserBlocked, unblockUser } from "../lib/api/trustSafety";
import { isSupabaseConfigured } from "../lib/supabaseClient";

const TrustSafetyContext = createContext(null);

export function TrustSafetyProvider({ children }) {
  const { user } = useAuth();
  const [blockedUserIds, setBlockedUserIds] = useState(new Set());

  useEffect(() => {
    let cancelled = false;
    if (!user?.id || !isSupabaseConfigured) {
      setBlockedUserIds(new Set());
      return undefined;
    }
    getBlockedUsers(user.id)
      .then((rows) => { if (!cancelled) setBlockedUserIds(new Set(rows.map((row) => String(row.blocked_id)))); })
      .catch((error) => console.error("Unable to load blocked users", error));
    return () => { cancelled = true; };
  }, [user?.id]);

  const isBlocked = useCallback((userId) => blockedUserIds.has(String(userId)), [blockedUserIds]);
  const checkBlocked = useCallback(async (userId) => {
    if (!user?.id || !userId || !isSupabaseConfigured) return false;
    return isUserBlocked(user.id, userId);
  }, [user?.id]);
  const block = useCallback(async (userId) => {
    if (!user?.id) throw new Error("You must be signed in to block a user.");
    await blockUser(user.id, userId);
    setBlockedUserIds((current) => new Set([...current, String(userId)]));
  }, [user?.id]);
  const unblock = useCallback(async (userId) => {
    if (!user?.id) return;
    await unblockUser(user.id, userId);
    setBlockedUserIds((current) => {
      const next = new Set(current);
      next.delete(String(userId));
      return next;
    });
  }, [user?.id]);

  return <TrustSafetyContext.Provider value={{ blockedUserIds, isBlocked, checkBlocked, block, unblock }}>{children}</TrustSafetyContext.Provider>;
}

export function useTrustSafety() {
  const context = useContext(TrustSafetyContext);
  if (!context) throw new Error("useTrustSafety must be used within a TrustSafetyProvider");
  return context;
}
