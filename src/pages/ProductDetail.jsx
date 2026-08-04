import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import CarouselRow from "../components/CarouselRow";
import StarRating from "../components/StarRating";
import ImageGallery from "../components/ImageGallery";
import PromotionBadge from "../components/PromotionBadge";
import { products, sellers } from "../data/mockData";
import { usePromotions } from "../context/PromotionContext";
import { useFavorites } from "../hooks/useFavorites";
import { useReviews } from "../context/ReviewContext";
import { usePaymentMethods } from "../context/PaymentMethodsContext";
import { useCart } from "../context/CartContext";
import { useInventory } from "../context/InventoryContext";
import OutlineIcon from "../components/OutlineIcon";
import { useSellerSettings } from "../context/SellerSettingsContext";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();
  const { getAvailable } = useInventory();
  const product =
    products.find((p) => p.id === id) ??
    products.find((p) => p.id === "strawberries");
  const { isFavorite, toggleFavorite } = useFavorites();
  const saved = isFavorite(product.id);
  const available = getAvailable(product.id);
  const soldOut = available === 0;
  const seller = sellers[product.sellerId] ?? Object.values(sellers).find((s) => s.name === product.shop);
  const { getSellerProfile } = useSellerSettings();
  const sellerProfile = getSellerProfile(seller?.id);
  const vacationMode = sellerProfile?.vacationMode ?? false;
  const { getPaymentMethods } = usePaymentMethods();
  const sellerPaymentMethods = getPaymentMethods(seller?.id);
  const { promotionsForProduct } = usePromotions();
  const promotion = promotionsForProduct(product.id)[0];
  const { reviewsForProduct, productRating, canReviewProduct } = useReviews();
  const { average, count } = productRating(product.id);
  const productReviewList = reviewsForProduct(product.id);

  useEffect(() => {
    console.info("Route opened", window.location.pathname, "Component: ProductDetail");
  }, [id]);

  return (
    <MobileScreenLayout>
      <Header onBack={() => navigate(-1)} />
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
        <div className="p-6 flex flex-col gap-6">
        <div className="relative">
          <ImageGallery
            images={product.images ?? [product.image]}
            alt={product.name}
          />
          <button
            aria-label={saved ? "Remove from favorites" : "Save to favorites"}
            onClick={() => toggleFavorite(product.id)}
            className="absolute left-2.5 top-2.5 z-10 p-2 rounded-full bg-[#2C2C2C] border border-[#2C2C2C]"
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
            <div className="flex flex-col gap-2">
              <span className="inline-flex w-fit items-center rounded-lg bg-[#CFF7D3] text-[#02542D] text-[16px] px-2 py-2">
                {product.tag ?? "Tag"}
              </span>
              {promotion && (
                <div className="flex flex-col items-start gap-1">
                  <PromotionBadge promotion={promotion} />
                  <span className="text-[14px] font-medium text-[#498467]">
                    {promotion.title}
                  </span>
                </div>
              )}
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
          {vacationMode && <div className="rounded-lg border border-[#D9D9D9] bg-[#F5FFF6] p-3 text-[14px] text-[#4F4F4F]">This store is temporarily not accepting orders.{sellerProfile.vacationMessage && <div className="mt-1 text-[13px] text-[#828282]">{sellerProfile.vacationMessage}</div>}</div>}
          <PaymentMethodsList paymentSettings={sellerPaymentMethods} />
          <FulfillmentInfo paymentSettings={sellerPaymentMethods} />
          <button
            onClick={() => navigate(`/product/${product.id}/reviews`)}
            className="flex items-center gap-2 w-fit"
          >
            <StarRating rating={average} size={20} />
            <span className="text-[16px] font-semibold">{average}</span>
            <span className="text-[16px] text-[#498467] underline">
              ({count} Reviews)
            </span>
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-[14px] text-[#757575]">Available: {available}</span>
            <label className="text-[16px]">Quantity</label>
            <div className="h-10 flex items-center justify-between rounded-lg border border-[#D9D9D9] px-4">
              <button type="button" aria-label="Decrease quantity" onClick={() => setQuantity((value) => Math.max(1, value - 1))} disabled={soldOut || quantity === 1} className="text-[20px] disabled:opacity-40">−</button>
              <span className="text-[16px]">{quantity}</span>
              <button type="button" aria-label="Increase quantity" onClick={() => setQuantity((value) => Math.min(available, value + 1))} disabled={soldOut || quantity >= available} className="text-[20px] text-[#498467] disabled:opacity-40">+</button>
            </div>
          </div>
        </div>

        {soldOut ? (
          <div className="w-full rounded-lg bg-[#E6E6E6] text-[#757575] text-center text-[16px] py-3">Sold Out</div>
        ) : vacationMode ? (
          <div className="w-full rounded-lg bg-[#E6E6E6] text-[#757575] text-center text-[16px] py-3">Orders Paused</div>
        ) : (
          <button type="button" onClick={() => addToCart(product, quantity)} className="w-full rounded-lg bg-[#498467] text-[#F5F5F5] text-[16px] py-3 border border-[#B2B2B2]">
            Add to Cart
          </button>
        )}

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
        <div className="flex items-center justify-between">
          <h2 className="text-[24px] font-semibold tracking-[-0.48px]">
            Latest reviews
          </h2>
          <button
            onClick={() => navigate(`/product/${product.id}/reviews`)}
            className="text-[16px] text-[#498467]"
          >
            See all
          </button>
        </div>

        {canReviewProduct(product.id) && (
          <button
            onClick={() => navigate(`/leave-review/${product.id}`)}
            className="w-full rounded-lg bg-[#498467] text-[#F5F5F5] text-[16px] py-3"
          >
            Leave Review
          </button>
        )}

        <div className="flex flex-col gap-6">
          {productReviewList.slice(0, 3).map((review) => (
            <div
              key={review.id}
              className="rounded-lg border border-[#D9D9D9] p-6 flex flex-col gap-6"
            >
              <StarRating rating={review.rating} size={20} />
              <div className="flex flex-col gap-1">
                <p className="text-[16px]">{review.text}</p>
              </div>
              {review.photos?.length > 0 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
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
          {productReviewList.length === 0 && (
            <p className="text-[16px] text-[#828282]">No reviews yet</p>
          )}
        </div>
      </div>

      <CarouselRow
        title="Products for you"
        products={products.filter((p) => p.id !== product.id)}
      />
      </div>
    </MobileScreenLayout>
  );
}

function PaymentMethodsList({ paymentSettings }) {
  const { methods } = paymentSettings;
  return (
    <div className="rounded-lg bg-[#F5FFF6] p-3">
      <div className="text-[12px] font-medium text-[#498467]">Accepted Payment Methods</div>
      {methods.includes("cash") && <div className="mt-1 text-[13px] text-[#4F4F4F]">• Cash</div>}
      {methods.includes("etransfer") && <div className="mt-1 text-[13px] text-[#4F4F4F]">• E-Transfer</div>}
      {methods.length > 0 && <div className="mt-1 text-[13px] text-[#4F4F4F]">• Pay at Pickup</div>}
    </div>
  );
}

function FulfillmentInfo({ paymentSettings }) {
  const methods = paymentSettings.fulfillmentMethods ?? [];
  const label = methods.includes("pickup") && methods.includes("delivery")
    ? "Pickup & Delivery Available"
    : methods.includes("delivery")
      ? "Delivery Available"
      : "Pickup Only";

  return (
    <div className="rounded-lg bg-[#F5FFF6] p-3">
      <div className="text-[12px] font-medium text-[#498467]">Fulfillment</div>
      <div className="mt-1 flex items-center gap-1 text-[13px] text-[#4F4F4F]"><OutlineIcon name="home" size={15} className="text-[#498467]" /> {label}</div>
    </div>
  );
}
