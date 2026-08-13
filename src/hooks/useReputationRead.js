import { useEffect, useState } from "react";
import { getReputationSnapshot } from "../lib/api/reputation";
import { isSupabaseConfigured } from "../lib/supabaseClient";

export function useReputationSnapshot(userId) {
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setSnapshot(null);
    if (!userId || !isSupabaseConfigured) {
      console.info("reputation source: local fallback", { userId: userId ?? null });
      return () => {
        cancelled = true;
      };
    }

    getReputationSnapshot(userId)
      .then((nextSnapshot) => {
        if (cancelled) return;
        setSnapshot(nextSnapshot);
        console.info("reputation source: supabase", {
          userId,
          diagnostics: nextSnapshot?.diagnostics,
        });
      })
      .catch((error) => {
        if (!cancelled) console.info("reputation source: local fallback", { userId, error: error?.message ?? String(error) });
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return snapshot;
}
