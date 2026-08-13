import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  currentUser,
  productReviews,
  products,
  sellers,
} from "../data/mockData";
import { useOrders } from "./OrderContext";
import { useAuth } from "./AuthContext";
import { getProductReviews, getSellerReviews } from "../lib/api/reviews";
import { isSupabaseConfigured } from "../lib/supabaseClient";

const ReviewContext = createContext(null);
const REVIEW_STORAGE_KEY = "grolo-submitted-reviews";

function getIdentity(user) {
  return {
    id: user?.id ?? currentUser.id,
    username: user?.user_metadata?.username ?? user?.user_metadata?.name ?? currentUser.username,
    email: user?.email,
    avatar: user?.user_metadata?.avatar_url ?? currentUser.avatar,
  };
}

function normalizeReview(review, identity = getIdentity()) {
  const source = review && typeof review === "object" ? review : {};
  const reviewerId = source.reviewerId ?? source.userId ?? source.buyerId ?? source.authorId ?? source.user_id ?? source.buyer_id ?? identity?.id;
  const reviewer = source.reviewer ?? source.username ?? source.author ?? (typeof source.buyer === "string" ? source.buyer : null) ?? identity?.username;
  return {
    ...source,
    reviewer,
    reviewerId,
    buyerId: source.buyerId ?? source.buyer_id ?? reviewerId,
    public: source.public !== false,
    deleted: Boolean(source.deleted),
    draft: Boolean(source.draft),
    private: Boolean(source.private),
  };
}

function readSubmittedReviews(identity, storageKey) {
  try {
    const savedValues = [localStorage.getItem(storageKey)];
    const savedReviews = savedValues.flatMap((value) => {
      if (!value) return [];
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
        if (Array.isArray(parsed?.reviews)) return parsed.reviews;
        if (Array.isArray(parsed?.data)) return parsed.data;
        return [];
      } catch {
        return [];
      }
    });
    const uniqueReviews = [...new Map(savedReviews.map((review, index) => [review?.id ?? `legacy-review-${index}`, review])).values()];
    return uniqueReviews.map((review) => normalizeReview(review, identity));
  } catch {
    return [];
  }
}

function buyerAliases(reviewer, reviewerId) {
  return new Set([reviewer, reviewerId].filter(Boolean).map((value) => String(value).trim().toLowerCase()));
}

function belongsToBuyer(review, aliases) {
  return [review.reviewer, review.reviewerId, review.userId, review.buyerId, review.authorId, review.username, review.author, review.buyer]
    .filter((value) => typeof value === "string" || typeof value === "number")
    .some((value) => aliases.has(String(value).trim().toLowerCase()));
}

function averageWith(baseRating, baseCount, addedRatings) {
  const count = baseCount + addedRatings.length;
  if (!count) return { average: 0, count: 0 };
  const sum =
    baseRating * baseCount + addedRatings.reduce((total, r) => total + r, 0);
  return { average: Number((sum / count).toFixed(1)), count };
}

export function ReviewProvider({ children }) {
  const { orders } = useOrders();
  const { user } = useAuth();
  const identity = useMemo(() => getIdentity(user), [user]);
  const storageKey = `${REVIEW_STORAGE_KEY}-${user?.id ?? "anonymous"}`;
  const [submittedReviews, setSubmittedReviews] = useState(() => readSubmittedReviews(identity, storageKey));

  useEffect(() => {
    let cancelled = false;
    const localReviews = readSubmittedReviews(identity, storageKey);
    setSubmittedReviews(localReviews);

    if (!user?.id || !isSupabaseConfigured) {
      console.info("review source: localStorage fallback", {
        reviewCount: localReviews.length,
        productReviewCount: localReviews.filter((review) => review.reviewType === "product" || !review.reviewType).length,
        sellerReviewCount: localReviews.filter((review) => review.reviewType === "seller").length,
        buyerReviewCount: localReviews.filter((review) => review.reviewType === "buyer").length,
      });
      return () => {
        cancelled = true;
      };
    }

    Promise.all([getProductReviews(), getSellerReviews()])
      .then(([productRows, sellerRows]) => {
        if (cancelled) return;
        const remoteReviews = [...productRows, ...sellerRows].map((review) => normalizeReview(review, identity));
        setSubmittedReviews(remoteReviews);
        console.info("review source: supabase", {
          reviewCount: remoteReviews.length,
          productReviewCount: productRows.length,
          sellerReviewCount: sellerRows.length,
          buyerReviewCount: 0,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        console.warn("review source: localStorage fallback", {
          error: error?.message ?? String(error),
          reviewCount: localReviews.length,
          productReviewCount: localReviews.filter((review) => review.reviewType === "product" || !review.reviewType).length,
          sellerReviewCount: localReviews.filter((review) => review.reviewType === "seller").length,
          buyerReviewCount: localReviews.filter((review) => review.reviewType === "buyer").length,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [identity, storageKey, user?.id]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(submittedReviews));
    } catch {
    }
  }, [storageKey, submittedReviews]);

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
    (reviewer = identity.username, reviewerId = identity.id) => {
      const aliases = buyerAliases(reviewer, reviewerId);
      aliases.add(currentUser.username.toLowerCase());
      aliases.add(currentUser.id.toLowerCase());
      if (identity.email) aliases.add(identity.email.toLowerCase());
      return allReviews.filter((review) => belongsToBuyer(review, aliases) && review.public !== false && !review.deleted && !review.draft && !review.private);
    },
    [allReviews, identity],
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
          String(o.buyer ?? "").toLowerCase() === identity.username.toLowerCase(),
      ),
    [identity.username, orders],
  );

  const hasReviewedProduct = useCallback(
    (productId) => submittedReviews.some((review) => belongsToBuyer(review, buyerAliases(identity.username, identity.id)) && review.productId === productId),
    [identity, submittedReviews],
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
        reviewer: identity.username,
        reviewerId: identity.id,
        buyerId: identity.id,
        avatar: identity.avatar,
        rating,
        date: "Just now",
        createdAt: new Date().toISOString(),
        text,
        photos: photos ?? [],
      }, identity),
      ...prev,
    ]);
  }, [identity]);

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
