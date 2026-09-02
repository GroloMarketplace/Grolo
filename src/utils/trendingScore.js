const HALF_LIFE_DAYS = 7;

function metricValue(item, keys) {
  return keys.reduce((total, key) => total + (Number(item?.[key]) || 0), 0);
}

function ageInDays(value, now = Date.now()) {
  const timestamp = value ? new Date(value).getTime() : now;
  if (!Number.isFinite(timestamp)) return 0;
  return Math.max((now - timestamp) / 86400000, 0);
}

export function engagementDecay(createdAt, now = Date.now()) {
  return 0.5 ** (ageInDays(createdAt, now) / HALF_LIFE_DAYS);
}

export function trendingScore(type, item = {}, now = Date.now()) {
  const weights = {
    listing: [
      [["clicks", "clickCount", "listingClicks"], 5],
      [["views", "viewCount"], 3],
      [["favorites", "favoriteCount", "likes"], 4],
      [["reviews", "reviewCount"], 3],
      [["regrows", "regrowCount"], 4],
      [["cartAdds", "addToCartCount"], 6],
      [["purchases", "purchaseCount", "orders"], 8],
      [["shares", "shareCount"], 5],
    ],
    event: [
      [["views", "viewCount"], 3],
      [["attendingCount", "attendees", "attendanceCount"], 6],
      [["shares", "shareCount", "reposts"], 4],
      [["comments", "commentCount"], 3],
    ],
    store: [
      [["profileVisits", "visits", "views"], 4],
      [["followers", "followerCount"], 3],
      [["orders", "orderCount", "purchases"], 6],
      [["listingClicks", "clicks"], 5],
    ],
    promotion: [
      [["clicks", "clickCount"], 5],
      [["views", "viewCount"], 2],
      [["productClickThroughs", "clickThroughs"], 6],
      [["conversions", "conversionCount", "purchases"], 8],
    ],
  };
  const score = (weights[type] ?? []).reduce((total, [keys, weight]) => total + metricValue(item, keys) * weight, 0);
  return Number((score * engagementDecay(item.lastEngagementAt ?? item.updatedAt ?? item.updated_at ?? item.createdAt ?? item.created_at ?? item.date ?? item.startsAt, now)).toFixed(4));
}
