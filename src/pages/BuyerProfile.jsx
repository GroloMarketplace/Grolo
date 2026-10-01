import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import ProfileSwitcher from "../components/ProfileSwitcher";
import Sidebar from "../components/Sidebar";
import { useSidebar } from "../hooks/useSidebar";
import { formatEventDate, formatEventTime, useEvents } from "../context/EventContext";
import { formatLocation } from "../data/locations";
import { useFollow } from "../context/FollowContext";
import { getBuyerImpactMetrics } from "../utils/buyerImpact";
import { impactTimeline } from "../data/communityImpact";
import OutlineIcon from "../components/OutlineIcon";
import ImpactIcon from "../components/ImpactIcon";
import { getBuyerTrustLevel, getBuyerStatusPresentation } from "../data/buyerTrust";
import TrustLevelIcon from "../components/TrustLevelIcon";
import { useSavedItems } from "../context/SavedContext";
import { useBuyerTrust } from "../context/BuyerTrustContext";
import { useAuth } from "../context/AuthContext";
import { useBuyerSettings } from "../context/BuyerSettingsContext";
import { useSellerSettings } from "../context/SellerSettingsContext";
import { useOrders } from "../context/OrderContext";
import { readNavigationState, writeNavigationState } from "../hooks/navigationState";
import { formatListingPrice } from "../utils/listingDisplay";
import ServiceCategoryLabel from "../components/ServiceCategoryLabel";
import { EventAttendanceCount } from "../components/EventRsvp";
import SellerReviewCard from "../components/SellerReviewCard";
import ReputationSummary from "../components/ReputationSummary";
import { useReputationSnapshot } from "../hooks/useReputationRead";
import FoundingMemberBadge from "../components/FoundingMemberBadge";
import { useActivity } from "../context/ActivityContext";
import { useRegrow } from "../context/RegrowContext";

const BUYER = {
  username: "remi",
  bio: "Discovering local makers, businesses, and community moments around Calgary.",
  banner: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80",
};

export default function BuyerProfile() {
  const navigate = useNavigate();
  const { isSidebarOpen, openSidebar, closeSidebar } = useSidebar();
  const { settings, updateSettings } = useBuyerSettings();
  const { getSellerProfile } = useSellerSettings();
  const { user } = useAuth();
  const { events: liveEvents, attendingEventIds } = useEvents();
  const { followedSellers } = useFollow();
  const { buyerOrders } = useOrders();
  const { reviewsForBuyer, getBuyerTrust, communityImpact } = useBuyerTrust();
  const reputationSnapshot = useReputationSnapshot("current-user");
  const buyerTrust = getBuyerTrust("you");
  const sellerReviews = useMemo(() => (reviewsForBuyer?.("you") ?? []).sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0)), [reviewsForBuyer]);

  useEffect(() => {
  }, [sellerReviews, user?.id]);
  const localImpactMetrics = getBuyerImpactMetrics({ orders: buyerOrders(), events: liveEvents, attendingEventIds, followedSellers, reviewsWritten: sellerReviews.length });
  const impactMetrics = {
    ...localImpactMetrics,
    ...Object.fromEntries(Object.entries(communityImpact?.metrics ?? {}).filter(([key]) => ["businessesSupported", "purchasesMade", "eventsAttended", "storesFollowed", "reviewsGiven"].includes(key))),
    reviewsWritten: communityImpact?.metrics?.reviewsGiven ?? localImpactMetrics.reviewsWritten,
    buyerReviewsReceived: buyerTrust.sellerReviews ?? 0,
  };
  const buyerProfile = { ...BUYER, username: settings.displayName, handle: settings.username, bio: settings.bio, avatar: settings.avatar };
  const publicLocation = settings.showLocationPublicly && settings.location.trim() ? `${settings.location.trim()}, Calgary` : "";
  const { savedItems } = useSavedItems();
  const { activities } = useActivity();
  const { regrownIds } = useRegrow();
  const savedProductCount = savedItems.filter((item) => item.type === "listing").length;
  const [savedProfileState] = useState(() => readNavigationState("buyer-profile", { activeTab: 0, scrollTop: 0, tabScrollLeft: 0 }));
  const [editing, setEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileDraft, setProfileDraft] = useState(() => ({
    displayName: settings.displayName,
    username: settings.username,
    bio: settings.bio,
    location: settings.location,
    showLocationPublicly: settings.showLocationPublicly,
  }));
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
    if (!editing) {
      setProfileDraft({
        displayName: settings.displayName,
        username: settings.username,
        bio: settings.bio,
        location: settings.location,
        showLocationPublicly: settings.showLocationPublicly,
      });
    }
  }, [editing, settings]);

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
  const activity = buildActivity(activities, savedItems, followedSellers, regrownIds);

  const handleProfileChange = (field, value) => {
    setProfileDraft((current) => ({ ...current, [field]: value }));
    setProfileError("");
  };

  const handleProfileButton = async () => {
    if (!editing) {
      setProfileDraft({
        displayName: settings.displayName,
        username: settings.username,
        bio: settings.bio,
        location: settings.location,
        showLocationPublicly: settings.showLocationPublicly,
      });
      setProfileError("");
      setEditing(true);
      return;
    }

    setSavingProfile(true);
    setProfileError("");
    try {
      await updateSettings(profileDraft);
      setEditing(false);
    } catch (error) {
      setProfileError(error.message || "We couldn't save your profile. Please try again.");
    } finally {
      setSavingProfile(false);
    }
  };

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
                {editing ? (
                  <label className="flex flex-col gap-1 text-[11px] font-medium text-[#828282]">
                    Display name
                    <input value={profileDraft.displayName} onChange={(event) => handleProfileChange("displayName", event.target.value)} className="w-full rounded-md border border-[#E6E6E6] px-2 py-1 text-[20px] font-semibold text-black outline-none focus:border-[#498467]" />
                  </label>
                ) : <h1 className="text-[20px] font-semibold">{buyerProfile.username || "Your profile"}</h1>}
                {editing ? (
                  <label className="mt-2 flex flex-col gap-1 text-[11px] font-medium text-[#828282]">
                    Username
                    <input value={profileDraft.username} onChange={(event) => handleProfileChange("username", event.target.value)} className="w-full rounded-md border border-[#E6E6E6] px-2 py-1 text-[12px] text-black outline-none focus:border-[#498467]" />
                  </label>
                ) : <p className="text-[12px] text-[#828282]">@{buyerProfile.handle}</p>}
                <FoundingMemberBadge sellerId="current-user" />
                <TrustStatusBadge status={reputationSnapshot?.buyerStatus} buyerId="you" />
                {editing ? (
                  <label className="mt-2 flex flex-col gap-1 text-[11px] font-medium text-[#828282]">
                    Location
                    <input value={profileDraft.location} onChange={(event) => handleProfileChange("location", event.target.value)} placeholder="City or neighborhood" className="w-full rounded-md border border-[#E6E6E6] px-2 py-1 text-[13px] text-black outline-none focus:border-[#498467]" />
                  </label>
                ) : publicLocation && <p className="mt-0.5 flex items-center gap-1 text-[13px] text-[#828282]"><OutlineIcon name="location" size={14} />{publicLocation}</p>}
              </div>
            </div>
            {editing ? (
              <label className="mt-3 flex flex-col gap-1 text-[11px] font-medium text-[#828282]">
                Bio
                <textarea value={profileDraft.bio} onChange={(event) => handleProfileChange("bio", event.target.value)} rows={3} className="resize-none rounded-md border border-[#E6E6E6] px-2 py-2 text-[14px] font-normal text-black outline-none focus:border-[#498467]" />
              </label>
            ) : <p className="mt-3 text-[14px] leading-[140%]">{buyerProfile.bio}</p>}
            {editing && <label className="mt-3 flex items-center gap-2 text-[13px] text-[#505050]"><input type="checkbox" checked={profileDraft.showLocationPublicly} onChange={(event) => handleProfileChange("showLocationPublicly", event.target.checked)} className="h-4 w-4 accent-[#498467]" />Show location publicly</label>}
            {profileError && <p role="alert" className="mt-3 text-[13px] text-red-600">{profileError}</p>}
            <button type="button" disabled={savingProfile} onClick={handleProfileButton} className="mt-4 w-full rounded-lg border border-[#498467] py-2.5 text-[14px] font-medium text-[#498467] disabled:cursor-wait disabled:opacity-60">{savingProfile ? "Saving…" : editing ? "Save Profile" : "Edit Profile"}</button>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <BuyerStat icon="users" label="Stores Followed" value={impactMetrics.storesFollowed} />
              <button type="button" onClick={() => navigate("/saved")} className="text-left"><BuyerStat icon="heart" label="Saved Items" value={savedProductCount} /></button>
              <BuyerStat icon="star" label="Seller Reviews" value={sellerReviews.length} />
              <BuyerStat icon="calendar" label="Events Attended" value={impactMetrics.eventsAttended} />
            </div>
            <ReputationSummary snapshot={reputationSnapshot} audience="buyer" className="mt-4" />
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
                {activity.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-[14px] text-[#828282]">No activity yet.</p>
                    <p className="mt-1 text-[13px] leading-[140%] text-[#828282]">Posts, saves, and community interactions will appear here.</p>
                  </div>
                ) : (
                  <div className="flex w-full min-w-0 flex-col gap-4">
                    {activity.map((item) => <ActivityCard key={item.id} activity={item} navigate={navigate} profile={buyerProfile} getSellerProfile={getSellerProfile} />)}
                  </div>
                )}
              </div>
              <CommunityImpactTab metrics={impactMetrics} profileId="you" buyerStatus={reputationSnapshot?.buyerStatus} />
              <ReviewsTab reviews={sellerReviews} />
            </div>
          </div>
        </div>
      </div>
      </MobileScreenLayout>
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} mode="buyer" />
    </>
  );
}

function buildActivity(activities, savedItems, followedSellers, regrownIds) {
  // Real activity is generated as the buyer interacts with the marketplace.
  // New accounts should start with no activity rather than sample entries.
  const safeSavedItems = Array.isArray(savedItems) ? savedItems.filter(Boolean) : [];
  const safeFollowedSellers = Array.isArray(followedSellers) ? followedSellers.filter(Boolean) : [];
  const safeRegrownIds = Array.isArray(regrownIds) ? regrownIds.filter(Boolean) : [];
  const fallbackActivities = [
    ...safeSavedItems.map((item) => ({ id: `save:${item.id}`, type: item.type === "event" ? "Save event" : "Save listing", label: `Saved ${item.name ?? item.title ?? "community content"}`, timestamp: item.createdAt, content: item })),
    ...safeFollowedSellers.map((sellerId) => ({ id: `follow:${sellerId}`, type: "Follow store", label: "Followed a store", entityId: sellerId })),
    ...safeRegrownIds.map((itemId) => ({ id: `regrow:${itemId}`, type: "Regrow", label: "Regrew community content", entityId: itemId })),
  ];
  const merged = new Map(fallbackActivities.map((activity) => [activity.id, activity]));
  (Array.isArray(activities) ? activities : []).forEach((activity) => {
    if (!activity || typeof activity !== "object" || !activity.id) return;
    const savedListing = activity.type === "Save listing"
      ? safeSavedItems.find((item) => [item.id, item.sourceId, item.databaseId].filter(Boolean).map(String).includes(String(activity.entityId)))
      : null;
    merged.set(activity.id, savedListing && !activity.content ? { ...activity, content: savedListing } : activity);
  });
  return [...merged.values()].sort((first, second) => new Date(second.timestamp ?? 0) - new Date(first.timestamp ?? 0));
}

export function TrustStatusBadge({ status }) {
  const navigate = useNavigate();
  const current = getBuyerStatusPresentation(status?.currentStatus);
  if (!status?.currentStatus) return null;
  return <button type="button" onClick={() => navigate("/trust-reputation")} aria-label={`Open ${current.name} trust details`} className="group mt-1 inline-flex w-fit items-center gap-1 rounded-md text-[13px] font-medium text-[#498467] transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#498467]"><TrustLevelIcon name={current.icon} className="h-4 w-4" /><span className="group-hover:underline">{current.name}</span><span aria-hidden="true" className="text-[15px] opacity-60">›</span></button>;
}

function TrustReputationCard({ buyerId = "you", status }) {
  const navigate = useNavigate();
  const { getBuyerTrust } = useBuyerTrust();
  const trust = getBuyerTrust(buyerId) ?? {};
  const current = getBuyerStatusPresentation(status?.currentStatus) ?? getBuyerTrustLevel(trust).current;
  return <button type="button" onClick={() => navigate("/trust-reputation")} aria-label="Open Trust and Reputation details" className="group mt-4 w-full rounded-lg border border-[#CFF7D3] bg-[#F5FFF6] p-4 text-left transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#498467]"><div className="flex items-center justify-between"><div className="text-[12px] font-medium uppercase tracking-[0.4px] text-[#498467]">Trust & Reputation</div><span aria-hidden="true" className="text-[20px] text-[#498467] opacity-60 transition-transform group-hover:translate-x-0.5">›</span></div><div className="mt-2 flex items-center gap-2 text-[17px] font-semibold"><TrustLevelIcon name={current.icon} /> {current.name}</div><div className="mt-3 grid grid-cols-2 gap-2 text-[11px] leading-[130%] text-[#828282]"><div><div className="text-[17px] font-semibold text-[#498467]">{trust.completedTransactions ?? 0}</div>Completed Transactions</div><div><div className="text-[17px] font-semibold text-[#498467]">{trust.sellerRecommendations ?? 0}</div>Seller Recommended</div></div></button>;
}

export function CommunityImpactTab({ metrics, publicView = false, profileId = "you", buyerStatus }) {
  const safeMetrics = {
    businessesSupported: 0,
    purchasesMade: 0,
    eventsAttended: 0,
    storesFollowed: 0,
    reviewsWritten: 0,
    ...(metrics ?? {}),
  };
  const impactTotal = ["businessesSupported", "purchasesMade", "eventsAttended", "storesFollowed", "reviewsWritten"]
    .reduce((total, key) => total + (Number(safeMetrics[key]) || 0), 0);
  const impactStats = [
    { label: "Local businesses supported", value: safeMetrics.businessesSupported, icon: "store" },
    { label: "Local purchases made", value: safeMetrics.purchasesMade, icon: "bag" },
    { label: "Events attended", value: safeMetrics.eventsAttended, icon: "calendar" },
    { label: "Stores followed", value: safeMetrics.storesFollowed, icon: "heart" },
    { label: "Seller reviews", value: safeMetrics.reviewsWritten, icon: "star" },
  ];
  const buyerReviewsReceived = Number(safeMetrics.buyerReviewsReceived) || 0;
  const impactBadges = [
    { name: "Local Supporter", progress: `${safeMetrics.purchasesMade} / 5 purchases completed`, value: safeMetrics.purchasesMade, goal: 5 },
    { name: "Market Explorer", progress: `${safeMetrics.businessesSupported} / 5 local businesses visited`, value: safeMetrics.businessesSupported, goal: 5 },
    { name: "Trusted Buyer", progress: `${buyerReviewsReceived} / 1 buyer review received`, value: buyerReviewsReceived, goal: 1 },
    { name: "Established Buyer", progress: `${buyerReviewsReceived} / 5 buyer reviews received`, value: buyerReviewsReceived, goal: 5 },
    { name: "Community Favorite Buyer", progress: `${buyerReviewsReceived} / 10 buyer reviews received`, value: buyerReviewsReceived, goal: 10 },
    { name: "Marketplace Trusted Buyer", progress: `${buyerReviewsReceived} / 25 buyer reviews received`, value: buyerReviewsReceived, goal: 25 },
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
            <ImpactIcon type={stat.icon} size={20} />
            <div className="mt-2 text-[22px] font-semibold text-[#498467]">{stat.value}</div>
            <div className="text-[12px] leading-[130%] text-[#828282]">{stat.label}</div>
          </div>
        ))}
      </div>
      <TrustReputationCard buyerId={profileId} status={buyerStatus} />
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

export function ActivityCard({ activity: rawActivity, navigate, profile, getSellerProfile }) {
  const activity = rawActivity && typeof rawActivity === "object" ? rawActivity : {};
  const content = activity.content ?? activity.event ?? activity.listing ?? activity.post ?? null;
  const contentType = content?.type ?? activity.contentType ?? (activity.type === "Save event" ? "event" : activity.type === "Save listing" ? "listing" : activity.entityId?.startsWith("event:") ? "event" : activity.entityId?.startsWith("post:") ? "post" : null);
  const event = contentType === "event" && content && typeof content === "object" ? content.event ?? content : null;
  const listing = contentType === "listing" && content && typeof content === "object" ? content.listing ?? content : null;
  const post = contentType === "post" && content && typeof content === "object" ? content.post ?? content : null;
  const followedStore = activity.type === "Follow store" ? getSellerProfile?.(activity.entityId) : null;
  const isSavedListing = activity.type === "Save listing" && Boolean(listing);
  const openActivity = () => {
    if (activity.type === "Follow store" && (followedStore?.id || activity.entityId)) navigate(`/seller/${encodeURIComponent(followedStore?.id ?? activity.entityId)}`);
    else if (event?.id) navigate(`/event/${event.id}`);
    else if (listing?.id || listing?.sourceId) navigate(`/product/${listing.databaseId ?? listing.id ?? listing.sourceId}`);
    else if (post) navigate("/comments", { state: { content: { type: "post", post } } });
  };
  const avatar = followedStore?.avatar ?? profile?.avatar ?? post?.avatar ?? event?.avatar ?? listing?.image;
  const activityLabel = followedStore?.name || (isSavedListing ? `Saved ${listing.name ?? listing.title ?? "listing"}` : activity.label);
  const timestamp = activity.timestamp ? new Date(activity.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
  const preview = followedStore ? <StorePreview store={followedStore} /> : event ? <EventPreview event={event} /> : listing ? <ListingPreview listing={listing} /> : post ? <PostPreview post={post} text={activity.text} /> : <p className="mt-3 rounded-md bg-[#F5FFF6] p-3 text-[13px] text-[#4F4F4F]">The original content is no longer available.</p>;
  const actionLabel = followedStore ? "View Store" : isSavedListing ? "View Listing" : "";

  return (
    <article
      className="w-full rounded-lg border border-[#E6E6E6] p-3 text-left transition-colors hover:bg-[#F5FFF6]"
      onClick={!actionLabel ? openActivity : undefined}
      onKeyDown={!actionLabel ? (event) => { if (event.key === "Enter" || event.key === " ") openActivity(); } : undefined}
      role={!actionLabel ? "button" : undefined}
      tabIndex={!actionLabel ? 0 : undefined}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {avatar && <img src={avatar} alt={followedStore?.name ?? profile?.username ?? post?.name ?? event?.title ?? listing?.name ?? "Profile"} className="h-8 w-8 shrink-0 rounded-full object-cover" />}
          <div className="min-w-0"><p className="truncate text-[14px] font-semibold">{activityLabel}</p><p className="text-[12px] text-[#828282]">{timestamp}</p></div>
        </div>
        <span className="shrink-0 text-[12px] text-[#498467]">{activity.type}</span>
      </div>
      {preview}
      {actionLabel && <button type="button" onClick={openActivity} className="mt-3 w-full rounded-lg border border-[#498467] py-2.5 text-[14px] font-medium text-[#498467]">{actionLabel}</button>}
    </article>
  );
}

export function ReviewsTab({ reviews }) {
  const safeReviews = Array.isArray(reviews) ? reviews : [];
  return (
    <div className="box-border w-full min-w-full max-w-full shrink-0 snap-start px-4 py-4">
      {safeReviews.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-[14px] text-[#828282]">No reviews yet.</p>
          <p className="mt-1 text-[13px] leading-[140%] text-[#828282]">Seller feedback will appear here after completed transactions.</p>
        </div>
      ) : (
        <div className="flex w-full min-w-0 flex-col gap-3">
          {safeReviews.map((review, index) => <SellerReviewCard key={review.id ?? `seller-review-${index}`} review={review} />)}
        </div>
      )}
    </div>
  );
}

function PostPreview({ post, text }) {
  if (!post) return null;
  return <><img src={post.image} alt="" className="mt-3 aspect-square w-full rounded-lg object-cover" /><p className="mt-2 text-[14px] leading-[140%]">{text || post.body}</p></>;
}

function EventPreview({ event }) {
  if (!event || typeof event !== "object") return <p className="mt-3 rounded-md bg-[#F5FFF6] p-3 text-[13px] text-[#4F4F4F]">This event is no longer available.</p>;
  return <><img src={event.image ?? ""} alt={event.title ?? "Event"} className="mt-3 aspect-square w-full rounded-lg object-cover" /><h3 className="mt-2 text-[15px] font-semibold">{event.title ?? "Event unavailable"}</h3><p className="mt-1 text-[13px] text-[#828282]">{event.date ? formatEventDate(event.date) : "Date unavailable"}{event.startTime ? ` · ${formatEventTime(event.startTime)}` : ""}{formatLocation(event) ? ` · ${formatLocation(event)}` : ""}</p>{event.id ? <EventAttendanceCount eventId={event.id} className="mt-1 block" /> : null}</>;
}

function StorePreview({ store }) {
  if (!store) return null;
  return <div className="mt-3 rounded-lg bg-[#F5FFF6] p-3"><div className="flex items-center gap-3">{store.avatar ? <img src={store.avatar} alt={store.name || "Store"} className="h-14 w-14 rounded-lg object-cover" /> : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#DCEBE0] text-[11px] font-semibold text-[#498467]">Store</div>}<div className="min-w-0"><h3 className="truncate text-[15px] font-semibold">{store.name || "Store"}</h3><p className="mt-1 line-clamp-2 text-[13px] leading-5 text-[#4F4F4F]">{store.description || "View this store profile and its listings."}</p></div></div></div>;
}

function ListingPreview({ listing }) {
  if (!listing) return null;
  return <><img src={listing.image} alt={listing.name} className="mt-3 aspect-square w-full rounded-lg object-cover" /><ServiceCategoryLabel listing={listing} className="mt-2 block" /><p className="mt-1 text-[14px] font-semibold">{listing.name}</p><p className="text-[14px] text-[#498467]">{listing.shop || "Local store"} · {formatListingPrice(listing)}</p></>;
}

function PromotionPreview({ promotion, listing }) {
  if (!promotion || !listing) return null;
  return <><div className="mt-3 rounded-lg bg-[#F5FFF6] p-3"><p className="text-[12px] font-medium text-[#498467]">{promotion.title}</p><p className="mt-1 text-[14px] font-semibold">{listing.name}</p></div></>;
}

function BuyerStat({ icon, label, value }) {
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
