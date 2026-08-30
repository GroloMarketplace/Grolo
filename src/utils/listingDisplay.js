export function isServiceListing(listing) {
  return String(listing?.category ?? "").trim().toLowerCase() === "services";
}

export function serviceStatusFor(listing) {
  return listing?.serviceStatus ?? listing?.service_status ?? "Accepting New Clients";
}

export function isListingOutOfStock(listing) {
  if (isServiceListing(listing)) return false;
  const hasVariants = Array.isArray(listing?.variants) && listing.variants.length > 0;
  return hasVariants ? listing?.availableForOrders === false : Math.max(0, Number(listing?.quantityAvailable) || 0) <= 0;
}

export function isListingActive(listing) {
  if (isServiceListing(listing)) return ["Accepting New Clients", "Limited Availability", "Waitlist Available"].includes(serviceStatusFor(listing));
  return !isListingOutOfStock(listing);
}

export function formatListingPrice(listing) {
  const discountedPrice = Number(listing?.discountedPrice);
  const originalPrice = Number(listing?.originalPrice ?? listing?.price);
  if (Number.isFinite(discountedPrice) && Number.isFinite(originalPrice) && discountedPrice < originalPrice) {
    return `$${discountedPrice.toFixed(2)}`;
  }
  if (listing?.pricingType) {
    if (!String(listing.price ?? "").trim() && listing.pricingType !== "Custom Pricing") return listing.pricingType;
    if (listing.pricingType === "Contact for Quote") return "Contact for Quote";
    if (listing.pricingType === "Free Quote") return "Free Quote";
    if (listing.pricingType === "Custom Pricing") return listing.price || "Custom Pricing";
    return listing.price || listing.pricingType;
  }
  const price = Number(listing?.discountedPrice ?? listing?.price);
  return Number.isFinite(price) ? `$${price.toFixed(2)}` : "Price on request";
}
