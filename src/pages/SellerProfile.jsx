import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import PromotionBadge from "../components/PromotionBadge";
import { communityPosts, followingPosts, products, sellers, messages } from "../data/mockData";
import { useFollow } from "../context/FollowContext";
import { useReviews } from "../context/ReviewContext";
import {
  formatEventDate,
  formatEventTime,
  useEvents,
} from "../context/EventContext";
import { usePromotions } from "../context/PromotionContext";

export default function SellerProfile() {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const { isFollowing, toggleFollow } = useFollow();
  const { sellerRating } = useReviews();
  const { upcomingEvents } = useEvents();
  const { promotionsForSeller } = usePromotions();
  const seller = sellers[sellerId] || sellers["sarahs-backyard"];
  const sellerEvents = upcomingEvents(seller.id);
  const sellerPromotions = promotionsForSeller(seller.id);
  const { average, count } = sellerRating(seller.id);
  const sellerProducts = products.filter((p) => p.sellerId === seller.id || p.shop === seller.name);
  const sellerPosts = [...followingPosts, ...communityPosts].filter(
    (post, index, posts) =>
      post.sellerId === seller.id && posts.findIndex((item) => item.id === post.id) === index,
  );
  const sellerRegrows = sellerPosts.slice(0, 2);
  const [activeTab, setActiveTab] = useState(0);
  const contentRef = useRef(null);
  const tabs = ["Listings", "Posts", "Events", "Regrows"];

  const handleTabChange = (index) => {
    setActiveTab(index);
    contentRef.current?.scrollTo({
      left: index * contentRef.current.clientWidth,
      behavior: "smooth",
    });
  };

  const handleContentScroll = (event) => {
    const index = Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth);
    if (index !== activeTab) setActiveTab(index);
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
      <div className="overflow-y-auto flex-1 no-scrollbar">
        {/* Banner */}
        <div className="h-[136px] relative">
          <img
            src={seller.banner}
            alt={`${seller.name} banner`}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Profile Info */}
        <div className="px-4 -mt-8 relative z-10">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <img
                src={seller.avatar}
                alt={seller.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-white shadow"
              />
              <div className="flex-1">
                <h1 className="text-[20px] font-semibold">{seller.name}</h1>
                <p className="text-[14px] text-[#828282]">{seller.location}</p>
              </div>
            </div>

            <p className="text-[14px] mt-3 leading-[140%]">{seller.description}</p>

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

          <div className="w-full max-w-full min-w-0 overflow-hidden">
            <div
              ref={contentRef}
              onScroll={handleContentScroll}
              className="flex w-full max-w-full min-w-0 snap-x snap-mandatory overflow-x-auto no-scrollbar"
            >
            <ListingsTab products={sellerProducts} promotions={sellerPromotions} navigate={navigate} />
            <PostsTab posts={sellerPosts} navigate={navigate} />
            <EventsTab events={sellerEvents} navigate={navigate} />
              <RegrowsTab posts={sellerRegrows} navigate={navigate} />
            </div>
          </div>
        </div>
      </div>
    </MobileScreenLayout>
  );
}

function TabPanel({ children }) {
  return <div className="box-border w-full min-w-full max-w-full shrink-0 snap-start overflow-hidden px-4 py-4">{children}</div>;
}

function EmptyTab({ children }) {
  return <div className="py-10 text-center text-[14px] text-[#828282]">{children}</div>;
}

function ListingsTab({ products, promotions, navigate }) {
  return (
    <TabPanel>
      {promotions.length > 0 && (
        <div className="mb-4 flex flex-col gap-2">
          {promotions.map((promotion) => (
            <div key={promotion.id} className="rounded-lg border border-[#CFF7D3] bg-[#F5FFF6] p-3 flex flex-col gap-1">
              <PromotionBadge promotion={promotion} />
              <span className="text-[14px] font-semibold">{promotion.title}</span>
              <span className="text-[12px] text-[#828282]">Available on {promotion.productIds.length} listing{promotion.productIds.length === 1 ? "" : "s"}</span>
            </div>
          ))}
        </div>
      )}
      {products.length === 0 ? (
        <EmptyTab>No active listings</EmptyTab>
      ) : (
        <div className="grid grid-cols-2 gap-3">
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
    </TabPanel>
  );
}

function PostsTab({ posts, navigate }) {
  return (
    <TabPanel>
      {posts.length === 0 ? <EmptyTab>No posts yet</EmptyTab> : <div className="flex flex-col gap-4">{posts.map((post) => <StorePostCard key={post.id} post={post} navigate={navigate} />)}</div>}
    </TabPanel>
  );
}

function EventsTab({ events, navigate }) {
  return (
    <TabPanel>
      {events.length === 0 ? (
        <EmptyTab>No upcoming events</EmptyTab>
      ) : (
        <div className="flex flex-col gap-2">
          {events.map((event) => (
            <button key={event.id} type="button" onClick={() => navigate(`/event/${event.id}`)} className="flex w-full items-start gap-3 rounded-lg border border-[#E6E6E6] p-3 text-left">
              <img src={event.image} alt={event.title} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[14px] font-medium">{event.title}</span>
                <span className="text-[12px] font-medium text-[#498467]">{event.type}</span>
                <span className="text-[12px] text-[#828282]">{formatEventDate(event.date)}</span>
                <span className="text-[12px] text-[#828282]">{formatEventTime(event.startTime)} – {formatEventTime(event.endTime)}</span>
                <span className="text-[12px] text-[#828282]">{event.location}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </TabPanel>
  );
}

function RegrowsTab({ posts, navigate }) {
  return (
    <TabPanel>
      {posts.length === 0 ? <EmptyTab>No regrows yet</EmptyTab> : <div className="flex flex-col gap-4">{posts.map((post) => <StorePostCard key={post.id} post={post} navigate={navigate} regrow />)}</div>}
    </TabPanel>
  );
}

function StorePostCard({ post, navigate, regrow }) {
  return (
    <button type="button" onClick={() => navigate("/comments", { state: { content: { type: "post", post } } })} className="w-full text-left">
      <div className="flex items-center gap-2">
        <img src={post.avatar} alt={post.name} className="h-8 w-8 rounded-full object-cover" />
        <div>
          <div className="text-[14px] font-semibold text-[#498467]">{post.name}</div>
          <div className="text-[12px] text-[#828282]">{post.time}</div>
        </div>
        {regrow && <span className="ml-auto rounded-full bg-[#CFF7D3] px-2 py-1 text-[11px] font-medium text-[#02542D]">Regrow</span>}
      </div>
      {post.image && <img src={post.image} alt="" className="mt-3 aspect-square w-full rounded-lg object-cover" />}
      <p className="mt-2 text-[14px] leading-[140%]">{post.body}</p>
    </button>
  );
}
