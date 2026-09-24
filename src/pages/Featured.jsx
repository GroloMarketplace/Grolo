import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import SearchBar from "../components/SearchBar";
import PromotionBadge from "../components/PromotionBadge";
import { formatEventDate, formatEventTime, useEvents } from "../context/EventContext";
import { useFollow } from "../context/FollowContext";
import { useAdvertising } from "../context/AdvertisingContext";
import { useListings } from "../context/ListingContext";
import { useOrders } from "../context/OrderContext";
import { trendingScore } from "../utils/trendingScore";
import { events, promotions, sellers } from "../data/mockData";
import { readNavigationState, writeNavigationState } from "../hooks/navigationState";
import FoundingMemberBadge from "../components/FoundingMemberBadge";
import { EventAttendanceCount } from "../components/EventRsvp";
import ServiceCategoryLabel from "../components/ServiceCategoryLabel";
import DistanceLabel from "../components/DistanceLabel";
import ReviewSummary from "../components/ReviewSummary";
import TradeBadge from "../components/TradeBadge";
import { formatLocation } from "../data/locations";
import { promotionMatchesListing, promotedContentImage } from "../utils/promotionMedia";
import { formatListingPrice } from "../utils/listingDisplay";

const FILTERS = ["All", "Listings", "Events", "Stores", "Promotions"];
const SORT_OPTIONS = ["Featured", "Trending", "Newest"];
const STORE_CATEGORIES = {};

export default function Featured() {
  const navigate = useNavigate();
  const { ads } = useAdvertising();
  const { listings } = useListings();
  const { events: liveEvents, getAttendeeCount } = useEvents();
  const { orders } = useOrders();
  const { getFollowerCount } = useFollow();
  const safeListings = Array.isArray(listings) ? listings.filter(Boolean) : [];
  const safeEvents = Array.isArray(liveEvents) ? liveEvents.filter(Boolean) : events.filter(Boolean);
  const safeOrders = Array.isArray(orders) ? orders.filter(Boolean) : [];
  const safeAds = Array.isArray(ads) ? ads.filter(Boolean) : [];
  const scrollRef = useRef(null);
  const savedFeaturedState = readNavigationState("featured", { query: "", filter: "All", sort: "Featured", scrollTop: 0 });
  const [query, setQuery] = useState(savedFeaturedState.query);
  const [filter, setFilter] = useState(savedFeaturedState.filter);
  const [sort, setSort] = useState(savedFeaturedState.sort);
  const queryRef = useRef(query);
  const filterRef = useRef(filter);
  const sortRef = useRef(sort);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = savedFeaturedState.scrollTop;
    const scrollElement = scrollRef.current;
    const saveState = () => writeNavigationState("featured", { query: queryRef.current, filter: filterRef.current, sort: sortRef.current, scrollTop: scrollElement?.scrollTop ?? 0 });
    scrollElement?.addEventListener("scroll", saveState, { passive: true });
    return () => {
      saveState();
      scrollElement?.removeEventListener("scroll", saveState);
    };
  }, []);
  const openProduct = (productId, destination = `/product/${productId}`) => {
    const searchState = readNavigationState("search", {});
    if (searchState.currentRoute === "featured") {
      writeNavigationState("search", { ...searchState, currentProductId: productId });
    }
    navigate(destination);
  };
  const promotionByProduct = useMemo(
    () => new Map(safeListings.map((product) => [product.id, promotions.find((promotion) => promotionMatchesListing(promotion, product))])),
    [safeListings],
  );
  const paidStoreIds = useMemo(() => new Set(
    safeAds
      .filter((ad) => (ad.status === "Trial" || ad.status === "Active") && ad.type === "Store")
      .map((ad) => ad.destinationId),
  ), [ads]);
  const featuredStores = useMemo(() => [
    ...Object.values(sellers).filter((store) => paidStoreIds.has(store.id)),
    ...Object.values(sellers).filter((store) => !paidStoreIds.has(store.id)),
  ].slice(0, 4).map((store) => ({
    ...store,
    followers: getFollowerCount(store.id),
    orders: safeOrders.filter((order) => String(order.sellerId ?? order.seller_id ?? "") === String(store.id) && String(order.status).toLowerCase() === "completed").length,
  })), [getFollowerCount, paidStoreIds, safeOrders]);
  const feed = useMemo(
    () => [
      ...featuredStores.map((store) => ({ type: "store", item: store, trending: trendingScore("store", store) })),
      ...safeListings.map((product) => {
        const promotion = promotionByProduct.get(product.id);
        return { type: "listing", item: product, promotion, trending: trendingScore("listing", product) + (promotion ? trendingScore("promotion", promotion) : 0) };
      }),
      ...safeEvents.slice(0, 6).map((event) => ({
        type: "event",
        item: { ...event, attendingCount: getAttendeeCount(event.id) },
        trending: trendingScore("event", { ...event, attendingCount: getAttendeeCount(event.id) }),
      })),
    ],
    [featuredStores, getAttendeeCount, promotionByProduct, safeEvents, safeListings],
  );
  const filteredFeed = feed
    .filter((entry) => filter === "All" || (filter === "Listings" && entry.type === "listing") || (filter === "Events" && entry.type === "event") || (filter === "Stores" && entry.type === "store") || (filter === "Promotions" && entry.promotion))
    .filter((entry) => {
      const item = entry?.item ?? {};
      const searchableText = entry?.type === "listing"
        ? `${item.name ?? ""} ${item.shop ?? ""}`
        : entry.type === "event"
          ? `${item.title} ${sellers[item.sellerId]?.name} ${item.location}`
          : `${item.name} ${STORE_CATEGORIES[item.id] ?? ""}`;
      return searchableText.toLowerCase().includes(query.trim().toLowerCase());
    })
    .sort((a, b) => {
      if (sort === "Trending" || sort === "Featured") return b.trending - a.trending;
      if (sort === "Newest") return String(b.item.date ?? b.item.id).localeCompare(String(a.item.date ?? a.item.id));
      return 0;
    });

  return (
    <MobileScreenLayout>
      <Header title="Grown Local" onBack={() => navigate(-1)} />
      <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar">
        <div className="border-b border-black/5 py-3">
          <SearchBar
            placeholder="Search featured products, stores, and events"
            value={query}
            onChange={(event) => { queryRef.current = event.target.value; setQuery(event.target.value); }}
          />
          <div className="mt-3 flex gap-2 overflow-x-auto px-4 no-scrollbar">
            {FILTERS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => { filterRef.current = option; setFilter(option); }}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium ${filter === option ? "bg-[#498467] text-white" : "bg-[#F5F5F5] text-[#828282]"}`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-[18px] font-semibold">Featured</h2>
          <label className="flex items-center gap-1.5 text-[12px] text-[#828282]">
            Sort by
            <select value={sort} onChange={(event) => { sortRef.current = event.target.value; setSort(event.target.value); }} className="rounded-md border border-[#E6E6E6] bg-white px-2 py-1 text-[12px] text-black outline-none">
              {SORT_OPTIONS.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
        </div>

        <div className="flex flex-col gap-3 px-4 pb-6">
          {filteredFeed.length === 0 ? (
            <div className="rounded-lg border border-[#E6E6E6] px-4 py-8 text-center text-[14px] text-[#828282]">
              No featured content matches your search.
            </div>
          ) : filteredFeed.map((entry, index) => (
            <FeaturedFeedCard key={`${entry.type}-${entry.item.id}-${index}`} entry={entry} onProduct={openProduct} />
          ))}
        </div>
      </div>
    </MobileScreenLayout>
  );
}

function FeaturedFeedCard({ entry, onProduct }) {
  if (entry.type === "event") return <FeaturedEventCard event={entry.item} />;
  if (entry.type === "store") return <FeaturedStoreCard store={entry.item} />;
  return <FeaturedListingCard product={entry.item} promotion={entry.promotion} onProduct={onProduct} />;
}

function FeaturedListingCard({ product, promotion, onProduct }) {
  if (!product || typeof product !== "object") return null;
  const openReviews = () => onProduct?.(product.id, `/product/${product.id}/reviews`);
  return (
    <article className="rounded-lg border border-[#E6E6E6] p-3">
      <Link to={`/product/${product.id}`} onClick={(event) => { if (onProduct) { event.preventDefault(); onProduct(product.id); } }} className="block">
        <div className="relative">
          <img src={promotedContentImage({ listing: product, promotion })} alt={product.name} className="h-[180px] w-full rounded-lg object-cover" />
          {promotion && <PromotionBadge promotion={promotion} className="absolute left-2 top-2" />}
        </div>
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <ServiceCategoryLabel listing={product} className="mb-1 block" />
            <h3 className="truncate text-[16px] font-semibold">{product.name ?? "Untitled listing"}</h3>
            <div className="flex flex-wrap items-center gap-2"><p className="text-[13px] text-[#498467]">{product.shop ?? ""}</p><FoundingMemberBadge sellerId={product.sellerId} compact /></div>
            <DistanceLabel content={product} />
          </div>
          <span className="shrink-0 text-[16px] font-semibold">{formatListingPrice(product)}</span>
        </div>
        <TradeBadge listing={product} compact className="mt-2" />
      </Link>
      <ReviewSummary product={product} onClick={openReviews} />
    </article>
  );
}

function FeaturedEventCard({ event }) {
  const navigate = useNavigate();
  const seller = sellers[event.sellerId];

  return (
    <button type="button" onClick={() => navigate(`/event/${event.id}`)} className="w-full overflow-hidden rounded-lg border border-[#E6E6E6] text-left">
      <img src={promotedContentImage({ event })} alt={event.title} className="h-[180px] w-full object-cover" />
      <div className="flex flex-col gap-1 p-3">
        <h3 className="text-[16px] font-semibold">{event.title}</h3>
        <p className="text-[13px] text-[#498467]">{seller?.name}</p>
        <DistanceLabel content={event} />
        <p className="text-[12px] text-[#828282]">{formatEventDate(event.date)} • {formatEventTime(event.startTime)} – {formatEventTime(event.endTime)}</p>
        <p className="text-[12px] text-[#828282]">{formatLocation(event)}</p>
        <EventAttendanceCount eventId={event.id} />
      </div>
    </button>
  );
}

function FeaturedStoreCard({ store }) {
  const { isFollowing, toggleFollow } = useFollow();
  const navigate = useNavigate();
  const following = isFollowing(store.id);

  return (
    <article className="flex items-center gap-3 rounded-lg border border-[#E6E6E6] p-3">
      <button type="button" onClick={() => navigate(`/seller/${store.id}`)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <img src={store.avatar} alt={store.name} className="h-16 w-16 shrink-0 rounded-full object-cover" />
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2"><span className="truncate text-[16px] font-semibold">{store.name}</span><FoundingMemberBadge sellerId={store.id} compact /></span>
          <span className="block text-[13px] text-[#828282]">{STORE_CATEGORIES[store.id] ?? "Local store"}</span>
          <DistanceLabel content={store} className="mt-1 block" />
          <span className="mt-1 block text-[12px] text-[#828282]"><span className="text-[#498467]">★</span> {Number.isFinite(Number(store.rating)) ? Number(store.rating).toFixed(1) : "New"} ({Number(store.reviewCount) || 0})</span>
        </span>
      </button>
      <button type="button" onClick={() => toggleFollow(store.id)} className={`shrink-0 rounded-lg px-3 py-2 text-[12px] font-medium ${following ? "border border-[#498467] text-[#498467]" : "bg-[#498467] text-white"}`}>
        {following ? "Following" : "Follow"}
      </button>
    </article>
  );
}
