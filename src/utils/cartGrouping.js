export function getCartItemProductId(item, listings = []) {
  return listings.find((listing) => (
    listing.id === item.productId
      || listing.id === item.listingId
      || listing.id === item.id
      || listing.name === item.name
  ))?.id ?? item.productId ?? item.listingId ?? item.id;
}

export function getCartItemSellerId(item, listings = []) {
  return listings.find((listing) => (
    listing.id === item.productId
      || listing.id === item.listingId
      || listing.id === item.id
      || listing.name === item.name
  ))?.sellerId ?? item.sellerId ?? "sarahs-backyard";
}

export function groupCartItemsByStore(items, listings = []) {
  return Object.entries(items.reduce((groups, item) => {
    const sellerId = getCartItemSellerId(item, listings);
    if (!groups[sellerId]) groups[sellerId] = [];
    groups[sellerId].push(item);
    return groups;
  }, {}));
}

export function getActiveCartItems(items, listings = [], getAvailable) {
  return items.filter((item) => (
    Number(getAvailable(getCartItemProductId(item, listings))) > 0
  ));
}

export function getActiveCartTotalQuantity(items, listings = [], getAvailable) {
  return getActiveCartItems(items, listings, getAvailable).reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
}
