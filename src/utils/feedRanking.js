import { distanceInKmBetween } from "./locationRadius.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENCY_HALF_LIFE_MS = 3 * DAY_MS;

function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function contentForItem(item) {
  if (item?.promotion && item?.product) {
    return {
      ...item.product,
      ...item.promotion,
      location: item.promotion.location ?? item.product.location,
      latitude: item.promotion.latitude ?? item.product.latitude,
      longitude: item.promotion.longitude ?? item.product.longitude,
    };
  }
  return item?.post ?? item?.event ?? item?.product ?? item?.promotion ?? {};
}

export function contentTimestamp(content) {
  const value = content?.createdAt ?? content?.created_at ?? content?.publishedAt ?? content?.published_at;
  if (typeof value === "number") return value;
  const timestamp = Date.parse(value ?? "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function recencyScore(content, now = Date.now()) {
  const timestamp = contentTimestamp(content);
  if (!timestamp) return 0;
  const age = Math.max(0, now - timestamp);
  const score = Math.exp(-Math.log(2) * age / RECENCY_HALF_LIFE_MS);
  // Protect new content from being buried before it has time to accumulate engagement.
  return age <= DAY_MS ? Math.max(score, 0.85) : score;
}

function engagementScore(item, engagement = {}) {
  const content = contentForItem(item);
  const signals = [
    engagement.likes,
    engagement.comments,
    engagement.shares,
    engagement.saves,
    engagement.regrows,
    content.likes,
    content.comments,
    content.shares,
    content.saves,
    content.favorites,
    content.views,
    content.listingViews,
    content.profileClicks,
    content.messages,
    content.messageCount,
  ];
  const total = signals.reduce((sum, value) => sum + numeric(value), 0);
  return Math.min(1, Math.log1p(total) / Math.log1p(100));
}

function relevanceScore(item, { followedSellers = new Set(), interactedSellerIds = new Set(), savedItems = [], viewedCategories = new Set() } = {}) {
  const content = contentForItem(item);
  const sellerId = String(content.sellerId ?? "");
  const category = String(content.category ?? content.classification ?? "").toLowerCase();
  const contentId = `${item.type}:${content.id}`;
  const saved = savedItems.some((savedItem) => String(savedItem.id) === contentId || String(savedItem.sourceId) === String(content.id));
  let score = 0;
  if (followedSellers.has(sellerId)) score += 0.55;
  if (interactedSellerIds.has(sellerId)) score += 0.3;
  if (saved) score += 0.1;
  if (category && viewedCategories.has(category)) score += 0.1;
  return Math.min(1, score);
}

export function rankFeedItems(items, {
  location,
  radius,
  now = Date.now(),
  followedSellers,
  interactedSellerIds,
  savedItems,
  viewedCategories,
  getEngagement,
} = {}) {
  return items
    .map((item, index) => {
      const content = contentForItem(item);
      const engagement = getEngagement?.(item.type, content) ?? {};
      const recency = recencyScore(content, now);
      const engagementAndRelevance = Math.min(1, engagementScore(item, engagement) * 0.7 + relevanceScore(item, {
        followedSellers: new Set((followedSellers ?? []).map(String)),
        interactedSellerIds: new Set((interactedSellerIds ?? []).map(String)),
        savedItems,
        viewedCategories: new Set([...(viewedCategories ?? [])].map((value) => String(value).toLowerCase())),
      }));
      const distance = distanceInKmBetween(content, location);
      const distanceScore = distance === null ? 0.5 : 1 - Math.min(distance / Number(radius || 1), 1);
      return {
        item,
        index,
        score: recency * 0.7 + engagementAndRelevance * 0.2 + distanceScore * 0.1,
        recency,
        engagementAndRelevance,
        distance,
      };
    })
    .sort((a, b) => b.score - a.score || b.recency - a.recency || (a.distance ?? Infinity) - (b.distance ?? Infinity) || a.index - b.index)
    .map(({ item }) => item);
}
