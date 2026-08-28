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

    getReputationSnapshot(userId)
      .then((nextSnapshot) => {
        if (cancelled) return;
        setSnapshot(nextSnapshot);
      })
      .catch((error) => {
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return snapshot;
}
