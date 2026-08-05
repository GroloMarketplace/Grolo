import { useFoundingMember } from "../context/FoundingMemberContext";

function FounderIcon({ compact = false }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={compact ? "h-4 w-4" : "h-5 w-5"}>
      <path d="M7 5.5h10v3.2a5 5 0 0 1-10 0V5.5Z" fill="#FFC107" stroke="#FFC107" strokeLinejoin="round" strokeWidth="1.35" />
      <path d="M7 7H5.8a2.2 2.2 0 0 0 0 4.4H8m9-4.4h1.2a2.2 2.2 0 0 1 0 4.4H16" fill="none" stroke="#FFC107" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.35" />
      <path d="M12 13.8v3.1m-2.2 2h4.4" fill="none" stroke="#FFC107" strokeLinecap="round" strokeWidth="1.35" />
      <path d="M12 13.5V9.2m0 0C9.5 9.2 7.8 7.7 7.8 5c2.8 0 4.2 1.5 4.2 4.2Zm0 1.4c0-3.1 1.8-5 4.8-5 0 2.8-1.8 5-4.8 5Z" fill="none" stroke="#FFC107" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.1" />
    </svg>
  );
}

export default function FoundingMemberBadge({ sellerId, compact = false, iconOnly = false }) {
  const { isFoundingMember } = useFoundingMember();
  if (!isFoundingMember(sellerId)) return null;

  if (iconOnly) {
    return <span aria-label="Founding Member" title="Founding Member" className="inline-flex shrink-0 items-center leading-none"><FounderIcon compact={compact} /></span>;
  }

  return (
    <span className={`inline-flex w-fit items-center gap-1 font-medium text-[#6F5B1A] ${compact ? "text-[10px]" : "text-[11px]"}`}>
      <FounderIcon compact={compact} />
      Founding Member
    </span>
  );
}
