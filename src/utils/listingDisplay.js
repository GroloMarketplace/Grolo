export function formatListingPrice(listing) {
  const discountedPrice = Number(listing?.discountedPrice);
  const originalPrice = Number(listing?.originalPrice ?? listing?.price);
  if (Number.isFinite(discountedPrice) && Number.isFinite(originalPrice) && discountedPrice < originalPrice) {
    return `$${discountedPrice.toFixed(2)}`;
  }
  if (listing?.pricingType) {
    if (listing.pricingType === "Free Quote") return "Free Quote";
    if (listing.pricingType === "Custom Pricing") return listing.price || "Custom Pricing";
    return listing.price || listing.pricingType;
  }
  const price = Number(listing?.discountedPrice ?? listing?.price);
  return Number.isFinite(price) ? `$${price.toFixed(2)}` : "Price on request";
}
