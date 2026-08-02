import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import StarRating from "../components/StarRating";
import { products } from "../data/mockData";
import { useReviews } from "../context/ReviewContext";

const filters = ["All Reviews", "5 Stars", "4 Stars", "3 Stars", "2 Stars", "1 Star"];
const sortOptions = ["Most Recent", "Oldest", "Highest Rating", "Lowest Rating"];

export default function ProductReviews() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("All Reviews");
  const [sortBy, setSortBy] = useState("Most Recent");
  const { reviewsForProduct, productRating, canReviewProduct } = useReviews();

  const product = products.find((p) => p.id === id);
  const { average, count } = productRating(id);

  const visibleReviews = reviewsForProduct(id)
    .filter((r) => filter === "All Reviews" || r.rating === parseInt(filter, 10))
    .sort((a, b) => {
      if (sortBy === "Most Recent") return b.createdAt.localeCompare(a.createdAt);
      if (sortBy === "Oldest") return a.createdAt.localeCompare(b.createdAt);
      if (sortBy === "Highest Rating") return b.rating - a.rating;
      return a.rating - b.rating;
    });

  return (
    <MobileScreenLayout>
      <Header title="Reviews" onBack={() => navigate(-1)} />
      <div className="overflow-y-auto flex-1 no-scrollbar">
        {/* Overview */}
        <div className="p-4 border-b border-[#E6E6E6]">
          {product && (
            <div className="flex items-center gap-3 mb-4">
              <img
                src={product.image}
                alt={product.name}
                className="w-12 h-12 rounded-lg object-cover shrink-0"
              />
              <div className="flex-1">
                <div className="text-[14px] font-medium">{product.name}</div>
                <div className="text-[12px] text-[#828282]">{product.shop}</div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="text-[32px] font-semibold text-[#498467]">{average}</div>
            <div>
              <StarRating rating={average} />
              <div className="text-[12px] text-[#828282] mt-1">
                ({count} Reviews)
              </div>
            </div>
          </div>
          {canReviewProduct(id) && (
            <button
              onClick={() => navigate(`/leave-review/${id}`)}
              className="w-full mt-4 bg-[#498467] text-white py-2.5 rounded-lg text-[14px] font-medium"
            >
              Leave Review
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 px-4 py-3 border-b border-[#E6E6E6] overflow-x-auto no-scrollbar">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap ${
                filter === f ? "bg-[#498467] text-white" : "bg-[#F5F5F5] text-black"
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
          {visibleReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
          {visibleReviews.length === 0 && (
            <div className="px-4 py-8 text-center text-[14px] text-[#828282]">
              No reviews yet
            </div>
          )}
        </div>
      </div>
    </MobileScreenLayout>
  );
}

export function ReviewCard({ review }) {
  return (
    <div className="p-4 border-b border-[#E6E6E6]">
      <div className="flex items-start gap-3">
        <img
          src={review.avatar}
          alt={review.reviewer}
          className="w-10 h-10 rounded-full object-cover shrink-0"
        />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold">{review.reviewer}</span>
              <StarRating rating={review.rating} />
            </div>
            <span className="text-[12px] text-[#828282]">{review.date}</span>
          </div>

          <p className="text-[14px] mt-2 leading-[140%]">{review.text}</p>

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
}
