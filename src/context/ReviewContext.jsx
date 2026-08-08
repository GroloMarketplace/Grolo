import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  currentUser,
  productReviews,
  products,
  sellers,
} from "../data/mockData";
import { useOrders } from "./OrderContext";

const ReviewContext = createContext(null);
const REVIEW_STORAGE_KEY = "grolo-submitted-reviews";

function normalizeReview(review) {
  const source = review && typeof review === "object" ? review : {};
  return {
    ...source,
    reviewer: source.reviewer ?? source.username ?? currentUser.username,
    reviewerId: source.reviewerId ?? source.userId ?? source.buyerId ?? currentUser.id,
    public: source.public !== false,
    deleted: Boolean(source.deleted),
    draft: Boolean(source.draft),
    private: Boolean(source.private),
  };
}

function readSubmittedReviews() {
  try {
    const saved = JSON.parse(localStorage.getItem(REVIEW_STORAGE_KEY));
    return Array.isArray(saved) ? saved.map(normalizeReview) : [];
  } catch {
    return [];
  }
}

function averageWith(baseRating, baseCount, addedRatings) {
  const count = baseCount + addedRatings.length;
  if (!count) return { average: 0, count: 0 };
  const sum =
    baseRating * baseCount + addedRatings.reduce((total, r) => total + r, 0);
  return { average: Number((sum / count).toFixed(1)), count };
}

export function ReviewProvider({ children }) {
  const [submittedReviews, setSubmittedReviews] = useState(readSubmittedReviews);
  const { orders } = useOrders();

  useEffect(() => {
    try {
      localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(submittedReviews));
    } catch {
    }
  }, [submittedReviews]);

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

  const reviewsForBuyer = useCallback(
    (reviewer = currentUser.username, reviewerId = currentUser.id) => submittedReviews
      .filter((review) => (review.reviewer === reviewer || review.reviewerId === reviewerId || review.userId === reviewerId || review.buyerId === reviewerId) && review.public !== false && !review.deleted && !review.draft && !review.private),
    [submittedReviews],
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

  const addReview = useCallback(({ productId, sellerId, rating, text, photos, ...target }) => {
    setSubmittedReviews((prev) => [
      normalizeReview({
        id: `rev-${Date.now()}`,
        ...target,
        productId,
        sellerId,
        reviewer: currentUser.username,
        reviewerId: currentUser.id,
        buyerId: currentUser.id,
        avatar: currentUser.avatar,
        rating,
        date: "Just now",
        createdAt: new Date().toISOString(),
        text,
        photos: photos ?? [],
      }),
      ...prev,
    ]);
  }, []);

  const value = {
    reviews: allReviews,
    submittedReviews,
    reviewsWrittenCount: reviewsForBuyer().length,
    reviewsForProduct,
    reviewsForBuyer,
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
