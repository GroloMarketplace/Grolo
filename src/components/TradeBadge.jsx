import OutlineIcon from "./OutlineIcon";

export default function TradeBadge({ listing, className = "", compact = false }) {
  if (!listing?.availableForTrade) return null;

  return (
    <span className={`inline-flex w-fit items-center gap-1 rounded-full border border-[#A7DDB5] bg-[#F5FFF6] font-medium text-[#356B4A] ${compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[12px]"} ${className}`}>
      <OutlineIcon name="trade" size={compact ? 10 : 12} />
      Available for Trade
    </span>
  );
}
