import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import CarouselRow from "../components/CarouselRow";
import StarRating from "../components/StarRating";
import ImageGallery from "../components/ImageGallery";
import PromotionBadge from "../components/PromotionBadge";
import { usePromotions } from "../context/PromotionContext";
import { useFavorites } from "../hooks/useFavorites";
import { useReviews } from "../context/ReviewContext";
import { usePaymentMethods } from "../context/PaymentMethodsContext";
import { useCart } from "../context/CartContext";
import OutlineIcon from "../components/OutlineIcon";
import FoundingMemberBadge from "../components/FoundingMemberBadge";
import { useSellerSettings } from "../context/SellerSettingsContext";
import { useListings } from "../context/ListingContext";
import { useMessages } from "../context/MessageContext";
import { formatListingPrice } from "../utils/listingDisplay";
import ServiceCategoryLabel from "../components/ServiceCategoryLabel";
import { formatLocation } from "../data/locations";
import DistanceLabel from "../components/DistanceLabel";
import TradeBadge from "../components/TradeBadge";
import { CompactReputationHeader, TrustMetricSummary } from "../components/ReputationSummary";
import { useReputationSnapshot } from "../hooks/useReputationRead";
import { useResolvedListingWithSeller, useResolvedSeller } from "../hooks/useEntityResolution";
import TrustSafetyActions from "../components/TrustSafetyActions";
import { trackAnalyticsEvent } from "../lib/api/analytics";
import UnavailableAccount from "../components/UnavailableAccount";
import { useBlockedAccount } from "../hooks/useBlockedAccount";

export default function ProductDetail() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [variantError, setVariantError] = useState("");
  const { addToCart } = useCart();
  const { listings } = useListings();
  const { createSellerConversation } = useMessages();
  const listingId = state?.listingId ?? id;
  const productId = state?.productId ?? listingId;
  const product = listings.find((p) => p.id === productId)
    ?? listings.find((p) => p.id === listingId)
    ?? { id: productId, name: "Listing unavailable", price: 0, image: "", images: [], sellerId: "", shop: "" };
  const { isFavorite, toggleFavorite } = useFavorites();
  const saved = isFavorite(product.id);
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const isService = product.category === "Services";
  const inventoryTracked = !isService && variants.length === 0;
  const availableForOrders = product.availableForOrders !== false;
  const available = isService ? Infinity : inventoryTracked ? Math.max(0, Number(product.quantityAvailable) || 0) : availableForOrders ? Infinity : 0;
  const computedAvailability = isService ? (product.serviceStatus ?? product.service_status ?? "Accepting New Clients") !== "Temporarily Not Accepting New Clients" && (product.serviceStatus ?? product.service_status ?? "Accepting New Clients") !== "Archived" : inventoryTracked ? available > 0 : availableForOrders;
  const displayedAvailability = isService ? (product.serviceStatus ?? product.service_status ?? "Accepting New Clients") : computedAvailability ? "Available" : "Out of Stock";
  const soldOut = !isService && !computedAvailability;
  const tradePreferences = product.desiredTradeItems?.trim() ?? "";
  const resolvedListing = useResolvedListingWithSeller(product);
  const resolvedSeller = useResolvedSeller(product.sellerId);
  const seller = resolvedListing?.seller ?? resolvedSeller;
  const { getSellerProfile } = useSellerSettings();
  const sellerProfile = getSellerProfile(seller?.id);
  const blocked = useBlockedAccount(product.sellerId ?? seller?.id);
  const reputationSnapshot = useReputationSnapshot(seller?.id);
  const vacationMode = sellerProfile?.vacationMode ?? false;
  const { getPaymentMethods } = usePaymentMethods();
  const sellerPaymentMethods = getPaymentMethods(seller?.id);
  const { getListingPricing } = usePromotions();
  const pricedProduct = selectedVariant ? { ...product, price: Number(selectedVariant.price) } : product;
  const pricing = getListingPricing(pricedProduct);
  const originalPrice = Number(pricing.originalPrice);
  const discountedPrice = Number(pricing.discountedPrice);
  const hasDiscount = Number.isFinite(discountedPrice) && Number.isFinite(originalPrice) && discountedPrice < originalPrice;
  const promotion = pricing.promotion;
  const { reviewsForProduct, productRating, canReviewProduct } = useReviews();
  const { average, count } = productRating(product.id);
  const productReviewList = reviewsForProduct(product.id);

  const handleMessageSeller = () => {
    if (!seller) return;
    const { id: conversationId, serviceContext, conversation } = createSellerConversation({ listing: product, seller });
    navigate(`/messages/${conversationId}`, {
      state: {
        listingId: product.id,
        serviceContext,
        pendingConversation: conversation,
      },
    });
  };

  const handleProposeTrade = () => {
    if (!seller) return;
    navigate(`/propose-trade/${product.id}`);
  };

  useEffect(() => {
    if (product.databaseId && product.sellerId) {
      void trackAnalyticsEvent("listing_view", {
        sellerId: product.sellerId,
        listingId: product.databaseId,
      }).then((recorded) => {
        if (recorded) window.dispatchEvent(new Event("listing-statistics-changed"));
      });
    }
  }, [available, computedAvailability, displayedAvailability, id, inventoryTracked, product.availableForTrade, product.barterEnabled, product.databaseId, product.id, product.quantityAvailable, product.sellerId, product.tradeEnabled, product.variants, variants.length]);

  useEffect(() => {
    setQuantity((current) => Math.min(current, Math.max(1, available)));
  }, [available]);

  if (blocked) return <UnavailableAccount onBack={() => navigate(-1)} />;

  if (!listings.some((listing) => listing.id === productId || listing.id === listingId)) {
    return (
      <MobileScreenLayout>
        <Header onBack={() => navigate(-1)} />
        <div className="p-6 text-center text-[14px] text-[#757575]">Listing unavailable.</div>
      </MobileScreenLayout>
    );
  }

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
            <ServiceCategoryLabel listing={product} />
            <h1 className="text-[24px] font-semibold tracking-[-0.48px]">
              {product.name}
            </h1>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex w-fit items-center rounded-lg bg-[#CFF7D3] text-[#02542D] text-[16px] px-2 py-2">
                  {product.tag ?? "Tag"}
                </span>
                <TradeBadge listing={product} />
              </div>
              {promotion && (
                <div className="flex flex-col items-start gap-1">
                  <PromotionBadge promotion={promotion} />
                  <span className="text-[14px] font-medium text-[#498467]">
                    {promotion.title}
                  </span>
                </div>
              )}
              <div className="flex flex-wrap items-baseline gap-3">
                {hasDiscount ? (
                  <>
                    <span className="text-[24px] font-bold text-[#498467]">${discountedPrice.toFixed(2)}</span>
                    <span className="text-[16px] text-[#757575] line-through">${originalPrice.toFixed(2)}</span>
                  </>
                ) : isService ? <span className="text-[24px] font-bold text-[#498467]">{formatListingPrice(product)}</span> : <>
                  <span className="text-[24px] font-bold">$</span>
                  <span className="text-[48px] font-bold leading-none">{Math.floor(Number(product.price) || 0)}</span>
                </>}
              </div>
              {seller && !product.availableForTrade && (
                <button
                  type="button"
                  onClick={handleMessageSeller}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#498467] bg-white py-3 text-[16px] font-medium text-[#498467] transition-colors hover:bg-[#F5FFF6]"
                >
                  Message Seller
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[16px] text-[#757575]">
            {seller ? (
              <>
                <button
                  onClick={() => navigate(`/seller/${seller.id}`)}
                  className="text-[#498467] hover:underline"
                >
                  {product.shop}
                </button>
                <DistanceLabel content={product} />
              </>
            ) : (
              product.shop
            )}
          </div>
          <FoundingMemberBadge sellerId={seller?.id} foundingMember={sellerProfile?.foundingMember} />
          <TrustSafetyActions targetType="listing" targetId={product.databaseId ?? product.id} />
          <CompactReputationHeader snapshot={reputationSnapshot} audience="seller" className="mt-3" />
          {reputationSnapshot?.sellerStatus && <TrustMetricSummary metrics={reputationSnapshot.sellerStatus.metrics} audience="seller" memberSince={sellerProfile?.createdAt} storeCreatedAt={sellerProfile?.storeOpenedAt} compact />}
          {vacationMode && <div className="rounded-lg border border-[#D9D9D9] bg-[#F5FFF6] p-3 text-[14px] text-[#4F4F4F]">This store is temporarily not accepting orders.{sellerProfile.vacationMessage && <div className="mt-1 text-[13px] text-[#828282]">{sellerProfile.vacationMessage}</div>}</div>}
          <PaymentMethodsList paymentSettings={sellerPaymentMethods} />
          {!isService && <FulfillmentInfo paymentSettings={sellerPaymentMethods} />}
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

        {isService ? (
          <div className="flex flex-col gap-2 rounded-lg border border-[#E6E6E6] p-4 text-[14px] text-[#4F4F4F]">
            <span><strong>Service Area:</strong> {formatLocation(product.serviceArea || product.location) || "Contact provider"}</span>
            {product.serviceAreaType === "radius" && product.serviceAreaRadius != null && <span><strong>Service Radius:</strong> {product.serviceAreaRadius} km from the selected location</span>}
            <span><strong>Service Status:</strong> {product.serviceStatus ?? product.service_status ?? "Accepting New Clients"}</span>
            <span><strong>Scheduling:</strong> {product.availability || "By appointment"}</span>
            {product.yearsOfExperience && <span><strong>Experience:</strong> {product.yearsOfExperience}</span>}
            <span><strong>Contact Method:</strong> {product.preferredContactMethod || "Message Through Grolo"}</span>
            {product.responseTime && <span><strong>Response time:</strong> {product.responseTime}</span>}
          </div>
        ) : (
          <>
            {variants.length > 0 && <div className="flex flex-col gap-2 rounded-lg border border-[#E6E6E6] p-4">
              <span className="text-[16px] font-semibold">Choose an option</span>
              <div className="flex flex-col gap-2">
                {variants.map((variant) => <button key={variant.name} type="button" onClick={() => { setSelectedVariant(variant); setVariantError(""); }} className={`flex items-center justify-between rounded-lg border px-3 py-3 text-left ${selectedVariant?.name === variant.name ? "border-[#498467] bg-[#F5FFF6]" : "border-[#E6E6E6]"}`}><span className="text-[14px] font-medium">{variant.name}</span><span className="text-[14px] text-[#498467]">${Number(variant.price).toFixed(2)}</span></button>)}
              </div>
              {variantError && <p role="alert" className="text-[13px] text-[#B42318]">{variantError}</p>}
            </div>}
            <div className="flex flex-col gap-4">
              {inventoryTracked ? <span className="text-[14px] text-[#757575]">Listing Inventory: {available}</span> : <span className="text-[14px] text-[#757575]">Availability: {availableForOrders ? "Available" : "Unavailable"}</span>}
              {!soldOut && <div className="flex flex-col gap-2">
                <label className="text-[16px]">Quantity</label>
                <div className="h-10 flex items-center justify-between rounded-lg border border-[#D9D9D9] px-4">
                  <button type="button" aria-label="Decrease quantity" onClick={() => setQuantity((value) => Math.max(1, value - 1))} disabled={quantity === 1} className="text-[20px] disabled:opacity-40">−</button>
                  <span className="text-[16px]">{quantity}</span>
                  <button type="button" aria-label="Increase quantity" onClick={() => setQuantity((value) => Math.min(available, value + 1))} disabled={quantity >= available} className="text-[20px] text-[#498467] disabled:opacity-40">+</button>
                </div>
              </div>}
            </div>
            {soldOut ? <div className="w-full rounded-lg bg-[#E6E6E6] text-[#757575] text-center text-[16px] py-3">Sold Out</div> : vacationMode ? <div className="w-full rounded-lg bg-[#E6E6E6] text-[#757575] text-center text-[16px] py-3">Orders Paused</div> : <button type="button" onClick={() => { if (variants.length > 0 && !selectedVariant) { setVariantError("Choose an option before adding this item to your cart."); return; } addToCart(product, quantity, undefined, selectedVariant); }} className="w-full rounded-lg bg-[#498467] text-[#F5F5F5] text-[16px] py-3 border border-[#B2B2B2]">Add to Cart</button>}
          </>
        )}

        {product.availableForTrade && seller && (
          <div className="rounded-lg border border-[#D9D9D9] bg-white p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[16px] font-semibold text-[#498467]">
              <OutlineIcon name="trade" size={18} className="text-[#498467]" />
              <span>Trade Availability</span>
            </div>
            <p className="text-[14px] text-[#4F4F4F]">This seller is open to trade offers.</p>
            <div className="text-[14px] text-[#4F4F4F]">
              <div className="font-medium">Looking For:</div>
              <div className="mt-1 whitespace-pre-wrap">{tradePreferences || "Open to offers"}</div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleMessageSeller}
                className="flex-1 rounded-lg bg-[#498467] py-2.5 text-[14px] font-medium text-[#F5F5F5]"
              >
                Message Seller
              </button>
              <button
                type="button"
                onClick={handleProposeTrade}
                className="flex-1 rounded-lg border border-[#498467] py-2.5 text-[14px] font-medium text-[#498467]"
              >
                Propose Trade
              </button>
            </div>
          </div>
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
              {product.description ?? "No description provided yet."}
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
        products={listings.filter((p) => p.id !== product.id)}
      />
      </div>
    </MobileScreenLayout>
  );
}

function PaymentMethodsList({ paymentSettings }) {
  const methodLabels = {
    cash: "Cash",
    etransfer: "E-Transfer",
    creditcard: "Credit Card",
    card: "Credit Card",
    debitcard: "Debit Card",
  };
  const methods = (paymentSettings.methods ?? []).filter((method) => methodLabels[method]);

  return (
    <div className="rounded-lg bg-[#F5FFF6] p-3">
      <div className="text-[12px] font-medium text-[#498467]">Accepted Payment Methods</div>
      {methods.map((method) => (
        <div key={method} className="mt-1 text-[13px] text-[#4F4F4F]">• {methodLabels[method]}</div>
      ))}
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
