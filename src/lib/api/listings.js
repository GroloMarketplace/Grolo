import { supabase, isSupabaseConfigured } from "../supabaseClient";
import { validateListing } from "../../utils/validation";

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. See .env.example.");
  }
}

const LISTING_SELECT = "id,seller_id,legacy_id,title,name,description,category,subcategory,price,pricing_details,condition,inventory_quantity,trade_enabled,pickup_available,delivery_available,image_url,image_urls,location,status,metadata,created_at,updated_at,profiles!listings_seller_id_fkey(shop_name,shop_slug)";

function imageUrlsFor(listing) {
  const images = Array.isArray(listing.images) ? listing.images.filter(Boolean) : [];
  if (images.length) return images;
  return listing.image ? [listing.image] : [];
}

function rowForListing(listing, sellerId) {
  const imageUrls = imageUrlsFor(listing);
  const numericPrice = Number(listing.price);
  const isNumericPrice = Number.isFinite(numericPrice);
  return {
    seller_id: sellerId ?? listing.sellerId,
    legacy_id: listing.legacyId ?? listing.id,
    title: listing.title ?? listing.name ?? "Untitled listing",
    name: listing.name ?? listing.title ?? "Untitled listing",
    description: listing.description ?? "",
    category: listing.category || null,
    subcategory: listing.subcategory || null,
    price: isNumericPrice ? numericPrice : 0,
    pricing_details: isNumericPrice ? null : String(listing.price ?? ""),
    condition: listing.condition || null,
    inventory_quantity: Number.isFinite(Number(listing.quantityAvailable)) ? Number(listing.quantityAvailable) : 0,
    trade_enabled: Boolean(listing.tradeEnabled ?? listing.availableForTrade),
    pickup_available: listing.pickupAvailable !== false,
    delivery_available: Boolean(listing.deliveryAvailable),
    image_url: imageUrls[0] ?? null,
    image_urls: imageUrls,
    location: listing.location || null,
    status: listing.status ?? "Active",
    metadata: {
      ...(listing.metadata ?? {}),
      pricingType: listing.pricingType,
      serviceType: listing.serviceType,
      serviceArea: listing.serviceArea,
      availability: listing.availability,
      yearsOfExperience: listing.yearsOfExperience,
      preferredContactMethod: listing.preferredContactMethod,
      responseTime: listing.responseTime,
      desiredTradeItems: listing.desiredTradeItems,
      views: listing.views ?? 0,
      favorites: listing.favorites ?? 0,
      messages: listing.messages ?? 0,
      rating: listing.rating ?? 0,
      reviewCount: listing.reviewCount ?? 0,
    },
  };
}

export function listingFromRow(row) {
  const imageUrls = Array.isArray(row.image_urls) && row.image_urls.length
    ? row.image_urls
    : row.image_url ? [row.image_url] : [];
  const metadata = row.metadata ?? {};
  return {
    ...row,
    id: row.legacy_id ?? row.id,
    databaseId: row.id,
    legacyId: row.legacy_id,
    sellerId: row.seller_id,
    title: row.title ?? row.name,
    name: row.title ?? row.name,
    subcategory: row.subcategory,
    price: row.pricing_details || row.price,
    condition: row.condition,
    quantityAvailable: row.inventory_quantity ?? 0,
    availableForTrade: Boolean(row.trade_enabled),
    tradeEnabled: Boolean(row.trade_enabled),
    pickupAvailable: row.pickup_available !== false,
    deliveryAvailable: Boolean(row.delivery_available),
    image: imageUrls[0] ?? "",
    images: imageUrls,
    shop: row.profiles?.shop_name ?? "",
    location: row.location ?? "",
    status: row.status ?? "Active",
    isActive: (row.status ?? "Active") !== "Archived",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...metadata,
  };
}

export async function getListings({ category, limit = 50, offset = 0, sellerId, includeArchived = false } = {}) {
  requireSupabase();
  let query = supabase
    .from("listings")
    .select(LISTING_SELECT)
    .order("created_at", { ascending: false });
  if (category) query = query.eq("category", category);
  if (sellerId) query = query.eq("seller_id", sellerId);
  if (!includeArchived) query = query.eq("status", "Active");
  if (limit) query = query.range(offset, offset + limit - 1);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(listingFromRow);
}

export async function getListingById(id) {
  requireSupabase();
  const query = supabase.from("listings").select(LISTING_SELECT);
  const isUuid = typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  const { data, error } = await (isUuid
    ? query.eq("id", id).maybeSingle()
    : query.eq("legacy_id", id).maybeSingle());
  if (error) throw error;
  return data ? listingFromRow(data) : null;
}

export async function searchListings(queryText, { limit = 30, offset = 0 } = {}) {
  requireSupabase();
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .textSearch("search_vector", queryText, { type: "websearch" })
    .eq("status", "Active")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return (data ?? []).map(listingFromRow);
}

export async function getCategories() {
  requireSupabase();
  const { data, error } = await supabase.from("categories").select("*");
  if (error) throw error;
  return data;
}

export async function createListing(listing, sellerId) {
  requireSupabase();
  const validationError = validateListing(listing, listing.category === "Services");
  if (validationError) throw new Error(validationError);
  if (!listing.category) throw new Error("Choose a listing category.");
  if ((listing.images ?? []).length > 5) throw new Error("You can upload up to 5 listing images.");
  const payload = rowForListing(listing, sellerId);
  console.info("Supabase createListing payload", {
    ...payload,
    seller_id: sellerId,
  });
  const { data, error } = await supabase
    .from("listings")
    .insert(payload)
    .select(LISTING_SELECT)
    .single();
  if (error) {
    console.error("Supabase createListing error", {
      code: error.code ?? null,
      message: error.message ?? null,
      details: error.details ?? null,
      hint: error.hint ?? null,
      seller_id: sellerId,
      payload,
    });
    throw error;
  }
  console.info("Supabase createListing response", data);
  return listingFromRow(data);
}

export async function updateListing(listingId, updates, sellerId) {
  requireSupabase();
  const existing = await getListingById(listingId);
  if (!existing) throw new Error("Listing not found.");
  const merged = { ...existing, ...updates };
  const validationError = validateListing(merged, merged.category === "Services");
  if (validationError) throw new Error(validationError);
  if ((merged.images ?? []).length > 5) throw new Error("You can upload up to 5 listing images.");
  const payload = {
    ...rowForListing(merged, sellerId ?? existing.seller_id),
    updated_at: new Date().toISOString(),
  };
  console.info("Supabase updateListing payload", {
    listingId,
    databaseId: existing.databaseId,
    inventory_quantity: payload.inventory_quantity,
  });
  const { data, error } = await supabase
    .from("listings")
    .update(payload)
    .eq("id", existing.databaseId)
    .select(LISTING_SELECT)
    .single();
  if (error) throw error;
  console.info("Supabase updateListing response", {
    listingId,
    databaseId: data.id,
    inventory_quantity: data.inventory_quantity,
  });
  return listingFromRow(data);
}

export async function deleteListing(listingId) {
  requireSupabase();
  const existing = await getListingById(listingId);
  if (!existing) return { archived: false, listing: null };

  const { count, error: orderLookupError } = await supabase
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", existing.databaseId);
  if (orderLookupError) throw orderLookupError;

  if ((count ?? 0) > 0) {
    const { data, error } = await supabase
      .from("listings")
      .update({ status: "Archived", updated_at: new Date().toISOString() })
      .eq("id", existing.databaseId)
      .select(LISTING_SELECT)
      .single();
    if (error) throw error;
    return { archived: true, listing: listingFromRow(data) };
  }

  const { error } = await supabase.from("listings").delete().eq("id", existing.databaseId);
  if (error) throw error;
  return { archived: false, listing: existing };
}

export async function restoreListingInventory(items) {
  requireSupabase();
  for (const item of items) {
    const listing = await getListingById(item.productId ?? item.id);
    if (!listing) continue;
    const quantity = Math.max(0, Number(listing.quantityAvailable) || 0) + (Number(item.quantity) || 0);
    const { error } = await supabase
      .from("listings")
      .update({ inventory_quantity: quantity, updated_at: new Date().toISOString() })
      .eq("id", listing.databaseId);
    if (error) throw error;
  }
}

export async function importLegacyListings(listings, sellerId) {
  requireSupabase();
  const legacyListings = Array.isArray(listings) ? listings.filter((listing) => listing?.id) : [];
  if (!legacyListings.length) return [];

  const legacyIds = legacyListings.map((listing) => String(listing.id));
  const { data: existing, error: lookupError } = await supabase
    .from("listings")
    .select("legacy_id")
    .in("legacy_id", legacyIds);
  if (lookupError) throw lookupError;
  const existingIds = new Set((existing ?? []).map((row) => row.legacy_id));
  const pending = legacyListings.filter((listing) => !existingIds.has(String(listing.id)));
  if (!pending.length) return [];

  const { data, error } = await supabase
    .from("listings")
    .insert(pending.map((listing) => rowForListing(listing, sellerId)))
    .select(LISTING_SELECT);
  if (error) throw error;
  return (data ?? []).map(listingFromRow);
}
