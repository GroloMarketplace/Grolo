import { createContext, useContext, useMemo, useState, useEffect } from "react";
import { useOrders } from "./OrderContext";
import { useEvents } from "./EventContext";
import { useAuth } from "./AuthContext";

const BuyerTrustContext = createContext(null);
const SELLER_REVIEW_STORAGE_KEY = "grolo-seller-buyer-reviews";

function readSellerReviews() {
  try {
    const saved = JSON.parse(localStorage.getItem(SELLER_REVIEW_STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function buyerMatches(review, buyer) {
  const aliases = new Set([buyer, buyer === "you" ? "current-user" : null].filter(Boolean).map((value) => String(value).toLowerCase()));
  return [review.buyer, review.buyerId, review.userId].some((value) => value != null && aliases.has(String(value).toLowerCase()));
}

export function BuyerTrustProvider({ children }) {
  const { orders } = useOrders();
  const { attendingEventIds } = useEvents();
  const { user } = useAuth();
  const [reviews, setReviews] = useState(readSellerReviews);

  useEffect(() => {
    try {
      localStorage.setItem(SELLER_REVIEW_STORAGE_KEY, JSON.stringify(reviews));
    } catch {
    }
  }, [reviews]);

  const addReview = ({ buyer, orderId, sellerId, criteria = [], notes = "", rating = 0, productId }) => {
    setReviews((current) => [
      ...current,
      {
        id: `buyer-trust-${Date.now()}`,
        buyer,
        buyerId: buyer === "you" ? "current-user" : buyer,
        orderId,
        sellerId,
        rating: rating || (criteria.includes("Would Transact Again") ? 5 : 4),
        criteria,
        notes,
        productId,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const reviewsForBuyer = (buyer = "you") => reviews.filter((review) => buyerMatches(review, buyer));
  const getBuyerTrust = (buyer = "you") => {
    const buyerReviews = reviewsForBuyer(buyer);
    const accountCreatedAt = user?.created_at ? new Date(user.created_at) : null;
    const now = new Date();
    const accountAgeDays = accountCreatedAt
      ? Math.max(Math.floor((now.getTime() - accountCreatedAt.getTime()) / 86400000), 0)
      : 0;
    const accountAgeMonths = accountCreatedAt
      ? Math.max((now.getFullYear() - accountCreatedAt.getFullYear()) * 12 + now.getMonth() - accountCreatedAt.getMonth() - (now.getDate() < accountCreatedAt.getDate() ? 1 : 0), 0)
      : 0;
    return {
      completedTransactions: orders.filter((order) => (order.buyer === buyer || (buyer === "you" && !order.buyerId && order.buyer === "you")) && order.status === "Completed").length,
      sellerRecommendations: buyerReviews.filter((review) => review.criteria?.length > 0).length,
      wouldTransactAgain: buyerReviews.filter((review) => review.criteria?.includes("Would Transact Again")).length,
      eventsAttended: buyer === "you" ? attendingEventIds.length : 0,
      accountAgeDays: buyer === "you" ? accountAgeDays : 0,
      accountAgeMonths: buyer === "you" ? accountAgeMonths : 0,
      sellerReviews: buyerReviews.length,
      reviewsWritten: buyerReviews.length,
      reliable: buyerReviews.length > 0 && buyerReviews.every((review) => review.criteria?.includes("Would Transact Again")),
    };
  };
  const hasReviewedOrder = (orderId) => reviews.some((review) => review.orderId === orderId);

  const value = useMemo(() => ({ reviews, addReview, reviewsForBuyer, getBuyerTrust, hasReviewedOrder }), [reviews, orders, attendingEventIds, user?.created_at]);
  return <BuyerTrustContext.Provider value={value}>{children}</BuyerTrustContext.Provider>;
}

export function useBuyerTrust() {
  const context = useContext(BuyerTrustContext);
  if (!context) throw new Error("useBuyerTrust must be used within a BuyerTrustProvider");
  return context;
}
