import { isSupabaseConfigured, supabase } from "../supabaseClient";

const VIEW_EVENT_TYPES = new Set(["listing_view", "promotion_view"]);
const recentEvents = new Map();

function storageKey(eventType, options) {
  return options.eventKey
    ?? [eventType, options.sellerId, options.listingId ?? "", options.promotionId ?? ""].join(":");
}

function wasRecordedInSession(key) {
  try {
    return window.sessionStorage.getItem(`grolo-analytics:${key}`) === "1";
  } catch {
    return false;
  }
}

function markRecordedInSession(key) {
  try {
    window.sessionStorage.setItem(`grolo-analytics:${key}`, "1");
  } catch {
  }
}

/** Fire-and-forget analytics. Tracking must never interrupt the user flow. */
export async function trackAnalyticsEvent(eventType, options = {}) {
  if (!isSupabaseConfigured || !supabase || !eventType || !options.sellerId) return false;

  const key = storageKey(eventType, options);
  const now = Date.now();
  if (VIEW_EVENT_TYPES.has(eventType) && wasRecordedInSession(key)) return false;
  if (now - (recentEvents.get(key) ?? 0) < 1000) return false;
  recentEvents.set(key, now);

  try {
    const { data: { user } = {} } = await supabase.auth.getUser();
    const payload = {
      seller_id: options.sellerId,
      listing_id: options.listingId ?? null,
      promotion_id: options.promotionId ?? null,
      event_type: eventType,
      user_id: user?.id ?? null,
      metadata: options.metadata ?? {},
    };
    const { error } = await supabase.from("vendor_analytics_events").insert(payload);
    if (error) throw error;
    if (VIEW_EVENT_TYPES.has(eventType) || options.persistInSession) markRecordedInSession(key);
    return true;
  } catch {
    return false;
  }
}

export async function getVendorAnalytics(sellerId, periodDays = 30) {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.rpc("get_vendor_analytics", {
    p_seller_id: sellerId,
    p_period_days: periodDays,
  });
  if (error) throw error;
  return data;
}
