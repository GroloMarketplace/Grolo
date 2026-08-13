import { supabase, isSupabaseConfigured } from "../supabaseClient";

const REVIEW_TYPES = new Set(["product", "seller", "buyer"]);
const REVIEW_SELECT = "id, review_type, reviewer_id, reviewee_id, listing_id, order_id, order_item_id, rating, title, body, criteria, photos, status, created_at, updated_at, published_at, deleted_at";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. See .env.example.");
  }
}

function isCanonicalUuid(value) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function profileName(profile, fallback) {
  return profile?.display_name
    ?? profile?.username
    ?? profile?.shop_name
    ?? fallback;
}

function legacyCriteria(criteria) {
  if (Array.isArray(criteria)) return criteria;
  if (!criteria || typeof criteria !== "object") return [];
  if (Array.isArray(criteria.selected)) return criteria.selected;
  return Object.entries(criteria)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([name]) => name);
}

function databaseStatusToLegacyFlags(row) {
  const status = row.status ?? "published";
  return {
    public: status === "published" && !row.deleted_at,
    deleted: status === "removed" || Boolean(row.deleted_at),
    draft: status === "draft",
    private: status === "hidden",
  };
}

function legacyDate(timestamp) {
  if (!timestamp) return undefined;
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime())
    ? undefined
    : parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function listingFor(row, listingsById) {
  return row.listing_id ? listingsById.get(row.listing_id) : null;
}

export function databaseReviewToLegacyReview(row, { profilesById = new Map(), listingsById = new Map() } = {}) {
  if (!row) return null;
  const reviewType = REVIEW_TYPES.has(row.review_type) ? row.review_type : "product";
  const reviewerProfile = profilesById.get(row.reviewer_id);
  const revieweeProfile = profilesById.get(row.reviewee_id);
  const listing = listingFor(row, listingsById);
  const flags = databaseStatusToLegacyFlags(row);
  const sellerId = reviewType === "buyer"
    ? row.reviewer_id
    : reviewType === "seller"
      ? row.reviewee_id
      : listing?.seller_id ?? row.reviewee_id ?? null;
  const buyerId = reviewType === "buyer" ? row.reviewee_id : row.reviewer_id;
  const buyerProfile = reviewType === "buyer" ? revieweeProfile : reviewerProfile;
  const reviewer = profileName(reviewerProfile, row.reviewer_id);
  const buyer = profileName(buyerProfile, buyerId);

  return {
    ...row,
    id: row.id,
    databaseId: row.id,
    reviewType,
    review_type: reviewType,
    reviewer,
    reviewerId: row.reviewer_id,
    reviewer_id: row.reviewer_id,
    buyer,
    buyerId,
    buyer_id: buyerId,
    revieweeId: row.reviewee_id,
    reviewee_id: row.reviewee_id,
    sellerId,
    seller_id: sellerId,
    listingId: listing?.legacy_id ?? row.listing_id,
    listing_id: row.listing_id,
    productId: listing?.legacy_id ?? row.listing_id,
    orderId: row.order_id,
    order_id: row.order_id,
    orderItemId: row.order_item_id,
    order_item_id: row.order_item_id,
    rating: Number(row.rating) || 0,
    title: row.title ?? "",
    body: row.body ?? "",
    text: row.body ?? "",
    notes: row.body ?? "",
    criteria: legacyCriteria(row.criteria),
    photos: Array.isArray(row.photos) ? row.photos : [],
    status: row.status ?? "published",
    createdAt: row.created_at,
    date: legacyDate(row.created_at),
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    deletedAt: row.deleted_at,
    avatar: reviewerProfile?.avatar_url,
    ...flags,
  };
}

function canonicalOrNull(value) {
  return value == null || value === "" ? null : isCanonicalUuid(value) ? value : null;
}

function databaseCriteria(criteria) {
  if (!criteria || typeof criteria !== "object") return {};
  if (!Array.isArray(criteria)) return criteria;
  return Object.fromEntries(criteria.filter(Boolean).map((name) => [name, true]));
}

export function legacyReviewToDatabasePayload(review, { reviewerId, reviewType, revieweeId, listingId, orderId, orderItemId } = {}) {
  const source = review && typeof review === "object" ? review : {};
  const resolvedType = reviewType
    ?? source.reviewType
    ?? source.review_type
    ?? (source.buyerId || source.buyer || source.criteria ? "buyer" : "product");
  const resolvedReviewerId = canonicalOrNull(reviewerId ?? source.reviewerId ?? source.reviewer_id ?? source.userId ?? source.user_id);
  const resolvedRevieweeId = canonicalOrNull(revieweeId ?? source.revieweeId ?? source.reviewee_id ?? (resolvedType === "buyer" ? source.buyerId ?? source.buyer_id : source.sellerId ?? source.seller_id));
  const resolvedListingId = canonicalOrNull(listingId ?? source.listingId ?? source.listing_id ?? source.productId ?? source.product_id);
  const resolvedOrderId = canonicalOrNull(orderId ?? source.orderId ?? source.order_id);
  const resolvedOrderItemId = canonicalOrNull(orderItemId ?? source.orderItemId ?? source.order_item_id);
  const status = source.status
    ?? (source.deleted ? "removed" : source.private ? "hidden" : source.draft ? "draft" : "published");

  return {
    ...(canonicalOrNull(source.databaseId ?? source.id) ? { id: canonicalOrNull(source.databaseId ?? source.id) } : {}),
    review_type: resolvedType,
    reviewer_id: resolvedReviewerId,
    reviewee_id: resolvedRevieweeId,
    listing_id: resolvedListingId,
    order_id: resolvedOrderId,
    order_item_id: resolvedOrderItemId,
    rating: Number(source.rating) || 0,
    title: source.title ?? null,
    body: source.body ?? source.text ?? source.notes ?? null,
    criteria: databaseCriteria(source.criteria),
    photos: Array.isArray(source.photos) ? source.photos : [],
    status,
  };
}

async function attachReviewMetadata(rows) {
  const profileIds = [...new Set(rows.flatMap((row) => [row.reviewer_id, row.reviewee_id]).filter(Boolean))];
  const listingIds = [...new Set(rows.map((row) => row.listing_id).filter(Boolean))];
  const [profileResult, listingResult] = await Promise.all([
    profileIds.length
      ? supabase.from("profiles").select("id, display_name, username, shop_name, avatar_url").in("id", profileIds)
      : Promise.resolve({ data: [], error: null }),
    listingIds.length
      ? supabase.from("listings").select("id, legacy_id, seller_id").in("id", listingIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (listingResult.error) throw listingResult.error;
  return {
    profilesById: new Map((profileResult.data ?? []).map((profile) => [profile.id, profile])),
    listingsById: new Map((listingResult.data ?? []).map((listing) => [listing.id, listing])),
  };
}

async function getReviewsByType(reviewType, filterColumn, filterValue) {
  requireSupabase();
  if (!REVIEW_TYPES.has(reviewType)) throw new Error("Review type is invalid.");
  let query = supabase
    .from("reviews")
    .select(REVIEW_SELECT)
    .eq("review_type", reviewType)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (filterColumn && filterValue != null) query = query.eq(filterColumn, filterValue);
  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];
  const metadata = await attachReviewMetadata(rows);
  const mapped = rows.map((row) => databaseReviewToLegacyReview(row, metadata)).filter(Boolean);
  console.info("Supabase review read", {
    reviewReadCount: rows.length,
    mappedReviewCount: mapped.length,
    productReviewCount: reviewType === "product" ? mapped.length : 0,
    sellerReviewCount: reviewType === "seller" ? mapped.length : 0,
    buyerReviewCount: reviewType === "buyer" ? mapped.length : 0,
  });
  return mapped;
}

export function getProductReviews(listingId) {
  return getReviewsByType("product", "listing_id", listingId);
}

export function getSellerReviews(sellerId) {
  return getReviewsByType("seller", "reviewee_id", sellerId);
}

export function getBuyerReviews(buyerId) {
  return getReviewsByType("buyer", "reviewee_id", buyerId);
}
