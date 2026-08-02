import { createContext, useCallback, useContext, useState } from "react";
import { promotions as mockPromotions } from "../data/mockData";

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
  if (promotion.type === "percentage") return `${promotion.value}% off`;
  if (promotion.type === "dollar") return `$${promotion.value} off`;
  if (promotion.type === "bogo") return "Buy 1 Get 1";
  if (promotion.type === "pickup") return "Free pickup";
  return "Limited time";
}

function isActive(promotion) {
  const today = new Date().toISOString().slice(0, 10);
  return (!promotion.startsAt || promotion.startsAt <= today) &&
    (!promotion.endsAt || promotion.endsAt >= today);
}

export function PromotionProvider({ children }) {
  const [promotions, setPromotions] = useState(mockPromotions);

  const activePromotions = useCallback(
    () => promotions.filter(isActive),
    [promotions],
  );

  const promotionsForProduct = useCallback(
    (productId) => activePromotions().filter((promotion) => promotion.productIds?.includes(productId)),
    [activePromotions],
  );

  const promotionsForSeller = useCallback(
    (sellerId) => activePromotions().filter((promotion) => promotion.sellerId === sellerId),
    [activePromotions],
  );

  const addPromotion = useCallback((promotion) => {
    setPromotions((current) => [
      {
        ...promotion,
        id: `promotion-${Date.now()}`,
        startsAt: promotion.startsAt || new Date().toISOString().slice(0, 10),
      },
      ...current,
    ]);
  }, []);

  return (
    <PromotionContext.Provider
      value={{
        promotions,
        activePromotions,
        promotionsForProduct,
        promotionsForSeller,
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
