import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileScreenLayout from "../components/MobileScreenLayout";
import {
  followingPosts,
  communityPosts,
  notificationsHighlights,
  notificationsFollowers,
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

const TABS = ["Following", "Your Community", "Notifications"];

export default function Feed() {
  const [tab, setTab] = useState("Following");
  const { followedSellers } = useFollow();

  const getPosts = () => {
    switch (tab) {
      case "Following":
        if (followedSellers.length === 0) {
          return [];
        }
        return followingPosts.filter((post) => followedSellers.includes(post.sellerId));
      case "Your Community":
        return communityPosts;
      case "Notifications":
        return null; // Handled separately with sub-tabs
      default:
        return followingPosts;
    }
  };

  const currentPosts = getPosts();

  return (
    <MobileScreenLayout>
      <div className="sticky top-0 bg-white z-10 flex items-center justify-center gap-8 px-4 py-2.5 border-b border-black/5 relative">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-[14px] font-semibold tracking-[-0.28px] relative ${
              tab === t ? "text-[#498467]" : "text-black/40"
            }`}
          >
            {t}
            {tab === t && <div className="absolute -bottom-2.5 left-0 right-0 h-0.5 bg-[#498467]" />}
          </button>
        ))}
      </div>

      <div className="overflow-y-auto flex-1 no-scrollbar">
        {tab === "Following" && (
          <div className="flex flex-col gap-8 px-4 py-6">
            {getPosts().length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[14px] text-[#828282]">Follow stores to see their posts here</p>
              </div>
            ) : (
              getPosts().map((post) => (
                <Post key={post.id} post={post} />
              ))
            )}
          </div>
        )}

        {tab === "Your Community" && <CommunityFeed />}

        {tab === "Notifications" && <Notifications />}
      </div>
    </MobileScreenLayout>
  );
}

function CommunityFeed() {
  const { upcomingEvents } = useEvents();
  const events = upcomingEvents();

  return (
    <div className="flex flex-col gap-8 px-4 py-6">
      {events.map((event) => (
        <EventPost key={event.id} event={event} />
      ))}
      {communityPosts.map((post) => (
        <Post key={post.id} post={post} stacked />
      ))}
    </div>
  );
}

function EventPost({ event }) {
  const navigate = useNavigate();
  const seller = sellers[event.sellerId];
  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [shares, setShares] = useState(event.shares ?? 0);

  const openEvent = () => navigate(`/event/${event.id}`);
  const openSeller = () => seller && navigate(`/seller/${seller.id}`);

  const handleShare = () => {
    const url = `${window.location.origin}/event/${event.id}`;
    setShares((count) => count + 1);
    if (navigator.share) {
      navigator.share({ title: event.title, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).catch(() => {});
    }
  };

  return (
    <div className="flex flex-col gap-3">
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
              <span className="text-[14px] text-[#B56576]">in {event.type}</span>
            </div>
            <span className="text-[12px] text-[#828282]">
              {formatEventDate(event.date)}
            </span>
          </div>
        </div>
        <span className="text-[12px] font-medium px-2 py-1 rounded-full bg-[#CFF7D3] text-[#02542D] whitespace-nowrap">
          {eventStatus(event)}
        </span>
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

function Post({ post, stacked }) {
  const navigate = useNavigate();
  const seller = Object.values(sellers).find((s) => s.name === post.name);

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
        <span className="text-[14px] text-[#B56576]">in {post.group}</span>
      </div>
      <span className="text-[12px] text-[#828282]">{post.time}</span>
    </div>
  );

  const moreButton = (
    <button aria-label="More options">
      <svg width="15" height="3" viewBox="0 0 15 3" fill="none">
        <path
          d="M1.5 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z"
          fill="black"
        />
      </svg>
    </button>
  );

  const content = (
    <>
      {post.image && (
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
      )}

      <p className="text-[14px] leading-[140%]">{post.body}</p>

      <div className="flex items-center gap-11">
        <IconCount label={post.likes}>
          <path
            d="M17.37 3.84a4.13 4.13 0 0 0-6.49-.5L10 4.22l-.88-.88a4.13 4.13 0 0 0-6.13 5.5l.63.88L10 17.19l6.48-6.48.63-.88a4.13 4.13 0 0 0 .26-6.49Z"
            stroke="black"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </IconCount>
        <IconCount label={post.comments}>
          <path
            d="M17.5 12.5a1.67 1.67 0 0 1-1.67 1.67H5.83L2.5 17.5V4.17A1.67 1.67 0 0 1 4.17 2.5h11.66A1.67 1.67 0 0 1 17.5 4.17v8.33Z"
            stroke="black"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </IconCount>
        <IconCount label={post.shares}>
          <path
            d="M5.83 7.5 2.5 4.17 5.83.83M2.5 4.17h11.67a3.33 3.33 0 0 1 3.33 3.33v1.67M14.17 12.5l3.33 3.33-3.33 3.34M17.5 15.83H5.83A3.33 3.33 0 0 1 2.5 12.5v-1.66"
            stroke="#1E1E1E"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </IconCount>
        <IconCount label={post.sends}>
          <path
            d="M18.33 1.67 9.17 10.83M9.17 10.83 1.67 7.5l16.66-5.83-5.83 16.66-3.33-7.5Z"
            stroke="#1E1E1E"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </IconCount>
      </div>
    </>
  );

  if (stacked) {
    return (
      <div className="flex flex-col gap-3">
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
    <div className="flex gap-3">
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

function IconCount({ children, label }) {
  return (
    <div className="flex items-center gap-2">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        {children}
      </svg>
      <span className="text-[14px] font-medium">{label}</span>
    </div>
  );
}

function Notifications() {
  const navigate = useNavigate();
  const [sub, setSub] = useState("Highlights");
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
    <div className="flex flex-col">
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
  );
}
