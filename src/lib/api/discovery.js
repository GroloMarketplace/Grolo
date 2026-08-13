import { categories as legacyCategories, communityPosts, followingPosts } from "../../data/mockData";
import { getMarketplaceEntities } from "./entities";
import { getReputationSnapshot } from "./reputation";
import { isSupabaseConfigured, supabase } from "../supabaseClient";

function sourceDiagnostics(source, extra = {}) {
  return { source, discovery_source: source, ...extra };
}

function logSource(message, diagnostics) {
  console.info(message, diagnostics);
}

function coordinatesFor(entity) {
  const latitude = Number(entity?.latitude ?? entity?.lat);
  const longitude = Number(entity?.longitude ?? entity?.lng ?? entity?.lon);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
}

function normalizeMapLocations(locations) {
  const withCoordinates = locations
    .map((location) => ({ ...location, coordinates: coordinatesFor(location) }))
    .filter((location) => location.coordinates);
  if (!withCoordinates.length) return locations;

  const latitudes = withCoordinates.map((location) => location.coordinates.latitude);
  const longitudes = withCoordinates.map((location) => location.coordinates.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latRange = maxLat - minLat || 1;
  const lngRange = maxLng - minLng || 1;

  return locations.map((location) => {
    const coordinates = coordinatesFor(location);
    if (!coordinates) return location;
    return {
      ...location,
      x: location.x ?? ((coordinates.longitude - minLng) / lngRange) * 80 + 10,
      y: location.y ?? (1 - (coordinates.latitude - minLat) / latRange) * 80 + 10,
      distanceKm: Number.isFinite(Number(location.distanceKm)) ? Number(location.distanceKm) : 0,
    };
  });
}

function listingMatchesId(listing, requestedId) {
  return [listing?.id, listing?.legacyId, listing?.databaseId].filter(Boolean).map(String).includes(String(requestedId));
}

async function getCategories() {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      const categories = data ?? [];
      logSource("discovery source: supabase", { entityType: "categories", count: categories.length });
      return { values: categories, diagnostics: sourceDiagnostics("supabase", { count: categories.length }) };
    } catch (error) {
      console.warn("category discovery failed", { error: error?.message ?? String(error) });
    }
  }
  const values = Array.isArray(legacyCategories) ? legacyCategories : Object.values(legacyCategories);
  logSource("discovery source: legacy fallback", { entityType: "categories", count: values.length });
  return { values, diagnostics: sourceDiagnostics("legacy fallback", { count: values.length }) };
}

async function getPosts() {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from("community_posts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      const posts = data ?? [];
      logSource("discovery source: supabase", { entityType: "community posts", count: posts.length });
      return { values: posts, diagnostics: sourceDiagnostics("supabase", { count: posts.length }) };
    } catch (error) {
      console.warn("community post discovery failed", { error: error?.message ?? String(error) });
    }
  }
  const values = [...followingPosts, ...communityPosts];
  logSource("discovery source: legacy fallback", { entityType: "community posts", count: values.length });
  return { values, diagnostics: sourceDiagnostics("legacy fallback", { count: values.length }) };
}

export async function getStoreDiscovery() {
  const entities = await getMarketplaceEntities({ includeEvents: false, includeMapLocations: false });
  const listingCounts = entities.listings.reduce((counts, listing) => {
    const sellerId = listing.sellerId ?? listing.seller_id;
    if (sellerId) counts[sellerId] = (counts[sellerId] ?? 0) + 1;
    return counts;
  }, {});
  const stores = await Promise.all(entities.sellers.map(async (seller) => {
    const reputationSnapshot = seller.id ? await getReputationSnapshot(seller.id).catch(() => null) : null;
    return {
      ...seller,
      listingCount: listingCounts[seller.id] ?? 0,
      reputationSnapshot,
      diagnostics: sourceDiagnostics(reputationSnapshot ? "supabase" : entities.diagnostics.sellers?.source ?? "legacy fallback", {
        resolvedSellerId: seller.id,
        listingCount: listingCounts[seller.id] ?? 0,
      }),
    };
  }));
  const diagnostics = {
    ...entities.diagnostics,
    stores: sourceDiagnostics(entities.diagnostics.sellers?.source ?? "legacy fallback", { count: stores.length }),
  };
  logSource("discovery source: stores", diagnostics.stores);
  return { stores, listings: entities.listings, diagnostics };
}

export async function getEventDiscovery() {
  const entities = await getMarketplaceEntities({ includeEvents: true, includeMapLocations: false });
  const events = entities.events.map((event) => ({
    ...event,
    diagnostics: sourceDiagnostics(entities.diagnostics.events?.source ?? "legacy fallback", { eventId: event.id }),
  }));
  logSource("discovery source: events", { source: entities.diagnostics.events?.source ?? "legacy fallback", count: events.length });
  return { events, diagnostics: entities.diagnostics.events ?? sourceDiagnostics("legacy fallback", { count: events.length }) };
}

export async function getMapLocations() {
  const entities = await getMarketplaceEntities({ includeEvents: true, includeMapLocations: true });
  let locations = entities.mapLocations ?? [];
  let mapSource = entities.diagnostics.mapLocations?.source ?? "legacy fallback";

  if (!locations.length) {
    locations = [
      ...entities.sellers.map((seller) => ({
        id: `store-${seller.id}`,
        kind: "store",
        sellerId: seller.id,
        category: seller.category ?? "Store",
        ...coordinatesFor(seller),
      })),
      ...entities.events.map((event) => ({
        id: `event-${event.id}`,
        kind: "event",
        eventId: event.id,
        ...coordinatesFor(event),
      })),
      ...entities.listings.map((listing) => ({
        id: `product-${listing.id}`,
        kind: "product",
        productId: listing.id,
        ...coordinatesFor(listing),
      })),
    ];
    mapSource = "derived entities";
  }

  const normalizedLocations = normalizeMapLocations(locations);
  const diagnostics = {
    ...entities.diagnostics,
    map: sourceDiagnostics(mapSource, { count: normalizedLocations.length }),
  };
  logSource("map source: resolved", diagnostics.map);
  return { locations: normalizedLocations, diagnostics };
}

export async function getMarketplaceDiscovery() {
  const [stores, events, map, categories, posts] = await Promise.all([
    getStoreDiscovery(),
    getEventDiscovery(),
    getMapLocations(),
    getCategories(),
    getPosts(),
  ]);
  const listings = stores.listings;
  const diagnostics = {
    ...stores.diagnostics,
    events: events.diagnostics,
    map: map.diagnostics.map,
    categories: categories.diagnostics,
    posts: posts.diagnostics,
    discovery: sourceDiagnostics(
      [stores.diagnostics.stores?.source, events.diagnostics.source, map.diagnostics.map.source]
        .every((source) => source === "supabase") ? "supabase" : "legacy fallback",
      { listingCount: listings.length, storeCount: stores.stores.length, eventCount: events.events.length },
    ),
  };
  logSource("discovery source: marketplace", diagnostics.discovery);
  return {
    stores: stores.stores,
    listings,
    events: events.events,
    mapLocations: map.locations,
    categories: categories.values,
    posts: posts.values,
    diagnostics,
  };
}

export function findDiscoveryListing(listings, requestedId) {
  return listings.find((listing) => listingMatchesId(listing, requestedId)) ?? null;
}
