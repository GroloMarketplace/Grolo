import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import ProfileSwitcher from "../components/ProfileSwitcher";
import Sidebar from "../components/Sidebar";
import { useSidebar } from "../hooks/useSidebar";
import { communityPosts, events, followingPosts, products, promotions } from "../data/mockData";
import { formatEventDate, formatEventTime } from "../context/EventContext";
import { impactBadges, impactStats, impactTimeline } from "../data/communityImpact";
import { getCommunityStatus } from "../data/communityStatus";

const BUYER = {
  username: "remi",
  location: "Kensington, Calgary",
  bio: "Discovering local makers, businesses, and community moments around Calgary.",
  banner: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80",
  avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&q=80",
};

export default function BuyerProfile() {
  const navigate = useNavigate();
  const { isSidebarOpen, openSidebar, closeSidebar } = useSidebar();
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const tabContentRef = useRef(null);
  const activity = buildActivity();

  const handleTabChange = (index) => {
    setActiveTab(index);
    tabContentRef.current?.scrollTo({
      left: index * tabContentRef.current.clientWidth,
      behavior: "smooth",
    });
  };

  const handleTabScroll = (event) => {
    const index = Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth);
    if (index !== activeTab) setActiveTab(index);
  };

  return (
    <>
      <MobileScreenLayout>
      <Header titleContent={<ProfileSwitcher />} onMenu={openSidebar} />
      <div className="overflow-y-auto flex-1 no-scrollbar">
        <div className="relative h-[136px]">
          <img src={BUYER.banner} alt="Buyer profile banner" className="h-full w-full object-cover" />
        </div>
        <div className="relative z-10 -mt-8 px-4">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <img src={BUYER.avatar} alt={BUYER.username} className="h-16 w-16 rounded-full border-2 border-white object-cover shadow" />
              <div className="flex-1">
                {editing ? <input defaultValue={BUYER.username} className="w-full border-b border-[#E6E6E6] text-[20px] font-semibold outline-none" /> : <h1 className="text-[20px] font-semibold">{BUYER.username}</h1>}
                <CommunityStatusBadge />
                <p className="text-[14px] text-[#828282]">{BUYER.location}</p>
              </div>
            </div>
            <p className="mt-3 text-[14px] leading-[140%]">{BUYER.bio}</p>
            <button type="button" onClick={() => setEditing((current) => !current)} className="mt-4 w-full rounded-lg border border-[#498467] py-2.5 text-[14px] font-medium text-[#498467]">{editing ? "Save Profile" : "Edit Profile"}</button>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <BuyerStat label="Stores Followed" value="12" />
              <BuyerStat label="Saved Items" value="18" />
              <BuyerStat label="Reviews Written" value="18" />
              <BuyerStat label="Events Attended" value="6" />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="sticky top-0 z-20 border-y border-[#E6E6E6] bg-white">
            <div className="flex">
              {["My Activity", "Community Impact"].map((tab, index) => (
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
                  {activity.map((item) => <ActivityCard key={item.id} activity={item} navigate={navigate} />)}
                </div>
              </div>
              <CommunityImpactTab />
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

function CommunityStatusBadge() {
  const status = getCommunityStatus();
  return <p className="mt-1 text-[13px] font-medium text-[#498467]">{status.icon} {status.name}</p>;
}

function CommunityStatusCard({ status }) {
  return <section className="rounded-lg border border-[#CFF7D3] bg-[#F5FFF6] p-4"><div className="text-[12px] font-medium uppercase tracking-[0.4px] text-[#498467]">Community Status</div><div className="mt-2 text-[20px] font-semibold">{status.icon} {status.name}</div><div className="mt-3 flex items-center justify-between text-[12px] text-[#828282]"><span>Progress to Next Level</span><span>{status.total} / {status.nextThreshold} actions</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#DDEBDF]"><div className="h-full rounded-full bg-[#498467]" style={{ width: `${status.progress}%` }} /></div></section>;
}

function CommunityImpactTab() {
  const status = getCommunityStatus();
  return (
    <div className="box-border w-full min-w-full max-w-full shrink-0 snap-start px-4 py-4">
      <CommunityStatusCard status={status} />
      <div className="mt-4 rounded-lg bg-[#498467] p-5 text-white">
        <h2 className="text-[20px] font-semibold">Your Community Impact</h2>
        <p className="mt-1 text-[14px] leading-[140%] text-white/80">Because of you, local businesses continue to grow.</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {impactStats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-[#E6E6E6] bg-white p-3">
            <div className="text-[22px] font-semibold text-[#498467]">{stat.value}</div>
            <div className="text-[12px] leading-[130%] text-[#828282]">{stat.label}</div>
          </div>
        ))}
      </div>
      <section className="mt-5">
        <h3 className="text-[18px] font-semibold">Impact timeline</h3>
        <div className="mt-3 flex flex-col">
          {impactTimeline.map((item, index) => (
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

function ActivityCard({ activity, navigate }) {
  const openActivity = () => {
    if (activity.type === "event") navigate(`/event/${activity.event.id}`);
    else if (activity.type === "listing" || activity.type === "promotion") navigate(`/product/${activity.listing.id}`);
    else navigate("/comments", { state: { content: { type: "post", post: activity.post } } });
  };

  return (
    <button type="button" onClick={openActivity} className="w-full rounded-lg border border-[#E6E6E6] p-3 text-left transition-colors hover:bg-[#F5FFF6]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <img src={BUYER.avatar} alt={BUYER.username} className="h-8 w-8 rounded-full object-cover" />
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

function PostPreview({ post, text }) {
  return <><img src={post.image} alt="" className="mt-3 aspect-square w-full rounded-lg object-cover" /><p className="mt-2 text-[14px] leading-[140%]">{text || post.body}</p></>;
}

function EventPreview({ event }) {
  return <><img src={event.image} alt={event.title} className="mt-3 aspect-square w-full rounded-lg object-cover" /><h3 className="mt-2 text-[15px] font-semibold">{event.title}</h3><p className="mt-1 text-[13px] text-[#828282]">{formatEventDate(event.date)} · {formatEventTime(event.startTime)} · {event.location}</p></>;
}

function ListingPreview({ listing }) {
  return <><img src={listing.image} alt={listing.name} className="mt-3 aspect-square w-full rounded-lg object-cover" /><p className="mt-2 text-[14px] font-semibold">{listing.name}</p><p className="text-[14px] text-[#498467]">{listing.shop} · ${listing.price.toFixed(2)}</p></>;
}

function PromotionPreview({ promotion, listing }) {
  return <><div className="mt-3 rounded-lg bg-[#F5FFF6] p-3"><p className="text-[12px] font-medium text-[#498467]">{promotion.title}</p><p className="mt-1 text-[14px] font-semibold">{listing.name}</p></div></>;
}

function BuyerStat({ label, value }) {
  return <div className="rounded-lg bg-[#F5FFF6] p-2"><div className="text-[18px] font-semibold text-[#498467]">{value}</div><div className="text-[11px] leading-[120%] text-[#498467]">{label}</div></div>;
}
