import { isSupabaseConfigured, supabase } from "../supabaseClient";

const DEFAULT_EVENT_IMAGE = "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80";

function eventFromRow(row) {
  if (!row) return null;
  const profile = row.profiles ?? row.profile ?? null;
  return {
    ...row,
    id: row.legacy_id ?? row.id,
    databaseId: row.id,
    legacyId: row.legacy_id,
    sellerId: row.seller_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startTime: row.start_time,
    endTime: row.end_time,
    image: row.image_url ?? row.image ?? DEFAULT_EVENT_IMAGE,
    capacity: row.capacity ?? "",
    visibility: row.visibility ?? "public",
    seller: profile ? {
      ...profile,
      id: profile.id,
      name: profile.shop_name ?? profile.display_name ?? profile.username ?? "",
      description: profile.store_description ?? profile.bio ?? "",
      location: profile.store_location ?? profile.location ?? "",
      avatar: profile.avatar_url ?? "",
      banner: profile.banner_url ?? "",
    } : null,
    diagnostics: { source: "supabase", event_source: "supabase" },
  };
}

function eventPayload(event, ownerId) {
  return {
    legacy_id: event.legacyId ?? event.id ?? null,
    seller_id: ownerId ?? event.sellerId,
    title: event.title ?? "",
    type: event.type ?? "",
    date: event.date ?? null,
    start_time: event.startTime ?? event.start_time ?? null,
    end_time: event.endTime ?? event.end_time ?? null,
    location: event.location ?? "",
    description: event.description ?? "",
    image_url: event.image ?? event.image_url ?? DEFAULT_EVENT_IMAGE,
    capacity: event.capacity === "" ? null : (event.capacity ?? null),
    visibility: event.visibility ?? "public",
    likes: event.likes ?? 0,
    comments: event.comments ?? 0,
    reposts: event.reposts ?? 0,
    shares: event.shares ?? 0,
  };
}

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user?.id) throw new Error("You must be signed in to manage events.");
  return data.user.id;
}

function logEventSource(source, operation, extra = {}) {
  const message = source === "supabase" ? "event source: supabase" : "event source: local fallback";
  console.info(message, { operation, ...extra });
}

export async function getEvents() {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from("events")
    .select("*, profiles(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const events = (data ?? []).map(eventFromRow);
  logEventSource("supabase", "getEvents", { count: events.length });
  return events;
}

export async function getEvent(eventId) {
  if (!isSupabaseConfigured) return null;
  const query = supabase.from("events").select("*, profiles(*)");
  const { data, error } = await (isUuid(eventId) ? query.eq("id", eventId) : query.eq("legacy_id", eventId)).maybeSingle();
  if (error) throw error;
  const event = eventFromRow(data);
  logEventSource("supabase", "getEvent", { eventId, found: Boolean(event) });
  return event;
}

export async function createEvent(event) {
  if (!isSupabaseConfigured) return null;
  const ownerId = await currentUserId();
  const { data, error } = await supabase
    .from("events")
    .insert(eventPayload(event, ownerId))
    .select("*, profiles(*)")
    .single();
  if (error) throw error;
  const created = eventFromRow(data);
  logEventSource("supabase", "createEvent", { eventId: created.id, sellerId: ownerId });
  return created;
}

export async function updateEvent(eventId, updates) {
  if (!isSupabaseConfigured) return null;
  const ownerId = await currentUserId();
  const payload = eventPayload(updates, ownerId);
  delete payload.legacy_id;
  delete payload.seller_id;
  const query = supabase.from("events").update(payload).eq("seller_id", ownerId);
  const { data, error } = await (isUuid(eventId) ? query.eq("id", eventId) : query.eq("legacy_id", eventId)).select("*, profiles(*)").single();
  if (error) throw error;
  const updated = eventFromRow(data);
  logEventSource("supabase", "updateEvent", { eventId: updated.id, sellerId: ownerId });
  return updated;
}

export async function deleteEvent(eventId) {
  if (!isSupabaseConfigured) return null;
  const ownerId = await currentUserId();
  const query = supabase.from("events").delete().eq("seller_id", ownerId);
  const { error } = await (isUuid(eventId) ? query.eq("id", eventId) : query.eq("legacy_id", eventId));
  if (error) throw error;
  logEventSource("supabase", "deleteEvent", { eventId, sellerId: ownerId });
  return true;
}

function isUuid(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export { DEFAULT_EVENT_IMAGE, eventFromRow };
