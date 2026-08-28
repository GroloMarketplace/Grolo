import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { ActivityCard } from "./BuyerProfile";
import { communityPosts, followingPosts, sellers, messages } from "../data/mockData";
import { useListings } from "../context/ListingContext";
import { useFollow } from "../context/FollowContext";
import { useReviews } from "../context/ReviewContext";
import {
  formatEventDate,
  formatEventTime,
  useEvents,
} from "../context/EventContext";
import { usePaymentMethods } from "../context/PaymentMethodsContext";
import { usePosts } from "../context/PostContext";
import OutlineIcon from "../components/OutlineIcon";
import { useSellerSettings } from "../context/SellerSettingsContext";
import { useAuth } from "../context/AuthContext";
import { readNavigationState, writeNavigationState } from "../hooks/navigationState";
import { formatListingPrice } from "../utils/listingDisplay";
import ServiceCategoryLabel from "../components/ServiceCategoryLabel";
import SellerProfileShareModal from "../components/SellerProfileShareModal";
import ShareProfileButton from "../components/ShareProfileButton";
import DistanceLabel from "../components/DistanceLabel";
import { useProfileMode } from "../context/ProfileModeContext";
import { useReputationSnapshot } from "../hooks/useReputationRead";
import ReputationSummary from "../components/ReputationSummary";
import UnavailableAccount from "../components/UnavailableAccount";
import { useBlockedAccount } from "../hooks/useBlockedAccount";
import { useResolvedSeller } from "../hooks/useEntityResolution";

function isCanonicalSellerId(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default function SellerProfile() {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const { isFollowing, toggleFollow, getFollowerCount, followedSellers, followsLoaded } = useFollow();
  const { user } = useAuth();
  const { sellerRating } = useReviews();
  const { upcomingEvents } = useEvents();
  const { getPaymentMethods } = usePaymentMethods();
  const { posts } = usePosts();
  const { getSellerProfile } = useSellerSettings();
  const { listings } = useListings();
  const { storeOpenedAt } = useProfileMode();
  const resolvedSeller = useResolvedSeller(sellerId);
  const seller = resolvedSeller ?? sellers[sellerId] ?? { id: sellerId, name: "Seller" };
  const profileSellerId = isCanonicalSellerId(resolvedSeller?.id)
    ? resolvedSeller.id
    : isCanonicalSellerId(sellerId) ? sellerId : null;
  const sellerProfile = getSellerProfile(profileSellerId ?? seller.id);
  const blocked = useBlockedAccount(seller.id);
  const reputationSnapshot = useReputationSnapshot(seller.id);
  const sellerPaymentMethods = getPaymentMethods(seller.id);
  const createdBySeller = (item) => {
    const createdAt = typeof item.createdAt === "number" ? item.createdAt : Date.parse(item.createdAt);
    return !Number.isNaN(createdAt) && createdAt >= storeOpenedAt;
  };
  const sellerEvents = upcomingEvents(seller.id).filter(createdBySeller);
  const sellerRatingData = sellerRating(seller.id);
  const { average, count } = sellerRatingData;
  const sellerProducts = listings.filter((p) => p.sellerId === seller.id || p.shop === sellerProfile.name || p.shop === seller.name);
  useEffect(() => {
    if (!followsLoaded) return;
  }, [followedSellers, followsLoaded, getFollowerCount, isFollowing, profileSellerId, sellerId, user?.id]);

  useEffect(() => {
    const followerCount = profileSellerId ? getFollowerCount(profileSellerId) : 0;
  }, [followedSellers, getFollowerCount, isFollowing, profileSellerId, resolvedSeller, seller.id, sellerId, user?.id]);
  const sellerPosts = [...followingPosts, ...communityPosts, ...posts].filter(
    (post, index, allPosts) =>
      String(post.sellerId) === String(seller.id) && createdBySeller(post) && allPosts.findIndex((item) => item.id === post.id) === index,
  );
  const savedProfileState = readNavigationState(`seller-profile-${seller.id}`, { activeTab: 0, scrollTop: 0, tabScrollLeft: 0 });
  const [activeTab, setActiveTab] = useState(savedProfileState.activeTab);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const pageScrollRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (pageScrollRef.current) pageScrollRef.current.scrollTop = savedProfileState.scrollTop;
    if (contentRef.current) contentRef.current.scrollLeft = savedProfileState.tabScrollLeft;
    const saveState = () => writeNavigationState(`seller-profile-${seller.id}`, { activeTab, scrollTop: pageScrollRef.current?.scrollTop ?? 0, tabScrollLeft: contentRef.current?.scrollLeft ?? 0 });
    const pageScroll = pageScrollRef.current;
    const tabScroll = contentRef.current;
    pageScroll?.addEventListener("scroll", saveState, { passive: true });
    tabScroll?.addEventListener("scroll", saveState, { passive: true });
    return () => {
      saveState();
      pageScroll?.removeEventListener("scroll", saveState);
      tabScroll?.removeEventListener("scroll", saveState);
    };
  }, [activeTab, seller.id]);

  if (blocked) return <UnavailableAccount onBack={() => navigate(-1)} />;

  const tabs = ["Listings", "Posts", "Events"];

  const handleTabChange = (index) => {
    setActiveTab(index);
    writeNavigationState(`seller-profile-${seller.id}`, { activeTab: index, scrollTop: pageScrollRef.current?.scrollTop ?? 0, tabScrollLeft: index * (contentRef.current?.clientWidth ?? 0) });
    contentRef.current?.scrollTo({
      left: index * contentRef.current.clientWidth,
      behavior: "smooth",
    });
  };

  const handleContentScroll = (event) => {
    const index = Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth);
    if (index !== activeTab) {
      setActiveTab(index);
      writeNavigationState(`seller-profile-${seller.id}`, { activeTab: index, scrollTop: pageScrollRef.current?.scrollTop ?? 0, tabScrollLeft: event.currentTarget.scrollLeft });
    }
  };

  const handleMessageClick = () => {
    // Check if conversation already exists with this seller
    const existingConversation = messages.find((m) => m.sellerId === sellerId);
    
    if (existingConversation) {
      // Open existing conversation
      navigate(`/messages/${existingConversation.id}`);
    } else {
      // Create new conversation and navigate to it
      // Use the seller ID until a conversation is persisted.
      navigate(`/messages/${sellerId}`);
    }
  };

  return (
    <MobileScreenLayout>
      <Header onBack={() => navigate(-1)} shareButton={<ShareProfileButton onClick={() => setIsShareModalOpen(true)} />} />
      <div ref={pageScrollRef} className="overflow-y-auto flex-1 no-scrollbar">
        {sellerProfile.vacationMode && <div className="mx-4 mt-4 mb-4 rounded-lg border border-[#F5A623] bg-[#FFF4E5] p-3"><div className="text-[14px] font-semibold text-[#8A4B08]">🟠 Store Temporarily Closed</div><p className="mt-1 text-[13px] text-[#8A4B08]">{sellerProfile.vacationMessage || "This seller is currently not accepting orders."}</p>{sellerProfile.returnDate && <p className="mt-1 text-[12px] text-[#8A4B08]">Returning {new Date(`${sellerProfile.returnDate}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>}</div>}
        {/* Banner */}
        <div className="h-[136px] relative">
          <img
            src={sellerProfile.banner}
            alt={`${sellerProfile.name} banner`}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Profile Info */}
        <div className="px-4 -mt-8 relative z-10">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <img
                src={sellerProfile.avatar}
                alt={sellerProfile.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-white shadow"
              />
              <div className="flex-1">
                <h1 className="text-[20px] font-semibold">{sellerProfile.name}</h1>

                <p className="mt-0.5 flex items-center gap-1 text-[13px] text-[#828282]"><OutlineIcon name="location" size={14} />{sellerProfile.location}</p>
                <DistanceLabel content={sellerProfile} />
                <FulfillmentAvailability methods={sellerPaymentMethods.fulfillmentMethods} />
              </div>
            </div>

            <p className="text-[14px] mt-3 leading-[140%]">{sellerProfile.description}</p>
            <PaymentMethodsList paymentSettings={sellerPaymentMethods} />

            <ReputationSummary snapshot={reputationSnapshot} audience="seller" sellerId={seller.id} foundingMember={sellerProfile.foundingMember} memberSince={sellerProfile.createdAt} storeCreatedAt={sellerProfile.storeOpenedAt} includeFoundingMember={false} runtimeDiagnostic className="mt-3" />

            {/* Rating */}
            <div className="flex items-center gap-2 mt-3">
              <div className="flex items-center gap-1">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M10 1.67 12.58 6.88l5.75.84-4.16 4.06.98 5.73L10 14.81l-5.15 2.71.98-5.73L1.67 7.73l5.75-.84L10 1.67Z"
                    fill="#FFC107"
                    stroke="#FFC107"
                    strokeWidth="1"
                  />
                </svg>
                <span className="text-[14px] font-semibold">{average}</span>
              </div>
              <button type="button" onClick={() => navigate("/my-shop/reviews")} className="text-[14px] text-[#828282] hover:text-[#498467]">({count} reviews)</button>
              <span className="text-[14px] text-[#828282]">•</span>
              <span className="flex items-center gap-1 text-[14px] text-[#828282]"><OutlineIcon name="users" size={14} />{getFollowerCount(profileSellerId)} followers</span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  if (profileSellerId) toggleFollow(profileSellerId);
                }}
                disabled={!profileSellerId}
                className={`flex-1 py-2.5 rounded-lg text-[14px] font-medium ${
                  isFollowing(profileSellerId)
                    ? "bg-[#498467] text-white"
                    : "bg-[#498467] text-white"
                }`}
              >
                {isFollowing(profileSellerId) ? "Following" : "Follow Store"}
              </button>
              <button 
                onClick={handleMessageClick}
                className="flex-1 border border-[#498467] text-[#498467] py-2.5 rounded-lg text-[14px] font-medium"
              >
                Message
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="sticky top-0 z-20 border-y border-[#E6E6E6] bg-white">
            <div className="flex">
              {tabs.map((tab, index) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleTabChange(index)}
                  className={`relative flex-1 py-3 text-[14px] font-semibold ${
                    activeTab === index ? "text-[#498467]" : "text-black/40"
                  }`}
                >
                  {tab}
                  {activeTab === index && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#498467]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full max-w-full overflow-hidden">
            <div
              ref={contentRef}
              onScroll={handleContentScroll}
              className="flex w-full max-w-full snap-x snap-mandatory overflow-x-auto no-scrollbar"
            >
            <ListingsTab sellerId={seller.id} products={sellerProducts} navigate={navigate} />
            <PostsTab posts={sellerPosts} navigate={navigate} profile={sellerProfile} />
            <EventsTab events={sellerEvents} navigate={navigate} profile={sellerProfile} />
            </div>
          </div>
        </div>
      </div>
      {isShareModalOpen && <SellerProfileShareModal seller={seller} profile={sellerProfile} onClose={() => setIsShareModalOpen(false)} />}
    </MobileScreenLayout>
  );
}

function FulfillmentAvailability({ methods }) {
  const pickup = methods.includes("pickup");
  const delivery = methods.includes("delivery");
  const label = pickup && delivery ? "Pickup & Local Delivery" : pickup ? "Pickup Only" : "Delivery Only";
  return <p className="mt-1 flex items-center gap-1 text-[14px] text-black"><span className="text-[#498467]"><OutlineIcon name={delivery && !pickup ? "sales" : "home"} size={16} /></span> {label}</p>;
}

function PaymentMethodsList({ paymentSettings }) {
  const { methods } = paymentSettings;
  return (
    <div className="mt-3 rounded-lg bg-[#F5FFF6] p-3">
      <div className="text-[12px] font-medium text-[#498467]">Accepted Payment Methods</div>
      {methods.includes("cash") && <div className="mt-1 text-[13px] text-[#4F4F4F]">Cash · Pay at pickup</div>}
      {methods.includes("etransfer") && <div className="mt-1 text-[13px] text-[#4F4F4F]">E-Transfer Available</div>}
      <div className="mt-1 text-[12px] text-[#828282]">Credit/Debit (Coming Soon)</div>
    </div>
  );
}

function TabPanel({ children }) {
  return <div className="box-border w-full min-w-full max-w-full shrink-0 snap-start px-4 py-4">{children}</div>;
}

function EmptyTab({ children }) {
  return <div className="py-10 text-center text-[14px] text-[#828282]">{children}</div>;
}

function groupListingsByCategory(products) {
  const groups = new Map();
  products.forEach((product) => {
    const category = product.category?.trim() || "Other";
    groups.set(category, [...(groups.get(category) ?? []), product]);
  });
  return [...groups.entries()];
}

function ListingsTab({ sellerId, products, navigate }) {
  const isInventoryTracked = (product) => !Array.isArray(product.variants) || product.variants.length === 0;
  const activeProducts = products.filter((product) => !isInventoryTracked(product) ? product.availableForOrders !== false : Number(product.quantityAvailable) > 0);
  const outOfStockProducts = products.filter((product) => !isInventoryTracked(product) ? product.availableForOrders === false : Number(product.quantityAvailable) <= 0);
  const categoryGroups = groupListingsByCategory(activeProducts);

  return (
    <TabPanel>
      {categoryGroups.length === 0 ? <EmptyTab>No active listings</EmptyTab> : categoryGroups.map(([category, categoryProducts]) => (
        <ListingSection key={category} title={category} count={categoryProducts.length} products={categoryProducts} navigate={navigate} onCategory={() => navigate(`/seller/${encodeURIComponent(sellerId)}/category/${encodeURIComponent(category)}`)} />
      ))}
      {outOfStockProducts.length > 0 && (
        <section className="mt-6 border-t border-black/5 pt-4">
          <button type="button" onClick={() => navigate(`/seller/${encodeURIComponent(sellerId)}/category/Out%20of%20Stock`)} className="mb-3 flex w-full items-center justify-between text-left"><h2 className="text-[16px] font-semibold">Out of Stock ({outOfStockProducts.length})</h2><span aria-hidden="true" className="text-[20px] text-[#828282]">›</span></button>
          <div className="grid w-full min-w-0 grid-cols-2 gap-3">
            {outOfStockProducts.map((product) => (
              <button key={product.id} type="button" onClick={() => navigate(`/product/${product.id}`)} className="rounded-lg border border-[#E6E6E6] p-3 text-left">
                <div className="relative">
                  <img src={product.image} alt={product.name} className="aspect-square w-full rounded-lg object-cover" />
                  <span className="absolute left-2 top-2 rounded-full bg-[#828282] px-2 py-0.5 text-[10px] font-semibold uppercase text-white">Sold Out</span>
                </div>
                <ServiceCategoryLabel listing={product} className="mt-2 block" />
                <span className="mt-1 block text-[14px] font-medium">{product.name}</span>
                <span className="mt-0.5 block text-[16px] font-semibold text-[#498467]">{formatListingPrice(product)}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </TabPanel>
  );
}

function ListingSection({ title, count, products, navigate, onCategory }) {
  return (
    <section>
      <button type="button" onClick={onCategory} className="mb-3 flex w-full items-center justify-between text-left">
        <h2 className="text-[16px] font-semibold">{title} ({count})</h2>
        <span aria-hidden="true" className="text-[20px] text-[#828282]">›</span>
      </button>
      {products.length === 0 ? (
        <EmptyTab>No active listings</EmptyTab>
      ) : (
        <div className="grid w-full min-w-0 grid-cols-2 gap-3">
          {products.map((product) => {
            return (
              <button key={product.id} type="button" onClick={() => navigate(`/product/${product.id}`)} className="text-left">
                <div className="relative">
                  <img src={product.image} alt={product.name} className="aspect-square w-full rounded-lg object-cover" />
                </div>
                <ServiceCategoryLabel listing={product} className="mt-2 block" />
                <span className="mt-1 block text-[14px] font-medium">{product.name}</span>
                <span className="mt-0.5 block text-[16px] font-semibold text-[#498467]">{formatListingPrice(product)}</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function PostsTab({ posts, navigate, profile }) {
  return (
    <TabPanel>
      {posts.length === 0 ? <EmptyTab>No posts yet</EmptyTab> : <div className="flex w-full min-w-0 flex-col gap-4">{posts.map((post) => <ActivityCard key={post.id} activity={{ id: post.id, type: "post", label: post.name, timestamp: post.time, post }} navigate={navigate} profile={profile} />)}</div>}
    </TabPanel>
  );
}

function EventsTab({ events, navigate, profile }) {
  return (
    <TabPanel>
      {events.length === 0 ? (
        <EmptyTab>No upcoming events</EmptyTab>
      ) : (
        <div className="flex w-full min-w-0 flex-col gap-4">
          {events.map((event) => (
            <ActivityCard
              key={event.id}
              activity={{
                id: event.id,
                type: "event",
                label: event.title,
                timestamp: `${formatEventDate(event.date)} · ${formatEventTime(event.startTime)} · ${event.location}`,
                event,
              }}
              navigate={navigate}
              profile={profile}
            />
          ))}
        </div>
      )}
    </TabPanel>
  );
}
