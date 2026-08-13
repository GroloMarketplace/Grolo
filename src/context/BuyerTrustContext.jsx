import { createContext, useContext, useMemo, useState, useEffect } from "react";
import { useOrders } from "./OrderContext";
import { useEvents } from "./EventContext";
import { useAuth } from "./AuthContext";
import { createReviewInDatabase, getBuyerReviews, getBuyerTrustAggregate, visibleReviews } from "../lib/api/reviews";
import { isSupabaseConfigured } from "../lib/supabaseClient";

const BuyerTrustContext = createContext(null);

function buyerMatches(review, buyer) {
  const aliases = new Set([buyer, buyer === "you" ? "current-user" : null].filter(Boolean).map((value) => String(value).toLowerCase()));
  return [review.buyer, review.buyerId, review.userId].some((value) => value != null && aliases.has(String(value).toLowerCase()));
}

export function BuyerTrustProvider({ children }) {
  const { orders } = useOrders();
  const { attendingEventIds } = useEvents();
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [trustAggregate, setTrustAggregate] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setReviews([]);
    setTrustAggregate(null);

    if (!user?.id || !isSupabaseConfigured) {
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

  const addReview = ({ buyer, orderId, sellerId, criteria = [], notes = "", rating = 0, productId }) => {
    const order = orders.find((candidate) => (
      candidate.id === orderId
      || candidate.orderId === orderId
      || candidate.databaseId === orderId
    ));
    const databaseOrderId = order?.databaseId ?? order?.orderId ?? orderId;
    const revieweeId = order?.buyerId ?? (buyer && buyer.includes("-") ? buyer : null);
    const reviewerId = user?.id ?? null;
    const localReview = {
      id: `buyer-trust-${Date.now()}`,
      reviewType: "buyer",
      buyer,
      buyerId: buyer === "you" ? "current-user" : buyer,
      orderId,
      sellerId,
      rating: rating || (criteria.includes("Would Transact Again") ? 5 : 4),
      criteria,
      notes,
      productId,
      createdAt: new Date().toISOString(),
    };
    const logContext = {
      reviewId: localReview.id,
      revieweeId,
      orderId: databaseOrderId ?? null,
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
      revieweeId,
      orderId: databaseOrderId,
    }).then((createdReview) => {
      console.info("buyer review succeeded", {
        reviewId: createdReview?.databaseId ?? createdReview?.id,
        revieweeId: createdReview?.revieweeId ?? revieweeId,
        orderId: createdReview?.orderId ?? databaseOrderId,
        reviewerId: createdReview?.reviewerId ?? user.id,
      });
      setReviews((current) => [...current, createdReview]);
      return createdReview;
    }).catch((error) => {
      console.warn("buyer review failed", {
        ...logContext,
        error: error?.message ?? String(error),
      });
      return null;
    });
  };

  const reviewsForBuyer = (buyer = "you") => visibleReviews(reviews).filter((review) => buyerMatches(review, buyer));
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

  const value = useMemo(() => ({ reviews, addReview, reviewsForBuyer, getBuyerTrust, hasReviewedOrder }), [reviews, orders, attendingEventIds, user?.created_at]);
  return <BuyerTrustContext.Provider value={value}>{children}</BuyerTrustContext.Provider>;
}

export function useBuyerTrust() {
  const context = useContext(BuyerTrustContext);
  if (!context) throw new Error("useBuyerTrust must be used within a BuyerTrustProvider");
  return context;
}
