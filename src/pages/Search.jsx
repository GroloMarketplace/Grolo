import { Croissant, Gem, Grid2X2, HeartPulse, Home, Leaf, Palette, PawPrint, Shirt, Utensils, Wrench } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import CarouselRow from "../components/CarouselRow";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { formatListingPrice } from "../utils/listingDisplay";
import ServiceCategoryLabel from "../components/ServiceCategoryLabel";
import { useFavorites } from "../hooks/useFavorites";
import { useSavedItems } from "../context/SavedContext";
import { useReviews } from "../context/ReviewContext";
import { useOrders } from "../context/OrderContext";
import { readNavigationState, writeNavigationState } from "../hooks/navigationState";
import { useListings } from "../context/ListingContext";
import TradeBadge from "../components/TradeBadge";
import ReviewSummary from "../components/ReviewSummary";
import { useBuyerSettings } from "../context/BuyerSettingsContext";
import { discoveryRadiusLabel, resolveUserLocation, sortByDistance } from "../utils/locationRadius";
import DistanceLabel from "../components/DistanceLabel";
import { CompactReputationHeader } from "../components/ReputationSummary";
import { useReputationSnapshot } from "../hooks/useReputationRead";
import { useMarketplaceDiscovery } from "../hooks/useEntityResolution";
import { useTrustSafety } from "../context/TrustSafetyContext";

// TODO: Reintroduce Map Search in a future update.
const TABS = ["Local", "History", "My Orders"];

const ORDER_SECTIONS = [
  { title: "Active Orders", statuses: ["Order Placed", "Preparing", "In Progress", "Seller Notified"] },
  { title: "Ready for Pickup", statuses: ["Ready for Pickup"], fulfillmentMethod: "pickup" },
  { title: "Out for Delivery", statuses: ["Out for Delivery"], fulfillmentMethod: "delivery" },
  { title: "Delivered Orders", statuses: ["Delivered"], fulfillmentMethod: "delivery" },
  { title: "Completed Pickup Orders", statuses: ["Completed"], fulfillmentMethod: "pickup" },
  { title: "Cancelled Orders", statuses: ["Cancelled"] },
];

export default function Search() {
  const navigate = useNavigate();
  const { listings, searchListings } = useListings();
  const safeListings = Array.isArray(listings) ? listings.filter(Boolean) : [];
  const marketplaceDiscovery = useMarketplaceDiscovery();
  const discoveryListings = marketplaceDiscovery?.listings ?? [];
  const discoveryProducts = safeListings.length ? safeListings : discoveryListings;
  const resolvedSellers = marketplaceDiscovery?.stores ?? [];
  const resolvedEvents = marketplaceDiscovery?.events ?? [];
  const resolvedCategories = marketplaceDiscovery?.categories ?? [];
  const resolvedPosts = marketplaceDiscovery?.posts ?? [];
  const [searchResults, setSearchResults] = useState(null);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [searchLoadingMore, setSearchLoadingMore] = useState(false);
  const { settings: buyerSettings = {} } = useBuyerSettings();
  const { blockedUserIds } = useTrustSafety();
  const location = useLocation();
  const scrollRef = useRef(null);
  const requestedTab = TABS.includes(location.state?.activeTab) ? location.state.activeTab : null;
  const savedSearchState = location.state?.resetSearch
    ? { tab: "Local", query: "", scrollTop: 0 }
    : requestedTab
      ? { ...readNavigationState("search", { tab: "Local", query: "", scrollTop: 0 }), tab: requestedTab }
      : readNavigationState("search", { tab: "Local", query: "", scrollTop: 0 });
  const initialTab = TABS.includes(savedSearchState.tab) ? savedSearchState.tab : "Local";
  const [tab, setTab] = useState(initialTab);
  const [query, setQuery] = useState(savedSearchState.query);
  const tabRef = useRef(tab);
  const queryRef = useRef(query);
  useEffect(() => {
    return () => {};
  }, []);
  const rememberProduct = (productId, destination = `/product/${productId}`) => {
    writeNavigationState("search", {
      tab,
      query,
      scrollTop: scrollRef.current?.scrollTop ?? 0,
      currentProductId: productId,
    });
    navigate(destination);
  };

  const returnToSearchHome = () => {
    tabRef.current = "Local";
    queryRef.current = "";
    setTab("Local");
    setQuery("");
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    writeNavigationState("search", { tab: "Local", query: "", scrollTop: 0 });
  };

  useEffect(() => {
    let cancelled = false;
    if (tab !== "Local" || !query.trim()) {
      setSearchResults(null);
      setSearchHasMore(false);
      return () => { cancelled = true; };
    }
    searchListings(query, { limit: 30, offset: 0 })
      .then((results) => { if (!cancelled) { setSearchResults(results); setSearchHasMore(results.length === 30); } })
      .catch((error) => {
        console.error("Unable to search listings", error);
        if (!cancelled) setSearchResults([]);
      });
    return () => { cancelled = true; };
  }, [query, searchListings, tab]);

  const loadMoreSearch = async () => {
    if (searchLoadingMore || !searchHasMore || !query.trim()) return;
    setSearchLoadingMore(true);
    try {
      const results = await searchListings(query, { limit: 30, offset: searchResults?.length ?? 0 });
      setSearchResults((current) => [...(current ?? []), ...results]);
      setSearchHasMore(results.length === 30);
    } catch (error) {
      console.error("Unable to load more search results", error);
    } finally {
      setSearchLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!location.state?.resetSearch) return;
    tabRef.current = "Local";
    queryRef.current = "";
    setTab("Local");
    setQuery("");
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    writeNavigationState("search", { tab: "Local", query: "", scrollTop: 0 });
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state?.resetSearch]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = savedSearchState.scrollTop;
    const saveState = () => writeNavigationState("search", { tab: tabRef.current, query: queryRef.current, scrollTop: scrollRef.current?.scrollTop ?? 0 });
    const scrollElement = scrollRef.current;
    scrollElement?.addEventListener("scroll", saveState, { passive: true });
    return () => {
      saveState();
      scrollElement?.removeEventListener("scroll", saveState);
    };
  }, []);

  return (
    <MobileScreenLayout>
      <div className="sticky top-0 bg-white z-10 flex items-center justify-center gap-8 px-4 py-2.5 border-b border-black/5 relative">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => { tabRef.current = t; setTab(t); writeNavigationState("search", { tab: t, query: queryRef.current, scrollTop: scrollRef.current?.scrollTop ?? 0 }); }}
            className={`text-[14px] font-semibold tracking-[-0.28px] relative ${
              tab === t ? "text-[#498467]" : "text-black/40"
            }`}
          >
            {t}
            {tab === t && <div className="absolute -bottom-2.5 left-0 right-0 h-0.5 bg-[#498467]" />}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="overflow-y-auto flex-1 no-scrollbar">
        <div className="bg-white py-3 border-b border-black/5">
          <p className="px-4 pb-2 text-[12px] text-[#828282]">Nearby results first, within {discoveryRadiusLabel(buyerSettings.locationRadius ?? 25)}</p>
          <SearchBar value={query} onChange={(event) => { queryRef.current = event.target.value; setQuery(event.target.value); }} />
        </div>

        {tab === "Local" && query.trim() ? <SearchResults products={searchResults ?? discoveryProducts} sellers={resolvedSellers} events={resolvedEvents} posts={resolvedPosts} blockedUserIds={blockedUserIds} query={query} navigate={navigate} onProduct={rememberProduct} onBack={returnToSearchHome} buyerSettings={buyerSettings} onLoadMore={loadMoreSearch} hasMore={searchHasMore} loadingMore={searchLoadingMore} /> : tab === "Local" && (
          <>
            <CommunityTipsCarousel />
            <CategoryRow categories={resolvedCategories} onCategory={(path) => { writeNavigationState("search", { tab, query, scrollTop: scrollRef.current?.scrollTop ?? 0, currentRoutePath: path }); navigate(path, { state: { fromSearch: true } }); }} />
            <CarouselRow
              title="Featured"
              products={discoveryProducts}
              onSeeAll={() => { writeNavigationState("search", { tab, query, scrollTop: scrollRef.current?.scrollTop ?? 0, currentRoute: "featured" }); navigate("/featured"); }}
              onProductClick={rememberProduct}
            />
            <TradingSection products={discoveryProducts} navigate={navigate} onProduct={rememberProduct} />
          </>
        )}

        {tab === "History" && <History products={discoveryProducts} onProduct={rememberProduct} />}

        {tab === "My Orders" && <MyOrders />}
      </div>
    </MobileScreenLayout>
  );
}

function SearchResults({ products, sellers, events, posts, blockedUserIds, query, navigate, onProduct, onBack, buyerSettings, onLoadMore, hasMore, loadingMore }) {
  const visibleAccount = (accountId) => !blockedUserIds.has(String(accountId));
  const normalizedQuery = query.trim().toLowerCase();
  // Search covers all content; results are just sorted nearest-first so local
  // matches surface at the top without hiding results outside the radius.
  const userLocation = resolveUserLocation(buyerSettings);
  const nearestFirst = (items) => sortByDistance(items, userLocation);
  const allPosts = posts ?? [];
  const matches = (value) => String(value ?? "").toLowerCase().includes(normalizedQuery);
  const productResults = nearestFirst(products.filter((product) => visibleAccount(product.sellerId) && matches(`${product.name} ${product.description} ${product.shop}`)));
  const storeResults = nearestFirst(sellers.filter((seller) => visibleAccount(seller.id) && matches(`${seller.name} ${seller.description} ${seller.location}`)));
  const eventResults = nearestFirst(events.filter((event) => visibleAccount(event.sellerId) && matches(`${event.title} ${event.description} ${event.type} ${event.location}`)));
  const postResults = nearestFirst(allPosts.filter((post, index, posts) => visibleAccount(post.sellerId ?? post.authorId) && posts.findIndex((item) => item.id === post.id) === index && matches(`${post.body} ${post.name} ${post.classification}`)));
  const tradeResults = nearestFirst(products.filter((product) => visibleAccount(product.sellerId) && product.availableForTrade && matches(`${product.name} ${product.tradeAvailable} ${product.desiredTradeItems}`)));
  const groups = [
    { title: "Products", items: productResults, render: (product) => <ProductSearchRow key={product.id} product={product} onProduct={onProduct} /> },
    { title: "Stores", items: storeResults, render: (seller) => <SellerResultRow key={seller.id} seller={seller} onClick={() => navigate(`/seller/${seller.id}`)} /> },
    { title: "Events", items: eventResults, render: (event) => <ResultRow key={event.id} title={event.title} subtitle={event.location} content={event} onClick={() => navigate(`/event/${event.id}`)} /> },
    { title: "Posts", items: postResults, render: (post) => <ResultRow key={post.id} title={post.body} subtitle={post.name} onClick={() => navigate("/comments", { state: { content: { type: "post", post } } })} /> },
    { title: "Trades", items: tradeResults, render: (product) => <ResultRow key={`trade-${product.id}`} title={`Looking to trade ${product.name}`} subtitle={`For ${product.desiredTradeItems || product.tradeAvailable}`} onClick={() => onProduct(product.id)} /> },
  ];
  const hasResults = groups.some((group) => group.items.length > 0);

  return <div className="flex flex-col gap-5 px-4 py-5"><button type="button" onClick={onBack} className="w-fit text-[14px] font-medium text-[#498467]">← Back</button><div><h2 className="text-[20px] font-semibold">Search Results</h2><p className="mt-1 text-[13px] text-[#828282]">Results for “{query.trim()}”</p></div>{hasResults ? groups.filter((group) => group.items.length > 0).map((group) => <section key={group.title}><h3 className="mb-2 text-[15px] font-semibold">{group.title}</h3><div className="flex flex-col gap-2">{group.items.map(group.render)}</div></section>) : <div className="rounded-lg border border-[#E6E6E6] px-4 py-8 text-center text-[14px] text-[#828282]">No results found</div>}{hasMore && <button type="button" onClick={onLoadMore} disabled={loadingMore} className="w-full rounded-lg border border-[#498467] py-3 text-[14px] font-medium text-[#498467] disabled:opacity-50">{loadingMore ? "Loading…" : "Load more products"}</button>}</div>;
}

function ProductSearchRow({ product, onProduct }) {
  const openReviews = () => onProduct(product.id, `/product/${product.id}/reviews`);
  const reputationSnapshot = useReputationSnapshot(product.sellerId);
  return (
    <div className="flex w-full items-center justify-between rounded-lg border border-[#E6E6E6] p-3 text-left">
      <button type="button" onClick={() => onProduct(product.id)} className="min-w-0 flex-1 text-left">
        <ServiceCategoryLabel listing={product} className="block" />
        <div className="truncate text-[14px] font-medium">{product.name}</div>
        <div className="mt-1 text-[12px] text-[#828282]">{product.shop}</div>
        <CompactReputationHeader snapshot={reputationSnapshot} audience="seller" className="mt-1 max-w-full" />
        <DistanceLabel content={product} className="mt-1 block" />
        <div className="mt-1 text-[14px] font-semibold text-[#498467]">{formatListingPrice(product)}</div>
        <TradeBadge listing={product} compact className="mt-1" />
      </button>
      <ReviewSummary product={product} onClick={openReviews} />
    </div>
  );
}

function SellerResultRow({ seller, onClick }) {
  const reputationSnapshot = useReputationSnapshot(seller.id);
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center justify-between rounded-lg border border-[#E6E6E6] p-3 text-left hover:bg-[#F5FFF6]">
      <div className="min-w-0">
        <div className="truncate text-[14px] font-medium">{seller.name}</div>
        <div className="mt-1 truncate text-[12px] text-[#828282]">{seller.location}</div>
        <CompactReputationHeader snapshot={reputationSnapshot} audience="seller" className="mt-1 max-w-full" />
        <DistanceLabel content={seller} className="mt-1 block" />
      </div>
      <span className="ml-3 text-[20px] text-[#498467]">›</span>
    </button>
  );
}

function ResultRow({ title, subtitle, content, onClick }) {
  return <button type="button" onClick={onClick} className="flex w-full items-center justify-between rounded-lg border border-[#E6E6E6] p-3 text-left hover:bg-[#F5FFF6]"><div className="min-w-0"><div className="truncate text-[14px] font-medium">{title}</div>{subtitle && <div className="mt-1 truncate text-[12px] text-[#828282]">{subtitle}</div>}{content && <DistanceLabel content={content} className="mt-1 block" />}</div><span className="ml-3 text-[20px] text-[#498467]">›</span></button>;
}

function History({ products, onProduct }) {
  const navigate = useNavigate();
  const { savedItems } = useSavedItems();
  const { favoriteIds } = useFavorites();
  const savedListings = products.filter((product) => favoriteIds.includes(product.id));
  const savedPosts = savedItems.filter((item) => item.type === "post");
  const savedEvents = savedItems.filter((item) => item.type === "event");
  const hasSavedItems = savedPosts.length || savedEvents.length || savedListings.length;

  return (
    <div className="flex flex-col gap-5 px-4 py-3">
      <HistoryGroup title="Recent Searches">
        <p className="text-[14px] text-[#828282]">No recent searches yet</p>
      </HistoryGroup>
      <HistoryGroup title="Recently Viewed">
        <div className="-mx-4"><CarouselRow title="" products={products.slice(0, 4)} onProductClick={onProduct} /></div>
      </HistoryGroup>
      <HistoryGroup title="Saved Items">
        {!hasSavedItems ? (
          <div className="rounded-lg border border-[#E6E6E6] px-4 py-6 text-center">
            <p className="text-[16px] font-semibold">No saved items yet</p>
            <p className="mt-1 text-[14px] text-[#828282]">Tap the heart icon on posts, events, or listings to save them here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {savedPosts.map((item) => (
              <SavedHistoryCard key={item.id} item={item} onClick={() => navigate("/comments", { state: { content: { type: "post", post: item.post } } })} />
            ))}
            {savedEvents.map((item) => (
              <SavedHistoryCard key={item.id} item={item} onClick={() => navigate(`/event/${item.sourceId}`)} />
            ))}
            {savedListings.map((product) => (
              <SavedHistoryCard key={product.id} item={{ ...product, storeName: product.shop, name: product.name }} onClick={() => onProduct(product.id)} listing />
            ))}
          </div>
        )}
      </HistoryGroup>
    </div>
  );
}

function HistoryGroup({ title, children }) {
  return (
    <section>
      <h2 className="mb-3 text-[18px] font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function SavedHistoryCard({ item, onClick, listing }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full gap-3 rounded-lg border border-[#E6E6E6] p-3 text-left transition-colors hover:bg-[#F5FFF6]">
      <div className="relative shrink-0">
        {item.image ? <img src={item.image} alt="" className="h-16 w-16 rounded-lg object-cover" /> : <div className="h-16 w-16 rounded-lg bg-[#F5FFF6]" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        {listing && <ServiceCategoryLabel listing={item} />}
        {listing && <ServiceCategoryLabel listing={item} />}
        <span className="text-[12px] text-[#828282]">{item.storeName || item.shop}</span>
        <span className="text-[14px] font-semibold">{item.name || item.title}</span>
        <span className="line-clamp-2 text-[12px] leading-[130%] text-[#828282]">{listing ? formatListingPrice(item) : item.description}</span>
      </div>
    </button>
  );
}

const COMMUNITY_TIPS = [
  {
    id: "complete-profile",
    title: "Complete Your Profile",
    description: "Add a profile photo, banner, and description to help buyers trust your shop.",
    cta: "Edit Profile",
    route: "/profile",
    image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&q=80",
  },
  {
    id: "first-product",
    title: "List Your First Product",
    description: "The more listings you create, the easier it is for buyers to discover your shop.",
    cta: "Add Listing",
    route: "/create-listing",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80",
  },
  {
    id: "local-event",
    title: "Create a Local Event",
    description: "Hosting a market, workshop, or pop-up? Create an event and invite your community.",
    cta: "Create Event",
    route: "/create-event",
    image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80",
  },
  {
    id: "first-review",
    title: "Get Your First Review",
    description: "Positive reviews help build trust and improve visibility within Grolo.",
    cta: "Learn More",
    route: "/community-impact",
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80",
  },
  {
    id: "follow-shops",
    title: "Follow Local Shops",
    description: "Stay connected with local makers, creators, and small businesses near you.",
    cta: "Explore Shops",
    route: "/featured",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80",
  },
];

function CommunityTipsCarousel() {
  const navigate = useNavigate();
  const touchStartX = useRef(null);
  const didSwipeRef = useRef(false);
  const pausedRef = useRef(false);
  const [current, setCurrent] = useState(1);
  const slides = [COMMUNITY_TIPS[COMMUNITY_TIPS.length - 1], ...COMMUNITY_TIPS, COMMUNITY_TIPS[0]];

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!pausedRef.current) setCurrent((index) => index + 1);
    }, 5000);
    return () => window.clearInterval(interval);
  }, []);

  const handleTransitionEnd = () => {
    if (current === slides.length - 1) setCurrent(1);
    else if (current === 0) setCurrent(slides.length - 2);
  };

  const handlePointerDown = (event) => {
    pausedRef.current = true;
    didSwipeRef.current = false;
    touchStartX.current = event.clientX;
  };

  const handlePointerUp = (event) => {
    if (touchStartX.current !== null) {
      const distance = event.clientX - touchStartX.current;
      if (Math.abs(distance) > 40) {
        didSwipeRef.current = true;
        setCurrent((index) => index + (distance < 0 ? 1 : -1));
      }
    }
    touchStartX.current = null;
    pausedRef.current = false;
  };

  const openTip = (event, tip) => {
    if (didSwipeRef.current) {
      event.preventDefault();
      didSwipeRef.current = false;
      return;
    }
    navigate(tip.route);
  };

  return (
    <section aria-label="Community Tips" className="px-4 py-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#498467]">Grolo Tips</p>
          <h2 className="mt-0.5 text-[16px] font-semibold tracking-[-0.32px] text-[#1F2D27]">Get the most out of your local community</h2>
        </div>
        <button type="button" onClick={() => navigate("/profile")} className="shrink-0 rounded-full bg-[#498467] px-3.5 py-2 text-[12px] font-semibold text-white shadow-[0_3px_8px_rgba(73,132,103,0.16)] transition-colors hover:bg-[#376B50]">
          Get Started
        </button>
      </div>
      <div className="overflow-hidden rounded-lg touch-pan-y" onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerCancel={() => { touchStartX.current = null; pausedRef.current = false; }}>
        <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${current * 100}%)` }} onTransitionEnd={handleTransitionEnd}>
          {slides.map((tip, index) => (
            <button key={`${tip.id}-${index}`} type="button" onClick={(event) => openTip(event, tip)} className="relative h-[176px] w-full shrink-0 overflow-hidden text-left transition-transform duration-150 active:scale-[0.98] active:brightness-90" aria-label={`${tip.title}: ${tip.cta}`}>
              <img src={tip.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <div className="absolute inset-x-4 bottom-4 pr-4 text-white">
                <p className="text-[16px] font-semibold leading-tight">{tip.title}</p>
                <p className="mt-1 line-clamp-2 text-[11px] leading-[140%] text-white/90">{tip.description}</p>
                <span className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#498467]">{tip.cta}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-center gap-1.5 py-2" aria-label="Community Tips slides">
        {COMMUNITY_TIPS.map((tip, index) => {
          const activeIndex = (current - 1 + COMMUNITY_TIPS.length) % COMMUNITY_TIPS.length;
          return <button key={tip.id} type="button" onClick={() => { pausedRef.current = true; setCurrent(index + 1); window.setTimeout(() => { pausedRef.current = false; }, 350); }} aria-label={`Go to tip ${index + 1}`} aria-current={activeIndex === index ? "true" : undefined} className={`h-1.5 rounded-full transition-all ${activeIndex === index ? "w-4 bg-[#498467]" : "w-1.5 bg-[#C8D8CE]"}`} />;
        })}
      </div>
    </section>
  );
}

function TradingSection({ products: allProducts, navigate, onProduct }) {
  const tradeProducts = allProducts.filter((product) => product.availableForTrade);

  return (
    <section className="py-2">
      <button type="button" onClick={() => navigate("/trading")} className="flex w-full items-center gap-2 px-4 py-2 text-left">
        <span className="text-[16px] font-semibold tracking-[-0.32px]">Trading</span>
        <span aria-hidden="true" className="rounded-full bg-[#F5F5F5] p-0.5">
          <svg width="14" height="14" viewBox="0 0 7 14" fill="none">
            <path
              d="M4.78 7 .79 3.01a.4.4 0 0 1 0-.55l.53-.53a.4.4 0 0 1 .55 0l4.73 4.73a.4.4 0 0 1 0 .55l-4.73 4.73a.4.4 0 0 1-.55 0l-.53-.53a.4.4 0 0 1 0-.55L4.78 7Z"
              fill="black"
            />
          </svg>
        </span>
      </button>
      <div className="flex gap-3 overflow-x-auto px-4 no-scrollbar">
        {tradeProducts.slice(0, 4).map((product) => (
          <button key={product.id} type="button" onClick={() => onProduct(product.id)} className="w-[148px] shrink-0 text-left">
            <img src={product.image} alt={product.name} className="h-[108px] w-[148px] rounded-lg object-cover" />
            <span className="mt-2 block line-clamp-1 text-[14px] font-medium">{product.name}</span>
            <span className="mt-0.5 block line-clamp-1 text-[12px] text-[#828282]">Looking for {product.desiredTradeItems}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

const CATEGORY_ICONS = [
  ["garden|plant|flower", Leaf],
  ["bakery|sweet|bread", Croissant],
  ["craft|art|design|handmade", Palette],
  ["meal|food|catering", Utensils],
  ["service|repair|work", Wrench],
  ["health|wellness", HeartPulse],
  ["home|decor", Home],
  ["clothing|fashion|accessor", Shirt],
  ["vintage|collect|jewel", Gem],
  ["pet|animal", PawPrint],
];

function categoryIconFor(name) {
  const normalizedName = String(name ?? "").toLowerCase();
  return CATEGORY_ICONS.find(([keywords]) => keywords.split("|").some((keyword) => normalizedName.includes(keyword)))?.[1] ?? Grid2X2;
}

function CategoryRow({ categories, onCategory }) {
  return (
    <div className="py-2">
      <div className="flex items-center gap-2 px-4 py-2">
        <span className="text-[16px] font-semibold tracking-[-0.32px]">Categories</span>
      </div>
      <div className="flex gap-5 overflow-x-auto px-4 no-scrollbar">
        {categories.map((category) => {
          const Icon = categoryIconFor(category.name);
          return (
            <button
              key={category.name}
              type="button"
              onClick={() => onCategory?.(`/category/${encodeURIComponent(category.name)}`)}
              className="flex w-[76px] shrink-0 flex-col items-center gap-2"
            >
              <span className="flex h-[76px] w-[76px] items-center justify-center rounded-full border border-[#DCEBE0] bg-[#F1F8F2] text-[#498467] shadow-[0_3px_10px_rgba(73,132,103,0.08)]">
                <Icon aria-hidden="true" className="h-8 w-8" strokeWidth={1.6} />
              </span>
              <span className="w-full truncate text-center text-[13px] font-medium">{category.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MyOrders() {
  const navigate = useNavigate();
  const { hasReviewedProduct } = useReviews();
  const { buyerOrders } = useOrders();
  const { listings } = useListings();
  const orders = buyerOrders();

  return (
    <div className="py-2">
      {ORDER_SECTIONS.map((section) => {
        const sectionOrders = orders.filter((o) => (
          section.statuses.includes(o.status)
          && (!section.fulfillmentMethod || (o.fulfillmentMethod ?? "pickup") === section.fulfillmentMethod)
        ));

        return (
          <div key={section.title} className="py-2">
            <div className="flex items-center gap-2 px-4 py-2">
              <span className="text-[16px] font-semibold tracking-[-0.32px]">
                {section.title}
              </span>
            </div>

            {sectionOrders.length === 0 ? (
              <div className="px-4 py-3 text-[14px] text-[#828282]">
                No orders here yet
              </div>
            ) : (
              <div className="flex flex-col gap-3 px-4">
                {sectionOrders.map((order) => {
                  // Listings live in ListingContext (created per seller), not the
                  // static mockData catalog. Fall back instead of hiding the order.
                  const product = listings.find((p) => p.id === order.productId)
                    ?? { id: order.productId, name: "Listing unavailable", image: "" };
                  const completed = order.status === "Completed";
                  const cancelled = order.status === "Cancelled";
                  const reviewed = hasReviewedProduct(order.productId);

                  const orderRouteId = order.id.replace(/^ORD-/, "");
                  const openOrderDetails = () => {
                    const route = `/orders/${orderRouteId}`;
                    navigate(route);
                  };

                  return (
                    <div
                      key={order.id}
                      onClick={openOrderDetails}
                      onKeyDown={(event) => {
                        if (
                          event.target === event.currentTarget &&
                          (event.key === "Enter" || event.key === " ")
                        ) {
                          openOrderDetails();
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className="rounded-lg border border-[#E6E6E6] p-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-3 w-full text-left">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-16 h-16 rounded-lg object-cover shrink-0"
                        />
                        <div className="flex-1">
                          <div className="text-[14px] font-medium">
                            {product.name}
                          </div>
                          <div className="text-[12px] text-[#828282]">
                            {product.shop}
                          </div>
                          <div className="text-[12px] text-[#828282]">
                            {order.date}
                          </div>
                        </div>
                        <span
                          className={`text-[12px] font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                            cancelled
                              ? "bg-[#FFF1F0] text-[#B42318]"
                              : completed
                                ? "bg-[#CFF7D3] text-[#02542D]"
                                : "bg-[#F5F5F5] text-[#828282]"
                          }`}
                        >
                          {cancelled ? "❌ Cancelled" : order.status}
                        </span>
                      </div>

                      {completed && !reviewed && (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/leave-review/${product.id}`);
                          }}
                          className="w-full mt-3 bg-[#498467] text-white py-2.5 rounded-lg text-[14px] font-medium"
                        >
                          Leave Review
                        </button>
                      )}
                      {completed && reviewed && (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/product/${product.id}/reviews`);
                          }}
                          className="w-full mt-3 border border-[#498467] text-[#498467] py-2.5 rounded-lg text-[14px] font-medium"
                        >
                          View Your Review
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
