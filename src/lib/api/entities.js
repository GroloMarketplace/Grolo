import { events as legacyEvents, mapLocations as legacyMapLocations, products as legacyProducts, sellers as legacySellers } from "../../data/mockData";
import { getListingById, getListings, listingFromRow } from "./listings";
import { getEvents } from "./events";
import { getReputationSnapshot } from "./reputation";
import { isSupabaseConfigured, supabase } from "../supabaseClient";
import { formatLocation } from "../../data/locations";

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

function isFoundingYearStore(value) {
  const date = value ? new Date(value) : null;
  return Boolean(date && !Number.isNaN(date.getTime()) && date.getUTCFullYear() === 2026);
}

function sellerProfileFromRow(row) {
  if (!row) return null;
  const profile = row.profiles ?? row.profile ?? row;
  const id = profile.id ?? row.seller_id ?? row.sellerId;
  const storeOpenedAt = profile.store_opened_at ?? profile.storeOpenedAt ?? null;
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
    location: formatLocation({ city: profile.city, province: profile.province, country: profile.country, location: profile.location }),
    avatar: profile.avatar_url ?? profile.avatar ?? "",
    banner: profile.banner_url ?? profile.banner ?? "",
    createdAt: profile.created_at ?? profile.createdAt ?? null,
    storeOpenedAt,
    foundingMember: Boolean(profile.founding_member ?? profile.foundingMember) || isFoundingYearStore(storeOpenedAt),
    storeProfile: Boolean(profile.shop_name || profile.store_onboarding_status || storeOpenedAt),
    isOfficial: Boolean(profile.is_official ?? profile.isOfficial),
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
    return fallback;
  }

  try {
    const rows = await getProfiles();
    const row = rows.find((profile) => profileMatches(profile, sellerId));
    if (row) {
      const seller = sellerProfileFromRow(row);
      return seller;
    }
  } catch (error) {
  }

  if (fallback) {
    return fallback;
  }
  return null;
}

export async function getSellerProfileForListing(listing) {
  const listingRecord = typeof listing === "object" ? listing : await getListingRecord(listing);
  const sellerId = listingRecord?.sellerId ?? listingRecord?.seller_id;
  const seller = await getSellerProfileById(sellerId);
  return seller;
}

export async function getListingWithSeller(listingId) {
  const listing = typeof listingId === "object" ? listingId : await getListingRecord(listingId);
  if (!listing) {
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
    return resolvedId;
  } catch {
    const fallback = typeof listingId === "object" ? listingId : legacyListing(requestedId);
    const resolvedId = fallback?.databaseId ?? fallback?.id ?? requestedId ?? null;
    return resolvedId;
  }
}

export async function resolveLegacySellerId(sellerId) {
  const requestedId = typeof sellerId === "object" ? sellerId.id ?? sellerId.sellerId ?? sellerId.legacyId : sellerId;
  if (isUuid(requestedId)) return requestedId;
  const seller = await getSellerProfileById(requestedId);
  const candidateId = seller?.databaseId ?? seller?.id;
  const resolvedId = isUuid(candidateId) ? candidateId : null;
  return resolvedId;
}

async function getEventsFromBackend() {
  return getEvents();
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
    }
    try {
      const profiles = await getProfiles();
      sellers = profiles.map(sellerProfileFromRow).filter((seller) => seller?.id);
      diagnostics.sellers = entityDiagnostics("supabase", { count: sellers.length });
    } catch (error) {
    }
    if (includeEvents) {
      try {
        events = await getEventsFromBackend();
        diagnostics.events = entityDiagnostics("supabase", { count: events.length });
      } catch (error) {
      }
    }
    if (includeMapLocations) {
      try {
        mapLocations = await getMapLocationsFromBackend();
        diagnostics.mapLocations = entityDiagnostics("supabase", { count: mapLocations.length });
      } catch (error) {
      }
    }
  }

  if (!listings.length) {
    listings = Object.values(legacyProducts);
    diagnostics.listings = entityDiagnostics("legacy fallback", { count: listings.length });
  }
  if (!sellers.length) {
    sellers = Object.values(legacySellers);
    diagnostics.sellers = entityDiagnostics("legacy fallback", { count: sellers.length });
  }
  if (includeEvents && !events.length) {
    events = Array.isArray(legacyEvents) ? legacyEvents : Object.values(legacyEvents);
    diagnostics.events = entityDiagnostics("legacy fallback", { count: events.length });
  }
  if (includeMapLocations && !mapLocations.length) {
    mapLocations = Array.isArray(legacyMapLocations) ? legacyMapLocations : Object.values(legacyMapLocations);
    diagnostics.mapLocations = entityDiagnostics("legacy fallback", { count: mapLocations.length });
  }

  return { listings, sellers, events, mapLocations, diagnostics };
}

export { listingFromRow };
