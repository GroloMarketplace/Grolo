import { Leaf, Percent, Sparkles, Tag } from "lucide-react";
import { normalizePromotionType } from "../context/PromotionContext";

const BADGE_STYLES = {
  featured: {
    label: "Featured",
    icon: Sparkles,
    className: "border-[#E8E1D2] bg-[#FFFDF7] text-[#1F5A45]",
  },
  localDeal: {
    label: "Local Deal",
    icon: Tag,
    className: "border-[#CFE0D5] bg-[#F6FAF7] text-[#1F5A45]",
  },
  discount: {
    label: "Off",
    icon: Percent,
    className: "border-[#CFE0D5] bg-white text-[#1F5A45]",
  },
  seasonal: {
    label: "Seasonal",
    icon: Leaf,
    className: "border-[#DCE4C9] bg-[#FAFCF3] text-[#1F5A45]",
  },
};

function normalizeBadgeVariant(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function badgeVariant(promotion, type) {
  const explicit = normalizeBadgeVariant(promotion.badgeVariant ?? promotion.badgeType);
  if (["featured", "feature"].includes(explicit)) return "featured";
  if (["local_deal", "deal", "local"].includes(explicit)) return "localDeal";
  if (["seasonal", "season"].includes(explicit)) return "seasonal";
  if (type === "percentage") return "discount";
  if (type === "fixed_amount") return "localDeal";
  return "featured";
}

function badgeLabel(promotion, variant, type, label) {
  if (label) return label;
  if (promotion?.badgeLabel) return promotion.badgeLabel;
  if (variant === "discount") return `${promotion.value}% Off`;
  if (variant === "localDeal" && type === "fixed_amount") return `$${promotion.value} Off`;
  return BADGE_STYLES[variant].label;
}

export default function PromotionBadge({ promotion, variant: forcedVariant, label, className = "" }) {
  if (!promotion && !forcedVariant) return null;
  const type = normalizePromotionType(promotion?.type);
  const variant = forcedVariant ?? badgeVariant(promotion, type);
  const style = BADGE_STYLES[variant];
  const Icon = style.icon;

  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none tracking-[0.1px] shadow-[0_2px_8px_rgba(31,90,69,0.12)] ${style.className} ${className}`}>
      <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
      <span>{badgeLabel(promotion, variant, type, label)}</span>
    </span>
  );
}
