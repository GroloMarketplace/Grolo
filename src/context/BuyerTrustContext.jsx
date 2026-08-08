import { createContext, useContext, useMemo, useState } from "react";
import { useOrders } from "./OrderContext";
import { useEvents } from "./EventContext";
import { useAuth } from "./AuthContext";
import { useReviews } from "./ReviewContext";

const BuyerTrustContext = createContext(null);

export function BuyerTrustProvider({ children }) {
  const { orders } = useOrders();
  const { attendingEventIds } = useEvents();
  const { user } = useAuth();
  const { reviewsForBuyer: productReviewsForBuyer } = useReviews();
  const [reviews, setReviews] = useState([]);

  const addReview = ({ buyer, orderId, sellerId, criteria, notes }) => {
    setReviews((current) => [
      ...current,
      { id: `buyer-trust-${Date.now()}`, buyer, orderId, sellerId, criteria, notes, createdAt: new Date().toISOString() },
    ]);
  };

  const reviewsForBuyer = (buyer) => reviews.filter((review) => review.buyer === buyer);
  const getBuyerTrust = (buyer) => {
    const buyerReviews = reviewsForBuyer(buyer);
    const reviewsWritten = buyer === "you" ? productReviewsForBuyer().length : productReviewsForBuyer(buyer).length;
    const accountCreatedAt = user?.created_at ? new Date(user.created_at) : null;
    const now = new Date();
    const accountAgeDays = accountCreatedAt
      ? Math.max(Math.floor((now.getTime() - accountCreatedAt.getTime()) / 86400000), 0)
      : 0;
    const accountAgeMonths = accountCreatedAt
      ? Math.max((now.getFullYear() - accountCreatedAt.getFullYear()) * 12 + now.getMonth() - accountCreatedAt.getMonth() - (now.getDate() < accountCreatedAt.getDate() ? 1 : 0), 0)
      : 0;
    return {
      completedTransactions: orders.filter((order) => order.buyer === buyer && order.status === "Completed").length,
      sellerRecommendations: buyerReviews.filter((review) => (review.criteria ?? []).length > 0).length,
      wouldTransactAgain: buyerReviews.filter((review) => (review.criteria ?? []).includes("Would Transact Again")).length,
      eventsAttended: buyer === "you" ? attendingEventIds.length : 0,
      accountAgeDays: buyer === "you" ? accountAgeDays : 0,
      accountAgeMonths: buyer === "you" ? accountAgeMonths : 0,
      reviewsWritten,
      reliable: buyerReviews.length > 0 && buyerReviews.every((review) => (review.criteria ?? []).includes("Would Transact Again")),
    };
  };
  const hasReviewedOrder = (orderId) => reviews.some((review) => review.orderId === orderId);

  const value = useMemo(() => ({ reviews, addReview, reviewsForBuyer, getBuyerTrust, hasReviewedOrder }), [reviews, orders, attendingEventIds, user?.created_at, productReviewsForBuyer]);
  return <BuyerTrustContext.Provider value={value}>{children}</BuyerTrustContext.Provider>;
}

export function useBuyerTrust() {
  const context = useContext(BuyerTrustContext);
  if (!context) throw new Error("useBuyerTrust must be used within a BuyerTrustProvider");
  return context;
}
