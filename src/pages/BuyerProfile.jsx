import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import ProfileSwitcher from "../components/ProfileSwitcher";
import Sidebar from "../components/Sidebar";
import { useSidebar } from "../hooks/useSidebar";
import { communityPosts, events, followingPosts, products, promotions } from "../data/mockData";
import { formatEventDate, formatEventTime, useEvents } from "../context/EventContext";
import { useFollow } from "../context/FollowContext";
import { useReviews } from "../context/ReviewContext";
import { getBuyerImpactMetrics } from "../utils/buyerImpact";
import { impactTimeline } from "../data/communityImpact";
import OutlineIcon from "../components/OutlineIcon";
import { getBuyerTrustLevel, BUYER_TRUST_LEVELS } from "../data/buyerTrust";
import TrustLevelIcon from "../components/TrustLevelIcon";
import { useSavedItems } from "../context/SavedContext";
import { useBuyerTrust } from "../context/BuyerTrustContext";
import { useBuyerSettings } from "../context/BuyerSettingsContext";
import { useOrders } from "../context/OrderContext";
import { readNavigationState, writeNavigationState } from "../hooks/navigationState";
import { formatListingPrice } from "../utils/listingDisplay";
import ServiceCategoryLabel from "../components/ServiceCategoryLabel";
import { EventAttendanceCount } from "../components/EventRsvp";
import BuyerReviewCard from "../components/BuyerReviewCard";

const BUYER = {
  username: "remi",
  bio: "Discovering local makers, businesses, and community moments around Calgary.",
  banner: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80",
};

export default function BuyerProfile() {
  const navigate = useNavigate();
  const { isSidebarOpen, openSidebar, closeSidebar } = useSidebar();
  const { settings } = useBuyerSettings();
  const { events: liveEvents, attendingEventIds } = useEvents();
  const { followedSellers } = useFollow();
  const { buyerOrders } = useOrders();
  const { reviewsWrittenCount, reviewsForBuyer } = useReviews();
  const buyerReviews = (reviewsForBuyer?.() ?? []).sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0));
  const impactMetrics = getBuyerImpactMetrics({ orders: buyerOrders(), events: liveEvents, attendingEventIds, followedSellers, reviewsWritten: reviewsWrittenCount });
  const buyerProfile = { ...BUYER, username: settings.displayName, bio: settings.bio, avatar: settings.avatar };
  const publicLocation = settings.showLocationPublicly && settings.location.trim() ? `${settings.location.trim()}, Calgary` : "";
  const { savedItems } = useSavedItems();
  const savedProductCount = savedItems.filter((item) => item.type === "listing").length;
  const [savedProfileState] = useState(() => readNavigationState("buyer-profile", { activeTab: 0, scrollTop: 0, tabScrollLeft: 0 }));
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState(() => Math.min(Math.max(savedProfileState.activeTab, 0), 2));
  const pageScrollRef = useRef(null);
  const tabContentRef = useRef(null);
  const restoredInitialLayout = useRef(false);

  useLayoutEffect(() => {
    if (!restoredInitialLayout.current && pageScrollRef.current) {
      pageScrollRef.current.scrollTop = savedProfileState.scrollTop;
      restoredInitialLayout.current = true;
    }
    if (tabContentRef.current) {
      tabContentRef.current.scrollLeft = activeTab * tabContentRef.current.clientWidth;
      writeNavigationState("buyer-profile", {
        activeTab,
        scrollTop: pageScrollRef.current?.scrollTop ?? 0,
        tabScrollLeft: tabContentRef.current.scrollLeft,
      });
    }
  }, [activeTab, savedProfileState.scrollTop]);

  useEffect(() => {
    const saveState = () => writeNavigationState("buyer-profile", { activeTab, scrollTop: pageScrollRef.current?.scrollTop ?? 0, tabScrollLeft: tabContentRef.current?.scrollLeft ?? 0 });
    const pageScroll = pageScrollRef.current;
    const tabScroll = tabContentRef.current;
    pageScroll?.addEventListener("scroll", saveState, { passive: true });
    tabScroll?.addEventListener("scroll", saveState, { passive: true });
    return () => {
      pageScroll?.removeEventListener("scroll", saveState);
      tabScroll?.removeEventListener("scroll", saveState);
    };
  }, [activeTab]);
  const activity = buildActivity();

  const handleTabChange = (index) => {
    setActiveTab(index);
    const tabScrollLeft = index * (tabContentRef.current?.clientWidth ?? 0);
    writeNavigationState("buyer-profile", { activeTab: index, scrollTop: pageScrollRef.current?.scrollTop ?? 0, tabScrollLeft });
    tabContentRef.current?.scrollTo({
      left: tabScrollLeft,
      behavior: "auto",
    });
  };

  const handleTabScroll = (event) => {
    const index = Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth);
    if (index !== activeTab) {
      setActiveTab(index);
      writeNavigationState("buyer-profile", { activeTab: index, scrollTop: pageScrollRef.current?.scrollTop ?? 0, tabScrollLeft: event.currentTarget.scrollLeft });
    }
  };

  return (
    <>
      <MobileScreenLayout>
      <Header titleContent={<ProfileSwitcher />} onMenu={openSidebar} />
      <div ref={pageScrollRef} className="overflow-y-auto flex-1 no-scrollbar">
        <div className="relative h-[136px]">
          <img src={BUYER.banner} alt="Buyer profile banner" className="h-full w-full object-cover" />
        </div>
        <div className="relative z-10 -mt-8 px-4">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <img src={buyerProfile.avatar} alt={buyerProfile.username} className="h-16 w-16 rounded-full border-2 border-white object-cover shadow" />
              <div className="flex-1">
                {editing ? <input defaultValue={buyerProfile.username} className="w-full border-b border-[#E6E6E6] text-[20px] font-semibold outline-none" /> : <h1 className="text-[20px] font-semibold">{buyerProfile.username}</h1>}
                <TrustStatusBadge />
                {publicLocation && <p className="mt-0.5 flex items-center gap-1 text-[13px] text-[#828282]"><OutlineIcon name="location" size={14} />{publicLocation}</p>}
              </div>
            </div>
            <p className="mt-3 text-[14px] leading-[140%]">{buyerProfile.bio}</p>
            <button type="button" onClick={() => setEditing((current) => !current)} className="mt-4 w-full rounded-lg border border-[#498467] py-2.5 text-[14px] font-medium text-[#498467]">{editing ? "Save Profile" : "Edit Profile"}</button>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <BuyerStat label="Stores Followed" value={impactMetrics.storesFollowed} />
              <button type="button" onClick={() => navigate("/saved")} className="text-left"><BuyerStat label="Saved Items" value={savedProductCount} /></button>
              <BuyerStat label="Reviews Written" value={impactMetrics.reviewsWritten} />
              <BuyerStat label="Events Attended" value={impactMetrics.eventsAttended} />
            </div>
          </div>

        </div>

        <div className="mt-4">
          <div className="sticky top-0 z-20 border-y border-[#E6E6E6] bg-white">
            <div className="flex">
              {["My Activity", "Community Impact", "Reviews"].map((tab, index) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleTabChange(index)}
                  className={`relative flex-1 py-3 text-[14px] font-semibold ${activeTab === index ? "text-[#498467]" : "text-black/40"}`}
                >
                  {tab}
                  {activeTab === index && <span className="absolute bottom-0 left-8 right-8 h-0.5 bg-[#498467]" />}
                </button>
              ))}
            </div>
          </div>
          <div className="w-full max-w-full overflow-hidden">
            <div ref={tabContentRef} onScroll={handleTabScroll} className="flex w-full max-w-full snap-x snap-mandatory overflow-x-auto no-scrollbar">
              <div className="box-border w-full min-w-full max-w-full shrink-0 snap-start px-4 py-4">
                <div className="flex w-full min-w-0 flex-col gap-4">
                  {activity.map((item) => <ActivityCard key={item.id} activity={item} navigate={navigate} profile={buyerProfile} />)}
                </div>
              </div>
              <CommunityImpactTab metrics={impactMetrics} />
              <ReviewsTab reviews={buyerReviews} navigate={navigate} />
            </div>
          </div>
        </div>
      </div>
      </MobileScreenLayout>
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} mode="buyer" />
    </>
  );
}

function buildActivity() {
  const post = communityPosts[0];
  const regrownPost = followingPosts[0];
  const event = events[0];
  const listing = products[0];
  const promotion = promotions[0];

  return [
    { id: "activity-post", type: "post", label: "Posted to the community", timestamp: "Today · 10:30 AM", post },
    { id: "activity-regrow-post", type: "post", label: "🌱 Regrew a community post", timestamp: "Yesterday · 4:20 PM", post: regrownPost },
    { id: "activity-regrow-event", type: "event", label: "🎉 Regrew an event", timestamp: "2 days ago", event },
    { id: "activity-regrow-listing", type: "listing", label: "🌱 Regrew a listing", timestamp: "3 days ago", listing },
    { id: "activity-comment", type: "comment", label: "💬 Commented on a post", timestamp: "4 days ago", post, text: "These look amazing! I will stop by this weekend." },
    { id: "activity-saved", type: "listing", label: "❤️ Saved a listing", timestamp: "5 days ago", listing: products[1] },
    { id: "activity-promotion", type: "promotion", label: "Interacted with a community promotion", timestamp: "6 days ago", promotion, listing },
  ];
}

export function TrustStatusBadge({ buyerId = "you" }) {
  const navigate = useNavigate();
  const { getBuyerTrust } = useBuyerTrust();
  const trust = getBuyerTrust(buyerId) ?? {};
  const { current = BUYER_TRUST_LEVELS[0] } = getBuyerTrustLevel(trust);
  return <button type="button" onClick={() => navigate("/trust-reputation")} aria-label={`Open ${current.name} trust details`} className="group mt-1 inline-flex w-fit items-center gap-1 rounded-md text-[13px] font-medium text-[#498467] transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#498467]"><TrustLevelIcon name={current.icon} className="h-4 w-4" /><span className="group-hover:underline">{current.name}</span><span aria-hidden="true" className="text-[15px] opacity-60">›</span></button>;
}

function TrustReputationCard({ buyerId = "you" }) {
  const navigate = useNavigate();
  const { getBuyerTrust } = useBuyerTrust();
  const trust = getBuyerTrust(buyerId) ?? {};
  const { current = BUYER_TRUST_LEVELS[0] } = getBuyerTrustLevel(trust);
  return <button type="button" onClick={() => navigate("/trust-reputation")} aria-label="Open Trust and Reputation details" className="group mt-4 w-full rounded-lg border border-[#CFF7D3] bg-[#F5FFF6] p-4 text-left transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#498467]"><div className="flex items-center justify-between"><div className="text-[12px] font-medium uppercase tracking-[0.4px] text-[#498467]">Trust & Reputation</div><span aria-hidden="true" className="text-[20px] text-[#498467] opacity-60 transition-transform group-hover:translate-x-0.5">›</span></div><div className="mt-2 flex items-center gap-2 text-[17px] font-semibold"><TrustLevelIcon name={current.icon} /> {current.name}</div><div className="mt-3 grid grid-cols-3 gap-2 text-[11px] leading-[130%] text-[#828282]"><div><div className="text-[17px] font-semibold text-[#498467]">{trust.completedTransactions ?? 0}</div>Completed Transactions</div><div><div className="text-[17px] font-semibold text-[#498467]">{trust.sellerRecommendations ?? 0}</div>Seller Recommended</div><div><div className="text-[17px] font-semibold text-[#498467]">{trust.wouldTransactAgain ?? 0}</div>Would Transact Again</div></div></button>;
}

export function CommunityImpactTab({ metrics, publicView = false, profileId = "you" }) {
  const safeMetrics = {
    businessesSupported: 0,
    purchasesMade: 0,
    eventsAttended: 0,
    storesFollowed: 0,
    reviewsWritten: 0,
    ...(metrics ?? {}),
  };
  const impactTotal = Object.values(safeMetrics).reduce((total, value) => total + (typeof value === "number" ? value : 0), 0);
  const impactStats = [
    { label: "Local businesses supported", value: safeMetrics.businessesSupported },
    { label: "Local purchases made", value: safeMetrics.purchasesMade },
    { label: "Events attended", value: safeMetrics.eventsAttended },
    { label: "Stores followed", value: safeMetrics.storesFollowed },
    { label: "Reviews written", value: safeMetrics.reviewsWritten },
  ];
  const impactBadges = [
    { name: "Local Supporter", progress: `${safeMetrics.purchasesMade} / 5 purchases completed`, value: safeMetrics.purchasesMade, goal: 5 },
    { name: "Market Explorer", progress: `${safeMetrics.businessesSupported} / 5 local businesses visited`, value: safeMetrics.businessesSupported, goal: 5 },
    { name: "Trusted Reviewer", progress: `${safeMetrics.reviewsWritten} / 25 reviews written`, value: safeMetrics.reviewsWritten, goal: 25 },
    { name: "Community Champion", progress: `${impactTotal} community actions completed`, value: impactTotal, goal: 50 },
  ];
  return (
    <div className="box-border w-full min-w-full max-w-full shrink-0 snap-start px-4 py-4">
      <div className="rounded-lg bg-[#498467] p-5 text-white">
        <h2 className="text-[20px] font-semibold">{publicView ? "Community Impact" : "Your Community Impact"}</h2>
        <p className="mt-1 text-[14px] leading-[140%] text-white/80">{publicView ? "Supported local businesses and strengthened the community." : "Because of you, local businesses continue to grow."}</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {impactStats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-[#E6E6E6] bg-white p-3">
            <div className="text-[22px] font-semibold text-[#498467]">{stat.value}</div>
            <div className="text-[12px] leading-[130%] text-[#828282]">{stat.label}</div>
          </div>
        ))}
      </div>
      <TrustReputationCard buyerId={profileId} />
      <section className="mt-5">
        <h3 className="text-[18px] font-semibold">Impact timeline</h3>
        <div className="mt-3 flex flex-col">
          {(publicView ? impactTimeline.filter((item) => !/saved/i.test(item)) : impactTimeline).map((item, index) => (
            <div key={item} className="flex gap-3">
              <div className="flex flex-col items-center"><span className="mt-1 h-3 w-3 rounded-full bg-[#498467]" />{index < impactTimeline.length - 1 && <span className="h-full w-px bg-[#CFF7D3]" />}</div>
              <p className="pb-5 text-[14px] leading-[140%]">{item}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="mt-1 pb-4">
        <h3 className="text-[18px] font-semibold">Achievement badges</h3>
        <div className="mt-3 flex flex-col gap-3">
          {impactBadges.map((badge) => (
            <div key={badge.name} className="rounded-lg border border-[#E6E6E6] p-3">
              <div className="flex items-center justify-between gap-3"><span className="text-[14px] font-semibold">{badge.name}</span><span className="text-[12px] text-[#828282]">{badge.progress}</span></div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#E6E6E6]"><div className="h-full rounded-full bg-[#498467]" style={{ width: `${Math.min((badge.value / badge.goal) * 100, 100)}%` }} /></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function ActivityCard({ activity, navigate, profile }) {
  const openActivity = () => {
    if (activity.type === "event") navigate(`/event/${activity.event.id}`);
    else if (activity.type === "listing" || activity.type === "promotion") navigate(`/product/${activity.listing.id}`);
    else navigate("/comments", { state: { content: { type: "post", post: activity.post } } });
  };

  return (
    <button type="button" onClick={openActivity} className={`w-full rounded-lg border border-[#E6E6E6] p-3 text-left transition-colors hover:bg-[#F5FFF6]`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <img src={profile?.avatar ?? activity.post?.avatar ?? activity.event?.avatar} alt={profile?.username ?? activity.post?.name ?? activity.event?.title} className="h-8 w-8 rounded-full object-cover" />
          <div>
            <p className="text-[14px] font-semibold">{activity.label}</p>
            <p className="text-[12px] text-[#828282]">{activity.timestamp}</p>
          </div>
        </div>
        <span className="text-[12px] text-[#498467]">{activity.type}</span>
      </div>
      {activity.type === "event" ? <EventPreview event={activity.event} /> : activity.type === "listing" ? <ListingPreview listing={activity.listing} /> : activity.type === "promotion" ? <PromotionPreview promotion={activity.promotion} listing={activity.listing} /> : <PostPreview post={activity.post} text={activity.text} />}
    </button>
  );
}

export function ReviewsTab({ reviews, navigate }) {
  const safeReviews = Array.isArray(reviews) ? reviews : [];
  return (
    <div className="box-border w-full min-w-full max-w-full shrink-0 snap-start px-4 py-4">
      {safeReviews.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-[14px] text-[#828282]">No reviews written yet.</p>
          <p className="mt-1 text-[13px] leading-[140%] text-[#828282]">Support local businesses and share your experiences with the community.</p>
        </div>
      ) : (
        <div className="flex w-full min-w-0 flex-col gap-3">
          {safeReviews.map((review, index) => <BuyerReviewCard key={review.id ?? `review-${index}`} review={review} navigate={navigate} />)}
        </div>
      )}
    </div>
  );
}

function PostPreview({ post, text }) {
  return <><img src={post.image} alt="" className="mt-3 aspect-square w-full rounded-lg object-cover" /><p className="mt-2 text-[14px] leading-[140%]">{text || post.body}</p></>;
}

function EventPreview({ event }) {
  return <><img src={event.image} alt={event.title} className="mt-3 aspect-square w-full rounded-lg object-cover" /><h3 className="mt-2 text-[15px] font-semibold">{event.title}</h3><p className="mt-1 text-[13px] text-[#828282]">{formatEventDate(event.date)} · {formatEventTime(event.startTime)} · {event.location}</p><EventAttendanceCount eventId={event.id} className="mt-1 block" /></>;
}

function ListingPreview({ listing }) {
  return <><img src={listing.image} alt={listing.name} className="mt-3 aspect-square w-full rounded-lg object-cover" /><ServiceCategoryLabel listing={listing} className="mt-2 block" /><p className="mt-1 text-[14px] font-semibold">{listing.name}</p><p className="text-[14px] text-[#498467]">{listing.shop} · {formatListingPrice(listing)}</p></>;
}

function PromotionPreview({ promotion, listing }) {
  return <><div className="mt-3 rounded-lg bg-[#F5FFF6] p-3"><p className="text-[12px] font-medium text-[#498467]">{promotion.title}</p><p className="mt-1 text-[14px] font-semibold">{listing.name}</p></div></>;
}

function BuyerStat({ label, value }) {
  return <div className="rounded-lg bg-[#F5FFF6] p-2"><div className="text-[18px] font-semibold text-[#498467]">{value}</div><div className="text-[11px] leading-[120%] text-[#498467]">{label}</div></div>;
}
