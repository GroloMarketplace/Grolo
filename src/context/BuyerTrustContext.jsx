import { createContext, useContext, useState, useEffect } from "react";
import { useOrders } from "./OrderContext";
import { useEvents } from "./EventContext";
import { useAuth } from "./AuthContext";
import { createReviewInDatabase, getBuyerReviews, getBuyerTrustAggregate, visibleReviews } from "../lib/api/reviews";
import { getReputationSnapshot, refreshUserReputation } from "../lib/api/reputation";
import { isSupabaseConfigured } from "../lib/supabaseClient";

const BuyerTrustContext = createContext(null);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isCanonicalUuid(value) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function buyerMatches(review, buyer, currentUserId) {
  const aliases = new Set([buyer, buyer === "you" ? "current-user" : null, buyer === "you" ? currentUserId : null].filter(Boolean).map((value) => String(value).toLowerCase()));
  return [review.buyer, review.buyerId, review.userId].some((value) => value != null && aliases.has(String(value).toLowerCase()));
}

export function BuyerTrustProvider({ children }) {
  const { orders } = useOrders();
  const { attendingEventIds } = useEvents();
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [trustAggregate, setTrustAggregate] = useState(null);
  const [communityImpact, setCommunityImpact] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setReviews([]);
    setTrustAggregate(null);
    setCommunityImpact(null);

    if (!user?.id || !isSupabaseConfigured) {
      console.info("reputation source: local fallback", { userId: user?.id ?? null });
      console.warn("review source: supabase read failed", {
        error: "Supabase authentication or configuration is unavailable.",
      });
      return () => {
        cancelled = true;
      };
    }

    getBuyerReviews()
      .then((remoteReviews) => {
        if (cancelled) return;
        setReviews(remoteReviews);
        getBuyerTrustAggregate(user.id)
          .then((aggregate) => {
            if (!cancelled) setTrustAggregate(aggregate);
          })
          .catch((aggregateError) => {
            console.warn("buyer trust aggregate source: supabase failed", {
              error: aggregateError?.message ?? String(aggregateError),
            });
          });
        getReputationSnapshot(user.id)
          .then((snapshot) => {
            if (cancelled) return;
            const reputationMetrics = snapshot?.buyerStatus?.metrics ?? {};
            setTrustAggregate((current) => ({ ...current, ...reputationMetrics, reputationStatus: snapshot?.buyerStatus?.currentStatus ?? null }));
            setCommunityImpact(snapshot?.communityImpact ?? null);
            console.info("reputation source: supabase", { userId: user.id, diagnostics: snapshot?.diagnostics });
          })
          .catch((reputationError) => {
            console.info("reputation source: local fallback", { userId: user.id, error: reputationError?.message ?? String(reputationError) });
          });
        console.info("review source: supabase", {
          reviewCount: remoteReviews.length,
          productReviewCount: 0,
          sellerReviewCount: 0,
          buyerReviewCount: remoteReviews.length,
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
  }, [user?.id]);

  const addReview = ({ buyer, buyerId, orderId, sellerId, criteria = [], notes = "", rating = 0, productId }) => {
    console.info("BuyerTrustContext.addReview called", {
      reviewType: "buyer",
      rating,
      criteria,
      sellerId: sellerId ?? null,
      buyerId: buyerId ?? null,
      orderId: orderId ?? null,
      listingId: productId ?? null,
    });
    const order = orders.find((candidate) => (
      candidate.id === orderId
      || candidate.orderId === orderId
      || candidate.databaseId === orderId
    ));
    const databaseOrderId = order?.databaseId ?? order?.orderId ?? (isCanonicalUuid(orderId) ? orderId : null);
    const resolvedBuyerId = order?.buyerId ?? buyerId ?? (isCanonicalUuid(buyer) ? buyer : null);
    const numericRating = Number(rating);
    const resolvedRating = Number.isInteger(numericRating) && numericRating >= 1 && numericRating <= 5
      ? numericRating
      : criteria.includes("Would Transact Again") ? 5 : 4;
    const reviewerId = user?.id ?? null;
    const localReview = {
      id: `buyer-trust-${Date.now()}`,
      reviewType: "buyer",
      buyer,
      buyerId: resolvedBuyerId ?? buyer,
      orderId: databaseOrderId,
      sellerId,
      rating: resolvedRating,
      criteria,
      notes,
      productId,
      createdAt: new Date().toISOString(),
    };
    const logContext = {
      reviewId: localReview.id,
      revieweeId: resolvedBuyerId,
      orderId: databaseOrderId,
      rating: resolvedRating,
      reviewerId,
    };
    console.info("buyer review requested", logContext);

    if (!user?.id || !isSupabaseConfigured) {
      console.warn("buyer review failed", { ...logContext, error: "Supabase is not configured or user is unauthenticated." });
      return Promise.resolve(null);
    }

    return createReviewInDatabase(localReview, {
      reviewerId: user.id,
      reviewType: "buyer",
      revieweeId: resolvedBuyerId,
      orderId: databaseOrderId,
    }).then((createdReview) => {
      console.info("buyer review succeeded", {
        reviewId: createdReview?.databaseId ?? createdReview?.id,
        revieweeId: createdReview?.revieweeId ?? resolvedBuyerId,
        orderId: createdReview?.orderId ?? databaseOrderId,
        reviewerId: createdReview?.reviewerId ?? user.id,
      });
      setReviews((current) => [...current, createdReview]);
      const reviewId = createdReview?.databaseId ?? createdReview?.id ?? localReview.id;
      void refreshUserReputation(reviewerId, { eventKey: `published-buyer-review:${reviewId}:reviewer` });
      void refreshUserReputation(createdReview?.revieweeId ?? resolvedBuyerId, { eventKey: `published-buyer-review:${reviewId}:reviewee` });
      return createdReview;
    }).catch((error) => {
      console.warn("buyer review failed", {
        ...logContext,
        error: error?.message ?? String(error),
      });
      return null;
    });
  };

  const reviewsForBuyer = (buyer = "you") => visibleReviews(reviews).filter((review) => buyerMatches(review, buyer, user?.id));
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
    const isCurrentBuyer = buyer === "you"
      || buyer === user?.id
      || buyer === user?.user_metadata?.username;
    return {
      completedTransactions: isCurrentBuyer && trustAggregate
        ? trustAggregate.completedTransactionCount
        : orders.filter((order) => (order.buyer === buyer || (buyer === "you" && !order.buyerId && order.buyer === "you")) && order.status === "Completed").length,
      sellerRecommendations: isCurrentBuyer && trustAggregate
        ? trustAggregate.sellerRecommendationCount
        : buyerReviews.filter((review) => review.criteria?.length > 0).length,
      wouldTransactAgain: isCurrentBuyer && trustAggregate
        ? trustAggregate.wouldTransactAgainCount
        : buyerReviews.filter((review) => review.criteria?.includes("Would Transact Again")).length,
      eventsAttended: buyer === "you" ? attendingEventIds.length : 0,
      accountAgeDays: buyer === "you" ? accountAgeDays : 0,
      accountAgeMonths: buyer === "you" ? accountAgeMonths : 0,
      sellerReviews: isCurrentBuyer && trustAggregate ? trustAggregate.buyerReviewCount : buyerReviews.length,
      reviewsWritten: isCurrentBuyer && trustAggregate ? trustAggregate.buyerReviewCount : buyerReviews.length,
      reliable: (isCurrentBuyer && trustAggregate
        ? trustAggregate.buyerReviewCount > 0 && trustAggregate.wouldTransactAgainCount === trustAggregate.buyerReviewCount
        : buyerReviews.length > 0 && buyerReviews.every((review) => review.criteria?.includes("Would Transact Again"))),
    };
  };
  const hasReviewedOrder = (orderId) => visibleReviews(reviews).some((review) => review.orderId === orderId);

  const value = { reviews, addReview, reviewsForBuyer, getBuyerTrust, hasReviewedOrder, communityImpact };
  return <BuyerTrustContext.Provider value={value}>{children}</BuyerTrustContext.Provider>;
}

export function useBuyerTrust() {
  const context = useContext(BuyerTrustContext);
  if (!context) throw new Error("useBuyerTrust must be used within a BuyerTrustProvider");
  return context;
}
