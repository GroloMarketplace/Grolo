import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { createPromotion, getPromotions } from "../lib/api/promotions";
import { isSupabaseConfigured } from "../lib/supabaseClient";

const PromotionContext = createContext(null);

export const PROMOTION_TYPES = [
  { value: "percentage", label: "Percentage Off" },
  { value: "dollar", label: "Dollar Amount Off" },
  { value: "bogo", label: "Buy One Get One" },
  { value: "pickup", label: "Free Pickup Event" },
  { value: "limited", label: "Limited Time Offer" },
];

export function promotionTypeLabel(type) {
  return PROMOTION_TYPES.find((option) => option.value === type)?.label ?? type;
}

export function promotionDisplayLabel(promotion) {
  const type = normalizePromotionType(promotion.type);
  if (type === "percentage") return `${promotion.value}% off`;
  if (type === "dollar") return `$${promotion.value} off`;
  if (promotion.type === "bogo") return "Buy 1 Get 1";
  if (promotion.type === "pickup") return "Free pickup";
  return "Limited time";
}

export function promotionUrgencyLabel(promotion) {
  if (!promotion?.endsAt) return "Limited-time offer";
  const end = new Date(`${promotion.endsAt}T23:59:59`);
  const days = Math.ceil((end.getTime() - Date.now()) / 86400000);
  if (days <= 1) return days < 1 ? "Ends today" : "Ends tomorrow";
  if (days < 7) return `Ends in ${days} days`;
  return `Ends ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

export function normalizePromotionType(type) {
  const normalized = String(type ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (["percentage", "percentage_off", "percent", "percent_off"].includes(normalized)) return "percentage";
  if (["dollar", "dollar_off", "fixed", "fixed_amount", "amount_off", "fixed_amount_off"].includes(normalized)) return "dollar";
  return normalized;
}

function localDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return localDateKey(new Date());
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function promotionActivity(promotion, now = new Date()) {
  const status = String(promotion?.status ?? "").trim().toLowerCase();
  const startsAt = String(promotion?.startsAt ?? promotion?.start_date ?? "").slice(0, 10);
  const endsAt = String(promotion?.endsAt ?? promotion?.end_date ?? "").slice(0, 10);
  const today = localDateKey(now);
  const startsBeforeToday = !startsAt || startsAt <= today;
  const endsAfterToday = !endsAt || endsAt >= today;
  const active = status === "active" && startsBeforeToday && endsAfterToday;
  return {
    active,
    status,
    startsAt,
    endsAt,
    today,
    reason: !active
      ? status !== "active" ? "status is not active" : !startsBeforeToday ? "start date is in the future" : "end date has passed"
      : "active through local end of day",
  };
}

export function isActivePromotion(promotion, now = new Date()) {
  return promotionActivity(promotion, now).active;
}

function promotionMatchesListing(promotion, listing) {
  const listingIds = [listing?.id, listing?.databaseId, listing?.legacyId]
    .filter(Boolean)
    .map(String);
  const promotionIds = [promotion?.listingId, ...(Array.isArray(promotion?.productIds) ? promotion.productIds : [])]
    .filter(Boolean)
    .map(String);
  return promotionIds.some((promotionId) => listingIds.includes(promotionId));
}

export function getPromotionPricing(listing, promotion) {
  const originalPrice = Number(listing?.price);
  if (!Number.isFinite(originalPrice) || !promotion) {
    return { originalPrice, discountedPrice: originalPrice, promotion: null, discountPercent: 0 };
  }
  const value = Number(promotion.value);
  const type = normalizePromotionType(promotion.type);
  const discountedPrice = type === "percentage"
    ? originalPrice * (1 - Math.min(100, Math.max(0, value)) / 100)
    : type === "dollar"
      ? originalPrice - Math.max(0, value)
      : originalPrice;
  const roundedDiscountedPrice = Math.max(0, Number(discountedPrice.toFixed(2)));
  return {
    originalPrice,
    discountedPrice: roundedDiscountedPrice,
    promotion,
    discountPercent: originalPrice > 0 ? Math.round(((originalPrice - roundedDiscountedPrice) / originalPrice) * 100) : 0,
  };
}

export function PromotionProvider({ children }) {
  const { user } = useAuth();
  const [promotions, setPromotions] = useState([]);

  useEffect(() => {
    let cancelled = false;
    if (!isSupabaseConfigured) {
      return () => { cancelled = true; };
    }
    getPromotions()
      .then((loaded) => {
        if (!cancelled) {
          setPromotions(loaded);
        }
      })
      .catch((error) => console.error("Unable to load promotions from Supabase", error));
    return () => { cancelled = true; };
  }, [user?.id]);

  const activePromotions = useCallback(
    () => promotions.filter((promotion) => isActivePromotion(promotion)),
    [promotions],
  );

  const promotionsForProduct = useCallback(
    (productId) => activePromotions().filter((promotion) => promotion.productIds?.some((id) => String(id) === String(productId))),
    [activePromotions],
  );

  const getListingPricing = useCallback((listing) => {
    const promotion = activePromotions().find((item) => promotionMatchesListing(item, listing)) ?? null;
    return getPromotionPricing(listing, promotion);
  }, [activePromotions]);

  const promotionsForSeller = useCallback(
    (sellerId) => activePromotions().filter((promotion) => promotion.sellerId === sellerId),
    [activePromotions],
  );

  const addPromotion = useCallback(async (promotion) => {
    if (!isSupabaseConfigured || !user?.id) throw new Error("Supabase authentication is required to create a promotion.");
    const created = await createPromotion({
      ...promotion,
      sellerId: user.id,
      startsAt: promotion.startsAt || new Date().toISOString().slice(0, 10),
    });
    setPromotions((current) => [created, ...current]);
    return created;
  }, [user?.id]);

  return (
    <PromotionContext.Provider
      value={{
        promotions,
        activePromotions,
        promotionsForProduct,
        promotionsForSeller,
        getListingPricing,
        addPromotion,
      }}
    >
      {children}
    </PromotionContext.Provider>
  );
}

export function usePromotions() {
  const context = useContext(PromotionContext);
  if (!context) throw new Error("usePromotions must be used within a PromotionProvider");
  return context;
}
