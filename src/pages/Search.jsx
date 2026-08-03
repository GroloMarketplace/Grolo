import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import CarouselRow from "../components/CarouselRow";
import MobileScreenLayout from "../components/MobileScreenLayout";
import {
  categories,
  featuredCommunitySpotlights,
  products,
  sellers,
} from "../data/mockData";
import PromotionBadge from "../components/PromotionBadge";
import { useFavorites } from "../hooks/useFavorites";
import { useSavedItems } from "../context/SavedContext";
import { useReviews } from "../context/ReviewContext";
import { useOrders } from "../context/OrderContext";
import { useAdvertising } from "../context/AdvertisingContext";
import MapView from "../components/MapView";

const TABS = ["Local", "Map", "History", "My Orders"];

const ORDER_SECTIONS = [
  { title: "Active Orders", statuses: ["Order Placed", "Preparing"] },
  { title: "Ready for Pickup", statuses: ["Ready for Pickup"] },
  { title: "Completed Orders", statuses: ["Completed", "Cancelled"] },
];

export default function Search() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("Local");

  return (
    <MobileScreenLayout>
      <div className="sticky top-0 bg-white z-10 flex items-center justify-center gap-8 px-4 py-2.5 border-b border-black/5 relative">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-[14px] font-semibold tracking-[-0.28px] relative ${
              tab === t ? "text-[#498467]" : "text-black/40"
            }`}
          >
            {t}
            {tab === t && <div className="absolute -bottom-2.5 left-0 right-0 h-0.5 bg-[#498467]" />}
          </button>
        ))}
      </div>

      <div className="overflow-y-auto flex-1 no-scrollbar">
        <div className="bg-white py-3 border-b border-black/5">
          <SearchBar />
        </div>

        {tab === "Local" && (
          <>
            <CommunitySpotlightCarousel />
            <CategoryRow />
            <CarouselRow
              title="Featured"
              products={products}
              onSeeAll={() => navigate("/featured")}
            />
            <TradingSection products={products} navigate={navigate} />
          </>
        )}

        {tab === "Map" && <MapView />}

        {tab === "History" && <History />}

        {tab === "My Orders" && <MyOrders />}
      </div>
    </MobileScreenLayout>
  );
}

function History() {
  const navigate = useNavigate();
  const { savedItems } = useSavedItems();
  const { favoriteIds } = useFavorites();
  const savedListings = products.filter((product) => favoriteIds.includes(product.id));
  const savedPosts = savedItems.filter((item) => item.type === "post");
  const savedEvents = savedItems.filter((item) => item.type === "event");
  const savedPromotions = savedItems.filter((item) => item.type === "promotion");
  const hasSavedItems = savedPosts.length || savedEvents.length || savedPromotions.length || savedListings.length;

  return (
    <div className="flex flex-col gap-5 px-4 py-3">
      <HistoryGroup title="Recent Searches">
        <p className="text-[14px] text-[#828282]">No recent searches yet</p>
      </HistoryGroup>
      <HistoryGroup title="Recently Viewed">
        <div className="-mx-4"><CarouselRow title="" products={products.slice(0, 4)} /></div>
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
              <SavedHistoryCard key={product.id} item={{ ...product, storeName: product.shop, name: product.name }} onClick={() => navigate(`/product/${product.id}`)} listing />
            ))}
            {savedPromotions.map((item) => (
              <SavedHistoryCard key={item.id} item={item} onClick={() => item.productId && navigate(`/product/${item.productId}`)} promotion />
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

function SavedHistoryCard({ item, onClick, listing, promotion }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full gap-3 rounded-lg border border-[#E6E6E6] p-3 text-left transition-colors hover:bg-[#F5FFF6]">
      <div className="relative shrink-0">
        {item.image ? <img src={item.image} alt="" className="h-16 w-16 rounded-lg object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#F5FFF6] text-[11px] font-medium text-[#498467]">Promotion</div>}
        {promotion && <PromotionBadge promotion={item.promotion} className="absolute left-1 top-1" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <span className="text-[12px] text-[#828282]">{item.storeName || item.shop}</span>
        <span className="text-[14px] font-semibold">{item.name || item.title}</span>
        <span className="line-clamp-2 text-[12px] leading-[130%] text-[#828282]">{listing ? `$${item.price.toFixed(2)}` : item.description}</span>
      </div>
    </button>
  );
}

function CommunitySpotlightCarousel() {
  const navigate = useNavigate();
  const { ads } = useAdvertising();
  const touchStartX = useRef(null);
  const didSwipeRef = useRef(false);
  const pausedRef = useRef(false);
  const [current, setCurrent] = useState(1);
  const paidSpotlights = ads
    .filter((ad) => ad.status === "Trial" || ad.status === "Active")
    .map((ad) => ({
      id: ad.id,
      type: ad.type === "Event" ? "event" : ad.type === "Store" ? "store" : "product",
      adType: ad.type,
      destinationType: ad.destinationType,
      badge: "Sponsored",
      title: ad.title,
      description: ad.description,
      sellerId: ad.sellerId,
      productId: ad.type === "Product" || ad.type === "Promotion" ? ad.destinationId : undefined,
      eventId: ad.type === "Event" ? ad.destinationId : undefined,
      destinationId: ad.destinationId,
      destinationRoute: ad.destinationRoute,
      image: ad.image,
    }));
  const organicSpotlights = featuredCommunitySpotlights.map((spotlight) => {
    const destinationId = spotlight.type === "event" ? spotlight.eventId : spotlight.type === "product" ? spotlight.productId : spotlight.sellerId;
    const destinationType = spotlight.type === "event" ? "Event detail page" : spotlight.type === "product" ? "Product listing" : "Store profile";
    const destinationRoute = spotlight.type === "event" ? `/event/${destinationId}` : spotlight.type === "product" ? `/listing/${destinationId}` : `/seller/${destinationId}`;
    return { ...spotlight, adType: spotlight.type, destinationId, destinationType, destinationRoute };
  });
  const spotlights = [...paidSpotlights, ...organicSpotlights].slice(0, 10);
  const slides = [spotlights[spotlights.length - 1], ...spotlights, spotlights[0]];

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!pausedRef.current) setCurrent((index) => index + 1);
    }, 5000);

    return () => window.clearInterval(interval);
  }, []);

  const openSpotlight = (spotlight) => {
    if (spotlight.destinationRoute) {
      navigate(spotlight.destinationRoute);
    } else if (spotlight.type === "event") {
      navigate(`/event/${spotlight.eventId}`);
    } else if (spotlight.type === "product") {
      navigate(`/listing/${spotlight.productId}`);
    } else {
      navigate(`/seller/${spotlight.sellerId}`);
    }
  };

  const handleTransitionEnd = () => {
    if (current === slides.length - 1) {
      setCurrent(1);
    } else if (current === 0) {
      setCurrent(slides.length - 2);
    }
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

  const handleSpotlightClick = (event, spotlight) => {
    if (didSwipeRef.current) {
      event.preventDefault();
      didSwipeRef.current = false;
      return;
    }
    openSpotlight(spotlight);
  };

  return (
    <section aria-label="Featured Community Spotlight" className="px-4 pt-3">
      <h2 className="mb-2 text-[16px] font-semibold tracking-[-0.32px]">Community Spotlight</h2>
      <div
        className="overflow-hidden rounded-lg touch-pan-y"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          touchStartX.current = null;
          pausedRef.current = false;
        }}
      >
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
          onTransitionEnd={handleTransitionEnd}
        >
          {slides.map((spotlight, index) => {
            const seller = sellers[spotlight.sellerId];
            return (
              <button
                key={`${spotlight.id}-${index}`}
                type="button"
                onClick={(event) => handleSpotlightClick(event, spotlight)}
                className="relative h-[136px] w-full shrink-0 overflow-hidden text-left transition-transform duration-150 active:scale-[0.98] active:brightness-90"
                aria-label={`${spotlight.title} by ${seller.name}`}
              >
                <img src={spotlight.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                <span aria-hidden="true" className="absolute bottom-2 right-3 text-[20px] font-light leading-none text-white/75">›</span>
                <div className="absolute inset-x-3 bottom-2.5 pr-6 text-white">
                  <div className="mb-1 flex items-center gap-2">
                    <img src={seller.avatar} alt="" className="h-6 w-6 rounded-full border border-white/80 object-cover" />
                    <span className="text-[11px] font-medium text-white/90">{seller.name}</span>
                    <span className="rounded-full bg-[#498467] px-2 py-0.5 text-[10px] font-semibold">{spotlight.badge}</span>
                  </div>
                  <p className="text-[16px] font-semibold leading-tight">{spotlight.title}</p>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-white/85">{spotlight.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex justify-center gap-1.5 py-2" aria-label="Spotlight slides">
        {spotlights.map((spotlight, index) => {
          const activeIndex = (current - 1 + spotlights.length) % spotlights.length;
          return (
            <button
              key={spotlight.id}
              type="button"
              onClick={() => {
                pausedRef.current = true;
                setCurrent(index + 1);
                window.setTimeout(() => {
                  pausedRef.current = false;
                }, 350);
              }}
              aria-label={`Go to spotlight ${index + 1}`}
              aria-current={activeIndex === index ? "true" : undefined}
              className={`h-1.5 rounded-full transition-all ${activeIndex === index ? "w-4 bg-[#498467]" : "w-1.5 bg-[#C8D8CE]"}`}
            />
          );
        })}
      </div>
    </section>
  );
}

function TradingSection({ products: allProducts, navigate }) {
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
          <button key={product.id} type="button" onClick={() => navigate("/trading")} className="w-[148px] shrink-0 text-left">
            <img src={product.image} alt={product.name} className="h-[108px] w-[148px] rounded-lg object-cover" />
            <span className="mt-2 block line-clamp-1 text-[14px] font-medium">{product.name}</span>
            <span className="mt-0.5 block line-clamp-1 text-[12px] text-[#828282]">Looking for {product.desiredTradeItems}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function CategoryRow() {
  const navigate = useNavigate();

  return (
    <div className="py-2">
      <div className="flex items-center gap-2 px-4 py-2">
        <span className="text-[16px] font-semibold tracking-[-0.32px]">
          Categories
        </span>
      </div>
      <div className="flex gap-6 px-4 overflow-x-auto no-scrollbar">
        {categories.map((category) => (
          <button
            key={category.name}
            type="button"
            onClick={() => navigate(`/category/${encodeURIComponent(category.name)}`)}
            className="flex flex-col items-center gap-2 shrink-0"
          >
            <img
              src={category.image}
              alt={category.name}
              className="w-[76px] h-[76px] rounded-full object-cover"
            />
            <span className="text-[14px] font-medium">{category.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MyOrders() {
  const navigate = useNavigate();
  const { hasReviewedProduct } = useReviews();
  const { buyerOrders } = useOrders();

  return (
    <div className="py-2">
      {ORDER_SECTIONS.map((section) => {
        const sectionOrders = buyerOrders().filter((o) =>
          section.statuses.includes(o.status),
        );

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
                  const product = products.find((p) => p.id === order.productId);
                  if (!product) return null;
                  const completed = order.status === "Completed";
                  const reviewed = hasReviewedProduct(order.productId);

                  return (
                    <div
                      key={order.id}
                      className="rounded-lg border border-[#E6E6E6] p-3"
                    >
                      <button
                        onClick={() => navigate(`/product/${product.id}`)}
                        className="flex items-center gap-3 w-full text-left"
                      >
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
                            completed
                              ? "bg-[#CFF7D3] text-[#02542D]"
                              : "bg-[#F5F5F5] text-[#828282]"
                          }`}
                        >
                          {order.status}
                        </span>
                      </button>

                      {completed && !reviewed && (
                        <button
                          onClick={() => navigate(`/leave-review/${product.id}`)}
                          className="w-full mt-3 bg-[#498467] text-white py-2.5 rounded-lg text-[14px] font-medium"
                        >
                          Leave Review
                        </button>
                      )}
                      {completed && reviewed && (
                        <button
                          onClick={() =>
                            navigate(`/product/${product.id}/reviews`)
                          }
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
