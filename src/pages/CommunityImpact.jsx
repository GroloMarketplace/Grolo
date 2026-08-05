import { useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { impactBadges, impactStats, impactTimeline } from "../data/communityImpact";
import { readNavigationState, writeNavigationState } from "../hooks/navigationState";

export default function CommunityImpact() {
  const navigate = useNavigate();
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
                <ImpactIcon type={stat.icon} />
                <div className="mt-2 text-[22px] font-semibold text-[#498467]">{stat.value}</div>
                <div className="text-[12px] leading-[130%] text-[#828282]">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-[18px] font-semibold">Recent impact</h2>
          <div className="mt-3 flex flex-col">
            {impactTimeline.map((activity, index) => (
              <div key={activity} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="mt-1 h-3 w-3 rounded-full bg-[#498467]" />
                  {index < impactTimeline.length - 1 && <span className="h-full w-px bg-[#CFF7D3]" />}
                </div>
                <p className="pb-5 text-[14px] leading-[140%]">{activity}</p>
              </div>
            ))}
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

function ImpactIcon({ type }) {
  const paths = {
    store: "M3 8.5 4.5 3h11L17 8.5M4 8.5h12v8H4v-8Zm3 8v-4h6v4",
    bag: "M4 6.5h12l-1 10H5l-1-10Zm3 0a3 3 0 0 1 6 0",
    calendar: "M4 5h12v12H4V5Zm3-2v4m6-4v4M4 8h12",
    heart: "M10 16.5S3 12.5 3 7.8a3.3 3.3 0 0 1 6-1.9 3.3 3.3 0 0 1 6 1.9c0 4.7-7 8.7-7 8.7Z",
    star: "m10 2 2.3 4.7 5.2.8-3.8 3.7.9 5.2-4.6-2.4-4.6 2.4.9-5.2-3.8-3.7 5.2-.8L10 2Z",
  };

  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-[#498467]">
      <path d={paths[type]} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
