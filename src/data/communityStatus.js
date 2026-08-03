export const BUYER_STATUS_LEVELS = [
  { name: "Community Seedling", icon: "🌱", threshold: 0, nextThreshold: 10 },
  { name: "Community Supporter", icon: "🌿", threshold: 10, nextThreshold: 25 },
  { name: "Community Champion", icon: "🌳", threshold: 25, nextThreshold: 75 },
  { name: "Local Legend", icon: "🌎", threshold: 75, nextThreshold: 125 },
  { name: "Community Builder", icon: "💚", threshold: 125, nextThreshold: 150 },
];

export const SELLER_STATUS_LEVELS = [
  { name: "New Seller", icon: "🌱", threshold: 0, nextThreshold: 10 },
  { name: "Local Grower", icon: "🌿", threshold: 10, nextThreshold: 25 },
  { name: "Trusted Merchant", icon: "🌳", threshold: 25, nextThreshold: 75 },
  { name: "Community Favorite", icon: "🏡", threshold: 75, nextThreshold: 125 },
  { name: "Grolo Partner", icon: "💚", threshold: 125, nextThreshold: 150 },
];

export const mockBuyerActions = {
  purchasesCompleted: 14,
  reviewsWritten: 18,
  eventsAttended: 3,
  tradesCompleted: 1,
  businessesSupported: 6,
};

export const mockSellerActions = {
  ordersFulfilled: 18,
  productsSold: 42,
  reviewsReceived: 12,
  eventsHosted: 4,
  followersGained: 28,
  tradesCompleted: 3,
};

function resolveStatus(levels, metrics) {
  const total = Object.values(metrics).reduce((sum, value) => sum + Number(value || 0), 0);
  const current = [...levels].reverse().find((level) => total >= level.threshold) ?? levels[0];
  return {
    ...current,
    total,
    metrics,
    progress: Math.min((total / current.nextThreshold) * 100, 100),
  };
}

export function getBuyerStatus(metrics = mockBuyerActions) {
  return resolveStatus(BUYER_STATUS_LEVELS, metrics);
}

export function getSellerStatus(metrics = mockSellerActions) {
  return resolveStatus(SELLER_STATUS_LEVELS, metrics);
}

// Backward-compatible alias for buyer-facing community status displays.
export const COMMUNITY_STATUS_LEVELS = BUYER_STATUS_LEVELS;
export const mockCommunityActions = mockBuyerActions;
export const communityActionTotal = Object.values(mockBuyerActions).reduce((sum, value) => sum + value, 0);
export function getCommunityStatus(metrics = mockBuyerActions) {
  return getBuyerStatus(metrics);
}
