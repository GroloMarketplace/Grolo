export function formatListingPrice(listing) {
  if (listing?.pricingType) {
    if (listing.pricingType === "Free Quote") return "Free Quote";
    if (listing.pricingType === "Custom Pricing") return listing.price || "Custom Pricing";
    return listing.price || listing.pricingType;
  }
  const price = Number(listing?.price);
  return Number.isFinite(price) ? `$${price.toFixed(2)}` : "Price on request";
}
