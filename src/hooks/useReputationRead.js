import { useEffect, useState } from "react";
import { getReputationSnapshot } from "../lib/api/reputation";
import { isSupabaseConfigured } from "../lib/supabaseClient";

export function useReputationSnapshot(userId) {
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setSnapshot(null);
    if (!userId || !isSupabaseConfigured) {
      return () => {
        cancelled = true;
      };
    }

    const loadSnapshot = () => {
      getReputationSnapshot(userId)
        .then((nextSnapshot) => {
          if (!cancelled) setSnapshot(nextSnapshot);
        })
        .catch(() => {});
    };
    const handleReputationUpdate = (event) => {
      if (!event.detail?.userId || event.detail.userId === userId || userId === "current-user") loadSnapshot();
    };

    loadSnapshot();
    window.addEventListener("grolo:reputation-updated", handleReputationUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener("grolo:reputation-updated", handleReputationUpdate);
    };
  }, [userId]);

  return snapshot;
}
