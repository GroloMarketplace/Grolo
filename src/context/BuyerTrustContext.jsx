import { createContext, useContext, useMemo, useState } from "react";
import { useOrders } from "./OrderContext";

const BuyerTrustContext = createContext(null);

export function BuyerTrustProvider({ children }) {
  const { orders } = useOrders();
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
    return {
      completedTransactions: orders.filter((order) => order.buyer === buyer && order.status === "Completed").length,
      sellerRecommendations: buyerReviews.filter((review) => review.criteria.length > 0).length,
      wouldTransactAgain: buyerReviews.filter((review) => review.criteria.includes("Would Transact Again")).length,
      reliable: buyerReviews.length > 0 && buyerReviews.every((review) => review.criteria.includes("Would Transact Again")),
    };
  };
  const hasReviewedOrder = (orderId) => reviews.some((review) => review.orderId === orderId);

  const value = useMemo(() => ({ reviews, addReview, reviewsForBuyer, getBuyerTrust, hasReviewedOrder }), [reviews, orders]);
  return <BuyerTrustContext.Provider value={value}>{children}</BuyerTrustContext.Provider>;
}

export function useBuyerTrust() {
  const context = useContext(BuyerTrustContext);
  if (!context) throw new Error("useBuyerTrust must be used within a BuyerTrustProvider");
  return context;
}
