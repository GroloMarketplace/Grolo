import { products } from "../data/mockData";

export function getBuyerImpactMetrics({ orders, events, attendingEventIds, followedSellers, reviewsWritten }) {
  const completedOrders = orders.filter((order) => order.status === "Completed");
  const supportedBusinesses = new Set(completedOrders.map((order) => (
    order.sellerId ?? products.find((product) => product.id === order.productId)?.sellerId
  )).filter(Boolean));
  const attendedEvents = events.filter((event) => (
    attendingEventIds.includes(event.id)
    || event.attended === true
    || event.attendanceStatus === "completed"
  ));

  return {
    businessesSupported: supportedBusinesses.size,
    purchasesMade: completedOrders.length,
    eventsAttended: attendedEvents.length,
    storesFollowed: followedSellers.length,
    reviewsWritten,
  };
}
