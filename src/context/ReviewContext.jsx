import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  currentUser,
  productReviews,
  products,
  sellers,
} from "../data/mockData";
import { useOrders } from "./OrderContext";

const ReviewContext = createContext(null);

function averageWith(baseRating, baseCount, addedRatings) {
  const count = baseCount + addedRatings.length;
  if (!count) return { average: 0, count: 0 };
  const sum =
    baseRating * baseCount + addedRatings.reduce((total, r) => total + r, 0);
  return { average: Number((sum / count).toFixed(1)), count };
}

export function ReviewProvider({ children }) {
  const [submittedReviews, setSubmittedReviews] = useState([]);
  const { orders } = useOrders();

  const allReviews = useMemo(
    () => [...submittedReviews, ...productReviews],
    [submittedReviews],
  );

  const reviewsForProduct = useCallback(
    (productId) => allReviews.filter((r) => r.productId === productId),
    [allReviews],
  );

  const reviewsForSeller = useCallback(
    (sellerId) => allReviews.filter((r) => r.sellerId === sellerId),
    [allReviews],
  );

  const productRating = useCallback(
    (productId) => {
      const product = products.find((p) => p.id === productId);
      const added = submittedReviews
        .filter((r) => r.productId === productId)
        .map((r) => r.rating);
      return averageWith(product?.rating ?? 0, product?.reviewCount ?? 0, added);
    },
    [submittedReviews],
  );

  const sellerRating = useCallback(
    (sellerId) => {
      const seller = sellers[sellerId];
      const added = submittedReviews
        .filter((r) => r.sellerId === sellerId)
        .map((r) => r.rating);
      return averageWith(seller?.rating ?? 0, seller?.reviewCount ?? 0, added);
    },
    [submittedReviews],
  );

  const completedOrderForProduct = useCallback(
    (productId) =>
      orders.find(
        (o) =>
          o.productId === productId &&
          o.status === "Completed" &&
          o.buyer === currentUser.username,
      ),
    [orders],
  );

  const hasReviewedProduct = useCallback(
    (productId) =>
      submittedReviews.some(
        (r) => r.productId === productId && r.reviewer === currentUser.username,
      ),
    [submittedReviews],
  );

  const canReviewProduct = useCallback(
    (productId) =>
      Boolean(completedOrderForProduct(productId)) &&
      !hasReviewedProduct(productId),
    [completedOrderForProduct, hasReviewedProduct],
  );

  const addReview = useCallback(({ productId, sellerId, rating, text, photos }) => {
    setSubmittedReviews((prev) => [
      {
        id: `rev-${Date.now()}`,
        productId,
        sellerId,
        reviewer: currentUser.username,
        avatar: currentUser.avatar,
        rating,
        date: "Just now",
        createdAt: new Date().toISOString(),
        text,
        photos: photos ?? [],
      },
      ...prev,
    ]);
  }, []);

  const value = {
    reviews: allReviews,
    submittedReviews,
    reviewsWrittenCount: submittedReviews.length,
    reviewsForProduct,
    reviewsForSeller,
    productRating,
    sellerRating,
    completedOrderForProduct,
    hasReviewedProduct,
    canReviewProduct,
    addReview,
  };

  return (
    <ReviewContext.Provider value={value}>{children}</ReviewContext.Provider>
  );
}

export function useReviews() {
  const ctx = useContext(ReviewContext);
  if (!ctx) throw new Error("useReviews must be used within a ReviewProvider");
  return ctx;
}
