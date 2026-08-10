import { promotionDisplayLabel } from "../context/PromotionContext";

function badgeStyle(type) {
  if (type === "percentage") return "bg-[#FCE7F3] text-[#9D174D] border-[#F9A8D4]";
  if (type === "dollar") return "bg-[#DCFCE7] text-[#166534] border-[#86EFAC]";
  if (type === "bogo") return "bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]";
  return "bg-[#F5FFF6] text-[#356B4A] border-[#A7DDB5]";
}

function badgeIcon(type) {
  if (type === "percentage") return "🎉";
  if (type === "dollar") return "🔥";
  if (type === "bogo") return "⭐";
  return "🌱";
}

export default function PromotionBadge({ promotion, className = "" }) {
  if (!promotion) return null;

  return (
    <span className={`inline-flex w-fit items-center gap-1 rounded-full border px-3 py-1.5 text-[12px] font-bold uppercase tracking-[0.3px] shadow-sm ${badgeStyle(promotion.type)} ${className}`}>
      <span aria-hidden="true">{badgeIcon(promotion.type)}</span>
      {promotionDisplayLabel(promotion)}
    </span>
  );
}
