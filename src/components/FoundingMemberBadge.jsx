import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function FounderIcon({ compact = false }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={compact ? "h-4 w-4" : "h-5 w-5"}>
      <path d="M7 5.5h10v3.2a5 5 0 0 1-10 0V5.5Z" fill="#D7A84B" stroke="#D7A84B" strokeLinejoin="round" strokeWidth="1.35" />
      <path d="M7 7H5.8a2.2 2.2 0 0 0 0 4.4H8m9-4.4h1.2a2.2 2.2 0 0 1 0 4.4H16" fill="none" stroke="#D7A84B" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.35" />
      <path d="M12 13.8v3.1m-2.2 2h4.4" fill="none" stroke="#D7A84B" strokeLinecap="round" strokeWidth="1.35" />
      <path d="M12 13.5V9.2m0 0C9.5 9.2 7.8 7.7 7.8 5c2.8 0 4.2 1.5 4.2 4.2Zm0 1.4c0-3.1 1.8-5 4.8-5 0 2.8-1.8 5-4.8 5Z" fill="none" stroke="#D7A84B" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.1" />
    </svg>
  );
}

export default function FoundingMemberBadge({ sellerId, ownerId = sellerId, foundingMember = false, compact = false, iconOnly = false, runtimeDiagnostic = false }) {
  const navigate = useNavigate();
  const foundingMemberQualified = Boolean(foundingMember);

  useEffect(() => {
    if (!runtimeDiagnostic) return;
  }, [foundingMember, foundingMemberQualified, ownerId, runtimeDiagnostic, sellerId]);

  if (!foundingMemberQualified) return null;

  const openFoundingMember = (event) => {
    event.stopPropagation();
    navigate(`/founding-member/${encodeURIComponent(sellerId)}`);
  };

  if (iconOnly) {
    return <button type="button" aria-label="Open Founding Member details" title="Founding Member • 2026" onClick={openFoundingMember} className="group inline-flex shrink-0 items-center rounded-md border border-[#E7C66A] bg-[#FFF9E6] px-1.5 py-0.5 leading-none transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F5B1A]"><FounderIcon compact={compact} /><span aria-hidden="true" className="text-[14px] text-[#6F5B1A] opacity-60">›</span></button>;
  }

  return (
    <button type="button" aria-label="Learn more about Founding Member • 2026 status" onClick={openFoundingMember} className={`group inline-flex w-fit items-center gap-1 rounded-md border border-[#E7C66A] bg-[#FFF9E6] px-1.5 py-0.5 font-medium text-[#6F5B1A] transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F5B1A] ${compact ? "text-[10px]" : "text-[11px]"}`}>
      <FounderIcon compact={compact} />
      <span className="group-hover:underline">Founding Member • 2026</span>
      <span aria-hidden="true" className="text-[14px] opacity-60">›</span>
    </button>
  );
}
