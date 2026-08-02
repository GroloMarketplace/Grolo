import { promotionDisplayLabel } from "../context/PromotionContext";

export default function PromotionBadge({ promotion, className = "" }) {
  if (!promotion) return null;

  return (
    <span
      className={`inline-flex w-fit items-center rounded-full bg-[#498467] px-2 py-1 text-[11px] font-semibold text-white ${className}`}
    >
      {promotionDisplayLabel(promotion)}
    </span>
  );
}
