import { useNavigate } from "react-router-dom";
import { impactStats } from "../data/communityImpact";

export default function CommunityImpactCard({ collapsed }) {
  const navigate = useNavigate();

  return (
    <>
      <button
        type="button"
        onClick={() => navigate("/community-impact")}
        aria-label="View Community Impact"
        className={`sticky top-0 z-20 flex w-full items-center justify-between overflow-hidden bg-white/95 text-left transition-all duration-300 ease-out hover:bg-[#F5FFF6] active:bg-[#CFF7D3] ${
          collapsed
            ? "mb-0 max-h-14 translate-y-0 border-b border-[#CFF7D3] py-2 opacity-100"
            : "pointer-events-none -mb-8 max-h-0 -translate-y-2 py-0 opacity-0"
        }`}
      >
        <span className="flex items-center gap-2 text-[#02542D]">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#CFF7D3] text-[#498467]">
            <SproutIcon />
          </span>
          <span className="text-[14px] font-semibold">Your Community Impact</span>
        </span>
        <ChevronIcon />
      </button>

      <section className="rounded-lg border border-[#CFF7D3] bg-[#F5FFF6] p-4">
        <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-semibold text-[#02542D]">Your Community Impact</h2>
          <p className="mt-1 text-[14px] leading-[140%] text-[#498467]">
            Because of you, local businesses continue to grow.
          </p>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#CFF7D3] text-[#498467]">
          <SproutIcon />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {impactStats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-2 rounded-lg bg-white/70 p-2">
            <ImpactIcon type={stat.icon} />
            <div className="min-w-0">
              <div className="text-[16px] font-semibold text-[#02542D]">{stat.value}</div>
              <div className="text-[11px] leading-[120%] text-[#498467]">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => navigate("/community-impact")}
        className="mt-4 text-[14px] font-semibold text-[#498467]"
      >
        View Details
        </button>
      </section>
    </>
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
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="shrink-0 text-[#498467]">
      <path d={paths[type]} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mr-1 shrink-0 text-[#498467]">
      <path d="m6 3 5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SproutIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 21V11m0 0C8 11 5 8.5 5 4c4.5 0 7 2.5 7 7Zm0 2c0-5 3-8 8-8 0 4.5-3 8-8 8Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
