import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

const ActivityContext = createContext(null);
const STORAGE_KEY = "grolo-activity";
const MAX_ACTIVITY_ITEMS = 100;

function readActivities(storageKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function writeActivities(storageKey, activities) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(activities));
  } catch {
    // Activity history is best effort when storage is unavailable.
  }
}

export function ActivityProvider({ children }) {
  const { user } = useAuth();
  const storageKey = `${STORAGE_KEY}-${user?.id ?? "anonymous"}`;
  const [activities, setActivities] = useState(() => readActivities(storageKey));

  useEffect(() => {
    setActivities(readActivities(storageKey));
  }, [storageKey]);

  const recordActivity = useCallback((activity) => {
    if (!activity?.type || !activity?.label) return;
    const nextActivity = {
      id: activity.id ?? `${activity.type}:${activity.entityId ?? Date.now()}`,
      type: activity.type,
      label: activity.label,
      timestamp: activity.timestamp ?? new Date().toISOString(),
      entityId: activity.entityId ?? null,
      ...activity,
    };
    setActivities((current) => {
      const withoutDuplicate = current.filter((item) => item.id !== nextActivity.id);
      const next = [nextActivity, ...withoutDuplicate].slice(0, MAX_ACTIVITY_ITEMS);
      writeActivities(storageKey, next);
      return next;
    });
  }, [storageKey]);

  return <ActivityContext.Provider value={{ activities, recordActivity }}>{children}</ActivityContext.Provider>;
}

export function useActivity() {
  const context = useContext(ActivityContext);
  if (!context) throw new Error("useActivity must be used within an ActivityProvider");
  return context;
}
