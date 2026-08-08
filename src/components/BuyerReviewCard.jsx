import { events, products, sellers } from "../data/mockData";

function getReviewTarget(review) {
  const product = products.find((item) => item.id === (review.productId ?? review.listingId ?? review.serviceId));
  const event = events.find((item) => item.id === review.eventId);
  const seller = sellers[review.sellerId] ?? (product ? sellers[product.sellerId] : null);
  if (event) {
    return {
      title: event.title,
      subtitle: `Hosted by ${seller?.name ?? "Local host"}`,
      image: review.photos?.[0] ?? event.image,
      path: `/event/${event.id}`,
    };
  }
  if (product) {
    return {
      title: product.name,
      subtitle: `${review.serviceId ? "Provided by" : "Purchased from"} ${seller?.name ?? product.shop}`,
      image: review.photos?.[0] ?? product.image,
      path: `/product/${product.id}`,
    };
  }
  return {
    title: review.title ?? "Community review",
    subtitle: seller ? `Provided by ${seller.name}` : "Grolo community",
    image: review.photos?.[0],
    path: review.promotionId ? `/promotions/${review.sellerId}` : null,
  };
}

export default function BuyerReviewCard({ review, navigate }) {
  const target = getReviewTarget(review);
  const submittedDate = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : review.date;
  const card = (
    <>
      {target.image && <img src={target.image} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />}
      <div className="min-w-0 flex-1">
        <div className="text-[15px] tracking-[1px] text-[#D7A84B]" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}{"☆".repeat(Math.max(5 - review.rating, 0))}</div>
        <h3 className="mt-1 truncate text-[15px] font-semibold">{target.title}</h3>
        <p className="mt-0.5 text-[13px] text-[#828282]">{target.subtitle}</p>
        <p className="mt-2 text-[14px] leading-[140%] text-[#4F4F4F]">“{review.text}”</p>
        <p className="mt-2 text-[12px] text-[#828282]">{submittedDate}</p>
      </div>
    </>
  );

  return target.path ? <button type="button" onClick={() => navigate(target.path)} className="flex w-full gap-3 rounded-lg border border-[#E6E6E6] p-3 text-left transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#498467]">{card}</button> : <article className="flex w-full gap-3 rounded-lg border border-[#E6E6E6] p-3">{card}</article>;
}
