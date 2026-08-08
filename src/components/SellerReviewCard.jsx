import { products, sellers } from "../data/mockData";

export default function SellerReviewCard({ review }) {
  const seller = sellers[review.sellerId];
  const product = products.find((item) => item.id === review.productId);
  const rating = Math.round(Math.max(0, Math.min(Number(review.rating) || 0, 5)));
  const date = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : review.date ?? "Date unavailable";

  return (
    <article className="flex w-full gap-3 rounded-lg border border-[#E6E6E6] p-3">
      <img src={seller?.avatar ?? "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&q=80"} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
      <div className="min-w-0 flex-1">
        <div className="text-[15px] tracking-[1px] text-[#D7A84B]" aria-label={`${rating} out of 5 stars`}>{"★".repeat(rating)}{"☆".repeat(Math.max(5 - rating, 0))}</div>
        <h3 className="mt-1 text-[15px] font-semibold">{seller?.name ?? review.sellerName ?? "Local seller"}</h3>
        <p className="mt-1 text-[14px] leading-[140%] text-[#4F4F4F]">“{review.notes || "This seller has not added written feedback."}”</p>
        {product && <p className="mt-2 text-[13px] text-[#828282]">Purchased: {product.name}</p>}
        <p className="mt-2 text-[12px] text-[#828282]">{date}</p>
        {review.criteria?.includes("Would Transact Again") && <p className="mt-2 text-[13px] font-medium text-[#498467]">✓ Would Transact Again</p>}
      </div>
    </article>
  );
}
