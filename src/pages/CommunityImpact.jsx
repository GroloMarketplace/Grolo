import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef } from "react";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import ImpactIcon from "../components/ImpactIcon";
import { events as mockEvents, products, sellers } from "../data/mockData";
import { useEvents } from "../context/EventContext";
import { useFollow } from "../context/FollowContext";
import { useListings } from "../context/ListingContext";
import { useOrders } from "../context/OrderContext";
import { useReviews } from "../context/ReviewContext";
import { useAuth } from "../context/AuthContext";
import { getBuyerImpactMetrics } from "../utils/buyerImpact";
import { readNavigationState, writeNavigationState } from "../hooks/navigationState";

function impactTimestamp(value) {
  const timestamp = Date.parse(value ?? "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function formatImpactDate(value) {
  const timestamp = impactTimestamp(value);
  return timestamp ? new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recently";
}

export default function CommunityImpact() {
  const navigate = useNavigate();
  const { events, attendingEventIds, attendanceRows } = useEvents();
  const { user } = useAuth();
  const { followedSellers } = useFollow();
  const { buyerOrders } = useOrders();
  const { listings } = useListings();
  const { reviewsWrittenCount } = useReviews();
  const orders = buyerOrders();
  const metrics = getBuyerImpactMetrics({ orders, events, attendingEventIds, followedSellers, reviewsWritten: reviewsWrittenCount });
  const recentImpact = useMemo(() => {
    const confirmedAttendance = (attendanceRows ?? []).filter((row) => row.user_id === user?.id && row.attendance_status === "confirmed_attended");
    const eventActivities = confirmedAttendance.length ? confirmedAttendance.map((row) => {
        const event = (events ?? mockEvents).find((item) => [item.id, item.databaseId].filter(Boolean).map(String).includes(String(row.event_id)));
        if (!event) return null;
        const date = row.created_at ?? event.date;
        return { id: `event-${row.event_id}`, type: "event", title: `Attended ${event.title}`, date, displayDate: formatImpactDate(date), icon: "calendar" };
      }) : attendingEventIds.map((eventId) => {
        const event = (events ?? mockEvents).find((item) => [item.id, item.databaseId].filter(Boolean).map(String).includes(String(eventId)));
        return event ? { id: `event-${eventId}`, type: "event", title: `Attended ${event.title}`, date: event.date, displayDate: formatImpactDate(event.date), icon: "calendar" } : null;
      });
    const validEventActivities = eventActivities.filter(Boolean);
    const completedOrders = orders.filter((order) => String(order.status).toLowerCase() === "completed");
    const purchaseActivities = completedOrders.map((order) => {
      const listing = listings.find((item) => [item.id, item.databaseId, item.legacyId].filter(Boolean).map(String).includes(String(order.productId)))
        ?? products.find((item) => String(item.id) === String(order.productId));
      const storeName = listing?.shop ?? sellers[order.sellerId]?.name ?? "a local business";
      const date = order.createdAt ?? order.created_at ?? order.date;
      return { id: `purchase-${order.databaseId ?? order.id ?? order.productId}`, type: "purchase", title: `Purchased ${listing?.name ?? "a local item"} from ${storeName}`, date, displayDate: formatImpactDate(date), icon: "bag" };
    });
    const supportedBusinesses = [...new Map(completedOrders.map((order) => {
      const storeName = listings.find((item) => String(item.sellerId) === String(order.sellerId))?.shop ?? sellers[order.sellerId]?.name ?? "a local business";
      const date = order.createdAt ?? order.created_at ?? order.date;
      return [String(order.sellerId ?? storeName), { id: `support-${order.databaseId ?? order.id ?? storeName}`, type: "support", title: `Supported ${storeName}`, date, displayDate: formatImpactDate(date), icon: "store" }];
    })).values()];
    return [...validEventActivities, ...purchaseActivities, ...supportedBusinesses]
      .sort((a, b) => impactTimestamp(b.date) - impactTimestamp(a.date))
      .slice(0, 3);
  }, [attendanceRows, attendingEventIds, events, listings, orders, user?.id]);
  const impactStats = [
    { label: "Local businesses supported", value: metrics.businessesSupported, icon: "store" },
    { label: "Local purchases made", value: metrics.purchasesMade, icon: "bag" },
    { label: "Events attended", value: metrics.eventsAttended, icon: "calendar" },
    { label: "Stores followed", value: metrics.storesFollowed, icon: "heart" },
    { label: "Reviews written", value: metrics.reviewsWritten, icon: "star" },
  ];
  const impactBadges = [
    { name: "Local Supporter", progress: `${metrics.purchasesMade} / 5 purchases completed`, value: metrics.purchasesMade, goal: 5 },
    { name: "Market Explorer", progress: `${metrics.businessesSupported} / 5 local businesses visited`, value: metrics.businessesSupported, goal: 5 },
    { name: "Trusted Reviewer", progress: `${metrics.reviewsWritten} / 25 reviews written`, value: metrics.reviewsWritten, goal: 25 },
    { name: "Community Champion", progress: `${Object.values(metrics).reduce((sum, value) => sum + value, 0)} community actions completed`, value: Object.values(metrics).reduce((sum, value) => sum + value, 0), goal: 50 },
  ];
  const scrollRef = useRef(null);
  const savedImpactState = readNavigationState("community-impact", { scrollTop: 0 });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = savedImpactState.scrollTop;
    const scrollElement = scrollRef.current;
    const saveState = () => writeNavigationState("community-impact", { scrollTop: scrollElement?.scrollTop ?? 0 });
    scrollElement?.addEventListener("scroll", saveState, { passive: true });
    return () => {
      saveState();
      scrollElement?.removeEventListener("scroll", saveState);
    };
  }, []);

  return (
    <MobileScreenLayout>
      <Header title="Community Impact" onBack={() => navigate(-1)} />
      <div ref={scrollRef} className="overflow-y-auto flex-1 no-scrollbar px-4 py-6">
        <div className="rounded-lg bg-[#498467] p-5 text-white">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
            <SproutIcon />
          </div>
          <h1 className="text-[22px] font-semibold tracking-[-0.44px]">Because of you, local businesses continue to grow.</h1>
          <p className="mt-2 text-[14px] leading-[140%] text-white/80">
            Every purchase, visit, follow, and review helps keep our local community thriving.
          </p>
        </div>

        <section className="mt-6">
          <h2 className="text-[18px] font-semibold">Your impact so far</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {impactStats.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-[#E6E6E6] bg-white p-3">
                <ImpactIcon type={stat.icon} size={20} />
                <div className="mt-2 text-[22px] font-semibold text-[#498467]">{stat.value}</div>
                <div className="text-[12px] leading-[130%] text-[#828282]">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-[18px] font-semibold">Recent impact</h2>
          <div className="mt-3 flex flex-col">
            {recentImpact.length ? recentImpact.map((activity, index) => (
              <div key={activity.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#CFF7D3]"><ImpactIcon type={activity.icon} size={14} /></span>
                  {index < recentImpact.length - 1 && <span className="h-full w-px bg-[#CFF7D3]" />}
                </div>
                <div className="pb-5 text-[14px] leading-[140%]"><p>{activity.title}</p><p className="mt-1 text-[12px] text-[#828282]">{activity.displayDate}</p></div>
              </div>
            )) : <p className="rounded-lg border border-[#E6E6E6] px-4 py-5 text-[14px] text-[#828282]">Your recent community activities will appear here as you shop local and attend events.</p>}
          </div>
        </section>

        <section className="mt-1 pb-6">
          <h2 className="text-[18px] font-semibold">Achievements</h2>
          <div className="mt-3 flex flex-col gap-3">
            {impactBadges.map((badge) => (
              <div key={badge.name} className="rounded-lg border border-[#E6E6E6] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#CFF7D3] text-[#498467]">
                      <BadgeIcon />
                    </div>
                    <span className="text-[14px] font-semibold">{badge.name}</span>
                  </div>
                  <span className="text-[12px] text-[#828282]">{badge.progress}</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#E6E6E6]">
                  <div
                    className="h-full rounded-full bg-[#498467]"
                    style={{ width: `${Math.min((badge.value / badge.goal) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </MobileScreenLayout>
  );
}

function SproutIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path d="M12 21V11m0 0C8 11 5 8.5 5 4c4.5 0 7 2.5 7 7Zm0 2c0-5 3-8 8-8 0 4.5-3 8-8 8Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BadgeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="m10 2 2.2 2.2 3.1.1.1 3.1L17.5 10l-2.1 2.6-.1 3.1-3.1.1L10 18l-2.2-2.2-3.1-.1-.1-3.1L2.5 10l2.1-2.6.1-3.1 3.1-.1L10 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="m7.2 10 1.8 1.8 3.8-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
