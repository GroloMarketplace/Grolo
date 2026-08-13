import { Link } from "react-router-dom";
import PromotionBadge from "./PromotionBadge";
import { usePromotions } from "../context/PromotionContext";
import { useSellerSettings } from "../context/SellerSettingsContext";
import FoundingMemberBadge from "./FoundingMemberBadge";
import { formatListingPrice } from "../utils/listingDisplay";
import ServiceCategoryLabel from "./ServiceCategoryLabel";
import DistanceLabel from "./DistanceLabel";
import TradeBadge from "./TradeBadge";

export default function ProductCard({ product, onClick }) {
  const { getListingPricing } = usePromotions();
  const pricing = getListingPricing(product);
  const { getSellerProfile } = useSellerSettings();
  const vacationMode = getSellerProfile(product.sellerId)?.vacationMode;

  return (
    <Link
      to={`/product/${product.id}`}
      onClick={(event) => {
        if (!onClick) return;
        event.preventDefault();
        onClick(product.id);
      }}
      className="flex flex-col gap-3 w-[148px] shrink-0"
    >
      <div className="relative">
        <img
          src={product.image}
          alt={product.name}
          className="w-[148px] h-[148px] rounded-lg object-cover"
        />
        {pricing.promotion && <PromotionBadge promotion={pricing.promotion} className="absolute left-2 top-2" />}
        {vacationMode && <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-medium text-[#4F4F4F]">Temporarily Closed</span>}
      </div>
      <div className="flex flex-col gap-0.5">
        <ServiceCategoryLabel listing={product} />
        <div className="text-[12px] text-black/50 line-clamp-2">
          {product.shop}
        </div>
        <DistanceLabel content={product} />
        <FoundingMemberBadge sellerId={product.sellerId} compact />
        <div className="text-[14px] text-black line-clamp-2">
          {product.name}
        </div>
        {pricing.promotion && pricing.discountedPrice < pricing.originalPrice ? (
          <div className="flex items-baseline gap-2 text-[16px] font-medium">
            <span className="text-black">${pricing.discountedPrice.toFixed(2)}</span>
            <span className="text-[12px] text-black/50 line-through">${pricing.originalPrice.toFixed(2)}</span>
          </div>
        ) : <div className="text-[16px] font-medium text-black">{formatListingPrice(product)}</div>}
        <TradeBadge listing={product} compact />
      </div>
    </Link>
  );
}
