export const COMMUNITY_STATUS_LEVELS = [
  { name: "Community Seedling", icon: "🌱", threshold: 0, nextThreshold: 10 },
  { name: "Community Supporter", icon: "🌿", threshold: 10, nextThreshold: 25 },
  { name: "Community Champion", icon: "🌳", threshold: 25, nextThreshold: 75 },
  { name: "Local Legend", icon: "🌎", threshold: 75, nextThreshold: 125 },
  { name: "Community Builder", icon: "💚", threshold: 125, nextThreshold: 150 },
];

export const mockCommunityActions = {
  purchasesCompleted: 14,
  reviewsWritten: 18,
  storesFollowed: 6,
  eventsAttended: 3,
  tradesCompleted: 1,
  successfulPickups: 0,
};

export const communityActionTotal = Object.values(mockCommunityActions).reduce((sum, value) => sum + value, 0);

export function getCommunityStatus(total = communityActionTotal) {
  const current = [...COMMUNITY_STATUS_LEVELS].reverse().find((level) => total >= level.threshold) ?? COMMUNITY_STATUS_LEVELS[0];
  return {
    ...current,
    total,
    progress: Math.min((total / current.nextThreshold) * 100, 100),
  };
}
