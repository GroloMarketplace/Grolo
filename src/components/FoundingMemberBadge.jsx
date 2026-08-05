import { useFoundingMember } from "../context/FoundingMemberContext";

export default function FoundingMemberBadge({ sellerId, compact = false, iconOnly = false }) {
  const { isFoundingMember } = useFoundingMember();
  if (!isFoundingMember(sellerId)) return null;

  if (iconOnly) {
    return <span aria-label="Founding Member" title="Founding Member" className="inline-flex shrink-0 items-center text-[13px] leading-none text-[#8A6500]">🏆</span>;
  }

  return (
    <span className={`inline-flex w-fit items-center gap-1 rounded-full border border-[#E7C66A] bg-[#FFF8DD] font-medium text-[#8A6500] ${compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[11px]"}`}>
      <span aria-hidden="true">🏆</span>
      Founding Member
    </span>
  );
}
