import { createContext, useContext, useState } from "react";

const AdvertisingContext = createContext(null);
const SELLER_ID = "current-user";

const initialAds = [];

function addDays(date, days) {
  const result = new Date(`${date}T00:00:00`);
  result.setDate(result.getDate() + days);
  return result.toISOString().slice(0, 10);
}

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
    setAds((current) => [
      {
        ...ad,
        id: `ad-${Date.now()}`,
        sellerId: SELLER_ID,
        destinationRoute: destinationRoute(ad),
        status: "Trial",
        startsAt,
        endsAt: ad.endsAt || addDays(startsAt, 30),
      },
      ...current,
    ]);
  };

  const updateAd = (adId, updates) => {
    setAds((current) => current.map((ad) => {
      if (ad.id !== adId) return ad;
      const updated = { ...ad, ...updates };
      if (!updates.destinationRoute && (updates.destinationId || updates.type)) {
        updated.destinationRoute = destinationRoute({ ...updated, destinationRoute: undefined });
      }
      return updated;
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
