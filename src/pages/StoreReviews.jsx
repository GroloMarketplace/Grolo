import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { useReviews } from "../context/ReviewContext";
import { useListings } from "../context/ListingContext";
import { useAuth } from "../context/AuthContext";
import ReputationSummary from "../components/ReputationSummary";
import { useReputationSnapshot } from "../hooks/useReputationRead";
import { useResolvedStoreProfile } from "../hooks/useEntityResolution";

const STORE_ID = "current-user";


export default function StoreReviews() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Most Recent");
  const { reviewsForSeller, sellerRating } = useReviews();
  const { listings } = useListings();
  const { user } = useAuth();
  const requestedStoreId = user?.id ?? STORE_ID;
  const storeProfile = useResolvedStoreProfile(requestedStoreId);
  const resolvedStoreId = storeProfile?.id ?? STORE_ID;

  const filters = ["All", "5 Stars", "4 Stars", "3 Stars", "2 Stars", "1 Star"];
  const sortOptions = ["Most Recent", "Oldest", "Highest Rating", "Lowest Rating"];

  const { average: averageRating, count: totalReviews } = sellerRating(resolvedStoreId);
  useEffect(() => {
  }, [averageRating, resolvedStoreId, totalReviews]);
  const reputationSnapshot = useReputationSnapshot(resolvedStoreId);
  const hasReputation = Boolean(reputationSnapshot?.sellerStatus || reputationSnapshot?.activeBadges?.length);

  const returnedReviews = useMemo(() => reviewsForSeller(resolvedStoreId), [resolvedStoreId, reviewsForSeller]);
  const storeReviews = useMemo(() => {
    const unique = new Map();
    returnedReviews.forEach((review) => {
      const reviewId = review.id ?? review.databaseId;
      const key = reviewId ? String(reviewId) : `review-without-id-${unique.size}`;
      if (!unique.has(key)) unique.set(key, review);
    });
    return [...unique.values()];
  }, [returnedReviews]);

  const ratingBreakdown = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: storeReviews.filter((review) => review.rating === stars).length,
  }));

  const filteredReviews = useMemo(() => storeReviews
    .filter((review) => filter === "All" || review.rating === parseInt(filter, 10))
    .sort((a, b) => {
      if (sortBy === "Most Recent") return b.createdAt.localeCompare(a.createdAt);
      if (sortBy === "Oldest") return a.createdAt.localeCompare(b.createdAt);
      if (sortBy === "Highest Rating") return b.rating - a.rating;
      return a.rating - b.rating;
    }), [filter, sortBy, storeReviews]);

  useEffect(() => {
  }, [filteredReviews, returnedReviews, storeReviews]);

  const renderStars = (rating) => {
    return Array(5)
      .fill(0)
      .map((_, i) => (
        <svg
          key={i}
          width="16"
          height="16"
          viewBox="0 0 20 20"
          fill="none"
          className={i < rating ? "text-[#FFC107]" : "text-[#E6E6E6]"}
        >
          <path
            d="M10 1.67 12.58 6.88l5.75.84-4.16 4.06.98 5.73L10 14.81l-5.15 2.71.98-5.73L1.67 7.73l5.75-.84L10 1.67Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1"
          />
        </svg>
      ));
  };

  const renderRatingBreakdown = () => {
    return ratingBreakdown.map((item) => (
      <div key={item.stars} className="flex items-center gap-2">
        <div className="flex gap-0.5 w-20">
          {renderStars(item.stars)}
        </div>
        <div className="flex-1 h-2 bg-[#E6E6E6] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#FFC107] rounded-full"
            style={{ width: `${(item.count / totalReviews) * 100}%` }}
          />
        </div>
        <span className="text-[12px] text-[#828282] w-8 text-right">{item.count}</span>
      </div>
    ));
  };

  return (
    <MobileScreenLayout>
      <Header title="Store Reviews" onBack={() => navigate("/shop")} />
      <div className="overflow-y-auto flex-1 no-scrollbar">
        {/* Overview Section */}
        <div className="p-4 border-b border-[#E6E6E6]">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-[48px] font-semibold text-[#498467]">
                {averageRating}
              </div>
              <div className="flex justify-center gap-0.5 mt-1">
                {renderStars(Math.round(averageRating))}
              </div>
              <div className="text-[12px] text-[#828282] mt-1">
                {totalReviews} reviews
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-2">
              {renderRatingBreakdown()}
            </div>
          </div>
        </div>
        {hasReputation && (
          <div className="px-4 py-3 border-b border-[#E6E6E6]">
            <div className="mb-2 flex items-center gap-2 text-[13px] font-medium text-[#498467]">
              Seller reputation
            </div>
            <ReputationSummary snapshot={reputationSnapshot} audience="seller" sellerId={resolvedStoreId} foundingMember={Boolean(storeProfile?.founding_member) || Boolean(storeProfile?.foundingMember)} memberSince={storeProfile?.created_at ?? storeProfile?.createdAt} storeCreatedAt={storeProfile?.store_opened_at ?? storeProfile?.storeOpenedAt} compact className="border-0 p-0" />
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 px-4 py-3 border-b border-[#E6E6E6] overflow-x-auto no-scrollbar">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap ${
                filter === f
                  ? "bg-[#498467] text-white"
                  : "bg-[#F5F5F5] text-black"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Sorting */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E6E6E6]">
          <span className="text-[12px] text-[#828282]">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-[12px] text-[#498467] font-medium outline-none bg-transparent"
          >
            {sortOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {/* Reviews List */}
        <div className="flex flex-col">
          {filteredReviews.map((review) => {
            const product = listings.find((item) => [item.id, item.legacyId, item.databaseId].filter(Boolean).map(String).includes(String(review.productId)));

            return (
              <div
                key={review.id}
                className="p-4 border-b border-[#E6E6E6]"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={review.avatar}
                    alt={review.reviewer}
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold">
                          {review.reviewer}
                        </span>
                        <div className="flex gap-0.5">
                          {renderStars(review.rating)}
                        </div>
                      </div>
                      <span className="text-[12px] text-[#828282]">
                        {review.date}
                      </span>
                    </div>

                    {/* Product Purchased */}
                    {product && (
                      <div className="flex items-center gap-2 mt-2 p-2 bg-[#F5F5F5] rounded-lg">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-12 h-12 rounded-lg object-cover shrink-0"
                        />
                        <div className="flex-1">
                          <div className="text-[12px] text-[#828282]">Purchased:</div>
                          <div className="text-[14px] font-medium">{product.name}</div>
                        </div>
                      </div>
                    )}

                    <p className="whitespace-pre-wrap text-[14px] mt-3 leading-[140%]">{review.text}</p>

                    {review.photos?.length > 0 && (
                      <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
                        {review.photos.map((photo) => (
                          <img
                            key={photo}
                            src={photo}
                            alt="Review photo"
                            className="w-20 h-20 rounded-lg object-cover shrink-0"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </MobileScreenLayout>
  );
}
