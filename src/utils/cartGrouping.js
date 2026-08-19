function getListingForCartItem(item, listings = []) {
  return listings.find((listing) => (
    listing.id === item.productId
      || listing.id === item.listingId
      || listing.databaseId === item.productId
      || listing.databaseId === item.listingId
      || listing.id === item.id
      || listing.name === item.name
  ));
}

export function getCartItemProductId(item, listings = []) {
  return getListingForCartItem(item, listings)?.id ?? item.productId ?? item.listingId ?? item.id;
}

export function getCartItemSellerId(item, listings = []) {
  return getListingForCartItem(item, listings)?.sellerId ?? item.sellerId ?? "current-user";
}

export function getCartItemStoreName(item, listings = []) {
  return getListingForCartItem(item, listings)?.shop || item.storeName || item.shop || null;
}

export function groupCartItemsByStore(items, listings = []) {
  return Object.entries(items.reduce((groups, item) => {
    const sellerId = getCartItemSellerId(item, listings);
    if (!groups[sellerId]) groups[sellerId] = [];
    groups[sellerId].push(item);
    return groups;
  }, {}));
}

export function getActiveCartItems(items, listings = []) {
  return items.filter((item) => {
    const listing = listings.find((candidate) => candidate.id === getCartItemProductId(item, listings));
    return Number(listing?.quantityAvailable ?? item.quantityAvailable) > 0;
  });
}

export function getActiveCartTotalQuantity(items, listings = []) {
  return getActiveCartItems(items, listings).reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
}
