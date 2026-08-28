function firstImage(candidates) {
  return candidates.find((candidate) => Boolean(candidate.value)) ?? { source: "store placeholder fallback", value: "" };
}

export function promotionMatchesListing(promotion, listing) {
  const listingIds = [listing?.id, listing?.databaseId, listing?.legacyId].filter(Boolean).map(String);
  const promotionIds = [promotion?.listingId, ...(Array.isArray(promotion?.productIds) ? promotion.productIds : [])].filter(Boolean).map(String);
  return promotionIds.some((promotionId) => listingIds.includes(promotionId));
}

export function listingContentImage(listing) {
  return firstImage([
    { source: "listing.primary_image", value: listing?.primary_image },
    { source: "listing.primaryImage", value: listing?.primaryImage },
    { source: "listing.images[0]", value: listing?.images?.[0] },
    { source: "listing.image", value: listing?.image },
  ]).value;
}

export function promotedContentImage({ listing, event, promotion, placeholder = "" } = {}) {
  const candidates = [
    { source: "listing.primary_image", value: listing?.primary_image },
    { source: "listing.primaryImage", value: listing?.primaryImage },
    { source: "listing.images[0]", value: listing?.images?.[0] },
    { source: "listing.image", value: listing?.image },
    { source: "event.image", value: event?.image },
    { source: "promotion.image", value: promotion?.image },
    { source: "store placeholder fallback", value: placeholder },
  ];
  const selected = firstImage(candidates);
  return selected.value;
}
