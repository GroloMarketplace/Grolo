import { isSupabaseConfigured, supabase } from "../supabaseClient";

const REVIEW_SELECT = "reviewee_id, reviewer_id, review_type, rating, status, deleted_at";
const COMPLETED_ORDER_STATUS = "Completed";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. See .env.example.");
  }
}

async function resolveReputationUserId(userId) {
  if (typeof userId === "string" && UUID_PATTERN.test(userId)) return userId;
  if (userId && !["current-user", "current-buyer"].includes(userId)) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user?.id ?? null;
}

function emptyDiagnostics({ badgeCount = 0, statusSource = "none", aggregateSource = "none" } = {}) {
  return {
    badgeCount,
    statusSource,
    aggregateSource,
    badge_count: badgeCount,
    status_source: statusSource,
    aggregate_source: aggregateSource,
  };
}

function isPublishedReview(review) {
  return (review.status ?? "published") === "published" && !review.deleted_at;
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function number(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function averageRating(rows) {
  if (!rows.length) return 0;
  return Number((rows.reduce((sum, row) => sum + number(row.rating), 0) / rows.length).toFixed(1));
}

function statusPayload(row, fallbackStatus, fallbackProgress, fallbackMetrics, diagnostics) {
  const currentStatus = row?.status_code ?? fallbackStatus;
  const progress = { ...fallbackProgress, ...asObject(row?.progress) };
  const metrics = { ...fallbackMetrics, ...asObject(row?.metrics) };
  return {
    currentStatus,
    current_status: currentStatus,
    progress,
    metrics,
    calculatedAt: row?.calculated_at ?? null,
    calculated_at: row?.calculated_at ?? null,
    definitionVersion: row?.definition_version ?? null,
    definition_version: row?.definition_version ?? null,
    diagnostics,
  };
}

function activeBadge(row, now = Date.now()) {
  const status = String(row.status ?? "active").toLowerCase();
  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : null;
  return status === "active" && !row.revoked_at && (expiresAt == null || expiresAt > now);
}

function mapBadge(row) {
  const definition = row.badge_definitions ?? row.badge_definition ?? {};
  return {
    ...row,
    badge: definition,
    badgeId: row.badge_id,
    badge_id: row.badge_id,
    code: definition.code ?? row.code,
    name: definition.name ?? row.name,
    description: definition.description ?? row.description,
    icon: definition.icon ?? row.icon,
    badgeType: definition.badge_type ?? row.badge_type,
    badge_type: definition.badge_type ?? row.badge_type,
    awardedAt: row.awarded_at,
    awarded_at: row.awarded_at,
    expiresAt: row.expires_at,
    expires_at: row.expires_at,
    revokedAt: row.revoked_at,
    revoked_at: row.revoked_at,
  };
}

export async function getUserBadges(userId) {
  requireSupabase();
  const resolvedUserId = await resolveReputationUserId(userId);
  if (!resolvedUserId) {
    return { userId: userId ?? null, user_id: userId ?? null, badges: [], earnedBadges: [], earned_badges: [], activeBadges: [], active_badges: [], diagnostics: emptyDiagnostics() };
  }

  const { data, error } = await supabase
    .from("user_badges")
    .select("id, user_id, badge_id, status, awarded_at, expires_at, revoked_at, metadata, badge_definitions(id, code, name, description, icon, badge_type, criteria, active)")
    .eq("user_id", resolvedUserId)
    .order("awarded_at", { ascending: false });
  if (error) throw error;

  const badges = (data ?? []).map(mapBadge);
  const activeBadges = badges.filter((badge) => activeBadge(badge));
  const diagnostics = emptyDiagnostics({
    badgeCount: badges.length,
    statusSource: "user_badges",
    aggregateSource: "user_badges",
  });
  console.info("reputation badges source: supabase", diagnostics);
  return {
    userId,
    user_id: userId,
    badges,
    earnedBadges: badges,
    earned_badges: badges,
    activeBadges,
    active_badges: activeBadges,
    diagnostics,
  };
}

function foundingMemberFromBadge(badge) {
  if (!badge || badge.code !== "founding_member") return null;
  const metadata = asObject(badge.metadata);
  const registrationNumber = Number(metadata.registrationNumber ?? metadata.registration_number);
  if (!Number.isInteger(registrationNumber) || registrationNumber < 1 || registrationNumber > 100) return null;
  const awardedAt = metadata.awardedAt ?? metadata.awarded_at ?? badge.awardedAt ?? badge.awarded_at;
  const memberSince = metadata.memberSince ?? metadata.member_since ?? awardedAt;
  return {
    ...metadata,
    registrationNumber,
    registration_number: registrationNumber,
    awardedAt,
    awarded_at: awardedAt,
    memberSince,
    member_since: memberSince,
    reviewSubmitted: metadata.reviewSubmitted ?? metadata.review_submitted ?? true,
    review_submitted: metadata.reviewSubmitted ?? metadata.review_submitted ?? true,
    reserved: metadata.reserved ?? false,
  };
}

export async function awardBadge(userIdOrOptions, badgeCode, metadata = {}) {
  requireSupabase();
  const options = userIdOrOptions && typeof userIdOrOptions === "object" ? userIdOrOptions : {};
  const requestedUserId = options.userId ?? options.user_id ?? userIdOrOptions;
  const requestedBadgeCode = options.badgeCode ?? options.badge_code ?? badgeCode;
  const requestedMetadata = options.metadata ?? metadata;
  const resolvedUserId = await resolveReputationUserId(requestedUserId);
  if (!resolvedUserId || !requestedBadgeCode) return null;

  const { data: definition, error: definitionError } = await supabase
    .from("badge_definitions")
    .select("id, code, name, description, icon, badge_type, criteria, active")
    .eq("code", requestedBadgeCode)
    .eq("active", true)
    .maybeSingle();
  if (definitionError) throw definitionError;
  if (!definition) throw new Error(`Active badge definition not found: ${requestedBadgeCode}`);

  const payload = {
    user_id: resolvedUserId,
    badge_id: definition.id,
    status: options.status ?? "active",
    awarded_at: options.awardedAt ?? options.awarded_at ?? new Date().toISOString(),
    expires_at: options.expiresAt ?? options.expires_at ?? null,
    metadata: asObject(requestedMetadata),
  };
  const { data, error } = await supabase
    .from("user_badges")
    .upsert(payload, { onConflict: "user_id,badge_id" })
    .select("id, user_id, badge_id, status, awarded_at, expires_at, revoked_at, metadata, badge_definitions(id, code, name, description, icon, badge_type, criteria, active)")
    .single();
  if (error) throw error;
  console.info("badge award source: supabase", { userId: resolvedUserId, badgeCode: requestedBadgeCode });
  return mapBadge(data);
}

export async function getFoundingMember(userId) {
  requireSupabase();
  const badges = await getUserBadges(userId);
  const member = foundingMemberFromBadge(badges.badges.find((badge) => badge.code === "founding_member"));
  if (member) console.info("founding member source: supabase", { userId: userId ?? null });
  return member;
}

async function getStatusRow(userId, audience) {
  const { data, error } = await supabase
    .from("user_reputation_status")
    .select("user_id, audience, status_code, progress, metrics, calculated_at, definition_version")
    .eq("user_id", userId)
    .eq("audience", audience)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getBuyerAggregate(userId) {
  const [{ data: reviews, error: reviewsError }, { data: orders, error: ordersError }] = await Promise.all([
    supabase.from("reviews").select(REVIEW_SELECT).eq("review_type", "buyer").eq("reviewee_id", userId),
    supabase.from("orders").select("id, status").eq("buyer_id", userId).eq("status", COMPLETED_ORDER_STATUS),
  ]);
  if (reviewsError) throw reviewsError;
  if (ordersError) throw ordersError;
  const includedReviews = (reviews ?? []).filter(isPublishedReview);
  const metrics = {
    reviewCount: includedReviews.length,
    review_count: includedReviews.length,
    averageRating: averageRating(includedReviews),
    average_rating: averageRating(includedReviews),
    completedTransactionCount: (orders ?? []).length,
    completed_transaction_count: (orders ?? []).length,
  };
  return { metrics, progress: { reviews: includedReviews.length, completedOrders: (orders ?? []).length } };
}

async function getSellerAggregate(userId) {
  const [{ data: reviews, error: reviewsError }, { data: orders, error: ordersError }, { data: listings, error: listingsError }] = await Promise.all([
    supabase.from("reviews").select(REVIEW_SELECT).eq("review_type", "seller").eq("reviewee_id", userId),
    supabase.from("orders").select("id, status").eq("seller_id", userId).eq("status", COMPLETED_ORDER_STATUS),
    supabase.from("listings").select("id, status").eq("seller_id", userId),
  ]);
  if (reviewsError) throw reviewsError;
  if (ordersError) throw ordersError;
  if (listingsError) throw listingsError;
  const includedReviews = (reviews ?? []).filter(isPublishedReview);
  const activeListings = (listings ?? []).filter((listing) => String(listing.status ?? "Active").toLowerCase() === "active");
  const metrics = {
    reviewCount: includedReviews.length,
    review_count: includedReviews.length,
    averageRating: averageRating(includedReviews),
    average_rating: averageRating(includedReviews),
    completedOrderCount: (orders ?? []).length,
    completed_order_count: (orders ?? []).length,
    activeListingCount: activeListings.length,
    active_listing_count: activeListings.length,
  };
  return { metrics, progress: { reviews: includedReviews.length, completedOrders: (orders ?? []).length, activeListings: activeListings.length } };
}

export async function getBuyerStatus(userId) {
  requireSupabase();
  if (!userId) return statusPayload(null, "unranked", {}, {}, emptyDiagnostics());
  const [row, aggregate] = await Promise.all([getStatusRow(userId, "buyer"), getBuyerAggregate(userId)]);
  const fallbackStatus = aggregate.metrics.completedTransactionCount > 0 ? "established_buyer" : "unranked";
  const diagnostics = emptyDiagnostics({ statusSource: row ? "user_reputation_status" : "derived", aggregateSource: "reviews, orders" });
  return { userId, user_id: userId, ...statusPayload(row, fallbackStatus, aggregate.progress, aggregate.metrics, diagnostics) };
}

export async function getSellerStatus(userId) {
  requireSupabase();
  if (!userId) return statusPayload(null, "unranked", {}, {}, emptyDiagnostics());
  const [row, aggregate] = await Promise.all([getStatusRow(userId, "seller"), getSellerAggregate(userId)]);
  const fallbackStatus = aggregate.metrics.completedOrderCount > 0 || aggregate.metrics.activeListingCount > 0 ? "established_seller" : "unranked";
  const diagnostics = emptyDiagnostics({ statusSource: row ? "user_reputation_status" : "derived", aggregateSource: "reviews, orders, listings" });
  return { userId, user_id: userId, ...statusPayload(row, fallbackStatus, aggregate.progress, aggregate.metrics, diagnostics) };
}

export async function getCommunityImpact(userId) {
  requireSupabase();
  if (!userId) return { userId: null, user_id: null, metrics: {}, progress: {}, diagnostics: emptyDiagnostics() };

  const [{ data: reviews, error: reviewsError }, { data: ordersAsBuyer, error: buyerOrdersError }, { data: ordersAsSeller, error: sellerOrdersError }, { data: listings, error: listingsError }] = await Promise.all([
    supabase.from("reviews").select(REVIEW_SELECT).or(`reviewer_id.eq.${userId},reviewee_id.eq.${userId}`),
    supabase.from("orders").select("id").eq("buyer_id", userId).eq("status", COMPLETED_ORDER_STATUS),
    supabase.from("orders").select("id").eq("seller_id", userId).eq("status", COMPLETED_ORDER_STATUS),
    supabase.from("listings").select("id, status").eq("seller_id", userId),
  ]);
  if (reviewsError) throw reviewsError;
  if (buyerOrdersError) throw buyerOrdersError;
  if (sellerOrdersError) throw sellerOrdersError;
  if (listingsError) throw listingsError;

  const includedReviews = (reviews ?? []).filter(isPublishedReview);
  const reviewsGiven = includedReviews.filter((review) => review.reviewer_id === userId);
  const reviewsReceived = includedReviews.filter((review) => review.reviewee_id === userId);
  const activeListings = (listings ?? []).filter((listing) => String(listing.status ?? "Active").toLowerCase() === "active");
  const metrics = {
    reviewsGiven: reviewsGiven.length,
    reviews_given: reviewsGiven.length,
    reviewsReceived: reviewsReceived.length,
    reviews_received: reviewsReceived.length,
    averageReceivedRating: averageRating(reviewsReceived),
    average_received_rating: averageRating(reviewsReceived),
    completedOrdersAsBuyer: (ordersAsBuyer ?? []).length,
    completed_orders_as_buyer: (ordersAsBuyer ?? []).length,
    completedOrdersAsSeller: (ordersAsSeller ?? []).length,
    completed_orders_as_seller: (ordersAsSeller ?? []).length,
    activeListingCount: activeListings.length,
    active_listing_count: activeListings.length,
  };
  const progress = { reviewsGiven: reviewsGiven.length, reviewsReceived: reviewsReceived.length, completedOrders: (ordersAsBuyer ?? []).length + (ordersAsSeller ?? []).length, activeListings: activeListings.length };
  const diagnostics = emptyDiagnostics({ statusSource: "none", aggregateSource: "reviews, orders, listings" });
  console.info("community impact aggregate source: supabase", diagnostics);
  return { userId, user_id: userId, metrics, progress, diagnostics };
}

export async function getReputationSnapshot(userId) {
  requireSupabase();
  if (!userId) {
    return { userId: null, user_id: null, badges: [], buyerStatus: null, sellerStatus: null, communityImpact: null, diagnostics: emptyDiagnostics() };
  }
  const [badges, buyerStatus, sellerStatus, communityImpact] = await Promise.all([
    getUserBadges(userId),
    getBuyerStatus(userId),
    getSellerStatus(userId),
    getCommunityImpact(userId),
  ]);
  const diagnostics = emptyDiagnostics({
    badgeCount: badges.diagnostics.badgeCount,
    statusSource: [buyerStatus.diagnostics.statusSource, sellerStatus.diagnostics.statusSource].join(", "),
    aggregateSource: "user_badges, user_reputation_status, reviews, orders, listings",
  });
  return {
    userId,
    user_id: userId,
    badges: badges.badges,
    earnedBadges: badges.earnedBadges,
    earned_badges: badges.earned_badges,
    activeBadges: badges.activeBadges,
    active_badges: badges.active_badges,
    buyerStatus,
    buyer_status: buyerStatus,
    sellerStatus,
    seller_status: sellerStatus,
    communityImpact,
    community_impact: communityImpact,
    diagnostics,
  };
}
