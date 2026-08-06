import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { ActivityCard } from "./BuyerProfile";
import PromotionBadge from "../components/PromotionBadge";
import PromotionsBanner from "../components/PromotionsBanner";
import { communityPosts, followingPosts, sellers, messages } from "../data/mockData";
import { useListings } from "../context/ListingContext";
import { useFollow } from "../context/FollowContext";
import { useReviews } from "../context/ReviewContext";
import {
  formatEventDate,
  formatEventTime,
  useEvents,
} from "../context/EventContext";
import { usePromotions } from "../context/PromotionContext";
import { usePaymentMethods } from "../context/PaymentMethodsContext";
import { useOrders } from "../context/OrderContext";
import { getSellerStatus } from "../data/communityStatus";
import OutlineIcon from "../components/OutlineIcon";
import FoundingMemberBadge from "../components/FoundingMemberBadge";
import { useFoundingMember } from "../context/FoundingMemberContext";
import { useSellerSettings } from "../context/SellerSettingsContext";
import { useInventory } from "../context/InventoryContext";
import { readNavigationState, writeNavigationState } from "../hooks/navigationState";

export default function SellerProfile() {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const { isFollowing, toggleFollow } = useFollow();
  const { sellerRating } = useReviews();
  const { upcomingEvents } = useEvents();
  const { promotionsForSeller } = usePromotions();
  const { getPaymentMethods } = usePaymentMethods();
  const { sellerOrders } = useOrders();
  const { getSellerProfile } = useSellerSettings();
  const { listings } = useListings();
  const { getAvailable } = useInventory();
  const { getFoundingMember } = useFoundingMember();
  const seller = sellers[sellerId] || sellers["sarahs-backyard"];
  const sellerProfile = getSellerProfile(seller.id);
  const foundingMember = getFoundingMember(seller.id);
  const sellerPaymentMethods = getPaymentMethods(seller.id);
  const sellerEvents = upcomingEvents(seller.id);
  const sellerPromotions = promotionsForSeller(seller.id);
  const { average, count } = sellerRating(seller.id);
  const sellerProducts = listings.filter((p) => p.sellerId === seller.id || p.shop === seller.name);
  const sellerOrdersForStatus = sellerOrders(seller.id);
  const sellerStatus = getSellerStatus({
    ordersFulfilled: sellerOrdersForStatus.filter((order) => order.status === "Completed").length,
    productsSold: sellerOrdersForStatus.reduce((total, order) => total + order.quantity, 0),
    reviewsReceived: count,
    eventsHosted: sellerEvents.length,
    followersGained: seller.followers,
    tradesCompleted: 3,
  });
  const sellerPosts = [...followingPosts, ...communityPosts].filter(
    (post, index, posts) =>
      post.sellerId === seller.id && posts.findIndex((item) => item.id === post.id) === index,
  );
  const sellerRegrows = sellerPosts.slice(0, 2);
  const savedProfileState = readNavigationState(`seller-profile-${seller.id}`, { activeTab: 0, scrollTop: 0, tabScrollLeft: 0 });
  const [activeTab, setActiveTab] = useState(savedProfileState.activeTab);
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
  const tabs = ["Listings", "Posts", "Events", "Regrows"];

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
      // For mock data, use sellerId as the conversation ID
      navigate(`/messages/${sellerId}`);
    }
  };

  return (
    <MobileScreenLayout>
      <Header onBack={() => navigate(-1)} />
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
                <SellerStatusBadge status={sellerStatus} />
                {foundingMember && <FoundingMemberBadge sellerId={seller.id} />}
                <p className="mt-0.5 flex items-center gap-1 text-[13px] text-[#828282]"><OutlineIcon name="location" size={14} />{sellerProfile.location}</p>
                <FulfillmentAvailability methods={sellerPaymentMethods.fulfillmentMethods} />
              </div>
            </div>

            <p className="text-[14px] mt-3 leading-[140%]">{sellerProfile.description}</p>
            <PaymentMethodsList paymentSettings={sellerPaymentMethods} />

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
              <span className="text-[14px] text-[#828282]">({count} reviews)</span>
              <span className="text-[14px] text-[#828282]">•</span>
              <span className="text-[14px] text-[#828282]">{seller.followers} followers</span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => toggleFollow(sellerId)}
                className={`flex-1 py-2.5 rounded-lg text-[14px] font-medium ${
                  isFollowing(sellerId)
                    ? "bg-[#498467] text-white"
                    : "bg-[#498467] text-white"
                }`}
              >
                {isFollowing(sellerId) ? "Following" : "Follow Store"}
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
            <ListingsTab products={sellerProducts} promotions={sellerPromotions} navigate={navigate} getAvailable={getAvailable} onOpenPromotions={() => navigate(`/promotions/${seller.id}`)} />
            <PostsTab posts={sellerPosts} navigate={navigate} profile={sellerProfile} />
            <EventsTab events={sellerEvents} navigate={navigate} profile={sellerProfile} />
              <RegrowsTab posts={sellerRegrows} navigate={navigate} profile={sellerProfile} />
            </div>
          </div>
        </div>
      </div>
    </MobileScreenLayout>
  );
}

function SellerStatusBadge({ status }) {
  return <p className="mt-1 flex items-center gap-1 text-[13px] font-medium text-[#498467]"><OutlineIcon name={status.icon} size={15} /> {status.name}</p>;
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

function ListingsTab({ products, promotions, navigate, getAvailable, onOpenPromotions }) {
  const activeProducts = products.filter((product) => getAvailable(product.id) > 0);
  const outOfStockProducts = products.filter((product) => getAvailable(product.id) <= 0);

  return (
    <TabPanel>
      {promotions.length > 0 && <PromotionsBanner count={promotions.length} onClick={onOpenPromotions} />}
      <ListingSection title="Listings" products={activeProducts} promotions={promotions} navigate={navigate} />
      {outOfStockProducts.length > 0 && (
        <section className="mt-6 border-t border-black/5 pt-4">
          <h2 className="mb-3 text-[16px] font-semibold">Out of Stock</h2>
          <div className="grid w-full min-w-0 grid-cols-2 gap-3">
            {outOfStockProducts.map((product) => (
              <button key={product.id} type="button" onClick={() => navigate(`/product/${product.id}`)} className="rounded-lg border border-[#E6E6E6] p-3 text-left">
                <div className="relative">
                  <img src={product.image} alt={product.name} className="aspect-square w-full rounded-lg object-cover" />
                  <span className="absolute left-2 top-2 rounded-full bg-[#828282] px-2 py-0.5 text-[10px] font-semibold uppercase text-white">Sold Out</span>
                </div>
                <span className="mt-2 block text-[14px] font-medium">{product.name}</span>
                <span className="mt-0.5 block text-[16px] font-semibold text-[#498467]">${product.price.toFixed(2)}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </TabPanel>
  );
}

function ListingSection({ title, products, promotions, navigate }) {
  return (
    <section>
      <h2 className="mb-3 text-[16px] font-semibold">{title}</h2>
      {products.length === 0 ? (
        <EmptyTab>No active listings</EmptyTab>
      ) : (
        <div className="grid w-full min-w-0 grid-cols-2 gap-3">
          {products.map((product) => {
            const promotion = promotions.find((item) => item.productIds.includes(product.id));
            return (
              <button key={product.id} type="button" onClick={() => navigate(`/product/${product.id}`)} className="text-left">
                <div className="relative">
                  <img src={product.image} alt={product.name} className="aspect-square w-full rounded-lg object-cover" />
                  {promotion && <PromotionBadge promotion={promotion} className="absolute left-2 top-2" />}
                </div>
                <span className="mt-2 block text-[14px] font-medium">{product.name}</span>
                <span className="mt-0.5 block text-[16px] font-semibold text-[#498467]">${product.price.toFixed(2)}</span>
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

function RegrowsTab({ posts, navigate, profile }) {
  return (
    <TabPanel>
      {posts.length === 0 ? <EmptyTab>No regrows yet</EmptyTab> : <div className="flex w-full min-w-0 flex-col gap-4">{posts.map((post) => <ActivityCard key={post.id} activity={{ id: post.id, type: "post", label: `🌱 Regrew a community post`, timestamp: post.time, post }} navigate={navigate} profile={profile} />)}</div>}
    </TabPanel>
  );
}
