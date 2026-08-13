import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  formatEventDate,
  formatEventTime,
} from "../context/EventContext";
import { useReviews } from "../context/ReviewContext";
import { CompactReputationHeader } from "./ReputationSummary";
import { useReputationSnapshot } from "../hooks/useReputationRead";
import { useMarketplaceDiscovery } from "../hooks/useEntityResolution";

const FILTERS = ["All", "Stores", "Events", "Products", "Near Me"];
const NEAR_ME_KM = 1;

export default function MapView() {
  const navigate = useNavigate();
  const { sellerRating } = useReviews();
  const discovery = useMarketplaceDiscovery();
  const mapLocations = discovery?.mapLocations ?? [];
  const products = discovery?.listings ?? [];
  const sellers = discovery?.stores ?? [];
  const events = discovery?.events ?? [];
  const [filter, setFilter] = useState("All");
  const [selectedId, setSelectedId] = useState(null);

  const resolve = (location) => {
    const distance = `${location.distanceKm.toFixed(1)} km away`;

    if (location.kind === "store") {
      const seller = sellers.find((item) => item.id === location.sellerId || item.legacyId === location.sellerId);
      if (!seller) return null;
      const snapshotRating = seller.reputationSnapshot?.sellerStatus?.metrics?.averageRating ?? seller.reputationSnapshot?.sellerStatus?.metrics?.average_rating;
      const { average } = sellerRating(seller.id);
      return {
        image: seller.avatar,
        title: seller.name,
        category: location.category,
        rating: snapshotRating ?? average,
        distance,
        lines: [seller.location],
        reputationId: seller.id,
        action: "View Store",
        onOpen: () => navigate(`/seller/${seller.id}`),
      };
    }

    if (location.kind === "event") {
      const event = events.find((item) => item.id === location.eventId || item.legacyId === location.eventId);
      if (!event) return null;
      const seller = sellers.find((item) => item.id === event.sellerId || item.legacyId === event.sellerId);
      return {
        image: event.image,
        title: event.title,
        category: event.type,
        distance,
        lines: [
          seller?.name,
          `${formatEventDate(event.date)} • ${formatEventTime(event.startTime)}`,
          event.location,
        ],
        action: "View Event",
        onOpen: () => navigate(`/event/${event.id}`),
      };
    }

    const product = products.find((item) => [item.id, item.legacyId, item.databaseId].filter(Boolean).map(String).includes(String(location.productId)));
    if (!product) return null;
    return {
      image: product.image,
      title: product.name,
      category: `$${(Number(product.price) || 0).toFixed(2)}`,
      rating: product.rating,
      distance,
      lines: [product.shop],
      action: "View Listing",
      onOpen: () => navigate(`/product/${product.id}`),
    };
  };

  const matchesFilter = (location) => {
    if (filter === "All") return true;
    if (filter === "Near Me") return location.distanceKm <= NEAR_ME_KM;
    if (filter === "Stores") return location.kind === "store";
    if (filter === "Events") return location.kind === "event";
    return location.kind === "product";
  };

  const visible = mapLocations
    .filter(matchesFilter)
    .map((location) => ({ location, item: resolve(location) }))
    .filter((entry) => entry.item)
    .sort((a, b) => a.location.distanceKm - b.location.distanceKm);

  const selected = visible.find((entry) => entry.location.id === selectedId);

  return (
    <div className="flex flex-col">
      {/* Map */}
      <div className="relative h-[280px] overflow-hidden border-b border-black/5">
        <MapBackdrop />

        {visible.map(({ location, item }) => (
          <button
            key={location.id}
            onClick={() => setSelectedId(location.id)}
            aria-label={item.title}
            className="absolute -translate-x-1/2 -translate-y-full"
            style={{ left: `${location.x}%`, top: `${location.y}%` }}
          >
            <Pin
              active={selectedId === location.id}
              kind={location.kind}
            />
          </button>
        ))}

        {/* You are here */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: "50%", top: "50%" }}
        >
          <span className="block w-3 h-3 rounded-full bg-[#498467] border-2 border-white shadow" />
        </div>

        {selected && (
          <div className="absolute left-3 right-3 bottom-3">
            <div className="rounded-lg bg-white shadow-lg border border-[#E6E6E6] p-3 flex items-start gap-3">
              <img
                src={selected.item.image}
                alt={selected.item.title}
                className="w-14 h-14 rounded-lg object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[14px] font-semibold truncate">
                    {selected.item.title}
                  </span>
                  <button
                    onClick={() => setSelectedId(null)}
                    aria-label="Close preview"
                    className="text-[#828282] text-[14px] leading-none shrink-0"
                  >
                    ×
                  </button>
                </div>
                <div className="text-[12px] text-[#498467] font-medium">
                  {selected.item.category}
                </div>
                {selected.item.lines.filter(Boolean).map((line) => (
                  <div key={line} className="text-[12px] text-[#828282] truncate">
                    {line}
                  </div>
                ))}
                <MapReputationContext userId={selected.item.reputationId} />
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[12px] text-[#828282]">
                    {selected.item.distance}
                  </span>
                  {selected.item.rating != null && (
                    <>
                      <span className="text-[12px] text-[#828282]">•</span>
                      <span className="flex items-center gap-1 text-[12px] font-medium">
                        <Star />
                        {selected.item.rating}
                      </span>
                    </>
                  )}
                </div>
                <button
                  onClick={selected.item.onOpen}
                  className="w-full mt-2 bg-[#498467] text-white py-2 rounded-lg text-[12px] font-medium"
                >
                  {selected.item.action}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 px-4 py-3 border-b border-black/5 overflow-x-auto no-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap ${
              filter === f ? "bg-[#498467] text-white" : "bg-[#F5F5F5] text-black"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Nearby list */}
      <div className="py-2">
        <div className="flex items-center justify-between px-4 py-2">
          <h2 className="text-[16px] font-semibold tracking-[-0.32px]">Nearby</h2>
          <span className="text-[12px] text-[#828282]">{visible.length}</span>
        </div>

        {visible.length === 0 ? (
          <div className="px-4 py-3 text-[14px] text-[#828282]">
            Nothing nearby matches this filter
          </div>
        ) : (
          <div className="flex flex-col gap-3 px-4">
            {visible.map(({ location, item }) => (
              <div
                key={location.id}
                className="rounded-lg border border-[#E6E6E6] p-3"
              >
                <button
                  onClick={() => setSelectedId(location.id)}
                  className="flex items-start gap-3 w-full text-left"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-16 h-16 rounded-lg object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium truncate">
                      {item.title}
                    </div>
                    <div className="text-[12px] text-[#498467] font-medium">
                      {item.category}
                    </div>
                    {item.lines.filter(Boolean).map((line) => (
                      <div
                        key={line}
                        className="text-[12px] text-[#828282] truncate"
                      >
                        {line}
                      </div>
                    ))}
                    {location.kind === "store" && <MapReputationContext userId={item.reputationId} />}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[12px] text-[#828282]">
                        {item.distance}
                      </span>
                      {item.rating != null && (
                        <>
                          <span className="text-[12px] text-[#828282]">•</span>
                          <span className="flex items-center gap-1 text-[12px] font-medium">
                            <Star />
                            {item.rating}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
                <button
                  onClick={item.onOpen}
                  className="w-full mt-3 bg-[#498467] text-white py-2.5 rounded-lg text-[14px] font-medium"
                >
                  {item.action}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MapReputationContext({ userId }) {
  const reputationSnapshot = useReputationSnapshot(userId);
  return <CompactReputationHeader snapshot={reputationSnapshot} audience="seller" className="mt-1 max-w-full" />;
}

function MapBackdrop() {
  return (
    <svg
      viewBox="0 0 375 280"
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full"
    >
      <rect width="375" height="280" fill="#EDF2EC" />
      {/* Parks */}
      <rect x="12" y="24" width="96" height="64" rx="8" fill="#DCE9DA" />
      <rect x="236" y="176" width="120" height="80" rx="8" fill="#DCE9DA" />
      {/* River */}
      <path
        d="M-10 210 C 70 190, 120 240, 200 214 S 330 170, 390 196 L 390 280 L -10 280 Z"
        fill="#D6E4EC"
      />
      {/* Roads */}
      {[48, 112, 176, 240].map((y) => (
        <rect key={y} x="0" y={y} width="375" height="6" fill="#FFFFFF" />
      ))}
      {[60, 150, 244, 320].map((x) => (
        <rect key={x} x={x} y="0" width="6" height="280" fill="#FFFFFF" />
      ))}
      {/* Blocks */}
      {[
        [130, 66],
        [262, 62],
        [92, 150],
        [268, 120],
        [176, 196],
      ].map(([x, y]) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width="46"
          height="34"
          rx="4"
          fill="#E4E4E0"
        />
      ))}
    </svg>
  );
}

function Pin({ active, kind }) {
  return (
    <span
      className={`flex flex-col items-center transition-transform ${
        active ? "scale-110" : ""
      }`}
    >
      <span
        className={`w-8 h-8 rounded-full flex items-center justify-center shadow border-2 border-white ${
          active ? "bg-[#02542D]" : "bg-[#498467]"
        }`}
      >
        {kind === "event" ? (
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <rect x="3" y="4.5" width="14" height="12" rx="2" stroke="white" strokeWidth="1.6" />
            <path d="M3 8.5h14M7 3v3M13 3v3" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        ) : kind === "product" ? (
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path
              d="M4 6h12l-1 10H5L4 6Zm3 0a3 3 0 0 1 6 0"
              stroke="white"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path
              d="M4 8.5 5.5 4h9L16 8.5M4 8.5h12v7H4v-7Z"
              stroke="white"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span
        className={`w-0 h-0 border-l-4 border-r-4 border-t-[6px] border-l-transparent border-r-transparent ${
          active ? "border-t-[#02542D]" : "border-t-[#498467]"
        }`}
      />
    </span>
  );
}

function Star() {
  return (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
      <path
        d="M10 1.67 12.58 6.88l5.75.84-4.16 4.06.98 5.73L10 14.81l-5.15 2.71.98-5.73L1.67 7.73l5.75-.84L10 1.67Z"
        fill="#FFC107"
        stroke="#FFC107"
        strokeWidth="1"
      />
    </svg>
  );
}
