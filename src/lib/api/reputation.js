import { isSupabaseConfigured, supabase } from "../supabaseClient";

const REVIEW_SELECT = "reviewee_id, reviewer_id, review_type, rating, criteria, status, deleted_at, created_at";
const COMPLETED_ORDER_STATUS = "Completed";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reputationRefreshes = new Map();

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. See .env.example.");
  }
}

function isMissingReputationObjectError(error) {
  const text = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
  return text.includes("pgrst205")
    || text.includes("42p01")
    || text.includes("could not find the table")
    || text.includes("relation") && text.includes("does not exist");
}

function missingReputationDiagnostics(objectName, error) {
  console.warn("Optional reputation object unavailable; continuing without it", {
    objectName,
    error: { message: error?.message, code: error?.code, details: error?.details, hint: error?.hint },
  });
  return emptyDiagnostics({ statusSource: "unavailable", aggregateSource: "reviews, orders" });
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
  if (error) {
    if (isMissingReputationObjectError(error)) {
      const diagnostics = missingReputationDiagnostics("user_badges/badge_definitions", error);
      return { userId, user_id: userId, badges: [], earnedBadges: [], earned_badges: [], activeBadges: [], active_badges: [], diagnostics };
    }
    throw error;
  }

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
  const badgeMutation = options.preserveExisting
    ? supabase.from("user_badges").insert(payload)
    : supabase.from("user_badges").upsert(payload, { onConflict: "user_id,badge_id" });
  const { data, error } = await badgeMutation
    .select("id, user_id, badge_id, status, awarded_at, expires_at, revoked_at, metadata, badge_definitions(id, code, name, description, icon, badge_type, criteria, active)")
    .single();
  if (error?.code === "23505" && options.preserveExisting) {
    const existing = await getUserBadges(resolvedUserId);
    const existingBadge = existing.badges.find((badge) => badge.code === requestedBadgeCode);
    return existingBadge ? { ...existingBadge, alreadyOwned: true } : null;
  }
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
  if (error) {
    if (isMissingReputationObjectError(error)) {
      missingReputationDiagnostics("user_reputation_status", error);
      return null;
    }
    throw error;
  }
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
  const sellerRecommendationCount = includedReviews.filter((review) => Object.keys(asObject(review.criteria)).length > 0).length;
  const wouldTransactAgainCount = includedReviews.filter((review) => Boolean(asObject(review.criteria)["Would Transact Again"])).length;
  const metrics = {
    reviewCount: includedReviews.length,
    review_count: includedReviews.length,
    buyerReviewCount: includedReviews.length,
    buyer_review_count: includedReviews.length,
    sellerRecommendationCount,
    seller_recommendation_count: sellerRecommendationCount,
    wouldTransactAgainCount,
    would_transact_again_count: wouldTransactAgainCount,
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
    supabase.from("orders").select("id, status, created_at").eq("seller_id", userId).eq("status", COMPLETED_ORDER_STATUS),
    supabase.from("listings").select("id, status, created_at").eq("seller_id", userId),
  ]);
  if (reviewsError) throw reviewsError;
  if (ordersError) throw ordersError;
  if (listingsError) throw listingsError;
  const includedReviews = (reviews ?? []).filter(isPublishedReview);
  const activeListings = (listings ?? []).filter((listing) => String(listing.status ?? "Active").toLowerCase() === "active");
  const activityDates = new Set([...includedReviews, ...(orders ?? []), ...(listings ?? [])].map((row) => row.created_at?.slice(0, 10)).filter(Boolean));
  const marketplaceInteractions = includedReviews.length + (orders ?? []).length + (listings ?? []).length;
  const metrics = {
    reviewCount: includedReviews.length,
    review_count: includedReviews.length,
    averageRating: averageRating(includedReviews),
    average_rating: averageRating(includedReviews),
    marketplaceInteractions,
    marketplace_interactions: marketplaceInteractions,
    activeDays: activityDates.size,
    active_days: activityDates.size,
    completedOrderCount: (orders ?? []).length,
    completed_order_count: (orders ?? []).length,
    activeListingCount: activeListings.length,
    active_listing_count: activeListings.length,
  };
  return { metrics, progress: { reviews: includedReviews.length, completedOrders: (orders ?? []).length, activeListings: activeListings.length } };
}

export async function getBuyerStatus(userId) {
  requireSupabase();
  const resolvedUserId = await resolveReputationUserId(userId);
  if (!resolvedUserId) return statusPayload(null, "unranked", {}, {}, emptyDiagnostics());
  const [row, aggregate] = await Promise.all([getStatusRow(resolvedUserId, "buyer"), getBuyerAggregate(resolvedUserId)]);
  const fallbackStatus = aggregate.metrics.completedTransactionCount > 0 ? "established_buyer" : "unranked";
  const diagnostics = emptyDiagnostics({ statusSource: row ? "user_reputation_status" : "derived", aggregateSource: "reviews, orders" });
  return { userId, user_id: userId, ...statusPayload(row, fallbackStatus, aggregate.progress, aggregate.metrics, diagnostics) };
}

export async function getSellerStatus(userId) {
  requireSupabase();
  const resolvedUserId = await resolveReputationUserId(userId);
  if (!resolvedUserId) return statusPayload(null, "unranked", {}, {}, emptyDiagnostics());
  const [row, aggregate] = await Promise.all([getStatusRow(resolvedUserId, "seller"), getSellerAggregate(resolvedUserId)]);
  const fallbackStatus = aggregate.metrics.completedOrderCount > 0 || aggregate.metrics.activeListingCount > 0 ? "established_seller" : "unranked";
  const diagnostics = emptyDiagnostics({ statusSource: row ? "user_reputation_status" : "derived", aggregateSource: "reviews, orders, listings" });
  return { userId, user_id: userId, ...statusPayload(row, fallbackStatus, aggregate.progress, aggregate.metrics, diagnostics) };
}

export async function getCommunityImpact(userId) {
  requireSupabase();
  const resolvedUserId = await resolveReputationUserId(userId);
  if (!resolvedUserId) return { userId: userId ?? null, user_id: userId ?? null, metrics: {}, progress: {}, diagnostics: emptyDiagnostics() };

  const [{ data: reviews, error: reviewsError }, { data: ordersAsBuyer, error: buyerOrdersError }, { data: ordersAsSeller, error: sellerOrdersError }, { data: listings, error: listingsError }] = await Promise.all([
    supabase.from("reviews").select(REVIEW_SELECT).or(`reviewer_id.eq.${resolvedUserId},reviewee_id.eq.${resolvedUserId}`),
    supabase.from("orders").select("id, seller_id").eq("buyer_id", resolvedUserId).eq("status", COMPLETED_ORDER_STATUS),
    supabase.from("orders").select("id, buyer_id").eq("seller_id", resolvedUserId).eq("status", COMPLETED_ORDER_STATUS),
    supabase.from("listings").select("id, status").eq("seller_id", resolvedUserId),
  ]);
  if (reviewsError) throw reviewsError;
  if (buyerOrdersError) throw buyerOrdersError;
  if (sellerOrdersError) throw sellerOrdersError;
  if (listingsError) throw listingsError;

  const includedReviews = (reviews ?? []).filter(isPublishedReview);
  const reviewsGiven = includedReviews.filter((review) => review.reviewer_id === resolvedUserId);
  const reviewsReceived = includedReviews.filter((review) => review.reviewee_id === resolvedUserId);
  const activeListings = (listings ?? []).filter((listing) => String(listing.status ?? "Active").toLowerCase() === "active");
  const businessesSupported = new Set((ordersAsBuyer ?? []).map((order) => order.seller_id).filter(Boolean)).size;
  const metrics = {
    businessesSupported,
    businesses_supported: businessesSupported,
    purchasesMade: (ordersAsBuyer ?? []).length,
    purchases_made: (ordersAsBuyer ?? []).length,
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

export async function refreshUserReputation(userId, { eventKey = "manual" } = {}) {
  const refreshKey = `${userId ?? "anonymous"}:${eventKey}`;
  const existingRefresh = reputationRefreshes.get(refreshKey);
  if (existingRefresh) return existingRefresh;

  const refresh = (async () => {
    const requestedAt = new Date().toISOString();
    console.info("reputation refresh requested", { userId: userId ?? null, eventKey, requestedAt });
    try {
      if (!isSupabaseConfigured) {
        const diagnostics = { requested: true, refreshed: false, failed: true, reason: "supabase_unconfigured" };
        console.info("reputation refresh failed", { userId: userId ?? null, eventKey, diagnostics });
        return { userId: userId ?? null, snapshot: null, diagnostics };
      }

      const badges = await evaluateUserBadges(userId);
      const status = await evaluateUserStatus(userId);
      const snapshot = await getReputationSnapshot(userId);
      const diagnostics = {
        requested: true,
        refreshed: true,
        failed: false,
        eventKey,
        badgeDiagnostics: badges?.diagnostics ?? null,
        statusDiagnostics: status?.diagnostics ?? null,
        snapshotDiagnostics: snapshot?.diagnostics ?? null,
      };
      console.info("reputation refreshed", { userId: userId ?? null, eventKey, diagnostics });
      return { userId: userId ?? null, snapshot, badges, status, diagnostics };
    } catch (error) {
      const diagnostics = {
        requested: true,
        refreshed: false,
        failed: true,
        eventKey,
        error: error?.message ?? String(error),
      };
      console.info("reputation refresh failed", { userId: userId ?? null, eventKey, diagnostics });
      return { userId: userId ?? null, snapshot: null, diagnostics };
    }
  })();

  reputationRefreshes.set(refreshKey, refresh);
  refresh.finally(() => reputationRefreshes.delete(refreshKey));
  return refresh;
}

const AUTOMATED_BADGE_RULES = Object.freeze({
  trusted_buyer: { metrics: { completedTransactions: 5, sellerRecommendations: 2, wouldTransactAgain: 3 } },
  established_buyer: { metrics: { completedTransactions: 15, sellerRecommendations: 5, wouldTransactAgain: 10, accountAgeDays: 60 } },
  community_champion: { metrics: { completedTransactions: 35, sellerRecommendations: 10, wouldTransactAgain: 20, eventsAttended: 5 } },
  community_trusted: { metrics: { completedTransactions: 75, sellerRecommendations: 20, wouldTransactAgain: 40, eventsAttended: 10, accountAgeMonths: 6 } },
  grolo_ambassador: { metrics: { completedTransactions: 150, sellerRecommendations: 50, wouldTransactAgain: 75, eventsAttended: 20, accountAgeMonths: 12 } },
  community_growing: { metrics: { listingsCreated: 5, completedSellerOrders: 1, followers: 5 } },
  community_flourishing: { metrics: { completedSellerOrders: 10, followers: 15, sellerReviews: 3, marketplaceInteractions: 10, activeDays: 30 } },
  grolo_partner: { metrics: { completedSellerOrders: 25, followers: 25, sellerReviews: 10, sellerRating: 4.5, activeDays: 90, communityContribution: 1 } },
});

function metricValue(metrics, key) {
  const aliases = {
    completedTransactions: ["completedTransactions", "completedTransactionCount", "completed_transaction_count"],
    sellerRecommendations: ["sellerRecommendations", "sellerRecommendationCount", "seller_recommendation_count"],
    wouldTransactAgain: ["wouldTransactAgain", "wouldTransactAgainCount", "would_transact_again_count"],
    accountAgeDays: ["accountAgeDays", "account_age_days"],
    accountAgeMonths: ["accountAgeMonths", "account_age_months"],
    eventsAttended: ["eventsAttended", "events_attended"],
    listingsCreated: ["listingsCreated", "activeListingCount", "active_listing_count"],
    completedSellerOrders: ["completedSellerOrders", "completedOrderCount", "completed_order_count"],
    sellerReviews: ["sellerReviews", "reviewCount", "review_count"],
    sellerRating: ["sellerRating", "averageRating", "average_rating"],
    marketplaceInteractions: ["marketplaceInteractions", "marketplace_interactions"],
    activeDays: ["activeDays", "active_days"],
    followers: ["followers", "followersGained", "followerCount", "follower_count"],
    communityContribution: ["communityContribution", "community_contribution"],
  };
  return aliases[key].reduce((value, alias) => value ?? metrics[alias], null) ?? 0;
}

export function isBadgeEligible(badgeCode, metrics = {}, criteria = {}) {
  const defaults = AUTOMATED_BADGE_RULES[badgeCode];
  if (!defaults) return false;
  const thresholds = { ...defaults.metrics, ...asObject(criteria.thresholds), ...Object.fromEntries(Object.entries(criteria).filter(([key, value]) => key in defaults.metrics && Number.isFinite(Number(value)))) };
  return Object.entries(thresholds).every(([key, threshold]) => metricValue(metrics, key) >= Number(threshold));
}

export function getBadgeEligibility(badgeCode, metrics = {}, criteria = {}) {
  const defaults = AUTOMATED_BADGE_RULES[badgeCode];
  if (!defaults) return { badgeCode, eligible: false, requirements: [] };
  const thresholds = { ...defaults.metrics, ...asObject(criteria.thresholds), ...Object.fromEntries(Object.entries(criteria).filter(([key, value]) => key in defaults.metrics && Number.isFinite(Number(value)))) };
  const requirements = Object.entries(thresholds).map(([key, target]) => ({ key, target: Number(target), value: metricValue(metrics, key), met: metricValue(metrics, key) >= Number(target) }));
  return { badgeCode, eligible: requirements.every((requirement) => requirement.met), requirements };
}

export async function evaluateUserBadges(userId) {
  requireSupabase();
  const resolvedUserId = await resolveReputationUserId(userId);
  if (!resolvedUserId) return { userId: userId ?? null, checked: [], awarded: [], alreadyOwned: [], diagnostics: { checked: 0, awarded: 0, alreadyOwned: 0 } };

  const [{ data: definitions, error: definitionsError }, snapshot, authResult, followersResult, eventsResult] = await Promise.all([
    supabase.from("badge_definitions").select("id, code, name, criteria, active").eq("active", true).in("code", Object.keys(AUTOMATED_BADGE_RULES)),
    getReputationSnapshot(resolvedUserId),
    supabase.auth.getUser(),
    supabase.from("user_follows").select("follower_id", { count: "exact", head: true }).eq("seller_id", resolvedUserId),
    supabase.from("event_attendees").select("event_id", { count: "exact", head: true }).eq("user_id", resolvedUserId),
  ]);
  if (definitionsError) {
    if (isMissingReputationObjectError(definitionsError)) {
      const diagnostics = missingReputationDiagnostics("badge_definitions", definitionsError);
      return { userId, checked: [], awarded: [], alreadyOwned: [], diagnostics };
    }
    throw definitionsError;
  }
  if (authResult.error) throw authResult.error;
  if (followersResult.error) throw followersResult.error;
  if (eventsResult.error) throw eventsResult.error;

  const accountCreatedAt = authResult.data.user?.created_at ? new Date(authResult.data.user.created_at) : null;
  const accountAgeDays = accountCreatedAt && !Number.isNaN(accountCreatedAt.getTime())
    ? Math.max(Math.floor((Date.now() - accountCreatedAt.getTime()) / 86400000), 0)
    : 0;
  const metrics = {
    ...(snapshot?.buyerStatus?.metrics ?? {}),
    ...(snapshot?.sellerStatus?.metrics ?? {}),
    ...(snapshot?.communityImpact?.metrics ?? {}),
    followers: followersResult.count ?? 0,
    follower_count: followersResult.count ?? 0,
    eventsAttended: eventsResult.count ?? 0,
    events_attended: eventsResult.count ?? 0,
    accountAgeDays,
    accountAgeMonths: Math.floor(accountAgeDays / 30),
  };
  const existingCodes = new Set((snapshot?.badges ?? []).map((badge) => badge.code));
  const checked = [];
  const awarded = [];
  const alreadyOwned = [];

  for (const definition of definitions ?? []) {
    const eligibility = getBadgeEligibility(definition.code, metrics, definition.criteria);
    checked.push(eligibility);
    console.info("badge eligibility checked", { userId: resolvedUserId, ...eligibility });
    if (!eligibility.eligible) continue;
    if (existingCodes.has(definition.code)) {
      alreadyOwned.push(definition.code);
      console.info("badge already owned", { userId: resolvedUserId, badgeCode: definition.code });
      continue;
    }
    const badge = await awardBadge({
      userId: resolvedUserId,
      badgeCode: definition.code,
      preserveExisting: true,
      metadata: { automation: "reputation", eligibilityMetrics: metrics, evaluatedAt: new Date().toISOString() },
    });
    existingCodes.add(definition.code);
    if (badge?.alreadyOwned) {
      alreadyOwned.push(definition.code);
      console.info("badge already owned", { userId: resolvedUserId, badgeCode: definition.code });
    } else {
      awarded.push(badge ?? definition.code);
      console.info("badge awarded", { userId: resolvedUserId, badgeCode: definition.code });
    }
  }

  return {
    userId,
    user_id: userId,
    metrics,
    checked,
    awarded,
    alreadyOwned,
    diagnostics: {
      checked: checked.length,
      awarded: awarded.length,
      alreadyOwned: alreadyOwned.length,
      badgeEligibilityChecked: checked.length,
      badgeAwarded: awarded.length,
      badgeAlreadyOwned: alreadyOwned.length,
    },
  };
}

const BUYER_STATUS_RULES = [
  { code: "building_trust", metrics: {} },
  { code: "trusted_buyer", metrics: { completedTransactions: 5, sellerRecommendations: 2, wouldTransactAgain: 3 } },
  { code: "established_buyer", metrics: { completedTransactions: 15, sellerRecommendations: 5, wouldTransactAgain: 10, accountAgeDays: 60 } },
  { code: "community_champion", metrics: { completedTransactions: 35, sellerRecommendations: 10, wouldTransactAgain: 20, eventsAttended: 5 } },
  { code: "community_trusted", metrics: { completedTransactions: 75, sellerRecommendations: 20, wouldTransactAgain: 40, eventsAttended: 10, accountAgeMonths: 6 } },
  { code: "grolo_ambassador", metrics: { completedTransactions: 150, sellerRecommendations: 50, wouldTransactAgain: 75, eventsAttended: 20, accountAgeMonths: 12 } },
];

const SELLER_STATUS_RULES = [
  { code: "community_seeding", metrics: {} },
  { code: "community_growing", metrics: { listingsCreated: 5, completedSellerOrders: 1, followers: 5 } },
  { code: "community_flourishing", metrics: { completedSellerOrders: 10, followers: 15, sellerReviews: 3, marketplaceInteractions: 10, activeDays: 30 } },
  { code: "grolo_partner", metrics: { completedSellerOrders: 25, followers: 25, sellerReviews: 10, sellerRating: 4.5, activeDays: 90, communityContribution: 1 } },
];

function statusProgress(rules, index, metrics) {
  const next = rules[index + 1];
  if (!next) return { percent: 100, requirements: [] };
  const requirements = Object.entries(next.metrics).map(([key, target]) => ({
    key,
    target,
    value: metricValue(metrics, key),
    met: metricValue(metrics, key) >= target,
  }));
  const percent = requirements.length
    ? Math.round(requirements.reduce((sum, requirement) => sum + Math.min(requirement.value / requirement.target, 1), 0) / requirements.length * 100)
    : 100;
  return { percent, requirements };
}

function calculateStatus(rules, metrics) {
  let index = 0;
  rules.forEach((rule, ruleIndex) => {
    if (isBadgeEligible(rule.code, metrics, { thresholds: rule.metrics })) index = ruleIndex;
  });
  return {
    statusCode: rules[index].code,
    progress: statusProgress(rules, index, metrics),
    levelIndex: index,
  };
}

function statusMetrics(snapshot, followers, eventsAttended, accountAgeDays) {
  const buyer = snapshot?.buyerStatus?.metrics ?? {};
  const seller = snapshot?.sellerStatus?.metrics ?? {};
  const community = snapshot?.communityImpact?.metrics ?? {};
  return {
    buyer: {
      completedTransactions: metricValue(buyer, "completedTransactions"),
      sellerRecommendations: metricValue(buyer, "sellerRecommendations"),
      wouldTransactAgain: metricValue(buyer, "wouldTransactAgain"),
      accountAgeDays,
      accountAgeMonths: Math.floor(accountAgeDays / 30),
      eventsAttended,
    },
    seller: {
      listingsCreated: metricValue(seller, "listingsCreated"),
      completedSellerOrders: metricValue(seller, "completedSellerOrders"),
      followers,
      sellerReviews: metricValue(seller, "sellerReviews"),
      sellerRating: metricValue(seller, "sellerRating"),
      marketplaceInteractions: metricValue(seller, "marketplaceInteractions"),
      activeDays: metricValue(seller, "activeDays"),
      communityContribution: metricValue(seller, "communityContribution") || metricValue(community, "communityContribution"),
    },
  };
}

function sameStatusSnapshot(row, calculated) {
  return row?.status_code === calculated.statusCode
    && row?.definition_version === "1"
    && JSON.stringify(row?.progress ?? {}) === JSON.stringify(calculated.progress)
    && JSON.stringify(row?.metrics ?? {}) === JSON.stringify(calculated.metrics);
}

export async function evaluateUserStatus(userId) {
  requireSupabase();
  const resolvedUserId = await resolveReputationUserId(userId);
  if (!resolvedUserId) return { userId: userId ?? null, buyer: null, seller: null, diagnostics: { evaluated: 0, updated: 0, unchanged: 0 } };

  const [{ data: rows, error: rowsError }, snapshot, authResult, followersResult, eventsResult] = await Promise.all([
    supabase.from("user_reputation_status").select("user_id, audience, status_code, progress, metrics, calculated_at, definition_version").eq("user_id", resolvedUserId).in("audience", ["buyer", "seller"]),
    getReputationSnapshot(resolvedUserId),
    supabase.auth.getUser(),
    supabase.from("user_follows").select("follower_id", { count: "exact", head: true }).eq("seller_id", resolvedUserId),
    supabase.from("event_attendees").select("event_id", { count: "exact", head: true }).eq("user_id", resolvedUserId),
  ]);
  if (rowsError) throw rowsError;
  if (authResult.error) throw authResult.error;
  if (followersResult.error) throw followersResult.error;
  if (eventsResult.error) throw eventsResult.error;

  const accountCreatedAt = authResult.data.user?.created_at ? new Date(authResult.data.user.created_at) : null;
  const accountAgeDays = accountCreatedAt && !Number.isNaN(accountCreatedAt.getTime())
    ? Math.max(Math.floor((Date.now() - accountCreatedAt.getTime()) / 86400000), 0)
    : 0;
  const metrics = statusMetrics(snapshot, followersResult.count ?? 0, eventsResult.count ?? 0, accountAgeDays);
  const currentRows = new Map((rows ?? []).map((row) => [row.audience, row]));
  const results = {};
  let updated = 0;
  let unchanged = 0;

  for (const [audience, rules] of [["buyer", BUYER_STATUS_RULES], ["seller", SELLER_STATUS_RULES]]) {
    const calculated = calculateStatus(rules, metrics[audience]);
    const payload = {
      user_id: resolvedUserId,
      audience,
      status_code: calculated.statusCode,
      progress: calculated.progress,
      metrics: metrics[audience],
      calculated_at: new Date().toISOString(),
      definition_version: "1",
    };
    const current = currentRows.get(audience);
    console.info("status evaluated", { userId: resolvedUserId, audience, statusCode: calculated.statusCode, progress: calculated.progress });
    if (sameStatusSnapshot(current, { ...calculated, metrics: metrics[audience] })) {
      unchanged += 1;
      results[audience] = { ...payload, calculated_at: current.calculated_at, unchanged: true };
      console.info("status unchanged", { userId: resolvedUserId, audience, statusCode: calculated.statusCode });
      continue;
    }
    const { data, error } = await supabase
      .from("user_reputation_status")
      .upsert(payload, { onConflict: "user_id,audience" })
      .select("user_id, audience, status_code, progress, metrics, calculated_at, definition_version")
      .single();
    if (error) throw error;
    updated += 1;
    results[audience] = data;
    console.info("status updated", { userId: resolvedUserId, audience, statusCode: calculated.statusCode });
  }

  return {
    userId,
    user_id: userId,
    buyer: results.buyer,
    seller: results.seller,
    metrics,
    diagnostics: { evaluated: 2, updated, unchanged },
  };
}
