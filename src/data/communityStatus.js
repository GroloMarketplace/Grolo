export const BUYER_STATUS_LEVELS = [
  { name: "Community Seedling", icon: "sprout", threshold: 0, nextThreshold: 10 },
  { name: "Community Supporter", icon: "leaf", threshold: 10, nextThreshold: 25 },
  { name: "Community Champion", icon: "tree", threshold: 25, nextThreshold: 75 },
  { name: "Local Legend", icon: "globe", threshold: 75, nextThreshold: 125 },
  { name: "Community Builder", icon: "heart", threshold: 125, nextThreshold: 150 },
];

export const SELLER_STATUS_LEVELS = [
  { name: "New Seller", icon: "sprout", requirements: [{ key: "profileCompleted", label: "Store profile completed", target: 1 }, { key: "activeListings", label: "At least 1 active listing", target: 1 }, { key: "accountInGoodStanding", label: "Account in good standing", target: 1 }] },
  { name: "Established Seller", icon: "tree", requirements: [{ key: "completedOrders", label: "Minimum 10 completed orders", target: 10 }, { key: "activeStoreDays", label: "Active store for 30+ days", target: 30 }, { key: "activeListings", label: "Minimum 5 active listings", target: 5 }, { key: "noTrustSafetyViolations", label: "No trust & safety violations", target: 1 }, { key: "buyerReviews", label: "At least 1 completed buyer review", target: 1 }] },
  { name: "Trusted Seller", icon: "star", requirements: [{ key: "completedOrders", label: "Minimum 50 completed orders", target: 50 }, { key: "averageRating", label: "Average rating of 4.7 or higher", target: 4.7 }, { key: "buyerReviews", label: "Minimum 15 buyer reviews", target: 15 }, { key: "activeStoreDays", label: "Active store for 90+ days", target: 90 }, { key: "noUnresolvedDisputes", label: "No unresolved disputes", target: 1 }, { key: "responseRate", label: "Response rate of 90% or higher", target: 90 }] },
  { name: "Community Champion", icon: "trophy", requirements: [{ key: "completedOrders", label: "Minimum 100 completed orders", target: 100 }, { key: "averageRating", label: "Average rating of 4.8 or higher", target: 4.8 }, { key: "buyerReviews", label: "Minimum 25 buyer reviews", target: 25 }, { key: "activeStoreDays", label: "Active store for 180+ days", target: 180 }, { key: "communityContribution", label: "2 hosted community events or significant contribution", target: 1 }, { key: "noTrustSafetyViolations", label: "No trust & safety violations", target: 1 }] },
];

export const buyerActions = {
  purchasesCompleted: 0,
  reviewsWritten: 0,
  eventsAttended: 0,
  tradesCompleted: 0,
  businessesSupported: 0,
};

export const sellerActions = {};

function resolveStatus(levels, metrics) {
  const total = Object.values(metrics).reduce((sum, value) => sum + Number(value || 0), 0);
  const current = [...levels].reverse().find((level) => total >= level.threshold) ?? levels[0];
  return { ...current, total, metrics, progress: Math.min((total / (current.nextThreshold || 1)) * 100, 100) };
}

export function getBuyerStatus(metrics = {}) {
  return resolveStatus(BUYER_STATUS_LEVELS, metrics);
}

function sellerMetrics(metrics = {}) {
  return {
    profileCompleted: Number(Boolean(metrics.profileCompleted ?? metrics.profile_completed)),
    activeListings: Number(metrics.activeListings ?? metrics.activeListingCount ?? metrics.active_listing_count ?? metrics.listingsCreated ?? 0),
    accountInGoodStanding: Number(metrics.accountInGoodStanding ?? metrics.account_in_good_standing ?? 0),
    completedOrders: Number(metrics.completedOrders ?? metrics.ordersFulfilled ?? metrics.completedOrderCount ?? metrics.completed_order_count ?? 0),
    activeStoreDays: Number(metrics.activeStoreDays ?? metrics.active_days ?? metrics.activeDays ?? 0),
    buyerReviews: Number(metrics.buyerReviews ?? metrics.buyerReviewCount ?? metrics.buyer_review_count ?? metrics.sellerReviews ?? metrics.reviewCount ?? metrics.reviewsReceived ?? 0),
    averageRating: Number(metrics.averageRating ?? metrics.average_rating ?? 0),
    noTrustSafetyViolations: Number(metrics.noTrustSafetyViolations ?? metrics.no_trust_safety_violations ?? 0),
    noUnresolvedDisputes: Number(metrics.noUnresolvedDisputes ?? metrics.no_unresolved_disputes ?? 0),
    responseRate: Number(metrics.responseRate ?? metrics.response_rate ?? 0),
    communityContribution: Number(metrics.communityContribution ?? (metrics.eventsHosted || metrics.promotionsCreated ? 1 : 0)),
  };
}

export function getSellerStatus(metrics = {}) {
  const normalized = sellerMetrics(metrics);
  let currentIndex = 0;
  for (let index = 1; index < SELLER_STATUS_LEVELS.length; index += 1) {
    if (SELLER_STATUS_LEVELS[index].requirements.every(({ key, target }) => normalized[key] >= target)) currentIndex = index;
  }
  const current = SELLER_STATUS_LEVELS[currentIndex];
  const next = SELLER_STATUS_LEVELS[currentIndex + 1] ?? null;
  const progressItems = (next?.requirements ?? []).map((requirement) => ({ ...requirement, value: normalized[requirement.key] }));
  const completedRequirements = progressItems.filter(({ value, target }) => value >= target).length;
  return { ...current, total: currentIndex, metrics: normalized, nextLevel: next, progressItems, progress: next ? (completedRequirements / next.requirements.length) * 100 : 100 };
}

export const COMMUNITY_STATUS_LEVELS = BUYER_STATUS_LEVELS;
