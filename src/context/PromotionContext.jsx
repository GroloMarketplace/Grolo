import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { createPromotion, deletePromotion as deletePromotionApi, getPromotions, updatePromotion as updatePromotionApi } from "../lib/api/promotions";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { promotionCreatedTimestamp } from "../utils/promotionRecords";

const PromotionContext = createContext(null);

export const PROMOTION_TYPES = [
  { value: "percentage", label: "Percentage Off" },
  { value: "fixed_amount", label: "Fixed Amount Off" },
];

export function promotionTypeLabel(type) {
  return PROMOTION_TYPES.find((option) => option.value === type)?.label ?? type;
}

export function promotionDisplayLabel(promotion) {
  const type = normalizePromotionType(promotion.type);
  if (type === "percentage") return `${promotion.value}% off`;
  if (type === "fixed_amount") return `$${promotion.value} off`;
  return "Promotion";
}

export function promotionDaysRemaining(promotion, now = new Date()) {
  if (!promotion?.endsAt) return null;
  const end = new Date(`${promotion.endsAt}T23:59:59`);
  if (Number.isNaN(end.getTime())) return null;
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
}

export function promotionUrgencyLabel(promotion) {
  const days = promotionDaysRemaining(promotion);
  if (days === null) return "Limited-time offer";
  if (days <= 1) return days < 1 ? "Ends today" : "Ends tomorrow";
  if (days < 7) return `Ends in ${days} days`;
  return `Ends ${new Date(`${promotion.endsAt}T23:59:59`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

export function normalizePromotionType(type) {
  const normalized = String(type ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (["percentage", "percentage_off", "percent", "percent_off"].includes(normalized)) return "percentage";
  if (["dollar", "dollar_off", "fixed", "fixed_amount", "amount_off", "fixed_amount_off"].includes(normalized)) return "fixed_amount";
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
    : type === "fixed_amount"
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
  const { user, isSuspended } = useAuth();
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
    (sellerId, { createdAfter = 0 } = {}) => activePromotions().filter((promotion) => (
      String(promotion.sellerId) === String(sellerId)
      && promotionCreatedTimestamp(promotion) >= createdAfter
    )),
    [activePromotions],
  );

  const addPromotion = useCallback(async (promotion) => {
    if (isSuspended) throw new Error("Your account is suspended and cannot create promotions.");
    if (!isSupabaseConfigured || !user?.id) throw new Error("Supabase authentication is required to create a promotion.");
    const created = await createPromotion({
      ...promotion,
      sellerId: user.id,
      startsAt: promotion.startsAt || new Date().toISOString().slice(0, 10),
    });
    setPromotions((current) => [created, ...current]);
    return created;
  }, [isSuspended, user?.id]);

  const updatePromotion = useCallback(async (promotionId, updates) => {
    if (isSuspended) throw new Error("Your account is suspended and cannot update a promotion.");
    if (!isSupabaseConfigured || !user?.id) throw new Error("Supabase authentication is required to update a promotion.");
    const updated = await updatePromotionApi(promotionId, updates);
    setPromotions((current) => current.map((promotion) => promotion.id === updated.id ? updated : promotion));
    return updated;
  }, [isSuspended, user?.id]);

  const endPromotion = useCallback((promotionId) => updatePromotion(promotionId, { status: "ended" }), [updatePromotion]);

  const deletePromotion = useCallback(async (promotionId) => {
    if (isSuspended) throw new Error("Your account is suspended and cannot delete a promotion.");
    if (!isSupabaseConfigured || !user?.id) throw new Error("Supabase authentication is required to delete a promotion.");
    await deletePromotionApi(promotionId);
    setPromotions((current) => current.filter((promotion) => promotion.id !== promotionId));
    return true;
  }, [isSuspended, user?.id]);

  return (
    <PromotionContext.Provider
      value={{
        promotions,
        activePromotions,
        promotionsForProduct,
        promotionsForSeller,
        getListingPricing,
        addPromotion,
        updatePromotion,
        endPromotion,
        deletePromotion,
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
