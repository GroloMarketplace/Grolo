import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MobileScreenLayout from "../components/MobileScreenLayout";
import Header from "../components/Header";
import CommunityImpactCard from "../components/CommunityImpactCard";
import PromotionBadge from "../components/PromotionBadge";
import ContentActionSheet from "../components/ContentActionSheet";
import ShareSheet from "../components/ShareSheet";
import { usePromotions } from "../context/PromotionContext";
import { useSavedItems } from "../context/SavedContext";
import { useRegrow } from "../context/RegrowContext";
import {
  followingPosts,
  communityPosts,
  notificationsHighlights,
  notificationsFollowers,
  products,
  sellers,
} from "../data/mockData";
import { useFollow } from "../context/FollowContext";
import { useOrders } from "../context/OrderContext";
import {
  eventStatus,
  formatEventDate,
  formatEventTime,
  useEvents,
} from "../context/EventContext";

const TABS = ["Following", "Your Community"];

export default function Feed() {
  const location = useLocation();
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);
  const mainTabContentRef = useRef(null);
  const initialTabRef = useRef(TABS.includes(location.state?.tab) ? location.state.tab : "Your Community");
  const [tab, setTab] = useState(initialTabRef.current);
  const [actionContent, setActionContent] = useState(null);
  const [shareContent, setShareContent] = useState(null);
  const [hiddenContentIds, setHiddenContentIds] = useState(() => new Set());
  const [feedToast, setFeedToast] = useState("");
  const [notificationsRead, setNotificationsRead] = useState(() => localStorage.getItem("grolo-notifications-read") === "true");
  const { followedSellers } = useFollow();
  const unreadNotifications = notificationsRead ? 0 : notificationsHighlights.length + notificationsFollowers.length;

  useEffect(() => {
    const savedScrollTop = sessionStorage.getItem("grolo-feed-scroll-top");
    if (savedScrollTop && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = Number(savedScrollTop);
      sessionStorage.removeItem("grolo-feed-scroll-top");
    }
    const initialIndex = TABS.indexOf(initialTabRef.current);
    if (initialIndex > 0 && mainTabContentRef.current) {
      mainTabContentRef.current.scrollLeft = initialIndex * mainTabContentRef.current.clientWidth;
    }
  }, []);

  const openComments = (content) => {
    sessionStorage.setItem(
      "grolo-feed-scroll-top",
      String(scrollContainerRef.current?.scrollTop ?? 0),
    );
    navigate("/comments", { state: { content } });
  };

  const handleTabChange = (nextTab) => {
    const nextIndex = TABS.indexOf(nextTab);
    setTab(nextTab);
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
      >
        <div className="w-full max-w-full overflow-hidden">
          <div
            ref={mainTabContentRef}
            onScroll={handleMainTabScroll}
            className="flex w-full max-w-full snap-x snap-mandatory overflow-x-auto no-scrollbar"
          >
            <div className="box-border w-full min-w-full max-w-full shrink-0 snap-start">
              <FollowingFeed
                followedSellers={followedSellers}
                hiddenContentIds={hiddenContentIds}
                onComment={openComments}
                onMenu={setActionContent}
                onShare={openShare}
              />
            </div>
            <div className="box-border w-full min-w-full max-w-full shrink-0 snap-start">
              <CommunityFeed onComment={openComments} onMenu={setActionContent} onShare={openShare} hiddenContentIds={hiddenContentIds} />
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

function FollowingFeed({ followedSellers, hiddenContentIds, onComment, onMenu, onShare }) {
  const { upcomingEvents } = useEvents();
  const { activePromotions } = usePromotions();
  const events = upcomingEvents().filter((event) => followedSellers.includes(event.sellerId));
  const posts = followingPosts.filter((post) => followedSellers.includes(post.sellerId));
  const listings = products.filter((product) => followedSellers.includes(product.sellerId));
  const promotions = activePromotions().filter((promotion) => followedSellers.includes(promotion.sellerId));
  const items = getFollowedItems({ posts, events, listings, promotions, hiddenContentIds });

  return (
    <div className="flex flex-col gap-8 px-4 py-6">
      {items.length === 0 ? (
        <div className="text-center py-12"><p className="text-[14px] text-[#828282]">{followedSellers.length === 0 ? "Follow stores to see their posts here" : "No content from followed stores yet"}</p></div>
      ) : (
        items.map((item) => renderCommunityItem(item, onComment, onMenu, onShare))
      )}
    </div>
  );
}

function getFollowedItems({ posts, events, listings, promotions, hiddenContentIds }) {
  const items = [
    ...posts.map((post) => ({ type: "post", id: `post:${post.id}`, post })),
    ...events.map((event) => ({ type: "event", id: `event:${event.id}`, event })),
    ...listings.map((product) => ({ type: "listing", id: `listing:${product.id}`, product })),
    ...promotions.map((promotion) => ({ type: "promotion", id: `promotion:${promotion.id}`, promotion, product: products.find((product) => promotion.productIds?.includes(product.id)) })),
  ];
  return items.filter((item) => !hiddenContentIds.has(item.id));
}

const COMMUNITY_FILTERS = ["For You", "Posts", "Events", "Listings", "Promotions"];

function CommunityFeed({ onComment, onMenu, onShare, hiddenContentIds }) {
  const { upcomingEvents } = useEvents();
  const { activePromotions } = usePromotions();
  const { followedSellers } = useFollow();
  const { isSaved } = useSavedItems();
  const { isRegrown } = useRegrow();
  const [filter, setFilter] = useState("For You");
  const [touchStart, setTouchStart] = useState(null);
  const events = upcomingEvents();
  const currentPromotions = activePromotions();
  const items = getCommunityItems(filter, { events, currentPromotions, followedSellers, isSaved, isRegrown, hiddenContentIds });

  const changeFilter = (nextFilter) => setFilter(nextFilter);
  const handlePointerEnd = (event) => {
    if (touchStart === null) return;
    const distance = event.clientX - touchStart;
    const currentIndex = COMMUNITY_FILTERS.indexOf(filter);
    if (Math.abs(distance) > 40) {
      const nextIndex = distance < 0 ? Math.min(currentIndex + 1, COMMUNITY_FILTERS.length - 1) : Math.max(currentIndex - 1, 0);
      setFilter(COMMUNITY_FILTERS[nextIndex]);
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
        <CommunityImpactCard />
        {items.map((item) => renderCommunityItem(item, onComment, onMenu, onShare))}
      </div>
    </div>
  );
}

function getCommunityItems(filter, { events, currentPromotions, followedSellers, isSaved, isRegrown, hiddenContentIds }) {
  const listingItems = products.map((product) => ({ type: "listing", id: `listing:${product.id}`, product }));
  const postItems = communityPosts.map((post) => ({ type: "post", id: `post:${post.id}`, post }));
  const eventItems = events.map((event) => ({ type: "event", id: `event:${event.id}`, event }));
  const promotionItems = currentPromotions.map((promotion) => ({
    type: "promotion",
    id: `promotion:${promotion.id}`,
    promotion,
    product: products.find((product) => promotion.productIds?.includes(product.id)),
  }));
  const allItems = [...postItems, ...eventItems, ...listingItems, ...promotionItems];
  const visibleItems = allItems.filter((item) => !hiddenContentIds.has(item.id));
  const filtered = filter === "For You"
    ? visibleItems
    : visibleItems.filter((item) => item.type === filter.slice(0, -1).toLowerCase());

  return filtered.sort((a, b) => relevanceScore(b, { followedSellers, isSaved, isRegrown }) - relevanceScore(a, { followedSellers, isSaved, isRegrown }));
}

function relevanceScore(item, { followedSellers, isSaved, isRegrown }) {
  const sellerId = item.post?.sellerId ?? item.event?.sellerId ?? item.product?.sellerId ?? item.promotion?.sellerId;
  const contentId = item.type === "post" ? `post:${item.post.id}` : `${item.type}:${item.event?.id ?? item.product?.id ?? item.promotion?.id}`;
  const postScore = item.post ? (item.post.likes ?? 0) + (item.post.comments ?? 0) * 2 : 0;
  return (followedSellers.includes(sellerId) ? 30 : 0) + (isSaved(contentId) ? 24 : 0) + (isRegrown(contentId) ? 18 : 0) + postScore + (item.type === "promotion" ? 16 : 0) + (item.type === "event" ? 10 : 0);
}

function renderCommunityItem(item, onComment, onMenu, onShare) {
  if (item.type === "post") return <Post key={item.id} post={item.post} stacked onComment={onComment} onMenu={onMenu} onShare={onShare} />;
  if (item.type === "event") return <EventPost key={item.id} event={item.event} onComment={onComment} onMenu={onMenu} onShare={onShare} />;
  if (item.type === "listing") return <ListingFeedCard key={item.id} product={item.product} onMenu={onMenu} onShare={onShare} />;
  return <PromotionFeedCard key={item.id} promotion={item.promotion} product={item.product} onMenu={onMenu} onShare={onShare} />;
}

function ListingFeedCard({ product, onMenu, onShare }) {
  const menuContent = { id: `listing:${product.id}`, type: "listing", title: product.name, name: product.name, sellerId: product.sellerId, productId: product.id, sharePath: `/product/${product.id}`, savedItem: { id: `listing:${product.id}`, type: "listing", sourceId: product.id, name: product.name, storeName: product.shop, image: product.image, description: product.name } };
  return <div className="rounded-lg border border-[#E6E6E6] p-3"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><img src={product.image} alt={product.name} className="h-8 w-8 rounded-full object-cover" /><span className="text-[14px] font-semibold text-[#498467]">{product.shop}</span></div><MoreButton onClick={() => onMenu(menuContent)} /></div><img src={product.image} alt={product.name} className="mt-3 aspect-square w-full rounded object-cover" /><h3 className="mt-2 text-[16px] font-semibold">{product.name}</h3><p className="text-[14px] text-[#498467]">${product.price.toFixed(2)}</p><div className="mt-3 flex justify-end"><ShareButton onClick={() => onShare(menuContent, undefined)} /></div></div>;
}

function PromotionFeedCard({ promotion, product, onMenu, onShare }) {
  const menuContent = { id: `promotion:${promotion.id}`, type: "promotion", title: promotion.title, name: promotion.title, sellerId: promotion.sellerId, productId: product?.id, sharePath: product ? `/product/${product.id}` : "/", savedItem: { id: `promotion:${promotion.id}`, type: "promotion", sourceId: promotion.id, name: promotion.title, storeName: product?.shop, image: product?.image, description: promotion.title, promotion, productId: product?.id } };
  return <div className="rounded-lg border border-[#E6E6E6] p-3"><div className="flex items-center justify-between gap-2"><PromotionBadge promotion={promotion} /><MoreButton onClick={() => onMenu(menuContent)} /></div>{product && <img src={product.image} alt={product.name} className="mt-3 aspect-square w-full rounded object-cover" />}<h3 className="mt-2 text-[16px] font-semibold">{promotion.title}</h3><p className="text-[14px] text-[#498467]">{product?.shop}</p><div className="mt-3 flex justify-end"><ShareButton onClick={() => onShare(menuContent, undefined)} /></div></div>;
}

function ShareButton({ onClick }) {
  return <button type="button" aria-label="Share" onClick={onClick} className="flex items-center gap-1 text-[12px] text-[#498467]"><svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M18.33 1.67 9.17 10.83M9.17 10.83 1.67 7.5l16.66-5.83-5.83 16.66-3.33-7.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Share</button>;
}

function MoreButton({ onClick }) {
  return (
    <button type="button" aria-label="More options" onClick={onClick} className="p-1">
      <svg width="15" height="3" viewBox="0 0 15 3" fill="none"><path d="M1.5 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" fill="black" /></svg>
    </button>
  );
}

function EventPost({ event, onComment, onMenu, onShare }) {
  const navigate = useNavigate();
  const { isSaved, toggleSaved } = useSavedItems();
  const { isRegrown, toggleRegrow } = useRegrow();
  const seller = sellers[event.sellerId];
  const likes = event.likes ?? 0;
  const [reposts, setReposts] = useState(
    (event.reposts ?? 0) + (isRegrown(`event:${event.id}`) ? 1 : 0),
  );
  const [shares, setShares] = useState(event.shares ?? 0);

  const openEvent = () => navigate(`/event/${event.id}`);
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
  const handleSave = () => toggleSaved([savedEvent]);

  const handleRepost = () => {
    const regrown = isRegrown(`event:${event.id}`);
    setReposts((count) => count + (regrown ? -1 : 1));
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
            <div className="flex items-baseline gap-1">
              <button
                onClick={openSeller}
                className="text-[14px] font-semibold text-[#498467] hover:underline"
              >
                {seller?.name}
              </button>
              <span className="text-[14px] text-[#B56576]">in Event</span>
            </div>
            <span className="text-[12px] text-[#828282]">
              {formatEventDate(event.date)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium px-2 py-1 rounded-full bg-[#CFF7D3] text-[#02542D] whitespace-nowrap">
            {eventStatus(event)}
          </span>
          <MoreButton onClick={() => onMenu(menuContent)} />
        </div>
      </div>

      <button
        onClick={openEvent}
        className="w-full aspect-square overflow-hidden rounded"
      >
        <img
          src={event.image}
          alt={event.title}
          className="w-full h-full object-cover hover:opacity-90 transition-opacity"
        />
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
        comments={event.comments ?? 0}
        reposts={reposts}
        shares={shares}
        liked={isSaved(savedEvent.id)}
        reposted={isRegrown(`event:${event.id}`)}
        onLike={handleSave}
        onComment={() => onComment({ type: "event", event, seller })}
        onRepost={handleRepost}
        onShare={() => onShare(menuContent, () => setShares((count) => count + 1))}
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

function Post({ post, stacked, onComment, onMenu, onShare }) {
  const navigate = useNavigate();
  const { promotionsForProduct } = usePromotions();
  const { isSaved, toggleSaved } = useSavedItems();
  const { isRegrown, toggleRegrow } = useRegrow();
  const [reposts, setReposts] = useState(
    (post.shares ?? 0) + (isRegrown(`post:${post.id}`) ? 1 : 0),
  );
  const seller = Object.values(sellers).find((s) => s.name === post.name);
  const promotion = post.productId ? promotionsForProduct(post.productId)[0] : null;
  const savedPost = {
    id: `post:${post.id}`,
    type: "post",
    sourceId: post.id,
    name: post.body,
    storeName: post.name,
    storeImage: post.avatar,
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
        storeImage: post.avatar,
        image: post.image,
        description: promotion.title,
        promotion,
        productId: post.productId,
      }
    : null;
  const menuContent = { id: `post:${post.id}`, type: "post", title: post.body, name: post.body, sellerId: post.sellerId, productId: post.productId, sharePath: post.productId ? `/product/${post.productId}` : "/", savedItems: [savedPost, ...(savedPromotion ? [savedPromotion] : [])], commentContent: { type: "post", post } };

  const handleSave = () => toggleSaved([savedPost, ...(savedPromotion ? [savedPromotion] : [])]);

  const handleRepost = () => {
    const regrowId = `post:${post.id}`;
    const regrown = isRegrown(regrowId);
    const message = promotion
      ? "🔥 Promotion regrown successfully"
      : post.productId
        ? "🛍 Product regrown successfully"
        : "🌱 Post regrown successfully";
    setReposts((count) => count + (regrown ? -1 : 1));
    toggleRegrow(regrowId, regrown ? "🌱 Regrow removed" : message);
  };

  const handleSellerClick = () => {
    if (seller) {
      navigate(`/seller/${seller.id}`);
    }
  };

  const handleImageClick = () => {
    if (post.productId) {
      navigate(`/product/${post.productId}`);
    }
  };

  const avatar = (
    <button onClick={handleSellerClick} className="shrink-0">
      <img
        src={post.avatar}
        alt={post.name}
        className="w-8 h-8 rounded-full object-cover hover:opacity-80 transition-opacity"
      />
    </button>
  );

  const meta = (
    <div className="flex flex-col">
      <div className="flex items-baseline gap-1">
        <button
          onClick={handleSellerClick}
          className="text-[14px] font-semibold text-[#498467] hover:underline"
        >
          {post.name}
        </button>
        <span className="text-[14px] text-[#B56576]">in {post.classification}</span>
      </div>
      <span className="text-[12px] text-[#828282]">{post.time}</span>
    </div>
  );

  const moreButton = <MoreButton onClick={() => onMenu(menuContent)} />;

  const content = (
    <>
      {post.image && (
        <div className="relative">
          <button
            onClick={handleImageClick}
            className="w-full aspect-square overflow-hidden rounded"
          >
            <img
              src={post.image}
              alt=""
              className="w-full h-full object-cover hover:opacity-90 transition-opacity"
            />
          </button>
          <PromotionBadge promotion={promotion} className="absolute left-2 top-2" />
        </div>
      )}

      <p className="text-[14px] leading-[140%]">{post.body}</p>

      <EngagementRow
        likes={post.likes}
        comments={post.comments}
        reposts={reposts}
        shares={post.sends}
        liked={isSaved(savedPost.id)}
        reposted={isRegrown(`post:${post.id}`)}
        onLike={handleSave}
        onComment={() => onComment({ type: "post", post })}
        onRepost={handleRepost}
        onShare={() => onShare(menuContent, () => {})}
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
  const [sub, setSub] = useState("Highlights");
  const fromTab = location.state?.fromTab === "Your Community" ? "Your Community" : "Following";

  const goBackToFeed = () => navigate("/", { state: { tab: fromTab } });
  const handlePointerUp = (event) => {
    if (edgeStartRef.current !== null && edgeStartRef.current < 30 && event.clientX - edgeStartRef.current > 50) goBackToFeed();
    edgeStartRef.current = null;
  };
  const { orderNotifications } = useOrders();
  const list =
    sub === "Highlights"
      ? [...orderNotifications, ...notificationsHighlights]
      : notificationsFollowers;

  const handleViewClick = (notification) => {
    if (notification.type === "order") {
      navigate("/orders");
    } else if (notification.type === "store" || notification.type === "follow") {
      navigate(`/seller/${notification.sellerId}`);
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
      <div className="overflow-y-auto flex-1 no-scrollbar">
        <div className="sticky top-0 bg-white z-10 flex justify-center gap-2 pt-6 pb-4">
        {["Highlights", "Followers"].map((s) => (
          <button
            key={s}
            onClick={() => setSub(s)}
            className={`px-3.5 py-1.5 rounded-full text-[14px] font-medium border ${
              sub === s
                ? "bg-[#498467] text-white border-transparent"
                : "bg-white text-black border-[#E6E6E6]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex flex-col">
        {list.map((n) => (
          <div
            key={n.id}
            className="flex items-center gap-4 px-4 py-3 border-b border-black/5"
          >
            <div className="relative shrink-0">
              <img
                src={n.avatar}
                alt={n.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              <span className="absolute left-0 top-8 w-1.5 h-1.5 rounded-full bg-[#FE2C55]" />
            </div>
            <div className="flex-1 flex flex-col gap-0.5 min-w-0">
              <div className="flex items-baseline gap-1">
                <span className="text-[14px] font-medium">{n.name}</span>
                <span className="text-[14px] text-black/50">{n.time}</span>
              </div>
              <div className="text-[14px] text-black/50">{n.action}</div>
              {n.quote && (
                <div className="flex items-center gap-2.5 mt-1">
                  <span className="w-[3px] h-5 rounded bg-[#D9D9D9]" />
                  <span className="text-[14px] text-[#828282] truncate">
                    {n.quote}
                  </span>
                </div>
              )}
            </div>
            {n.button && (
              <button 
                onClick={() => handleViewClick(n)}
                className="shrink-0 h-8 px-4 rounded-lg bg-[#498467] text-white text-[14px] font-medium"
              >
                {n.button}
              </button>
            )}
            {n.thumb && (
              <button
                onClick={() => handleViewClick(n)}
                className="shrink-0"
              >
                <img
                  src={n.thumb}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover"
                />
              </button>
            )}
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
