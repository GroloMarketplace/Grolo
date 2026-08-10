export const BUYER_STATUS_LEVELS = [
  { name: "Community Seedling", icon: "sprout", threshold: 0, nextThreshold: 10 },
  { name: "Community Supporter", icon: "leaf", threshold: 10, nextThreshold: 25 },
  { name: "Community Champion", icon: "tree", threshold: 25, nextThreshold: 75 },
  { name: "Local Legend", icon: "globe", threshold: 75, nextThreshold: 125 },
  { name: "Community Builder", icon: "heart", threshold: 125, nextThreshold: 150 },
];

export const SELLER_STATUS_LEVELS = [
  { name: "Community Seeding", icon: "sprout", requirements: [] },
  { name: "Community Growing", icon: "leaf", requirements: [{ key: "listingsCreated", label: "Listings Created", target: 5 }, { key: "completedOrders", label: "Completed Orders", target: 1 }, { key: "profileVisits", label: "Profile Visits", target: 25 }, { key: "followers", label: "Followers", target: 5 }] },
  { name: "Community Flourishing", icon: "tree", requirements: [{ key: "completedOrders", label: "Completed Orders", target: 10 }, { key: "followers", label: "Followers", target: 15 }, { key: "sellerReviews", label: "Seller Reviews", target: 3 }, { key: "marketplaceInteractions", label: "Marketplace Interactions", target: 10 }, { key: "activeDays", label: "Store Active", target: 30 }] },
  { name: "Grolo Partner", icon: "heart", requirements: [{ key: "completedOrders", label: "Completed Orders", target: 25 }, { key: "followers", label: "Followers", target: 25 }, { key: "sellerReviews", label: "Seller Reviews", target: 10 }, { key: "averageRating", label: "Average Rating", target: 4.5 }, { key: "activeDays", label: "Store Active", target: 90 }, { key: "communityContribution", label: "Community Contribution", target: 1 }] },
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
    listingsCreated: Number(metrics.listingsCreated ?? metrics.productsCreated ?? 0),
    completedOrders: Number(metrics.completedOrders ?? metrics.ordersFulfilled ?? 0),
    profileVisits: Number(metrics.profileVisits ?? 0),
    followers: Number(metrics.followers ?? metrics.followersGained ?? 0),
    sellerReviews: Number(metrics.sellerReviews ?? metrics.reviewsReceived ?? 0),
    marketplaceInteractions: Number(metrics.marketplaceInteractions ?? 0),
    activeDays: Number(metrics.activeDays ?? 0),
    averageRating: Number(metrics.averageRating ?? 0),
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
