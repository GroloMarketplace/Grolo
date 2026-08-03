import { useNavigate } from "react-router-dom";

export default function CommunityImpactCard() {
  const navigate = useNavigate();

  return (
    <button type="button" onClick={() => navigate("/community-impact")} aria-label="View Community Impact" className="flex min-h-14 w-full items-center justify-between rounded-lg border border-[#CFF7D3] bg-[#F5FFF6] px-3 py-2 text-left shadow-sm transition-colors hover:bg-[#ECFBEF] active:bg-[#CFF7D3]">
      <span className="flex items-center gap-2 text-[#02542D]"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#CFF7D3] text-[#498467]"><SproutIcon /></span><span className="text-[14px] font-semibold">Your Community Impact</span></span>
      <ChevronIcon />
    </button>
  );
}

function ChevronIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mr-1 shrink-0 text-[#498467]"><path d="m6 3 5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function SproutIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 21V11m0 0C8 11 5 8.5 5 4c4.5 0 7 2.5 7 7Zm0 2c0-5 3-8 8-8 0 4.5-3 8-8 8Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
