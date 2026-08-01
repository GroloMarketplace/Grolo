import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";

const mockReviews = [
  {
    id: 1,
    reviewer: "johndoe",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80",
    rating: 5,
    date: "2 days ago",
    text: "Fantastic quality and very fresh! The strawberries were sweet and perfectly ripe. Will definitely order again.",
    product: "Bag of Strawberries",
    productImage: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=100&q=80",
  },
  {
    id: 2,
    reviewer: "janedoe",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80",
    rating: 5,
    date: "1 week ago",
    text: "Amazing produce! The organic beets were delicious and perfect for roasting. Great seller!",
    product: "Organic Beets",
    productImage: "https://images.unsplash.com/photo-1520052205864-92d242b3a76b?w=100&q=80",
  },
  {
    id: 3,
    reviewer: "bobsmith",
    avatar: "https://images.unsplash.com/photo-1541823709867-1b206113eafd?w=100&q=80",
    rating: 4,
    date: "2 weeks ago",
    text: "Good quality and fair prices. The produce was fresh and well-packaged. Would recommend.",
    product: "Bag of Strawberries",
    productImage: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=100&q=80",
  },
  {
    id: 4,
    reviewer: "alicejohnson",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80",
    rating: 5,
    date: "3 weeks ago",
    text: "Best strawberries I've ever had! So sweet and juicy. The seller is very responsive and friendly.",
    product: "Bag of Strawberries",
    productImage: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=100&q=80",
  },
  {
    id: 5,
    reviewer: "charliebrown",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80",
    rating: 3,
    date: "1 month ago",
    text: "Decent quality but delivery was a bit delayed. The produce was still fresh though.",
    product: "Organic Beets",
    productImage: "https://images.unsplash.com/photo-1520052205864-92d242b3a76b?w=100&q=80",
  },
];

const ratingBreakdown = [
  { stars: 5, count: 78 },
  { stars: 4, count: 23 },
  { stars: 3, count: 12 },
  { stars: 2, count: 6 },
  { stars: 1, count: 5 },
];

export default function StoreReviews() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Most Recent");

  const filters = ["All", "5 Stars", "4 Stars", "3 Stars", "2 Stars", "1 Star"];
  const sortOptions = ["Most Recent", "Oldest", "Highest Rating", "Lowest Rating"];

  const averageRating = 4.8;
  const totalReviews = 124;

  const filteredReviews = mockReviews.filter((review) => {
    if (filter === "All") return true;
    const starRating = parseInt(filter);
    return review.rating === starRating;
  });

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
          {filteredReviews.map((review) => (
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
                  <div className="flex items-center gap-2 mt-2 p-2 bg-[#F5F5F5] rounded-lg">
                    <img
                      src={review.productImage}
                      alt={review.product}
                      className="w-12 h-12 rounded-lg object-cover shrink-0"
                    />
                    <div className="flex-1">
                      <div className="text-[12px] text-[#828282]">Purchased:</div>
                      <div className="text-[14px] font-medium">{review.product}</div>
                    </div>
                  </div>

                  <p className="text-[14px] mt-3 leading-[140%]">{review.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MobileScreenLayout>
  );
}
