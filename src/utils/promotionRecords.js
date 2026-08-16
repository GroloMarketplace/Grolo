export function promotionCreatedTimestamp(promotion) {
  if (typeof promotion?.createdAt === "number") return promotion.createdAt;
  const timestamp = Date.parse(promotion?.createdAt ?? "");
  return Number.isNaN(timestamp) ? 0 : timestamp;
}
