import { events as legacyEvents, mapLocations as legacyMapLocations, products as legacyProducts, sellers as legacySellers } from "../../data/mockData";
import { getListingById, getListings, listingFromRow } from "./listings";
import { getReputationSnapshot } from "./reputation";
import { isSupabaseConfigured, supabase } from "../supabaseClient";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function entityDiagnostics(source, extra = {}) {
  return {
    source,
    entity_source: source,
    ...extra,
  };
}

function logEntity(source, entityType, diagnostics) {
  const message = source === "supabase" ? "entity source: supabase" : "entity source: legacy fallback";
  console.info(message, { entityType, ...diagnostics });
}

function warnMissing(entityType, requestedId, diagnostics = {}) {
  console.warn("missing entity warning", {
    entityType,
    requestedId: requestedId ?? null,
    ...diagnostics,
  });
}

function sellerProfileFromRow(row) {
  if (!row) return null;
  const profile = row.profiles ?? row.profile ?? row;
  const id = profile.id ?? row.seller_id ?? row.sellerId;
  return {
    ...profile,
    id,
    databaseId: profile.id ?? id,
    legacyId: profile.legacy_id ?? profile.legacyId,
    sellerId: id,
    name: profile.shop_name ?? profile.display_name ?? profile.username ?? "",
    shopName: profile.shop_name ?? "",
    shopSlug: profile.shop_slug ?? "",
    description: profile.store_description ?? profile.bio ?? "",
    location: profile.store_location ?? profile.location ?? "",
    avatar: profile.avatar_url ?? profile.avatar ?? "",
    banner: profile.banner_url ?? profile.banner ?? "",
    storeProfile: Boolean(profile.shop_name || profile.store_onboarding_status || profile.store_opened_at),
  };
}

function profileMatches(row, requestedId) {
  const profile = row?.profiles ?? row?.profile ?? row;
  const requested = String(requestedId ?? "").toLowerCase();
  return [profile?.id, profile?.legacy_id, profile?.legacyId, profile?.username, profile?.shop_slug, profile?.shopSlug]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase() === requested);
}

function legacySeller(requestedId) {
  if (!requestedId) return null;
  const seller = legacySellers[requestedId]
    ?? Object.values(legacySellers).find((item) => [item.id, item.legacyId, item.username, item.shopSlug].includes(requestedId));
  return seller ? { ...seller, sellerId: seller.id, databaseId: seller.id, legacyId: seller.legacyId ?? seller.id } : null;
}

function legacyListing(requestedId) {
  if (!requestedId) return null;
  return (Array.isArray(legacyProducts) ? legacyProducts : Object.values(legacyProducts))
    .find((item) => [item.id, item.legacyId, item.databaseId].filter(Boolean).map(String).includes(String(requestedId))) ?? null;
}

async function getListingRecord(requestedId) {
  try {
    return await getListingById(requestedId);
  } catch (error) {
    const fallback = legacyListing(requestedId);
    if (!fallback) throw error;
    logEntity("legacy fallback", "listing", entityDiagnostics("legacy fallback", { requestedListingId: requestedId, resolvedListingId: fallback.id }));
    return fallback;
  }
}

async function getProfiles() {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from("profiles").select("*");
  if (error) throw error;
  return data ?? [];
}

export async function getSellerProfileById(sellerId) {
  const fallback = legacySeller(sellerId);
  if (!sellerId || !isSupabaseConfigured) {
    if (fallback) logEntity("legacy fallback", "seller", entityDiagnostics("legacy fallback", { requestedId: sellerId, resolvedSellerId: fallback.id }));
    else warnMissing("seller", sellerId, entityDiagnostics("legacy fallback", { resolvedSellerId: null }));
    return fallback;
  }

  try {
    const rows = await getProfiles();
    const row = rows.find((profile) => profileMatches(profile, sellerId));
    if (row) {
      const seller = sellerProfileFromRow(row);
      logEntity("supabase", "seller", entityDiagnostics("supabase", { requestedId: sellerId, resolvedSellerId: seller.id }));
      return seller;
    }
  } catch (error) {
    console.warn("seller entity lookup failed", { requestedId: sellerId, error: error?.message ?? String(error) });
  }

  if (fallback) {
    logEntity("legacy fallback", "seller", entityDiagnostics("legacy fallback", { requestedId: sellerId, resolvedSellerId: fallback.id }));
    return fallback;
  }
  warnMissing("seller", sellerId, entityDiagnostics("legacy fallback", { resolvedSellerId: null }));
  return null;
}

export async function getSellerProfileForListing(listing) {
  const listingRecord = typeof listing === "object" ? listing : await getListingRecord(listing);
  const sellerId = listingRecord?.sellerId ?? listingRecord?.seller_id;
  const seller = await getSellerProfileById(sellerId);
  if (!seller) warnMissing("seller", sellerId, { resolvedListingId: listingRecord?.databaseId ?? listingRecord?.id ?? null });
  return seller;
}

export async function getListingWithSeller(listingId) {
  const listing = typeof listingId === "object" ? listingId : await getListingRecord(listingId);
  if (!listing) {
    warnMissing("listing", listingId, { resolvedListingId: null });
    return null;
  }
  const seller = await getSellerProfileForListing(listing);
  const diagnostics = entityDiagnostics(seller ? "supabase" : "legacy fallback", {
    requestedListingId: typeof listingId === "object" ? listingId.id : listingId,
    resolvedListingId: listing.databaseId ?? listing.id,
    resolvedSellerId: seller?.id ?? listing.sellerId ?? null,
  });
  return { ...listing, seller, diagnostics };
}

export async function getStoreProfile(sellerId) {
  const seller = await getSellerProfileById(sellerId);
  if (!seller) return null;
  const reputation = isSupabaseConfigured ? await getReputationSnapshot(seller.id).catch(() => null) : null;
  return {
    ...seller,
    storeProfile: true,
    reputationSnapshot: reputation,
    diagnostics: entityDiagnostics(reputation ? "supabase" : "legacy fallback", {
      requestedSellerId: sellerId,
      resolvedSellerId: seller.id,
    }),
  };
}

export async function getPublicProfile(userId) {
  const profile = await getSellerProfileById(userId);
  if (!profile) return null;
  const reputation = isSupabaseConfigured ? await getReputationSnapshot(profile.id).catch(() => null) : null;
  return {
    ...profile,
    publicProfile: true,
    reputationSnapshot: reputation,
    diagnostics: entityDiagnostics(reputation ? "supabase" : "legacy fallback", {
      requestedUserId: userId,
      resolvedSellerId: profile.id,
    }),
  };
}

export async function resolveLegacyProductId(listingId) {
  const requestedId = typeof listingId === "object" ? listingId.databaseId ?? listingId.id ?? listingId.legacyId : listingId;
  if (isUuid(requestedId)) return requestedId;
  try {
    const listing = await getListingById(requestedId);
    const resolvedId = listing?.databaseId ?? listing?.id ?? requestedId ?? null;
    console.info("entity source: supabase", { entityType: "listing id", requestedListingId: requestedId, resolvedListingId: resolvedId });
    return resolvedId;
  } catch {
    const fallback = typeof listingId === "object" ? listingId : legacyListing(requestedId);
    const resolvedId = fallback?.databaseId ?? fallback?.id ?? requestedId ?? null;
    console.info("entity source: legacy fallback", { entityType: "listing id", requestedListingId: requestedId, resolvedListingId: resolvedId });
    return resolvedId;
  }
}

export async function resolveLegacySellerId(sellerId) {
  const requestedId = typeof sellerId === "object" ? sellerId.id ?? sellerId.sellerId ?? sellerId.legacyId : sellerId;
  if (isUuid(requestedId)) return requestedId;
  const seller = await getSellerProfileById(requestedId);
  const resolvedId = seller?.databaseId ?? seller?.id ?? requestedId ?? null;
  console.info(`entity source: ${seller ? "supabase" : "legacy fallback"}`, {
    entityType: "seller id",
    requestedSellerId: requestedId,
    resolvedSellerId: resolvedId,
  });
  return resolvedId;
}

async function getEventsFromBackend() {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.from("events").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((event) => ({ ...event, id: event.legacy_id ?? event.id, databaseId: event.id, legacyId: event.legacy_id, sellerId: event.seller_id, createdAt: event.created_at }));
}

async function getMapLocationsFromBackend() {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.from("map_locations").select("*");
  if (error) throw error;
  return data ?? [];
}

export async function getMarketplaceEntities({ includeEvents = true, includeMapLocations = true } = {}) {
  const diagnostics = {};
  let listings = [];
  let sellers = [];
  let events = [];
  let mapLocations = [];

  if (isSupabaseConfigured) {
    try {
      listings = await getListings();
      diagnostics.listings = entityDiagnostics("supabase", { count: listings.length });
    } catch (error) {
      console.warn("listing entity lookup failed", { error: error?.message ?? String(error) });
    }
    try {
      const profiles = await getProfiles();
      sellers = profiles.map(sellerProfileFromRow).filter((seller) => seller?.id);
      diagnostics.sellers = entityDiagnostics("supabase", { count: sellers.length });
    } catch (error) {
      console.warn("seller entity lookup failed", { error: error?.message ?? String(error) });
    }
    if (includeEvents) {
      try {
        events = await getEventsFromBackend();
        diagnostics.events = entityDiagnostics("supabase", { count: events.length });
      } catch (error) {
        console.warn("event entity lookup failed", { error: error?.message ?? String(error) });
      }
    }
    if (includeMapLocations) {
      try {
        mapLocations = await getMapLocationsFromBackend();
        diagnostics.mapLocations = entityDiagnostics("supabase", { count: mapLocations.length });
      } catch (error) {
        console.warn("map location entity lookup failed", { error: error?.message ?? String(error) });
      }
    }
  }

  if (!listings.length) {
    listings = Object.values(legacyProducts);
    diagnostics.listings = entityDiagnostics("legacy fallback", { count: listings.length });
    logEntity("legacy fallback", "listing collection", diagnostics.listings);
  }
  if (!sellers.length) {
    sellers = Object.values(legacySellers);
    diagnostics.sellers = entityDiagnostics("legacy fallback", { count: sellers.length });
    logEntity("legacy fallback", "seller collection", diagnostics.sellers);
  }
  if (includeEvents && !events.length) {
    events = Array.isArray(legacyEvents) ? legacyEvents : Object.values(legacyEvents);
    diagnostics.events = entityDiagnostics("legacy fallback", { count: events.length });
    logEntity("legacy fallback", "event collection", diagnostics.events);
  }
  if (includeMapLocations && !mapLocations.length) {
    mapLocations = Array.isArray(legacyMapLocations) ? legacyMapLocations : Object.values(legacyMapLocations);
    diagnostics.mapLocations = entityDiagnostics("legacy fallback", { count: mapLocations.length });
    logEntity("legacy fallback", "map location collection", diagnostics.mapLocations);
  }

  return { listings, sellers, events, mapLocations, diagnostics };
}

export { listingFromRow };
