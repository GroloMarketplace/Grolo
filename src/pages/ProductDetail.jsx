import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import Header from "../components/Header";
import CarouselRow from "../components/CarouselRow";
import { products, reviews, sellers } from "../data/mockData";
import { useFavorites } from "../hooks/useFavorites";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const product =
    products.find((p) => p.id === id) ??
    products.find((p) => p.id === "strawberries");
  const { isFavorite, toggleFavorite } = useFavorites();
  const saved = isFavorite(product.id);
  const seller = Object.values(sellers).find((s) => s.name === product.shop);

  return (
    <div>
      <Header onBack={() => navigate(-1)} />
      <div className="p-6 flex flex-col gap-6">
        <div className="relative">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-[327px] object-cover rounded-lg"
          />
          <button
            aria-label={saved ? "Remove from favorites" : "Save to favorites"}
            onClick={() => toggleFavorite(product.id)}
            className="absolute left-2.5 top-2.5 p-2 rounded-full bg-[#2C2C2C] border border-[#2C2C2C]"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill={saved ? "#F5F5F5" : "none"}>
              <path
                d="M17.37 3.84a4.13 4.13 0 0 0-6.49-.5L10 4.72l-.88-.88a4.13 4.13 0 0 0-6.13 5.5l.63.88L10 17.69l6.48-6.48.63-.88a4.13 4.13 0 0 0 .26-6.49Z"
                stroke="#F5F5F5"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            <h1 className="text-[24px] font-semibold tracking-[-0.48px]">
              {product.name}
            </h1>
            <div className="flex flex-col gap-1">
              <span className="inline-flex w-fit items-center rounded-lg bg-[#CFF7D3] text-[#02542D] text-[16px] px-2 py-2">
                {product.tag ?? "Tag"}
              </span>
              <div className="flex items-end">
                <span className="text-[24px] font-bold">$</span>
                <span className="text-[48px] font-bold leading-none">
                  {Math.floor(product.price)}
                </span>
              </div>
            </div>
          </div>
          <div className="text-[16px] text-[#757575]">
            {seller ? (
              <button
                onClick={() => navigate(`/seller/${seller.id}`)}
                className="text-[#498467] hover:underline"
              >
                {product.shop}
              </button>
            ) : (
              product.shop
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[16px]">Product</label>
            <div className="h-10 flex items-center justify-between rounded-lg border border-[#D9D9D9] px-4">
              <span className="text-[16px]">Value</span>
              <Chevron />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[16px]">Quantity</label>
            <div className="h-10 flex items-center justify-between rounded-lg border border-[#D9D9D9] px-4">
              <span className="text-[16px]">Value</span>
              <Chevron />
            </div>
          </div>
        </div>

        <button className="w-full rounded-lg bg-[#498467] text-[#F5F5F5] text-[16px] py-3 border border-[#B2B2B2]">
          Add to Cart
        </button>

        <div className="rounded-lg border border-[#D9D9D9] p-4 flex flex-col gap-2">
          <button
            className="flex items-center justify-between w-full"
            onClick={() => setOpen((o) => !o)}
          >
            <span className="text-[16px] font-semibold">Description</span>
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              className={open ? "" : "rotate-180"}
            >
              <path
                d="M15 12.5 10 7.5 5 12.5"
                stroke="#1E1E1E"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {open && (
            <p className="text-[16px] leading-[140%]">
              {product.description ??
                "Fresh bags of strawberries, straight from my backyard garden. All soil and seeds are 100% organic."}
            </p>
          )}
        </div>
      </div>

      <div className="p-6 flex flex-col gap-6">
        <h2 className="text-[24px] font-semibold tracking-[-0.48px]">
          Latest reviews
        </h2>
        <div className="flex flex-col gap-6">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-lg border border-[#D9D9D9] p-6 flex flex-col gap-6"
            >
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} />
                ))}
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-[24px] font-semibold tracking-[-0.48px]">
                  {review.title}
                </h3>
                <p className="text-[16px]">{review.body}</p>
              </div>
              <div className="flex items-center gap-3">
                <img
                  src={review.avatar}
                  alt={review.reviewer}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex flex-col gap-0.5">
                  <div className="text-[16px] font-semibold text-[#757575]">
                    {review.reviewer}
                  </div>
                  <div className="text-[16px] text-[#B3B3B3]">
                    {review.date}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <CarouselRow
        title="Products for you"
        products={products.filter((p) => p.id !== product.id)}
      />
    </div>
  );
}

function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M4 6l4 4 4-4"
        stroke="#1E1E1E"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Star() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M10 1.67 12.58 6.88l5.75.84-4.16 4.06.98 5.73L10 14.81l-5.15 2.71.98-5.73L1.67 7.73l5.75-.84L10 1.67Z"
        stroke="#2C2C2C"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
