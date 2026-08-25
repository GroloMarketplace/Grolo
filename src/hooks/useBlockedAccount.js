import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTrustSafety } from "../context/TrustSafetyContext";

export function useBlockedAccount(userId) {
  const { user } = useAuth();
  const { isBlocked, checkBlocked } = useTrustSafety();
  const [blocked, setBlocked] = useState(() => isBlocked(userId));

  useEffect(() => {
    let cancelled = false;
    setBlocked(isBlocked(userId));
    if (!user?.id || !userId || String(user.id) === String(userId)) return undefined;
    checkBlocked(userId)
      .then((result) => { if (!cancelled) setBlocked(Boolean(result)); })
      .catch((error) => console.warn("Unable to check account visibility", { userId, error: error?.message ?? String(error) }));
    return () => { cancelled = true; };
  }, [checkBlocked, isBlocked, user?.id, userId]);

  return blocked;
}
