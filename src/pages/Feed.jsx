import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MobileScreenLayout from "../components/MobileScreenLayout";
import Header from "../components/Header";
import CommunityImpactCard from "../components/CommunityImpactCard";
import PromotionBadge from "../components/PromotionBadge";
import ContentActionSheet from "../components/ContentActionSheet";
import ShareSheet from "../components/ShareSheet";
import { promotionUrgencyLabel, usePromotions } from "../context/PromotionContext";
import { useAdvertising } from "../context/AdvertisingContext";
import { useSavedItems } from "../context/SavedContext";
import { useRegrow } from "../context/RegrowContext";
import { useEngagement } from "../context/EngagementContext";
import {
  followingPosts,
  products,
  currentUser,
  notificationsHighlights,
  notificationsFollowers,
  sellers,
} from "../data/mockData";
import { useFollow } from "../context/FollowContext";
import { useAuth } from "../context/AuthContext";
import { useOrders } from "../context/OrderContext";
import {
  eventStatus,
  formatEventDate,
  formatEventTime,
  useEvents,
} from "../context/EventContext";
import { displayPostClassification } from "../data/postClassifications";
import { formatListingPrice } from "../utils/listingDisplay";
import ServiceCategoryLabel from "../components/ServiceCategoryLabel";
import OutlineIcon from "../components/OutlineIcon";
import FoundingMemberBadge from "../components/FoundingMemberBadge";
import ReviewSummary from "../components/ReviewSummary";
import { EventAttendanceCount } from "../components/EventRsvp";
import { readNavigationState, writeNavigationState } from "../hooks/navigationState";
import { toggleCommentLike as persistCommentLike } from "../lib/api/commentLikes";
import { useSellerSettings } from "../context/SellerSettingsContext";
import { useListings } from "../context/ListingContext";
import { usePosts } from "../context/PostContext";
import { useBuyerSettings } from "../context/BuyerSettingsContext";
import { discoveryRadiusLabel, isWithinDiscoveryRadius, resolveUserLocation, sortByDistance } from "../utils/locationRadius";
import DistanceLabel from "../components/DistanceLabel";

const TABS = ["Following", "Your Community"];
const COMMUNITY_FILTERS = ["For You", "Posts", "Events", "Listings", "Promotions", "Regrows"];

function imageReferenceMatches(first, second) {
  if (!first || !second) return true;
  return first.split("?")[0] === second.split("?")[0];
}

// Promotions don't carry their own location, so resolve one from a linked
// listing (falling back to the promotion itself) for radius filtering/sorting.
function promotionLocationContent(promotion, listings) {
  const product = listings.find((item) => promotion.productIds?.includes(item.id));
  return {
    ...promotion,
    location: promotion.location ?? product?.location,
    latitude: promotion.latitude ?? product?.latitude,
    longitude: promotion.longitude ?? product?.longitude,
  };
}

export default function Feed() {
  const location = useLocation();
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);
  const mainTabContentRef = useRef(null);
  const savedFeedState = readNavigationState("feed", { tab: "Your Community", communityFilter: "For You", scrollTop: 0 });
  const initialTabRef = useRef(TABS.includes(location.state?.tab) ? location.state.tab : savedFeedState.tab);
  const communityFilterRef = useRef(COMMUNITY_FILTERS.includes(location.state?.communityFilter)
    ? location.state.communityFilter
    : COMMUNITY_FILTERS.includes(savedFeedState.communityFilter)
      ? savedFeedState.communityFilter
      : "For You");
  const [tab, setTab] = useState(initialTabRef.current);
  const [communityFilter, setCommunityFilter] = useState(communityFilterRef.current);
  const [actionContent, setActionContent] = useState(null);
  const [shareContent, setShareContent] = useState(null);
  const [hiddenContentIds, setHiddenContentIds] = useState(() => new Set());
  const [feedToast, setFeedToast] = useState("");
  const [refreshDistance, setRefreshDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedVersion, setFeedVersion] = useState(0);
  const touchStartRef = useRef(null);
  const [notificationsRead, setNotificationsRead] = useState(() => localStorage.getItem("grolo-notifications-read") === "true");
  const { followedSellers } = useFollow();
  const { settings: buyerSettings = {} } = useBuyerSettings();
  const { orderNotifications } = useOrders();
  const unreadNotifications = notificationsRead ? 0 : notificationsHighlights.length + notificationsFollowers.length + orderNotifications.length;

  useEffect(() => {
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = savedFeedState.scrollTop;
    const initialIndex = TABS.indexOf(initialTabRef.current);
    if (initialIndex > 0 && mainTabContentRef.current) mainTabContentRef.current.scrollLeft = initialIndex * mainTabContentRef.current.clientWidth;
    const scrollElement = scrollContainerRef.current;
    const saveState = () => writeNavigationState("feed", { tab: initialTabRef.current, communityFilter: communityFilterRef.current, scrollTop: scrollElement?.scrollTop ?? 0 });
    scrollElement?.addEventListener("scroll", saveState, { passive: true });
    return () => {
      saveState();
      scrollElement?.removeEventListener("scroll", saveState);
    };
  }, []);

  const saveFeedNavigationState = () => {
    writeNavigationState("feed", {
      tab: initialTabRef.current,
      communityFilter: communityFilterRef.current,
      scrollTop: scrollContainerRef.current?.scrollTop ?? 0,
    });
  };

  const openFeedDetail = (path, state = {}) => {
    saveFeedNavigationState();
    navigate(path, {
      state: {
        ...state,
        feedOrigin: {
          tab: initialTabRef.current,
          communityFilter: communityFilterRef.current,
        },
      },
    });
  };

  const openComments = (content) => {
    sessionStorage.setItem(
      "grolo-feed-scroll-top",
      String(scrollContainerRef.current?.scrollTop ?? 0),
    );
    navigate("/comments", { state: { content } });
  };

  const handleCommunityFilterChange = (nextFilter) => {
    if (!COMMUNITY_FILTERS.includes(nextFilter)) return;
    communityFilterRef.current = nextFilter;
    setCommunityFilter(nextFilter);
    saveFeedNavigationState();
  };

  const handleTabChange = (nextTab) => {
    const nextIndex = TABS.indexOf(nextTab);
    setTab(nextTab);
    initialTabRef.current = nextTab;
    writeNavigationState("feed", { tab: nextTab, communityFilter: communityFilterRef.current, scrollTop: scrollContainerRef.current?.scrollTop ?? 0 });
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    mainTabContentRef.current?.scrollTo({
      left: nextIndex * mainTabContentRef.current.clientWidth,
      behavior: "smooth",
    });
  };

  const handleMainTabScroll = (event) => {
    const index = Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth);
    if (index >= 0 && index < TABS.length && TABS[index] !== tab) {
      setTab(TABS[index]);
      initialTabRef.current = TABS[index];
      writeNavigationState("feed", { tab: TABS[index], communityFilter: communityFilterRef.current, scrollTop: scrollContainerRef.current?.scrollTop ?? 0 });
    }
  };

  const showFeedToast = (message) => {
    setFeedToast(message);
    window.setTimeout(() => setFeedToast(""), 2200);
  };

  const hideContent = (contentId) => {
    setHiddenContentIds((current) => new Set([...current, contentId]));
  };

  const openShare = (content, onComplete) => setShareContent({ content, onComplete });

  const refreshFeed = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshDistance(56);
    setFeedVersion((version) => version + 1);
    window.setTimeout(() => {
      setIsRefreshing(false);
      setRefreshDistance(0);
    }, 900);
  };

  const handleTouchStart = (event) => {
    if (scrollContainerRef.current?.scrollTop === 0 && !isRefreshing) {
      touchStartRef.current = event.touches[0].clientY;
    }
  };

  const handleTouchMove = (event) => {
    if (touchStartRef.current === null || isRefreshing || scrollContainerRef.current?.scrollTop !== 0) return;
    const distance = event.touches[0].clientY - touchStartRef.current;
    if (distance > 0) {
      setRefreshDistance(Math.min(distance * 0.55, 72));
      if (distance > 4) event.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    if (touchStartRef.current === null) return;
    if (refreshDistance >= 48) refreshFeed();
    else setRefreshDistance(0);
    touchStartRef.current = null;
  };

  return (
    <MobileScreenLayout>
      <div className="sticky top-0 bg-white z-10 flex items-center justify-center gap-8 px-4 py-2.5 border-b border-black/5 relative">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={`text-[14px] font-semibold tracking-[-0.28px] relative ${
              tab === t ? "text-[#498467]" : "text-black/40"
            }`}
          >
            {t}
            {tab === t && <div className="absolute -bottom-2.5 left-0 right-0 h-0.5 bg-[#498467]" />}
          </button>
        ))}
        <button type="button" onClick={() => { setNotificationsRead(true); localStorage.setItem("grolo-notifications-read", "true"); navigate("/notifications", { state: { fromTab: tab } }); }} aria-label="Notifications" className="absolute right-4 p-1">
          <span className={`relative block ${unreadNotifications > 0 ? "animate-pulse" : ""}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 21V11m0 0C8 11 5 8.5 5 4c4.5 0 7 2.5 7 7Zm0 2c0-5 3-8 8-8 0 4.5-3 8-8 8Z" stroke="#498467" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {unreadNotifications > 0 && <span className="absolute -right-1 -top-1 flex h-2 min-w-2 items-center justify-center rounded-full bg-[#498467] px-0.5 text-[8px] font-bold text-white">{unreadNotifications > 9 ? "9+" : unreadNotifications}</span>}
          </span>
        </button>
      </div>

      <div
        ref={scrollContainerRef}
        className="overflow-y-auto flex-1 no-scrollbar"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {(refreshDistance > 0 || isRefreshing) && (
          <div
            className="flex items-center justify-center overflow-hidden text-[#498467] transition-[height] duration-150"
            style={{ height: `${isRefreshing ? 56 : refreshDistance}px` }}
          >
            <div className="flex flex-col items-center gap-1 text-[12px] font-medium">
              <span className={isRefreshing ? "animate-spin text-[#498467]" : "text-[#498467]"}><OutlineIcon name="sprout" size={20} /></span>
              <span>{isRefreshing ? "Loading fresh local content..." : "Pull to refresh"}</span>
            </div>
          </div>
        )}
        <div className="w-full max-w-full overflow-hidden">
          <div
            ref={mainTabContentRef}
            onScroll={handleMainTabScroll}
            className="flex w-full max-w-full snap-x snap-mandatory overflow-x-auto no-scrollbar"
          >
            <div className="box-border w-full min-w-full max-w-full shrink-0 snap-start">
              <FollowingFeed
                key={`following-${feedVersion}`}
                followedSellers={followedSellers}
                location={resolveUserLocation(buyerSettings)}
                radius={buyerSettings.locationRadius ?? 25}
                hiddenContentIds={hiddenContentIds}
                onComment={openComments}
                onMenu={setActionContent}
                onShare={openShare}
              />
            </div>
            <div className="box-border w-full min-w-full max-w-full shrink-0 snap-start">
              <CommunityFeed
                key={`community-${feedVersion}`}
                filter={communityFilter}
                onFilterChange={handleCommunityFilterChange}
                onOpenDetail={openFeedDetail}
                onComment={openComments}
                onMenu={setActionContent}
                onShare={openShare}
                location={resolveUserLocation(buyerSettings)}
                radius={buyerSettings.locationRadius ?? 25}
                hiddenContentIds={hiddenContentIds}
              />
            </div>

          </div>
        </div>
      </div>
      {actionContent && (
        <ContentActionSheet
          content={actionContent}
          onClose={() => setActionContent(null)}
          onHide={hideContent}
          onToast={showFeedToast}
        />
      )}
      {shareContent && (
        <ShareSheet
          content={shareContent.content}
          onClose={() => setShareContent(null)}
          onSuccess={(message) => {
            shareContent.onComplete?.();
            showFeedToast(message);
          }}
        />
      )}
      {feedToast && <div className="pointer-events-none absolute bottom-20 left-1/2 z-[90] -translate-x-1/2 rounded-full bg-[#498467] px-4 py-2 text-[13px] font-medium text-white shadow-lg">{feedToast}</div>}
    </MobileScreenLayout>
  );
}

function FollowingFeed({ followedSellers, location, radius, hiddenContentIds, onComment, onMenu, onShare }) {
  const { upcomingEvents } = useEvents();
  const { listings } = useListings();
  const { posts } = usePosts();
  const { activePromotions } = usePromotions();
  const events = upcomingEvents().filter((event) => followedSellers.includes(event.sellerId) && isWithinDiscoveryRadius(event, location, radius));
  const followedPosts = [...followingPosts, ...posts].filter((post) => followedSellers.includes(post.sellerId) && isWithinDiscoveryRadius(post, location, radius));
  const followedListings = listings.filter((product) => followedSellers.includes(product.sellerId) && isWithinDiscoveryRadius(product, location, radius));
  const listingsForPromotions = listings;
  const postsForItems = followedPosts;
  const listingsForItems = followedListings;
  const promotions = activePromotions().filter((promotion) => followedSellers.includes(promotion.sellerId) && isWithinDiscoveryRadius(promotionLocationContent(promotion, listings), location, radius));
  const items = getFollowedItems({ posts: postsForItems, events, listings: listingsForItems, promotions, allListings: listingsForPromotions, hiddenContentIds, location });

  return (
    <div className="flex flex-col gap-8 px-4 py-6">
      {items.length === 0 ? (
        <div className="text-center py-12"><p className="text-[14px] text-[#828282]">{followedSellers.length === 0 ? "Follow stores to see their posts here" : "No content from followed stores yet"}</p></div>
      ) : (
        items.map((item) => renderCommunityItem(item, null, onComment, onMenu, onShare))
      )}
    </div>
  );
}

function getFollowedItems({ posts, events, listings, promotions, allListings, hiddenContentIds, location }) {
  const items = [
    ...posts.map((post) => ({ type: "post", id: `post:${post.id}`, post })),
    ...events.map((event) => ({ type: "event", id: `event:${event.id}`, event })),
    ...listings.map((product) => ({ type: "listing", id: `listing:${product.id}`, product })),
    ...promotions.map((promotion) => ({ type: "promotion", id: `promotion:${promotion.id}`, promotion, product: allListings.find((product) => promotion.productIds?.includes(product.id)) })),
  ];
  const visible = items.filter((item) => !hiddenContentIds.has(item.id));
  // Closer content first; ties (or unknown distance) fall back to newest first.
  return sortByDistance(visible, location, feedItemContent, (a, b) => contentTimestamp(b) - contentTimestamp(a));
}

function feedItemContent(item) {
  return item.post ?? item.event ?? item.product ?? item.promotion ?? {};
}

function CommunityFeed({ filter, onFilterChange, onOpenDetail, onComment, onMenu, onShare, location, radius, hiddenContentIds }) {
  const { upcomingEvents } = useEvents();
  const { listings } = useListings();
  const { posts } = usePosts();
  const { activePromotions } = usePromotions();
  const { isRegrown } = useRegrow();
  const [touchStart, setTouchStart] = useState(null);
  const events = upcomingEvents().filter((event) => isWithinDiscoveryRadius(event, location, radius));
  const nearbyListings = listings.filter((listing) => isWithinDiscoveryRadius(listing, location, radius));
  const nearbyPosts = posts.filter((post) => isWithinDiscoveryRadius(post, location, radius));
  const currentPromotions = activePromotions().filter((promotion) => isWithinDiscoveryRadius(promotionLocationContent(promotion, listings), location, radius));
  const items = getCommunityItems(filter, { events, listings: nearbyListings, posts: nearbyPosts, currentPromotions, isRegrown, hiddenContentIds, location });

  const changeFilter = (nextFilter) => onFilterChange(nextFilter);
  const handlePointerEnd = (event) => {
    if (touchStart === null) return;
    const distance = event.clientX - touchStart;
    const currentIndex = COMMUNITY_FILTERS.indexOf(filter);
    if (Math.abs(distance) > 40) {
      const nextIndex = distance < 0 ? Math.min(currentIndex + 1, COMMUNITY_FILTERS.length - 1) : Math.max(currentIndex - 1, 0);
      onFilterChange(COMMUNITY_FILTERS[nextIndex]);
    }
    setTouchStart(null);
  };

  return (
    <div className="flex flex-col">
      <div
        className="sticky top-0 z-20 flex touch-pan-x gap-6 overflow-x-auto border-b border-black/5 bg-white px-4 py-2 no-scrollbar"
        onPointerDown={(event) => {
          event.stopPropagation();
          setTouchStart(event.clientX);
        }}
        onPointerUp={(event) => {
          event.stopPropagation();
          handlePointerEnd(event);
        }}
        onPointerCancel={(event) => {
          event.stopPropagation();
          setTouchStart(null);
        }}
      >
        {COMMUNITY_FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => changeFilter(item)}
            className={`relative shrink-0 py-1 text-[14px] font-semibold ${filter === item ? "text-[#498467]" : "text-black/40"}`}
          >
            {item}
            {filter === item && <span className="absolute -bottom-2 left-0 right-0 h-0.5 bg-[#498467]" />}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-4 px-4 py-3">
        <p className="text-[12px] text-[#828282]">Showing results within {discoveryRadiusLabel(radius)}</p>
        <CommunityImpactCard />
        {items.map((item) => renderCommunityItem(item, onOpenDetail, onComment, onMenu, onShare))}
      </div>
    </div>
  );
}

function getCommunityItems(filter, { events, listings, posts, currentPromotions, isRegrown, hiddenContentIds, location }) {
  const listingItems = listings.map((product) => ({ type: "listing", id: `listing:${product.id}`, product }));
  const postItems = posts.map((post) => ({ type: "post", id: `post:${post.id}`, post }));
  const eventItems = events.map((event) => ({ type: "event", id: `event:${event.id}`, event }));
  const promotionItems = currentPromotions.map((promotion) => ({
    type: "promotion",
    id: `promotion:${promotion.id}`,
    promotion,
    product: listings.find((product) => promotion.productIds?.includes(product.id)),
  }));
  const allItems = [...postItems, ...eventItems, ...listingItems, ...promotionItems];
  const visibleItems = allItems.filter((item) => !hiddenContentIds.has(item.id));
  const filtered = filter === "For You"
    ? visibleItems
    : filter === "Regrows"
      ? visibleItems.filter((item) => isRegrown(item.id))
      : visibleItems.filter((item) => item.type === filter.slice(0, -1).toLowerCase());

  // Closer content first; ties (or unknown distance) fall back to newest first.
  return sortByDistance(filtered, location, feedItemContent, (a, b) => contentTimestamp(b) - contentTimestamp(a));
}

function contentTimestamp(item) {
  return item.post?.createdAt ?? item.event?.createdAt ?? item.product?.createdAt ?? item.promotion?.createdAt ?? 0;
}


function renderCommunityItem(item, onOpenDetail, onComment, onMenu, onShare) {
  if (item.type === "post") return <Post key={item.id} post={item.post} stacked onOpenDetail={onOpenDetail} onComment={onComment} onMenu={onMenu} onShare={onShare} />;
  if (item.type === "event") return <EventPost key={item.id} event={item.event} onOpenDetail={onOpenDetail} onComment={onComment} onMenu={onMenu} onShare={onShare} />;
  if (item.type === "listing") return <ListingFeedCard key={item.id} product={item.product} onOpenDetail={onOpenDetail} onMenu={onMenu} onShare={onShare} />;
  return <PromotionFeedCard key={item.id} promotion={item.promotion} product={item.product} onOpenDetail={onOpenDetail} onMenu={onMenu} onShare={onShare} />;
}

function ListingFeedCard({ product, onOpenDetail, onMenu, onShare }) {
  const navigate = useNavigate();
  const { ads } = useAdvertising();
  const openDetail = onOpenDetail ?? ((path, state) => navigate(path, { state }));
  const seller = sellers[product.sellerId];
  const paidAd = ads.find((ad) =>
    (ad.status === "Active" || ad.paid === true)
      && ad.destinationId === product.id
      && (ad.type === "Product" || ad.type === "Promotion"),
  );
  const savedItem = { id: `listing:${product.id}`, type: "listing", sourceId: product.id, name: product.name, storeName: product.shop, image: product.image, description: product.name };
  const menuContent = { id: `listing:${product.id}`, type: "listing", title: product.name, name: product.name, sellerId: product.sellerId, productId: product.id, sharePath: `/product/${product.id}`, savedItem };
  const openProduct = () => {
    console.info("Home Feed listing clicked", { listingId: product.id, storeId: product.sellerId });
    openDetail(`/product/${product.id}`, { sellerId: product.sellerId });
  };
  const openReviews = () => openDetail(`/product/${product.id}/reviews`, { sellerId: product.sellerId });
  const openStore = (event) => {
    event.stopPropagation();
    navigate(`/seller/${product.sellerId}`);
  };
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openProduct}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") openProduct();
      }}
      className="cursor-pointer rounded-lg border border-[#E6E6E6] p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <button type="button" onClick={openStore} className="flex min-w-0 items-center gap-2 text-left">
            <img src={seller?.avatar ?? product.image} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
            <span className="truncate text-[14px] font-semibold text-[#498467]">{seller?.name ?? product.shop}</span>
          </button>
          <FoundingMemberBadge sellerId={product.sellerId} iconOnly />
        </div>
        <MoreButton onClick={() => onMenu(menuContent)} />
      </div>
      <DistanceLabel content={product} className="mt-1" />
      <p className="text-[12px] text-[#828282]">{product.postedAt ?? "Recently posted"}</p>
      <ServiceCategoryLabel listing={product} className="mt-1 block" />
      <VacationBadge sellerId={product.sellerId} />
      <button type="button" onClick={openProduct} className="relative mt-3 block w-full text-left">
        <img src={product.image} alt={product.name} className="aspect-square w-full rounded object-cover" />
        {paidAd && <span className="absolute right-2 top-2 rounded-full bg-[#CFF7D3] px-2 py-1 text-[12px] font-medium text-[#02542D] shadow-sm">{paidAd.badgeLabel ?? paidAd.label ?? paidAd.placementLabel ?? "Featured"}</span>}
      </button>
      <button type="button" onClick={openProduct} className="mt-2 block text-left">
        <h3 className="text-[16px] font-semibold">{product.name}</h3>
        <p className="text-[14px] text-[#498467]">{formatListingPrice(product)}</p>
      </button>
      <ReviewSummary product={product} onClick={openReviews} />
      <div className="mt-3 flex justify-end gap-4"><SaveButton savedItem={savedItem} /><ShareButton onClick={() => onShare(menuContent, undefined)} /></div>
    </div>
  );
}

function PromotionFeedCard({ promotion, product, onOpenDetail, onMenu, onShare }) {
  const navigate = useNavigate();
  const openDetail = onOpenDetail ?? ((path, state) => navigate(path, { state }));
  const savedItem = product ? { id: `listing:${product.id}`, type: "listing", sourceId: product.id, name: product.name, storeName: product.shop, image: product.image, description: product.name } : null;
  const menuContent = { id: `promotion:${promotion.id}`, type: "promotion", title: promotion.title, name: promotion.title, sellerId: promotion.sellerId, productId: product?.id, sharePath: product ? `/product/${product.id}` : "/", savedItem: { id: `promotion:${promotion.id}`, type: "promotion", sourceId: promotion.id, name: promotion.title, storeName: product?.shop, image: product?.image, description: promotion.title, promotion, productId: product?.id } };
  return (
    <div className="overflow-hidden rounded-xl border border-[#F3D38A] bg-gradient-to-br from-[#FFFDF5] via-white to-[#F5FFF6] p-4 shadow-[0_5px_18px_rgba(73,132,103,0.14)]">
      <div className="flex items-start justify-between gap-2">
        <PromotionBadge promotion={promotion} className="text-[13px]" />
        <MoreButton onClick={() => onMenu(menuContent)} />
      </div>
      <VacationBadge sellerId={promotion.sellerId} />
      {product && <button type="button" onClick={() => openDetail(`/product/${product.id}`, { sellerId: product.sellerId })} className="relative mt-4 block w-full overflow-hidden rounded-lg"><img src={product.image} alt={product.name} className="aspect-square w-full object-cover" /><span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-[15px] font-extrabold uppercase text-[#498467] shadow">{promotionDisplayLabel(promotion)}</span></button>}
      <h3 className="mt-4 text-[20px] font-bold tracking-[-0.3px]">{promotion.title}</h3>
      <p className="mt-2 text-[14px] font-semibold text-[#498467]">{product?.shop}</p>
      <DistanceLabel content={product ?? promotion} className="mt-1" />
      <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.4px] text-[#B56576]">⏳ {promotionUrgencyLabel(promotion)}</p>
      <div className="mt-4 flex items-center justify-between gap-4"><button type="button" onClick={() => product && openDetail(`/product/${product.id}`, { sellerId: product.sellerId })} className="rounded-lg bg-[#498467] px-4 py-2 text-[13px] font-semibold text-white">View Promotion</button><div className="flex gap-4">{savedItem && <SaveButton savedItem={savedItem} />}<ShareButton onClick={() => onShare(menuContent, undefined)} /></div></div>
    </div>
  );
}

function AttachedListingCard({ product, onOpenDetail }) {
  const navigate = useNavigate();
  const openDetail = onOpenDetail ?? ((path, state) => navigate(path, { state }));
  const seller = sellers[product.sellerId];
  const openProduct = (event) => {
    event.stopPropagation();
    openDetail(`/product/${product.id}`, { sellerId: product.sellerId });
  };
  return (
    <button type="button" onClick={openProduct} className="rounded-lg border border-[#E6E6E6] p-3 text-left">
      <p className="mb-2 text-[12px] font-medium text-[#828282]">Attached Listing</p>
      <div className="flex items-center gap-3">
        {product.image && <img src={product.image} alt={product.name} className="h-12 w-12 shrink-0 rounded-lg object-cover" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold">{product.name}</p>
          <p className="text-[13px] text-[#498467]">{formatListingPrice(product)}</p>
          <p className="text-[12px] text-[#828282]">Seller: {seller?.name ?? product.shop}</p>
        </div>
      </div>
    </button>
  );
}

function ShareButton({ onClick }) {
  return <button type="button" aria-label="Share" onClick={(event) => { event.stopPropagation(); onClick(event); }} className="flex items-center gap-1 text-[12px] text-[#498467]"><svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M18.33 1.67 9.17 10.83M9.17 10.83 1.67 7.5l16.66-5.83-5.83 16.66-3.33-7.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Share</button>;
}

function SaveButton({ savedItem }) {
  const { isSaved, toggleSaved } = useSavedItems();
  const saved = isSaved(savedItem.id);
  return (
    <button
      type="button"
      aria-label={saved ? "Remove from Saved Items" : "Save product"}
      aria-pressed={saved}
      onClick={(event) => { event.stopPropagation(); toggleSaved([savedItem]); }}
      className={`flex items-center gap-1 text-[12px] ${saved ? "text-[#498467]" : "text-[#4F4F4F]"}`}
    >
      <OutlineIcon name="heart" size={16} fill={saved ? "currentColor" : "none"} />
      {saved ? "Saved" : "Save"}
    </button>
  );
}

function VacationBadge({ sellerId }) {
  const { getSellerProfile } = useSellerSettings();
  return getSellerProfile(sellerId)?.vacationMode
    ? <div className="mt-2 w-fit rounded-full bg-[#F5FFF6] px-2 py-1 text-[11px] font-medium text-[#4F4F4F]">Temporarily Closed</div>
    : null;
}

function MoreButton({ onClick }) {
  return (
    <button type="button" aria-label="More options" onClick={(event) => { event.stopPropagation(); onClick(event); }} className="p-1">
      <svg width="15" height="3" viewBox="0 0 15 3" fill="none"><path d="M1.5 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" fill="black" /></svg>
    </button>
  );
}

function EventPost({ event, onOpenDetail, onComment, onMenu, onShare }) {
  const navigate = useNavigate();
  const openDetail = onOpenDetail ?? ((path, state) => navigate(path, { state }));
  const { toggleSaved } = useSavedItems();
  const { isRegrown, toggleRegrow } = useRegrow();
  const { getEngagement, toggleLike, incrementShares, toggleRegrow: toggleEngagementRegrow } = useEngagement();
  const seller = sellers[event.sellerId];
  const engagement = getEngagement("event", event);
  const likes = engagement.likes;
  const reposts = engagement.regrows;
  const shares = engagement.shares;

  const openEvent = () => openDetail(`/event/${event.id}`);
  const openSeller = () => seller && navigate(`/seller/${seller.id}`);
  const savedEvent = {
    id: `event:${event.id}`,
    type: "event",
    sourceId: event.id,
    name: event.title,
    storeName: seller?.name,
    storeImage: seller?.avatar,
    image: event.image,
    description: event.description,
    event,
  };

  const menuContent = { id: `event:${event.id}`, type: "event", title: event.title, name: event.title, sellerId: event.sellerId, eventId: event.id, sharePath: `/event/${event.id}`, savedItem: savedEvent, commentContent: { type: "event", event, seller } };
  const handleLike = () => {
    toggleLike("event", event.id);
    toggleSaved([savedEvent]);
  };

  const handleRepost = () => {
    const regrown = isRegrown(`event:${event.id}`);
    toggleEngagementRegrow("event", event.id);
    toggleRegrow(
      `event:${event.id}`,
      regrown ? "🌱 Regrow removed" : "🎉 Event regrown successfully",
    );
  };


  return (
    <div className="rounded-lg border border-[#E6E6E6] p-3 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button onClick={openSeller} className="shrink-0">
            <img
              src={seller?.avatar}
              alt={seller?.name}
              className="w-8 h-8 rounded-full object-cover hover:opacity-80 transition-opacity"
            />
          </button>
          <div className="flex flex-col">
            <div className="flex min-w-0 max-w-full items-center gap-1 overflow-hidden whitespace-nowrap">
              <button
                onClick={openSeller}
                className="min-w-0 truncate text-left text-[14px] font-semibold text-[#498467] hover:underline"
              >
                {seller?.name}
              </button>
              <FoundingMemberBadge sellerId={event.sellerId} iconOnly />
              <span className="shrink-0 text-[14px] text-[#B56576]">in {displayPostClassification("Event")}</span>
            </div>
            <span className="text-[12px] text-[#828282]">
              {formatEventDate(event.date)}
            </span>
            <EventAttendanceCount eventId={event.id} />
          </div>
        </div>
        <MoreButton onClick={() => onMenu(menuContent)} />
      </div>
      <DistanceLabel content={event} />

      <button
        onClick={openEvent}
        className="relative w-full aspect-square overflow-hidden rounded"
      >
        <img
          src={event.image}
          alt={event.title}
          className="w-full h-full object-cover hover:opacity-90 transition-opacity"
        />
        <span className="absolute right-2 top-2 rounded-full bg-[#CFF7D3] px-2 py-1 text-[12px] font-medium text-[#02542D] shadow-sm">
          {eventStatus(event)}
        </span>
      </button>

      <button onClick={openEvent} className="text-left">
        <h3 className="text-[16px] font-semibold tracking-[-0.32px]">
          {event.title}
        </h3>
      </button>

      <p className="text-[14px] leading-[140%]">{event.description}</p>

      <div className="flex flex-col gap-1">
        <EventMeta label="Category" value={event.type} />
        <EventMeta label="Date" value={formatEventDate(event.date)} />
        <EventMeta
          label="Time"
          value={`${formatEventTime(event.startTime)} – ${formatEventTime(event.endTime)}`}
        />
        <EventMeta label="Location" value={event.location} />
      </div>

      <EngagementRow
        likes={likes}
        comments={engagement.comments}
        reposts={reposts}
        shares={shares}
        liked={engagement.liked}
        reposted={engagement.regrown}
        onLike={handleLike}
        onComment={() => onComment({ type: "event", event, seller })}
        onRepost={handleRepost}
        onShare={() => onShare(menuContent, () => incrementShares("event", event.id))}
      />
    </div>
  );
}

function EventMeta({ label, value }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[14px] text-[#828282] w-[70px] shrink-0">
        {label}
      </span>
      <span className="text-[14px] font-medium flex-1">{value}</span>
    </div>
  );
}

function Post({ post, stacked, onOpenDetail, onComment, onMenu, onShare }) {
  const navigate = useNavigate();
  const openDetail = onOpenDetail ?? ((path, state) => navigate(path, { state }));
  const { promotionsForProduct } = usePromotions();
  const { toggleSaved } = useSavedItems();
  const { isRegrown, toggleRegrow } = useRegrow();
  const { getPostEngagement, togglePostLike, incrementPostShares, togglePostRegrow } = useEngagement();
  const { settings: buyerProfile } = useBuyerSettings();
  const { listings } = useListings();
  const engagement = getPostEngagement(post);
  const postAvatar = post.authorId === buyerProfile.displayName ? buyerProfile.avatar : post.avatar;
  const reposts = engagement.regrows;
  const likes = engagement.likes;
  const comments = engagement.comments;
  const shares = engagement.shares;
  const seller = Object.values(sellers).find((s) => s.name === post.name);
  const promotion = post.productId ? promotionsForProduct(post.productId)[0] : null;
  const product = post.productId
    ? products.find((item) => item.id === post.productId) ?? listings.find((item) => item.id === post.productId)
    : null;
  const postImages = post.images?.length ? post.images : post.image ? [post.image] : [];
  const savedPost = {
    id: `post:${post.id}`,
    type: "post",
    sourceId: post.id,
    name: post.body,
    storeName: post.name,
    storeImage: postAvatar,
    image: post.image,
    description: post.body,
    feedTab: stacked ? "Your Community" : "Following",
    post,
  };
  const savedPromotion = promotion
    ? {
        id: `promotion:${promotion.id}`,
        type: "promotion",
        sourceId: promotion.id,
        name: promotion.title,
        storeName: post.name,
        storeImage: postAvatar,
        image: post.image,
        description: promotion.title,
        promotion,
        productId: post.productId,
      }
    : null;
  const menuContent = { id: `post:${post.id}`, type: "post", title: post.body, name: post.body, sellerId: post.sellerId, productId: post.productId, sharePath: post.productId ? `/product/${post.productId}` : "/", savedItems: [savedPost, ...(savedPromotion ? [savedPromotion] : [])], commentContent: { type: "post", post } };

  const handleSave = () => {
    togglePostLike(post.id);
    toggleSaved([savedPost, ...(savedPromotion ? [savedPromotion] : [])]);
  };

  const handleRepost = () => {
    const regrowId = `post:${post.id}`;
    const regrown = isRegrown(regrowId);
    const message = promotion
      ? "🔥 Promotion regrown successfully"
      : post.productId
        ? "🛍 Product regrown successfully"
        : "🌱 Post regrown successfully";
    togglePostRegrow(post.id);
    toggleRegrow(regrowId, regrown ? "🌱 Regrow removed" : message);
  };

  const handleSellerClick = () => {
    if (seller) {
      navigate(`/seller/${seller.id}`);
    }
  };

  const handleImageClick = () => {
    openDetail(`/post/${post.id}`);
  };

  const openPostDetail = () => openDetail(`/post/${post.id}`);

  const avatar = (
    <button onClick={handleSellerClick} className="shrink-0">
      <img
        src={postAvatar}
        alt={post.name}
        className="w-8 h-8 rounded-full object-cover hover:opacity-80 transition-opacity"
      />
    </button>
  );

  const meta = (
    <div className="flex flex-col">
      <div className="flex min-w-0 max-w-full items-center gap-1 overflow-hidden whitespace-nowrap">
        <button
          onClick={handleSellerClick}
          className="min-w-0 truncate text-left text-[14px] font-semibold text-[#498467] hover:underline"
        >
          {post.name}
        </button>
        <FoundingMemberBadge sellerId={post.sellerId} iconOnly />
        <span className="shrink-0 text-[14px] text-[#B56576]">in {displayPostClassification(post.classification)}</span>
      </div>
      <DistanceLabel content={post} className="mt-0.5" />
      <span className="text-[12px] text-[#828282]">{post.time}</span>
    </div>
  );

  const moreButton = <MoreButton onClick={() => onMenu(menuContent)} />;

  const content = (
    <>
      {postImages.length > 0 && (
        <div className={postImages.length > 1 ? "flex gap-1 overflow-x-auto no-scrollbar" : "relative"}>
          {postImages.map((image, index) => (
            <button
              key={index}
              onClick={handleImageClick}
              className={postImages.length > 1 ? "relative aspect-square w-[85%] shrink-0 overflow-hidden rounded" : "relative w-full aspect-square overflow-hidden rounded"}
            >
              <img
                src={image}
                alt=""
                className="w-full h-full object-cover hover:opacity-90 transition-opacity"
              />
              {index === 0 && <PromotionBadge promotion={promotion} className="absolute left-2 top-2" />}
            </button>
          ))}
        </div>
      )}

      {product && <VacationBadge sellerId={product.sellerId} />}
      <button type="button" onClick={openPostDetail} className="text-left text-[14px] leading-[140%]">{post.body}</button>

      {product && <AttachedListingCard product={product} onOpenDetail={openDetail} />}

      <EngagementRow
        likes={likes}
        comments={comments}
        reposts={reposts}
        shares={shares}
        liked={engagement.liked}
        reposted={engagement.regrows > 0}
        onLike={handleSave}
        onComment={() => onComment({ type: "post", post })}
        onRepost={handleRepost}
        onShare={() => onShare(menuContent, () => incrementPostShares(post.id))}
      />
    </>
  );

  if (stacked) {
    return (
      <div className="rounded-lg border border-[#E6E6E6] p-3 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {avatar}
            {meta}
          </div>
          {moreButton}
        </div>
        {content}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#E6E6E6] p-3 flex gap-3">
      {avatar}
      <div className="flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between">
          {meta}
          {moreButton}
        </div>
        {content}
      </div>
    </div>
  );
}

function EngagementRow({
  likes,
  comments,
  reposts,
  shares,
  liked,
  reposted,
  onLike,
  onComment,
  onRepost,
  onShare,
}) {
  return (
    <div className="flex items-center gap-11">
      <IconCount label={likes} onClick={onLike} ariaLabel="Like" active={liked}>
        <path
          d="M17.37 3.84a4.13 4.13 0 0 0-6.49-.5L10 4.22l-.88-.88a4.13 4.13 0 0 0-6.13 5.5l.63.88L10 17.19l6.48-6.48.63-.88a4.13 4.13 0 0 0 .26-6.49Z"
          stroke={liked ? "#498467" : "black"}
          fill={liked ? "#498467" : "none"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </IconCount>
      <IconCount label={comments} onClick={onComment} ariaLabel="Comment">
        <path
          d="M17.5 12.5a1.67 1.67 0 0 1-1.67 1.67H5.83L2.5 17.5V4.17A1.67 1.67 0 0 1 4.17 2.5h11.66a1.67 1.67 0 0 1 1.67 1.67v8.33Z"
          stroke="black"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </IconCount>
      <IconCount label={reposts} onClick={onRepost} ariaLabel="Regrow" active={reposted}>
        <path
          d="M5.83 7.5 2.5 4.17 5.83.83M2.5 4.17h11.67a3.33 3.33 0 0 1 3.33 3.33v1.67M14.17 12.5l3.33 3.33-3.33 3.34M17.5 15.83H5.83A3.33 3.33 0 0 1 2.5 12.5v-1.66"
          stroke={reposted ? "#498467" : "#1E1E1E"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </IconCount>
      <IconCount label={shares} onClick={onShare} ariaLabel="Share">
        <path
          d="M18.33 1.67 9.17 10.83M9.17 10.83 1.67 7.5l16.66-5.83-5.83 16.66-3.33-7.5Z"
          stroke="#1E1E1E"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </IconCount>
    </div>
  );
}

function IconCount({ children, label, onClick, ariaLabel, active }) {
  const content = (
    <>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        {children}
      </svg>
      <span className="text-[14px] font-medium">{label}</span>
    </>
  );

  if (!onClick) {
    return <div className="flex items-center gap-2">{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
      className="flex items-center gap-2"
    >
      {content}
    </button>
  );
}

export function Notifications() {
  const location = useLocation();
  const navigate = useNavigate();
  const edgeStartRef = useRef(null);
  const tabContentRef = useRef(null);
  const notificationScrollRef = useRef(null);
  const savedNotificationState = readNavigationState("notifications", { activeTab: 0, scrollTop: 0, tabScrollLeft: 0 });
  const [activeTab, setActiveTab] = useState(savedNotificationState.activeTab);
  const [likedComments, setLikedComments] = useState(() => new Set());
  const [commentLikeCounts, setCommentLikeCounts] = useState({});
  const { user: authUser } = useAuth();
  const currentUserId = authUser?.id ?? currentUser.id;
  const fromTab = location.state?.fromTab === "Your Community" ? "Your Community" : "Following";

  useEffect(() => {
    if (notificationScrollRef.current) notificationScrollRef.current.scrollTop = savedNotificationState.scrollTop;
    if (tabContentRef.current) tabContentRef.current.scrollLeft = savedNotificationState.tabScrollLeft;
    const saveState = () => writeNavigationState("notifications", { activeTab, scrollTop: notificationScrollRef.current?.scrollTop ?? 0, tabScrollLeft: tabContentRef.current?.scrollLeft ?? 0 });
    const scrollElement = notificationScrollRef.current;
    const tabElement = tabContentRef.current;
    scrollElement?.addEventListener("scroll", saveState, { passive: true });
    tabElement?.addEventListener("scroll", saveState, { passive: true });
    return () => {
      saveState();
      scrollElement?.removeEventListener("scroll", saveState);
      tabElement?.removeEventListener("scroll", saveState);
    };
  }, [activeTab]);

  const goBackToFeed = () => navigate("/", { state: { tab: fromTab } });
  const handlePointerUp = (event) => {
    if (edgeStartRef.current !== null && edgeStartRef.current < 30 && event.clientX - edgeStartRef.current > 50) goBackToFeed();
    edgeStartRef.current = null;
  };
  const handleTabChange = (index) => {
    setActiveTab(index);
    writeNavigationState("notifications", { activeTab: index, scrollTop: notificationScrollRef.current?.scrollTop ?? 0, tabScrollLeft: index * (tabContentRef.current?.clientWidth ?? 0) });
    tabContentRef.current?.scrollTo({
      left: index * tabContentRef.current.clientWidth,
      behavior: "smooth",
    });
  };
  const handleTabScroll = (event) => {
    const index = Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth);
    if (index !== activeTab) {
      setActiveTab(index);
      writeNavigationState("notifications", { activeTab: index, scrollTop: notificationScrollRef.current?.scrollTop ?? 0, tabScrollLeft: event.currentTarget.scrollLeft });
    }
  };
  const { orderNotifications } = useOrders();
  const { posts } = usePosts();
  const notificationLists = [
    [...orderNotifications, ...notificationsHighlights],
    notificationsFollowers,
  ];

  const toggleCommentLike = async (notification) => {
    const notificationId = notification.id;
    const wasLiked = likedComments.has(notificationId);
    const nextLiked = !wasLiked;
    setLikedComments((current) => {
      const next = new Set(current);
      if (nextLiked) next.add(notificationId);
      else next.delete(notificationId);
      return next;
    });
    setCommentLikeCounts((current) => ({
      ...current,
      [notificationId]: Math.max(0, (current[notificationId] ?? notification.commentLikes ?? 0) + (nextLiked ? 1 : -1)),
    }));

    if (!authUser?.id) return;
    try {
      await persistCommentLike({
        commentId: notification.commentId,
        userId: authUser.id,
        commentOwnerId: notification.commentOwnerId ?? currentUserId,
        actorUsername: authUser.user_metadata?.username ?? authUser.email,
        actorAvatarUrl: currentUser.avatar,
        postId: notification.postId,
        quote: notification.quote,
        thumbnailUrl: notification.thumbnailUrl ?? notification.thumb,
      });
    } catch (error) {
      setLikedComments((current) => {
        const next = new Set(current);
        if (wasLiked) next.add(notificationId);
        else next.delete(notificationId);
        return next;
      });
      setCommentLikeCounts((current) => ({
        ...current,
        [notificationId]: Math.max(0, (current[notificationId] ?? notification.commentLikes ?? 0) + (wasLiked ? 1 : -1)),
      }));
      console.error("Unable to update comment like", error);
    }
  };

  const handleProfileClick = (notification) => {
    const actorUserId = notification.actorUserId ?? notification.actor_user_id ?? notification.actor_id ?? notification.user_id;
    if (!actorUserId) return;
    navigate(`/profile/${encodeURIComponent(actorUserId)}`, {
      state: {
        actorUsername: notification.actorUsername ?? notification.actor_username ?? notification.name,
        actorAvatar: notification.avatar ?? notification.actor_avatar_url,
      },
    });
  };

  const handleViewClick = (notification) => {
    const isCommentNotification = (
      /comment|reply|mention/i.test(notification.notificationType ?? "")
      || /comment|reply|mention/i.test(notification.action ?? "")
    );
    const loadedPost = notification.postId == null
      ? null
      : posts.find((item) => String(item.id) === String(notification.postId));
    const productThumbnail = notification.productId
      ? products.find((product) => product.id === notification.productId)?.image
      : undefined;
    const thumbnailReference = notification.thumbnailUrl ?? notification.thumb ?? productThumbnail;
    console.log("Notification clicked:", notification.id);
    console.log("Notification type:", notification.notificationType);
    console.log("Stored post ID:", notification.postId);
    console.log("Stored comment ID:", notification.commentId);
    console.log("Thumbnail image reference:", thumbnailReference);
    console.log("Loaded post ID:", loadedPost?.id);
    console.log("Loaded post image reference:", loadedPost?.image);

    if (notification.postId != null) {
      if (!loadedPost) {
        console.error("Notification post not found:", notification.postId);
        return;
      }
      if (thumbnailReference && !imageReferenceMatches(loadedPost.image, thumbnailReference)) {
        console.error("Notification thumbnail does not match opened post image", {
          notificationId: notification.id,
          postId: notification.postId,
          thumbnailReference,
          loadedPostImage: loadedPost.image,
        });
        return;
      }
      navigate(`/post/${notification.postId}`, {
        state: {
          notificationId: notification.id,
          storedPostId: notification.postId,
          notificationThumbnail: thumbnailReference,
          ...(isCommentNotification ? {
            commentId: notification.commentId,
            replyId: notification.replyId,
            notificationType: notification.notificationType,
            focusReply: true,
          } : {}),
        },
      });
    } else if (isCommentNotification) {
      return;
    } else if (notification.type === "order") {
      navigate(`/orders/${encodeURIComponent(notification.orderId ?? "")}`);
    } else if (notification.productId) {
      navigate(`/product/${notification.productId}`);
    } else if (notification.actorUserId) {
      handleProfileClick(notification);
    } else if (notification.type === "store" || notification.type === "follow" || notification.type === "profile") {
      return;
    } else if (notification.type === "event") {
      navigate(`/event/${notification.eventId}`);
    } else if (notification.type === "product") {
      navigate(`/product/${notification.productId}`);
    }
  };

  return (
    <div
      className="flex h-full flex-col touch-pan-y"
      onPointerDown={(event) => {
        if (event.clientX < 30) edgeStartRef.current = event.clientX;
      }}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { edgeStartRef.current = null; }}
    >
      <Header title="Notifications" onBack={goBackToFeed} />
      <div ref={notificationScrollRef} className="overflow-y-auto flex-1 no-scrollbar">
        <div className="sticky top-0 z-10 flex justify-center gap-2 bg-white pt-6 pb-4">
          {["Highlights", "Followers"].map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => handleTabChange(index)}
              className={`rounded-full border px-3.5 py-1.5 text-[14px] font-medium ${
                activeTab === index
                  ? "border-transparent bg-[#498467] text-white"
                  : "border-[#E6E6E6] bg-white text-black"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="w-full max-w-full overflow-hidden">
          <div
            ref={tabContentRef}
            onScroll={handleTabScroll}
            className="flex w-full max-w-full snap-x snap-mandatory overflow-x-auto no-scrollbar"
          >
            {notificationLists.map((notifications, index) => (
              <div key={index} className="box-border w-full min-w-full max-w-full shrink-0 snap-start">
                {notifications.length === 0 ? (
                  <div className="px-4 py-12 text-center">
                    <p className="text-[18px] font-semibold">No notifications yet.</p>
                    <p className="mt-2 text-[14px] text-[#828282]">We'll keep you updated when something happens.</p>
                  </div>
                ) : (
                <div className="flex flex-col">
        {notifications.map((n) => {
          const productThumb = n.productId
            ? products.find((product) => product.id === n.productId)?.image
            : undefined;
          const thumbnail = n.thumb ?? productThumb;
          const actorUserId = n.actorUserId ?? n.actor_user_id ?? n.actor_id ?? n.user_id;
          const isProfileNotification = Boolean(actorUserId);
          const isCommentNotification = n.commentId != null && (
            /comment|reply|mention/i.test(n.notificationType ?? "")
            || /comment|reply|mention/i.test(n.action ?? "")
          );
          const isPostNotification = n.postId !== undefined;
          const isProductLikeNotification = Boolean(n.productId) && (
            /liked your product/i.test(n.action ?? "")
            || n.notificationType === "product_like"
          );

          return (
            <div
              key={n.id}
              className="flex items-start gap-3 border-b border-black/5 px-4 py-4"
            >
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => handleProfileClick(n)}
                  disabled={!actorUserId}
                  aria-label={`View ${n.name} profile`}
                  className="rounded-full disabled:cursor-default"
                >
                  <img
                    src={n.avatar}
                    alt={n.name}
                    className="h-12 w-12 rounded-full object-cover transition-opacity hover:opacity-80"
                  />
                </button>
                <span className="pointer-events-none absolute left-0 top-8 h-1.5 w-1.5 rounded-full bg-[#498467]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-1">
                  <button
                    type="button"
                    onClick={() => handleProfileClick(n)}
                    disabled={!actorUserId}
                    className="text-[14px] font-medium text-[#498467] hover:underline disabled:cursor-default disabled:no-underline"
                  >
                    {n.name}
                  </button>
                  <span className="text-[14px] text-black/50">{n.time}</span>
                </div>
                <div className="mt-0.5 text-[14px] leading-5 text-black/60">{n.action}</div>
                {n.quote && (
                  <>
                    <button
                      type="button"
                      onClick={() => isCommentNotification && handleViewClick(n)}
                      className={`mt-1 flex max-w-full items-center gap-2.5 text-left ${isCommentNotification ? "cursor-pointer" : "cursor-default"}`}
                    >
                      <span className="h-5 w-[3px] shrink-0 rounded bg-[#D9D9D9]" />
                      <span className="truncate text-[14px] text-[#828282]">{n.quote}</span>
                    </button>
                    {isCommentNotification && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
                        <button
                          type="button"
                          aria-label={likedComments.has(n.id) ? "Unlike comment" : "Like comment"}
                          onClick={() => toggleCommentLike(n)}
                          className={`flex min-h-8 items-center gap-1 px-1 text-[17px] transition-transform active:scale-125 ${likedComments.has(n.id) ? "text-[#498467]" : "text-black/60"}`}
                        >
                          <span aria-hidden="true">{likedComments.has(n.id) ? "♥" : "♡"}</span>
                          {(commentLikeCounts[n.id] ?? n.commentLikes ?? 0) > 0 && <span>{commentLikeCounts[n.id] ?? n.commentLikes}</span>}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleViewClick(n)}
                          className="min-h-8 px-1 text-black/60"
                        >
                          Reply
                        </button>
                      </div>
                    )}
                  </>
                )}
                {(isProfileNotification || isPostNotification || n.type === "order") && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-medium text-[#498467]">
                    {isProfileNotification && (
                      <button
                        type="button"
                        onClick={() => handleProfileClick(n)}
                        className="min-h-8 px-1 text-left"
                      >
                        View Profile
                      </button>
                    )}
                    {isPostNotification && !isProductLikeNotification && (
                      <button
                        type="button"
                        onClick={() => handleViewClick(n)}
                        className="min-h-8 px-1 text-left"
                      >
                        View Post
                      </button>
                    )}
                    {n.type === "order" && (
                      <>
                        <button type="button" onClick={() => handleViewClick(n)} className="min-h-8 px-1 text-left">View Order</button>
                        {n.sellerId && <button type="button" onClick={() => navigate(`/seller/${n.sellerId}`)} className="min-h-8 px-1 text-left">View Store</button>}
                      </>
                    )}
                  </div>
                )}
              </div>
              {thumbnail && (n.type === "product" || n.type === "event" || n.type === "order") && (
                <button
                  type="button"
                  onClick={() => handleViewClick(n)}
                  className="shrink-0"
                  aria-label={`Open ${n.type}`}
                >
                  <img
                    src={thumbnail}
                    alt=""
                    className="h-12 w-12 rounded object-cover"
                  />
                </button>
              )}
            </div>
          );
                })}
                </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
