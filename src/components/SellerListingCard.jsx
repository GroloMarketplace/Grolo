import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useReviews } from "../context/ReviewContext";
import PromotionBadge from "./PromotionBadge";
import { usePromotions } from "../context/PromotionContext";
import ReviewSummary from "./ReviewSummary";
import { formatListingPrice } from "../utils/listingDisplay";
import ServiceCategoryLabel from "./ServiceCategoryLabel";
import ConfirmationModal from "./ConfirmationModal";
import DistanceLabel from "./DistanceLabel";
import TradeBadge from "./TradeBadge";

export default function SellerListingCard({ product, onDelete, archived = false, hasOrderHistory = false }) {
  const navigate = useNavigate();
  const { getListingPricing } = usePromotions();
  const { productRating } = useReviews();
  const pricing = getListingPricing(product);
  const { count: reviewCount } = productRating(product.id);
  const viewCount = Number(product.views ?? product.metadata?.views) || 0;
  const likeCount = Number(product.favorites ?? product.metadata?.favorites) || 0;
  const regrowCount = Number(product.regrows ?? product.metadata?.regrows) || 0;
  const promotion = pricing.promotion;
  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
  const inventoryTracked = !hasVariants;
  const available = inventoryTracked ? Number(product.quantityAvailable) || 0 : null;
  const computedAvailability = inventoryTracked ? available > 0 : product.availableForOrders !== false;
  const displayedAvailability = computedAvailability ? "Available" : "Out of Stock";
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [status] = useState(product.status || "Active");
  const displayStatus = archived ? "Archived" : !computedAvailability ? "Sold" : hasVariants ? "Active" : status;

  useEffect(() => {
    console.info("LISTING METRICS LOAD", {
      listingId: product.databaseId ?? product.id ?? null,
      viewCount,
      likeCount,
      reviewCount,
      regrowCount,
      metricSources: {
        views: "listings.metadata.views (listing_view events are recorded in vendor_analytics_events)",
        likes: "listings.metadata.favorites (favorites rows are persisted in favorites)",
        reviews: "ReviewContext.productRating (reviews table)",
        regrows: "listings.metadata.regrows (no listing regrow database query currently exists)",
      },
    });
  }, [likeCount, product.databaseId, product.id, regrowCount, reviewCount, viewCount]);

  useEffect(() => {
    if (!hasVariants) return;
    console.info("Variant listing stock status", {
      listingId: product.id,
      hasVariants,
      quantityAvailable: product.quantityAvailable,
      inventoryTracked,
      computedAvailability,
      displayedAvailability,
    });
  }, [computedAvailability, displayedAvailability, hasVariants, inventoryTracked, product.id, product.quantityAvailable]);

  const handleEdit = () => {
    navigate(`/edit-listing/${product.id}`);
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    setShowDeleteModal(false);
    if (onDelete) {
      onDelete(product.id);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
  };

  const handleImageClick = () => {
    navigate(`/product/${product.id}`);
  };

  const statusColors = {
    Active: "bg-[#498467] text-white",
    Sold: "bg-[#828282] text-white",
    Draft: "bg-[#E6E6E6] text-black",
    Archived: "bg-[#E6E6E6] text-[#4F4F4F]",
  };

  return (
    <>
      <div className="flex flex-col gap-3 w-[148px] shrink-0 relative">
        {/* Status Badge */}
        <div className="absolute top-2 right-2 z-10">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColors[displayStatus]}`}>
            {displayStatus}
          </span>
        </div>
        <PromotionBadge promotion={promotion} className="absolute left-2 top-2 z-10" />

        {/* Product Image */}
        <button
          onClick={handleImageClick}
          className="w-[148px] h-[148px] rounded-lg object-cover overflow-hidden"
        >
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover hover:opacity-90 transition-opacity"
          />
        </button>

        {/* Product Info */}
        <div className="flex flex-col gap-0.5">
          <ServiceCategoryLabel listing={product} />
          <div className="text-[12px] text-black/50 line-clamp-2">
            {product.shop}
          </div>
          <DistanceLabel content={product} />
          <div className="text-[14px] text-black line-clamp-2">
            {product.name}
          </div>
          {pricing.discountedPrice < pricing.originalPrice ? <div className="flex items-baseline gap-2 text-[16px] font-medium"><span>${pricing.discountedPrice.toFixed(2)}</span><span className="text-[12px] text-[#828282] line-through">${pricing.originalPrice.toFixed(2)}</span></div> : <div className="text-[16px] font-medium text-black">{formatListingPrice(product)}</div>}
          <TradeBadge listing={product} compact />
          <ReviewSummary product={product} />
          <div className="text-[12px] text-[#828282]">{inventoryTracked ? `${available} Available` : `Availability: ${product.availableForOrders === false ? "Unavailable" : "Available"}`}</div>
        </div>

        {/* Performance Metrics */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#828282]">
          <div className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 3.5c-3.5 0-6.5 2-8 5 1.5 3 4.5 5 8 5s6.5-2 8-5c-1.5-3-4.5-5-8-5Zm0 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3Zm0-4.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5Z"
                fill="currentColor"
              />
            </svg>
            <span>{viewCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
              <path
                d="M17.37 3.84a4.13 4.13 0 0 0-6.49-.5L10 4.22l-.88-.88a4.13 4.13 0 0 0-6.13 5.5l.63.88L10 17.19l6.48-6.48.63-.88a4.13 4.13 0 0 0 .26-6.49Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{likeCount}</span>
          </div>
          <div className="flex items-center gap-1" aria-label={`${reviewCount} reviews`}>
            <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 1.67 12.58 6.88l5.75.84-4.16 4.06.98 5.73L10 14.81l-5.15 2.71.98-5.73L1.67 7.73l5.75-.84L10 1.67Z"
                fill="#FFC107"
                stroke="#FFC107"
                strokeWidth="1"
              />
            </svg>
            <span>{reviewCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
              <path
                d="M5.83 7.5 2.5 4.17 5.83.83M2.5 4.17h11.67a3.33 3.33 0 0 1 3.33 3.33v1.67M14.17 12.5l3.33 3.33-3.33 3.34M17.5 15.83H5.83A3.33 3.33 0 0 1 2.5 12.5v-1.66"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{regrowCount}</span>
          </div>

        </div>

        {!archived && <div className="flex gap-2 mt-1">
          <button
            onClick={handleEdit}
            className="flex-1 text-[12px] font-medium text-[#498467] border border-[#498467] rounded py-1"
          >
            Edit
          </button>
          <button
            onClick={handleDeleteClick}
            className="flex-1 text-[12px] font-medium text-red-500 border border-red-500 rounded py-1"
          >
            Delete
          </button>
        </div>}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && <ConfirmationModal title="Delete Listing?" message={hasOrderHistory ? "This listing has previous orders and will be archived instead of permanently deleted." : "Are you sure you want to delete this listing? This action cannot be undone."} confirmLabel="Delete Listing" onCancel={handleDeleteCancel} onConfirm={handleDeleteConfirm} />}
    </>
  );
}
