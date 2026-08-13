import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import OutlineIcon from "../components/OutlineIcon";
import ImpactIcon from "../components/ImpactIcon";
import { ActivityCard, CommunityImpactTab, ReviewsTab, TrustStatusBadge } from "./BuyerProfile";
import { useBuyerTrust } from "../context/BuyerTrustContext";
import { communityPosts, events, notificationsFollowers, notificationsHighlights, products } from "../data/mockData";
import { getBuyerImpactMetrics } from "../utils/buyerImpact";
import { useFollow } from "../context/FollowContext";
import { readNavigationState, writeNavigationState } from "../hooks/navigationState";
import { useReputationSnapshot } from "../hooks/useReputationRead";

const FALLBACK_AVATAR = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80";
const PROFILE_BANNER = "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80";

function getNotificationProfile(userId, state) {
  const notification = [...notificationsHighlights, ...notificationsFollowers].find((item) => item.actorUserId === userId);
  return {
    username: state?.actorUsername ?? notification?.actorUsername ?? notification?.name ?? userId,
    avatar: state?.actorAvatar ?? notification?.avatar ?? FALLBACK_AVATAR,
    bio: "Discovering local makers, businesses, and community moments around Calgary.",
    location: "Calgary",
  };
}

function buildPublicActivity() {
  return [
    { id: "public-post", type: "post", label: "Posted to the community", timestamp: "Today · 10:30 AM", post: communityPosts[5] ?? communityPosts[0] },
    { id: "public-event", type: "event", label: "Attended a community event", timestamp: "2 days ago", event: events[0] },
    { id: "public-regrow", type: "post", label: "Regrew a community post", timestamp: "3 days ago", post: communityPosts[0] },
    { id: "public-review", type: "listing", label: "Reviewed a local product", timestamp: "5 days ago", listing: products[1] },
  ];
}

export default function PublicProfile() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { state } = useLocation();
  const { isFollowing, toggleFollow, getFollowerCount } = useFollow();
  const { reviewsForBuyer } = useBuyerTrust();
  const reputationSnapshot = useReputationSnapshot(userId);
  const profile = getNotificationProfile(userId, state);
  const profileReviews = reviewsForBuyer(profile.username).sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0));
  const activity = buildPublicActivity();
  const reputationMetrics = reputationSnapshot?.communityImpact?.metrics ?? {};
  const metrics = getBuyerImpactMetrics({
    orders: [],
    events,
    attendingEventIds: [],
    followedSellers: [],
    reviewsWritten: reputationMetrics.reviewsGiven ?? profileReviews.length,
  });
  const savedProfileState = readNavigationState(`public-profile-${userId}`, { activeTab: 0, scrollTop: 0, tabScrollLeft: 0 });
  const [activeTab, setActiveTab] = useState(() => Math.min(Math.max(savedProfileState.activeTab, 0), 2));
  const pageScrollRef = useRef(null);
  const tabContentRef = useRef(null);
  const restoredInitialLayout = useRef(false);

  useLayoutEffect(() => {
    if (!restoredInitialLayout.current && pageScrollRef.current) {
      pageScrollRef.current.scrollTop = savedProfileState.scrollTop;
      restoredInitialLayout.current = true;
    }
    if (tabContentRef.current) tabContentRef.current.scrollLeft = activeTab * tabContentRef.current.clientWidth;
  }, [activeTab, savedProfileState.scrollTop]);

  useEffect(() => {
    const saveState = () => writeNavigationState(`public-profile-${userId}`, {
      activeTab,
      scrollTop: pageScrollRef.current?.scrollTop ?? 0,
      tabScrollLeft: tabContentRef.current?.scrollLeft ?? 0,
    });
    const pageScroll = pageScrollRef.current;
    const tabScroll = tabContentRef.current;
    pageScroll?.addEventListener("scroll", saveState, { passive: true });
    tabScroll?.addEventListener("scroll", saveState, { passive: true });
    return () => {
      pageScroll?.removeEventListener("scroll", saveState);
      tabScroll?.removeEventListener("scroll", saveState);
    };
  }, [activeTab, userId]);

  const handleTabChange = (index) => {
    setActiveTab(index);
    tabContentRef.current?.scrollTo({ left: index * (tabContentRef.current?.clientWidth ?? 0), behavior: "auto" });
  };

  const handleMessage = () => {
    navigate(`/messages/${encodeURIComponent(userId)}`, {
      state: {
        pendingConversation: {
          id: userId,
          participantId: userId,
          name: profile.username,
          avatar: profile.avatar,
          location: profile.location,
          messages: [],
        },
      },
    });
  };

  return (
    <MobileScreenLayout>
      <Header title="Profile" onBack={() => navigate(-1)} />
      <div ref={pageScrollRef} className="overflow-y-auto flex-1 no-scrollbar">
        <div className="relative h-[136px]"><img src={PROFILE_BANNER} alt="Community profile banner" className="h-full w-full object-cover" /></div>
        <div className="relative z-10 -mt-8 px-4">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <img src={profile.avatar} alt={profile.username} className="h-16 w-16 rounded-full border-2 border-white object-cover shadow" />
              <div className="flex-1"><h1 className="text-[20px] font-semibold">{profile.username}</h1><p className="text-[14px] text-[#828282]">@{profile.username}</p><div className="mt-0.5 flex flex-col gap-0.5"><TrustStatusBadge buyerId={profile.username} />{profile.location && <p className="flex items-center gap-1 text-[13px] text-[#828282]"><OutlineIcon name="location" size={14} />{profile.location}</p>}</div></div>
            </div>
            <p className="mt-3 text-[14px] leading-[140%]">{profile.bio}</p>
            <div className="mt-4 flex gap-3"><button type="button" onClick={() => toggleFollow(userId)} className="flex-1 rounded-lg bg-[#498467] py-2.5 text-[14px] font-medium text-white">{isFollowing(userId) ? "Following" : "Follow"}</button><button type="button" onClick={handleMessage} className="flex-1 rounded-lg border border-[#498467] py-2.5 text-[14px] font-medium text-[#498467]">Message</button></div>
            <div className="mt-4 grid grid-cols-2 gap-2"><PublicStat icon="users" label="Followers" value={getFollowerCount(userId)} /><PublicStat icon="user" label="Following" value={0} /></div>
          </div>
        </div>
        <div className="mt-4"><div className="sticky top-0 z-20 border-y border-[#E6E6E6] bg-white"><div className="flex">{["My Activity", "Community Impact", "Reviews"].map((tab, index) => <button key={tab} type="button" onClick={() => handleTabChange(index)} className={`relative flex-1 py-3 text-[14px] font-semibold ${activeTab === index ? "text-[#498467]" : "text-black/40"}`}>{tab}{activeTab === index && <span className="absolute bottom-0 left-8 right-8 h-0.5 bg-[#498467]" />}</button>)}</div></div><div className="w-full max-w-full overflow-hidden"><div ref={tabContentRef} className="flex w-full max-w-full snap-x snap-mandatory overflow-x-auto no-scrollbar"><div className="box-border w-full min-w-full max-w-full shrink-0 snap-start px-4 py-4"><div className="flex w-full min-w-0 flex-col gap-4">{activity.map((item) => <ActivityCard key={item.id} activity={item} navigate={navigate} profile={profile} />)}</div></div><CommunityImpactTab metrics={metrics} publicView profileId={profile.username} /><ReviewsTab reviews={profileReviews} navigate={navigate} /></div></div></div>
      </div>
    </MobileScreenLayout>
  );
}

function PublicStat({ icon, label, value }) {
  return (
    <div className="rounded-lg bg-[#F5FFF6] p-2">
      <div className="flex items-center gap-1.5">
        {icon && <ImpactIcon type={icon} size={14} />}
        <div className="text-[18px] font-semibold text-[#498467]">{value}</div>
      </div>
      <div className="text-[11px] leading-[120%] text-[#498467]">{label}</div>
    </div>
  );
}
