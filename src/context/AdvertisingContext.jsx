import { createContext, useContext, useState } from "react";
import { addCalendarDays, validateCampaignDates } from "../utils/campaignDuration";

const AdvertisingContext = createContext(null);
const SELLER_ID = "current-user";

export const COMMUNITY_SPOTLIGHT_PLAN = {
  id: "community-spotlight",
  name: "Community Spotlight",
  trialDays: 30,
  autoRenew: false,
  trialLabel: "30-Day Free Trial",
  priceLabel: "$9.99/month",
  cancellationLabel: "Cancel anytime.",
  benefits: [
    "Featured placement in Search carousel",
    "Featured placement in Community feed",
    "Featured Store badge",
    "Local discovery boost",
    "Priority placement in relevant categories",
    "Spotlight analytics (views, clicks, followers gained)",
  ],
};

const initialAds = [];

function destinationRoute(ad) {
  if (ad.destinationRoute) return ad.destinationRoute;
  if (ad.type === "Store") return `/seller/${ad.destinationId}`;
  if (ad.type === "Event") return `/event/${ad.destinationId}`;
  return `/listing/${ad.destinationId}`;
}

export function AdvertisingProvider({ children }) {
  const [ads, setAds] = useState(initialAds);

  const addAd = (ad) => {
    const startsAt = ad.startsAt || new Date().toISOString().slice(0, 10);
    const trialStartedAt = ad.trialStartedAt || new Date().toISOString().slice(0, 10);
    const nextAd = {
      ...ad,
      id: `ad-${Date.now()}`,
      sellerId: SELLER_ID,
      destinationRoute: destinationRoute(ad),
      status: "Trial",
      startsAt,
      endsAt: ad.endsAt || startsAt,
      trialStartedAt,
      trialEndsAt: ad.trialEndsAt || addCalendarDays(trialStartedAt, COMMUNITY_SPOTLIGHT_PLAN.trialDays),
    };
    const validationError = validateCampaignDates(nextAd);
    if (validationError) throw new Error(validationError);
    setAds((current) => [nextAd, ...current]);
    return nextAd;
  };

  const updateAd = (adId, updates) => {
    const existingAd = ads.find((ad) => ad.id === adId);
    const updated = existingAd ? { ...existingAd, ...updates } : null;
    if (updated && (Object.hasOwn(updates, "startsAt") || Object.hasOwn(updates, "endsAt"))) {
      const validationError = validateCampaignDates(updated, { existingAd });
      if (validationError) throw new Error(validationError);
    }
    setAds((current) => current.map((ad) => {
      if (ad.id !== adId) return ad;
      const nextAd = { ...ad, ...updates };
      if (!updates.destinationRoute && (updates.destinationId || updates.type)) {
        nextAd.destinationRoute = destinationRoute({ ...nextAd, destinationRoute: undefined });
      }
      return nextAd;
    }));
  };

  const cancelAd = (adId) => updateAd(adId, { status: "Expired" });
  const getAd = (adId) => ads.find((ad) => ad.id === adId);

  return (
    <AdvertisingContext.Provider value={{ ads, addAd, updateAd, cancelAd, getAd }}>
      {children}
    </AdvertisingContext.Provider>
  );
}

export function useAdvertising() {
  const context = useContext(AdvertisingContext);
  if (!context) throw new Error("useAdvertising must be used within an AdvertisingProvider");
  return context;
}
