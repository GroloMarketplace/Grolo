import { useState, useEffect, useRef, useCallback } from "react";
import MobileScreenLayout from "../components/MobileScreenLayout";
import {
  followingPosts,
  notificationsHighlights,
  notificationsFollowers,
} from "../data/mockData";

const TABS = ["Following", "Your Community", "Notifications"];

export default function Feed() {
  const [tab, setTab] = useState("Following");
  const [animating, setAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const mouseDownX = useRef(0);
  const mouseUpX = useRef(0);
  const isDragging = useRef(false);
  const currentTab = useRef(tab);

  useEffect(() => {
    currentTab.current = tab;
  }, [tab]);

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.changedTouches[0].screenX;
  }, []);

  const handleTouchEnd = useCallback((e) => {
    touchEndX.current = e.changedTouches[0].screenX;
    handleSwipe();
  }, []);

  const handleMouseDown = useCallback((e) => {
    isDragging.current = true;
    mouseDownX.current = e.clientX;
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
  }, []);

  const handleMouseUp = useCallback((e) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    mouseUpX.current = e.clientX;
    handleMouseSwipe();
  }, []);

  const handleSwipe = useCallback(() => {
    const swipeThreshold = 50;
    const diff = touchStartX.current - touchEndX.current;
    const currentTabValue = currentTab.current;

    if (Math.abs(diff) > swipeThreshold) {
      const currentIndex = TABS.indexOf(currentTabValue);
      if (diff > 0 && currentIndex < TABS.length - 1) {
        handleTabChange(TABS[currentIndex + 1]);
      } else if (diff < 0 && currentIndex > 0) {
        handleTabChange(TABS[currentIndex - 1]);
      }
    }
  }, []);

  const handleMouseSwipe = useCallback(() => {
    const swipeThreshold = 50;
    const diff = mouseDownX.current - mouseUpX.current;
    const currentTabValue = currentTab.current;

    if (Math.abs(diff) > swipeThreshold) {
      const currentIndex = TABS.indexOf(currentTabValue);
      if (diff > 0 && currentIndex < TABS.length - 1) {
        handleTabChange(TABS[currentIndex + 1]);
      } else if (diff < 0 && currentIndex > 0) {
        handleTabChange(TABS[currentIndex - 1]);
      }
    }
  }, []);

  const handleTabChange = useCallback((newTab) => {
    if (newTab === currentTab.current) return;
    const direction = TABS.indexOf(newTab) > TABS.indexOf(currentTab.current) ? 1 : -1;
    setAnimationDirection(direction);
    setAnimating(true);
    setTimeout(() => setTab(newTab), 100);
    setTimeout(() => setAnimating(false), 300);
  }, []);

  useEffect(() => {
    const element = document.body;
    element.addEventListener("touchstart", handleTouchStart);
    element.addEventListener("touchend", handleTouchEnd);
    element.addEventListener("mousedown", handleMouseDown);
    element.addEventListener("mousemove", handleMouseMove);
    element.addEventListener("mouseup", handleMouseUp);

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchend", handleTouchEnd);
      element.removeEventListener("mousedown", handleMouseDown);
      element.removeEventListener("mousemove", handleMouseMove);
      element.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleTouchStart, handleTouchEnd, handleMouseDown, handleMouseMove, handleMouseUp]);

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
      </div>

      <div className="overflow-hidden">
        <div 
          className={`flex transition-all duration-300 ease-in-out ${
            animating ? 'opacity-0' : 'opacity-100'
          }`}
          style={{
            transform: animating ? `translateX(${animationDirection * 20}px)` : 'translateX(0)'
          }}
        >
          {tab !== "Notifications" && (
            <div className="flex flex-col gap-8 px-4 py-6">
              {followingPosts.map((post) => (
                <Post key={post.id} post={post} />
              ))}
            </div>
          )}

          {tab === "Notifications" && <Notifications />}
        </div>
      </div>
    </MobileScreenLayout>
  );
}

function Post({ post }) {
  return (
    <div className="flex gap-3">
      <img
        src={post.avatar}
        alt={post.name}
        className="w-8 h-8 rounded-full object-cover shrink-0"
      />
      <div className="flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="text-[14px] font-semibold">{post.name}</span>
              <span className="text-[14px] text-[#B56576]">
                in {post.group}
              </span>
            </div>
            <span className="text-[12px] text-[#828282]">{post.time}</span>
          </div>
          <button aria-label="More options">
            <svg width="15" height="3" viewBox="0 0 15 3" fill="none">
              <path
                d="M1.5 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z"
                fill="black"
              />
            </svg>
          </button>
        </div>

        {post.image && (
          <img
            src={post.image}
            alt=""
            className="w-full aspect-square object-cover rounded"
          />
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
  const [sub, setSub] = useState("Highlights");
  const list = sub === "Highlights" ? notificationsHighlights : notificationsFollowers;

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 bg-white z-10 flex justify-center gap-2 pt-6 pb-4">
        {["Highlights", "Followers"].map((s) => (
          <button
            key={s}
            onClick={() => setSub(s)}
            className={`px-3.5 py-1.5 rounded-full text-[14px] font-medium border ${
              sub === s
                ? "bg-black/90 text-white border-transparent"
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
              <button className="shrink-0 h-8 px-4 rounded-lg bg-black text-white text-[14px] font-medium">
                {n.button}
              </button>
            )}
            {n.thumb && (
              <img
                src={n.thumb}
                alt=""
                className="w-12 h-12 rounded-lg object-cover shrink-0"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
