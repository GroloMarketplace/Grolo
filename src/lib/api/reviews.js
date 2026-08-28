import { isSupabaseConfigured, supabase, supabaseEnvironmentDiagnostics, supabaseProjectReference, supabaseProjectUrl } from "../supabaseClient";

const REVIEW_TYPES = new Set(["product", "seller", "buyer"]);
const REVIEW_SELECT = `
id,
review_type,
reviewer_id,
reviewee_id,
listing_id,
order_id,
order_item_id,
rating,
title,
body,
criteria,
photos,
status,
created_at,
updated_at,
published_at,
deleted_at
`;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. See .env.example.");
  }
}

function classifyReviewRpcError(error) {
  const text = `${error?.code ?? ""} ${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();
  if (text.includes("could not find the function") || text.includes("404")) return "function_not_found_or_schema_cache";
  if (text.includes("permission denied") || text.includes("42501")) return "permission_denied";
  if (text.includes("row-level security") || text.includes("rls")) return "rls_violation";
  if (text.includes("completed order")) return "completed_order_validation_failure";
  if (text.includes("seller and the buyer") || text.includes("matching purchased listing")) return "seller_buyer_relationship_validation_failure";
  if (text.includes("review type") || text.includes("rating") || text.includes("criteria") || text.includes("photos")) return "review_validation_failure";
  return "unknown_database_or_http_error";
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

export function databaseReviewToLegacyReview(row, { profilesById = new Map(), listingsById = new Map(), ordersById = new Map() } = {}) {
  if (!row) return null;
  const reviewType = REVIEW_TYPES.has(row.review_type) ? row.review_type : "product";
  const reviewerProfile = profilesById.get(row.reviewer_id);
  const revieweeProfile = profilesById.get(row.reviewee_id);
  const listing = listingFor(row, listingsById);
  const order = ordersById.get(row.order_id);
  const legacyOrderId = order?.metadata?.legacy_order_id ?? order?.metadata?.legacyOrderId ?? row.order_id;
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
    sellerName: reviewType === "buyer"
      ? reviewerProfile?.shop_name ?? reviewerProfile?.display_name ?? reviewerProfile?.username ?? null
      : null,
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
    orderId: legacyOrderId,
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
  const resolvedListingId = resolvedType === "product"
    ? canonicalOrNull(listingId ?? source.listingId ?? source.listing_id ?? source.productId ?? source.product_id)
    : null;
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
  const orderIds = [...new Set(rows.map((row) => row.order_id).filter(Boolean))];
  const [profileResult, listingResult, orderResult] = await Promise.all([
    profileIds.length
      ? supabase.from("profiles").select("id, display_name, username, shop_name, avatar_url").in("id", profileIds)
      : Promise.resolve({ data: [], error: null }),
    listingIds.length
      ? supabase.from("listings").select("id, legacy_id, seller_id").in("id", listingIds)
      : Promise.resolve({ data: [], error: null }),
    orderIds.length
      ? supabase.from("orders").select("id, metadata").in("id", orderIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (listingResult.error) throw listingResult.error;
  if (orderResult.error) throw orderResult.error;
  return {
    profilesById: new Map((profileResult.data ?? []).map((profile) => [profile.id, profile])),
    listingsById: new Map((listingResult.data ?? []).map((listing) => [listing.id, listing])),
    ordersById: new Map((orderResult.data ?? []).map((order) => [order.id, order])),
  };
}

function isPublishedReview(review) {
  return (review.status ?? "published") === "published"
    && !review.deleted_at
    && !review.deleted
    && review.public !== false
    && !review.draft
    && !review.private;
}

export function publishedReviews(reviews) {
  return (Array.isArray(reviews) ? reviews : []).filter(isPublishedReview);
}

export function visibleReviews(reviews) {
  return publishedReviews(reviews);
}

export function reviewVisibilitySummary(reviews) {
  const rows = Array.isArray(reviews) ? reviews : [];
  const moderationStatus = rows.reduce((counts, row) => {
    const status = row.status ?? "published";
    counts[status] = (counts[status] ?? 0) + 1;
    return counts;
  }, {});
  const includedReviewCount = rows.filter(isPublishedReview).length;
  return {
    moderationStatus,
    includedReviewCount,
    excludedReviewCount: rows.length - includedReviewCount,
  };
}

function visibilityDiagnostics(rows, includedRows, source = "database status") {
  console.info("review visibility", {
    ...reviewVisibilitySummary(rows),
    visibilitySource: source,
    includedReviewCount: includedRows.length,
    excludedReviewCount: (rows ?? []).length - includedRows.length,
  });
}

function ratingAggregate(rows, key) {
  const groups = new Map();
  rows.forEach((row) => {
    const groupKey = row[key];
    if (!groupKey) return;
    const group = groups.get(groupKey) ?? { key: groupKey, sum: 0, count: 0, breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
    const rating = Number(row.rating) || 0;
    group.sum += rating;
    group.count += 1;
    if (group.breakdown[rating] != null) group.breakdown[rating] += 1;
    groups.set(groupKey, group);
  });
  return [...groups.values()].map((group) => ({
    [key]: group.key,
    average: group.count ? Number((group.sum / group.count).toFixed(1)) : 0,
    count: group.count,
    breakdown: group.breakdown,
  }));
}

export async function getProductRatingAggregates() {
  requireSupabase();
  const { data, error } = await supabase
    .from("reviews")
    .select("listing_id, rating");
  if (error) throw error;
  const includedRows = (data ?? []).filter(isPublishedReview);
  visibilityDiagnostics(data ?? [], includedRows);
  const aggregates = ratingAggregate(includedRows, "listing_id");
  console.info("product aggregate source: supabase", {
    aggregateReviewCount: includedRows.length,
    aggregateAverageRating: aggregates.length
      ? Number((includedRows.reduce((sum, row) => sum + (Number(row.rating) || 0), 0) / includedRows.length).toFixed(1))
      : 0,
  });
  return aggregates;
}

export async function getSellerRatingAggregates() {
  requireSupabase();
  const [{ data: reviews, error: reviewsError }, { data: listings, error: listingsError }, { data: orders, error: ordersError }] = await Promise.all([
    supabase
      .from("reviews")
      .select("listing_id,rating"),
    supabase
      .from("listings")
      .select("id,seller_id"),
    supabase
      .from("orders")
      .select("seller_id")
      .eq("status", "Completed"),
  ]);
  if (reviewsError) throw reviewsError;
  if (listingsError) throw listingsError;
  if (ordersError) throw ordersError;
  const sellerByListingId = new Map((listings ?? []).map((listing) => [String(listing.id), listing.seller_id]));
  const includedRows = (reviews ?? [])
    .filter(isPublishedReview)
    .map((review) => ({
      ...review,
      reviewee_id: sellerByListingId.get(String(review.listing_id)),
      review_type: "product",
    }))
    .filter((review) => review.reviewee_id);
  visibilityDiagnostics(reviews ?? [], includedRows);
  const aggregates = ratingAggregate(includedRows, "reviewee_id").map((aggregate) => ({
    ...aggregate,
    completedOrderCount: (orders ?? []).filter((order) => order.seller_id === aggregate.reviewee_id).length,
  }));
  console.info("seller aggregate source: supabase", {
    sourceReviewCount: reviews?.length ?? 0,
    includedReviewCount: includedRows.length,
    productReviewsIncluded: includedRows.filter((review) => review.review_type === "product").length,
    sellerReviewsIncluded: includedRows.filter((review) => review.review_type === "seller").length,
    aggregateReviewCount: aggregates.reduce((sum, aggregate) => sum + aggregate.count, 0),
    aggregateAverageRating: aggregates.length
      ? Number((includedRows.reduce((sum, row) => sum + (Number(row.rating) || 0), 0) / includedRows.length).toFixed(1))
      : 0,
  });
  return aggregates;
}

export async function getBuyerTrustAggregate(buyerId) {
  requireSupabase();
  if (!buyerId) return null;
  const [{ data: reviews, error: reviewsError }, { data: orders, error: ordersError }] = await Promise.all([
    supabase
      .from("reviews")
      .select("reviewee_id, criteria, order_id, status, deleted_at")
      .eq("review_type", "buyer")
      .eq("reviewee_id", buyerId),
    supabase
      .from("orders")
      .select("id")
      .eq("buyer_id", buyerId)
      .eq("status", "Completed"),
  ]);
  if (reviewsError) throw reviewsError;
  if (ordersError) throw ordersError;
  const buyerReviews = (reviews ?? []).filter(isPublishedReview);
  visibilityDiagnostics(reviews ?? [], buyerReviews);
  const aggregate = {
    buyerReviewCount: buyerReviews.length,
    sellerRecommendationCount: buyerReviews.filter((review) => review.criteria && Object.keys(review.criteria).length > 0).length,
    wouldTransactAgainCount: buyerReviews.filter((review) => Boolean(review.criteria?.["Would Transact Again"])).length,
    completedTransactionCount: (orders ?? []).length,
  };
  console.info("buyer trust aggregate source: supabase", {
    aggregateReviewCount: aggregate.buyerReviewCount,
    aggregateAverageRating: 0,
  });
  return aggregate;
}

async function getAuthenticatedUserId(requestedReviewerId) {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const authenticatedUserId = data.user?.id;
  if (!authenticatedUserId) throw new Error("Authentication is required to create a review.");
  if (requestedReviewerId && requestedReviewerId !== authenticatedUserId) {
    throw new Error("Review creation must use the authenticated reviewer.");
  }
  return authenticatedUserId;
}

export async function createReviewInDatabase(review, { reviewerId, reviewType, revieweeId, listingId, orderId, orderItemId } = {}) {
  console.info("reviews.js createReviewInDatabase called", {
    supabaseProjectUrl,
    supabaseProjectReference,
    supabaseEnvironmentDiagnostics,
    sellerId: reviewerId ?? null,
    buyerId: reviewType === "buyer" ? revieweeId ?? review?.buyerId ?? null : null,
    orderId: orderId ?? review?.orderId ?? null,
    listingId: listingId ?? review?.listingId ?? review?.productId ?? null,
    reviewType: reviewType ?? review?.reviewType ?? null,
  });
  requireSupabase();
  const authenticatedReviewerId = await getAuthenticatedUserId(reviewerId);
  const payload = legacyReviewToDatabasePayload(review, {
    reviewerId: authenticatedReviewerId,
    reviewType,
    revieweeId,
    listingId,
    orderId,
    orderItemId,
  });
  console.info("review insert payload", {
    sellerId: authenticatedReviewerId,
    buyerId: payload.review_type === "buyer" ? payload.reviewee_id : null,
    orderId: payload.order_id,
    listingId: payload.listing_id,
    reviewType: payload.review_type,
    payload,
  });
  let row;
  try {
    const rpcArgs = {
      p_review_type: payload.review_type,
      p_rating: payload.rating,
      p_order_id: payload.order_id,
      p_reviewee_id: payload.reviewee_id,
      p_listing_id: payload.listing_id,
      p_order_item_id: payload.order_item_id,
      p_title: payload.title,
      p_body: payload.body,
      p_criteria: payload.criteria,
      p_photos: payload.photos,
    };
    console.info("reviews.js create_review RPC called", {
      supabaseProjectUrl,
      supabaseProjectReference,
      sellerId: authenticatedReviewerId,
      buyerId: payload.review_type === "buyer" ? payload.reviewee_id : null,
      orderId: payload.order_id,
      listingId: payload.listing_id,
      reviewType: payload.review_type,
      rpcArgs,
    });
    const result = await supabase.rpc("create_review", rpcArgs);
    console.log("reviews.js create_review RPC full result", result);
    const { data, error, status, statusText } = result;
    console.info("reviews.js create_review RPC response", {
      sellerId: authenticatedReviewerId,
      buyerId: payload.review_type === "buyer" ? payload.reviewee_id : null,
      orderId: payload.order_id,
      listingId: payload.listing_id,
      reviewType: payload.review_type,
      data,
      error,
      errorCategory: classifyReviewRpcError(error),
      status,
      statusText,
    });
    if (error) throw error;
    row = Array.isArray(data) ? data[0] : data;
  } catch (rpcError) {
    console.error("reviews.js create_review RPC error", {
      sellerId: authenticatedReviewerId,
      buyerId: payload.review_type === "buyer" ? payload.reviewee_id : null,
      orderId: payload.order_id,
      listingId: payload.listing_id,
      reviewType: payload.review_type,
      errorCategory: classifyReviewRpcError(rpcError),
      error: { message: rpcError?.message, code: rpcError?.code, details: rpcError?.details, hint: rpcError?.hint },
    });
    if (!payload.listing_id) throw rpcError;
    console.warn("create_review RPC unavailable; using canonical reviews insert", {
      error: rpcError?.message ?? String(rpcError),
      listingId: payload.listing_id,
      reviewerId: authenticatedReviewerId,
    });
    const insertPayload = {
      review_type: payload.review_type,
      reviewer_id: authenticatedReviewerId,
      reviewee_id: payload.reviewee_id,
      listing_id: payload.listing_id,
      order_id: payload.order_id,
      order_item_id: payload.order_item_id,
      rating: payload.rating,
      title: payload.title,
      body: payload.body,
      criteria: payload.criteria,
      photos: payload.photos,
      status: payload.status,
    };
    console.info("reviews.js reviews insert called", {
      sellerId: authenticatedReviewerId,
      buyerId: payload.review_type === "buyer" ? payload.reviewee_id : null,
      orderId: payload.order_id,
      listingId: payload.listing_id,
      reviewType: payload.review_type,
      payload: insertPayload,
    });
    const { data, error } = await supabase
      .from("reviews")
      .insert(insertPayload)
      .select(REVIEW_SELECT)
      .single();
    console.info("reviews.js reviews insert response", {
      sellerId: authenticatedReviewerId,
      buyerId: payload.review_type === "buyer" ? payload.reviewee_id : null,
      orderId: payload.order_id,
      listingId: payload.listing_id,
      reviewType: payload.review_type,
      row: data ?? null,
      error: error ? { message: error.message, code: error.code, details: error.details, hint: error.hint } : null,
    });
    if (error) throw error;
    row = data;
  }
  console.info("reviews.js review row created", {
    created: Boolean(row?.id),
    reviewId: row?.id ?? null,
    reviewType: row?.review_type ?? payload.review_type,
    reviewerId: row?.reviewer_id ?? authenticatedReviewerId,
    revieweeId: row?.reviewee_id ?? payload.reviewee_id ?? null,
    rating: row?.rating ?? payload.rating ?? null,
    createdAt: row?.created_at ?? null,
    orderId: row?.order_id ?? payload.order_id ?? null,
    listingId: row?.listing_id ?? payload.listing_id ?? null,
  });
  const mapped = databaseReviewToLegacyReview(row);
  return {
    ...mapped,
    productId: review?.productId ?? mapped?.productId,
    listingId: review?.listingId ?? mapped?.listingId ?? listingId,
    sellerId: mapped?.sellerId ?? review?.sellerId,
    reviewer: mapped?.reviewer ?? review?.reviewer,
    reviewerId: mapped?.reviewerId ?? authenticatedReviewerId,
    buyerId: review?.buyerId ?? mapped?.buyerId ?? authenticatedReviewerId,
    orderId: review?.orderId ?? mapped?.orderId,
    orderItemId: review?.orderItemId ?? mapped?.orderItemId,
    reviewType: mapped?.reviewType ?? reviewType ?? review?.reviewType,
  };
}

async function getReviewsByType(reviewType, filterColumn, filterValue) {
  requireSupabase();
  if (!REVIEW_TYPES.has(reviewType)) throw new Error("Review type is invalid.");
  let query = supabase
    .from("reviews")
    .select(REVIEW_SELECT)
    .eq("review_type", reviewType)
    .order("created_at", { ascending: false });
  if (filterValue != null && filterColumn) query = query.eq(filterColumn, filterValue);
  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];
  const includedRows = rows.filter(isPublishedReview);
  visibilityDiagnostics(rows, includedRows);
  const metadata = await attachReviewMetadata(includedRows);
  const mappedRows = includedRows.map((row) => databaseReviewToLegacyReview(row, metadata)).filter(Boolean);
  const mapped = reviewType === "seller" && filterValue != null
    ? mappedRows.filter((review) => String(review.sellerId) === String(filterValue))
    : mappedRows;
  console.info("Supabase review read", {
    reviewReadCount: rows.length,
    mappedReviewCount: mapped.length,
    reviewQuery: { reviewType, filterColumn, filterValue: filterValue ?? null },
    reviews: mapped.map((review) => ({
      review_id: review.databaseId ?? review.id ?? null,
      reviewer_id: review.reviewerId ?? null,
      reviewee_id: review.revieweeId ?? null,
      rating: review.rating ?? null,
      created_at: review.createdAt ?? null,
      review_type: review.reviewType ?? null,
    })),

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

export function getBuyerReviewsWrittenBy(reviewerId) {
  return getReviewsByType("buyer", "reviewer_id", reviewerId);
}
