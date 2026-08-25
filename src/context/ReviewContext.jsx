import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  currentUser,
  products,
  sellers,
} from "../data/mockData";
import { useOrders } from "./OrderContext";
import { useAuth } from "./AuthContext";
import {
  createReviewInDatabase,
  getProductRatingAggregates,
  getProductReviews,
  getSellerRatingAggregates,
  getSellerReviews,
  visibleReviews,
} from "../lib/api/reviews";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { refreshUserReputation } from "../lib/api/reputation";

const ReviewContext = createContext(null);

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

function buyerAliases(reviewer, reviewerId) {
  return new Set([reviewer, reviewerId].filter(Boolean).map((value) => String(value).trim().toLowerCase()));
}

function buyerAliasesForIdentity(identity) {
  return buyerAliases(identity.username, identity.id);
}

function belongsToBuyer(review, aliases) {
  return [review.reviewer, review.reviewerId, review.userId, review.buyerId, review.authorId, review.username, review.author, review.buyer]
    .filter((value) => typeof value === "string" || typeof value === "number")
    .some((value) => aliases.has(String(value).trim().toLowerCase()));
}

function isCompletedOrderStatus(status) {
  return ["completed", "complete", "completed_pickup", "picked_up", "fulfilled"].includes(
    String(status ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_"),
  );
}

function orderMatchesProduct(order, productId) {
  const product = products.find((item) => [item.id, item.databaseId, item.legacyId].filter(Boolean).map(String).includes(String(productId ?? "")));
  const targetIds = new Set([productId, product?.id, product?.databaseId, product?.legacyId].filter(Boolean).map(String));
  const orderIds = [order.productId, order.listingId, order.product_id, order.listing_id, ...(order.orderItems ?? []).flatMap((item) => [item.productId, item.listingId, item.product_id, item.listing_id])]
    .filter(Boolean)
    .map(String);
  return orderIds.some((id) => targetIds.has(id));
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
  const [submittedReviews, setSubmittedReviews] = useState([]);
  const [productAggregates, setProductAggregates] = useState(new Map());
  const [sellerAggregates, setSellerAggregates] = useState(new Map());

  useEffect(() => {
    let cancelled = false;
    setSubmittedReviews([]);
    setProductAggregates(new Map());
    setSellerAggregates(new Map());

    if (!user?.id || !isSupabaseConfigured) {
      console.warn("review source: supabase read failed", {
        error: "Supabase authentication or configuration is unavailable.",
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
        Promise.all([getProductRatingAggregates(), getSellerRatingAggregates()])
          .then(([productRowsAggregate, sellerRowsAggregate]) => {
            if (cancelled) return;
            const productMap = new Map();
            productRowsAggregate.forEach((aggregate) => {
              productMap.set(aggregate.listing_id, aggregate);
              remoteReviews
                .filter((review) => review.listing_id === aggregate.listing_id)
                .forEach((review) => productMap.set(review.productId, aggregate));
            });
            const sellerMap = new Map();
            sellerRowsAggregate.forEach((aggregate) => {
              sellerMap.set(aggregate.reviewee_id, aggregate);
              remoteReviews
                .filter((review) => review.reviewee_id === aggregate.reviewee_id || review.sellerId === aggregate.reviewee_id)
                .forEach((review) => sellerMap.set(review.sellerId, aggregate));
            });
            setProductAggregates(productMap);
            setSellerAggregates(sellerMap);
          })
          .catch((aggregateError) => {
            console.warn("review aggregate source: supabase failed", {
              error: aggregateError?.message ?? String(aggregateError),
            });
          });
        console.info("review source: supabase", {
          reviewCount: remoteReviews.length,
          productReviewCount: productRows.length,
          sellerReviewCount: sellerRows.length,
          buyerReviewCount: 0,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        console.warn("review source: supabase read failed", {
          error: error?.message ?? String(error),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [identity, user?.id]);

  const allReviews = useMemo(
    () => visibleReviews(submittedReviews),
    [submittedReviews],
  );

  const reviewsForProduct = useCallback(
    (productId) => allReviews.filter((r) => r.productId === productId),
    [allReviews],
  );

  const reviewsForSeller = useCallback(
    (sellerId) => allReviews.filter((review) => String(review.sellerId ?? review.reviewee_id ?? "") === String(sellerId ?? "")),
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
      const aggregate = productAggregates.get(productId);
      if (aggregate) return aggregate;
      const product = products.find((p) => p.id === productId);
      const added = visibleReviews(submittedReviews)
        .filter((r) => r.productId === productId)
        .map((r) => r.rating);
      return averageWith(product?.rating ?? 0, product?.reviewCount ?? 0, added);
    },
    [productAggregates, submittedReviews],
  );

  const sellerRating = useCallback(
    (sellerId) => {
      const sellerReviews = allReviews
        .filter((review) => String(review.sellerId ?? review.reviewee_id ?? "") === String(sellerId ?? ""));
      if (sellerReviews.length) return averageWith(0, 0, sellerReviews.map((review) => review.rating));
      const aggregate = sellerAggregates.get(sellerId);
      if (aggregate) return aggregate;
      const seller = sellers[sellerId];
      return averageWith(seller?.rating ?? 0, seller?.reviewCount ?? 0, []);
    },
    [allReviews, sellerAggregates],
  );

  const completedOrderForProduct = useCallback(
    (productId) => {
      const buyerAliases = buyerAliasesForIdentity(identity);
      const order = orders.find((candidate) => {
        const buyerMatches = [candidate.buyerId, candidate.buyer_id, candidate.buyer, candidate.username]
          .filter(Boolean)
          .some((value) => buyerAliases.has(String(value).trim().toLowerCase()));
        return orderMatchesProduct(candidate, productId) && isCompletedOrderStatus(candidate.status) && buyerMatches;
      });
      console.info("review eligibility calculation", {
        productId,
        orderId: order?.databaseId ?? order?.orderId ?? order?.id ?? null,
        orderStatus: order?.status ?? null,
        fulfillmentType: order?.fulfillmentMethod ?? order?.fulfillment_method ?? null,
        buyerId: order?.buyerId ?? order?.buyer_id ?? null,
        eligible: Boolean(order),
      });
      return order;
    },
    [identity, orders],
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
    const completedOrder = completedOrderForProduct(productId);
    const orderItem = completedOrder?.orderItems?.find((item) => (
      item.productId === productId || item.listingId === productId
    ));
    const orderId = target.orderId ?? completedOrder?.databaseId ?? completedOrder?.orderId ?? completedOrder?.id;
    const listingDatabaseId = target.listingId ?? orderItem?.listingId;
    const orderItemId = target.orderItemId ?? orderItem?.id;
    const localReview = normalizeReview({
      id: `rev-${Date.now()}`,
      ...target,
      reviewType: "product",
      productId,
      listingId: listingDatabaseId ?? productId,
      orderId,
      orderItemId,
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
    }, identity);
    const logContext = {
      reviewId: localReview.id,
      listingId: listingDatabaseId ?? productId,
      orderId: orderId ?? null,
      orderItemId: orderItemId ?? null,
      reviewerId: identity.id,
    };
    console.info("review create requested", logContext);

    if (!user?.id || !isSupabaseConfigured) {
      console.warn("review create failed", { ...logContext, error: "Supabase is not configured or user is unauthenticated." });
      return Promise.resolve(null);
    }

    return createReviewInDatabase(localReview, {
      reviewerId: user.id,
      listingId: listingDatabaseId,
      orderId,
      orderItemId,
    }).then((createdReview) => {
      console.info("review create succeeded", {
        reviewId: createdReview?.databaseId ?? createdReview?.id,
        listingId: createdReview?.listingId ?? listingDatabaseId,
        orderId: createdReview?.orderId ?? orderId,
        orderItemId: createdReview?.orderItemId ?? orderItemId,
        reviewerId: createdReview?.reviewerId ?? user.id,
      });
      setSubmittedReviews((prev) => [createdReview, ...prev]);
      const reviewId = createdReview?.databaseId ?? createdReview?.id ?? localReview.id;
      const revieweeId = createdReview?.revieweeId ?? createdReview?.sellerId ?? sellerId;
      void refreshUserReputation(identity.id, { eventKey: `published-review:${reviewId}:reviewer` });
      void refreshUserReputation(revieweeId, { eventKey: `published-review:${reviewId}:reviewee` });
      return createdReview;
    }).catch((error) => {
      console.warn("review create failed", {
        ...logContext,
        error: error?.message ?? String(error),
      });
      return null;
    });
  }, [completedOrderForProduct, identity, user?.id]);

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
