import { useEffect } from "react";
import { products, sellers } from "../data/mockData";
import TrustSafetyActions from "./TrustSafetyActions";

const REVIEW_CRITERIA = ["Would Transact Again", "Communicated Well", "Arrived for Pickup", "Polite and Respectful"];

export default function SellerReviewCard({ review }) {
  const seller = sellers[review.sellerId];
  const product = products.find((item) => item.id === review.productId);
  const rating = Math.round(Math.max(0, Math.min(Number(review.rating) || 0, 5)));
  const date = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : review.date ?? "Date unavailable";
  const sellerName = review.sellerName || review.storeName || seller?.name || "Verified Seller";
  const writtenFeedback = String(review.body || review.notes || review.text || "").trim();
  const criteria = REVIEW_CRITERIA.filter((criterion) => review.criteria?.includes(criterion));
  const profileAvatarUrl = review.avatar ?? null;
  const avatarUrlUsed = profileAvatarUrl ?? seller?.avatar ?? "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&q=80";

  useEffect(() => {
    if (review.reviewType !== "buyer" && review.review_type !== "buyer") return;
  }, [avatarUrlUsed, profileAvatarUrl, review]);

  return (
    <article className="flex w-full gap-3 rounded-lg border border-[#E6E6E6] p-3">
      <img src={avatarUrlUsed} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
      <div className="min-w-0 flex-1">
        <div className="text-[15px] tracking-[1px] text-[#D7A84B]" aria-label={`${rating} out of 5 stars`}>{"★".repeat(rating)}{"☆".repeat(Math.max(5 - rating, 0))}</div>
        <h3 className="mt-1 text-[15px] font-semibold">{sellerName}</h3>
        {writtenFeedback && <p className="mt-2 text-[14px] leading-[140%] text-[#4F4F4F]">{writtenFeedback}</p>}
        {product && <p className="mt-2 text-[13px] text-[#828282]">Purchased: {product.name}</p>}
        <p className="mt-2 text-[12px] text-[#828282]">{date}</p>
        {criteria.map((criterion) => <p key={criterion} className="mt-2 text-[13px] font-medium text-[#498467]">✓ {criterion}</p>)}
        <TrustSafetyActions contentType="review" contentId={review.databaseId ?? review.id ?? review.review_id} reportedUserId={review.reviewerId ?? review.reviewer_id} compact />
      </div>
    </article>
  );
}
