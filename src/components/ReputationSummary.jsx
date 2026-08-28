import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TrustLevelIcon from "./TrustLevelIcon";
import FoundingMemberBadge from "./FoundingMemberBadge";
import { getBuyerStatusPresentation, normalizeBuyerStatusCode } from "../data/buyerTrust";

const BUYER_STATUS_CODES = new Set(["new_buyer", "trusted_buyer", "established_buyer", "community_champion", "community_trusted", "grolo_ambassador"]);

const BADGE_ICONS = {
  founding_member: "trophy",
  trusted_buyer: "leaf",
  established_buyer: "tree",
  community_champion: "star",
  community_trusted: "trophy",
  grolo_ambassador: "diamond",
  community_growing: "leaf",
  community_flourishing: "tree",
  grolo_partner: "heart",
};

function labelForCode(code) {
  return String(code ?? "Unranked")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function badgeDisplayName(badge) {
  return badge.code === "founding_member" ? "Founding Member • 2026" : badge.name ?? labelForCode(badge.code);
}

export function ReputationStatusPill({ status, audience = "buyer", onClick }) {
  if (!status?.currentStatus) return null;
  const code = audience === "buyer" ? normalizeBuyerStatusCode(status.currentStatus) : status.currentStatus;
  const presentation = audience === "buyer" ? getBuyerStatusPresentation(code) : null;
  const className = "inline-flex items-center gap-1 rounded-full bg-[#F5FFF6] px-2 py-1 text-[11px] font-medium text-[#498467]";
  const content = <><TrustLevelIcon name={presentation?.icon ?? BADGE_ICONS[code] ?? (audience === "seller" ? "tree" : "sprout")} className="h-4 w-4" />{presentation?.name ?? labelForCode(code)}</>;
  if (onClick) return <button type="button" onClick={onClick} className={`${className} transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#498467]`}>{content}</button>;
  return <span className={className}>{content}</span>;
}

export function BadgeRow({ badges = [], compact = false, includeFoundingMember = true }) {
  const visibleBadges = badges.filter((badge) => !BUYER_STATUS_CODES.has(badge.code) && (includeFoundingMember || badge.code !== "founding_member"));
  if (!visibleBadges.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Earned reputation badges">
      {visibleBadges.map((badge) => (
        <span
          key={`${badge.code}-${badge.id ?? badge.badgeId ?? "badge"}`}
          title={badge.description ?? badgeDisplayName(badge)}
          className={`inline-flex items-center gap-1 rounded-md border border-[#E7C66A] bg-[#FFF9E6] font-medium text-[#6F5B1A] ${compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[11px]"}`}
        >
          <TrustLevelIcon name={BADGE_ICONS[badge.code]} className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          {badgeDisplayName(badge)}
        </span>
      ))}
    </div>
  );
}

export function CompactBadgeStack({ badges = [], includeFoundingMember = true }) {
  const visibleBadges = badges.filter((badge) => !BUYER_STATUS_CODES.has(badge.code) && (includeFoundingMember || badge.code !== "founding_member"));
  if (!visibleBadges.length) return null;
  return (
    <div className="flex items-center gap-0.5" aria-label={`${visibleBadges.length} earned reputation badges`}>
      {visibleBadges.slice(0, 3).map((badge) => (
        <span key={`${badge.code}-${badge.id ?? badge.badgeId ?? "badge"}`} title={badgeDisplayName(badge)}>
          <TrustLevelIcon name={BADGE_ICONS[badge.code]} className="h-4 w-4" />
        </span>
      ))}
      {visibleBadges.length > 3 && <span className="text-[10px] font-medium text-[#6F5B1A]">+{visibleBadges.length - 3}</span>}
    </div>
  );
}

function formatMemberSince(storeCreatedAt, memberSince) {
  const date = [memberSince, storeCreatedAt]
    .map((value) => value ? new Date(value) : null)
    .find((candidate) => candidate && !Number.isNaN(candidate.getTime()));
  return date ? date.toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "Recently Joined";
}

export function CompactReputationHeader({ snapshot, audience = "seller", includeFoundingMember = true, className = "" }) {
  const navigate = useNavigate();
  const status = audience === "seller" ? { ...(snapshot?.sellerStatus ?? {}), currentStatus: "established_seller" } : snapshot?.buyerStatus;
  const metrics = status?.metrics ?? {};
  const activeBadges = snapshot?.activeBadges ?? [];
  const values = audience === "seller"
    ? `${metrics.reviewCount ?? metrics.review_count ?? 0} reviews • ${metrics.completedOrderCount ?? metrics.completed_order_count ?? 0} orders`
    : `${metrics.completedTransactionCount ?? metrics.completed_transaction_count ?? 0} transactions • ${metrics.sellerRecommendationCount ?? metrics.seller_recommendation_count ?? 0} recommended`;

  useEffect(() => {
  }, [activeBadges.length, audience, metrics.averageRating, metrics.average_rating, snapshot, status?.currentStatus]);
  if (!snapshot || (!status && !activeBadges.length)) return null;

  return (
    <div className={`flex min-w-0 items-center gap-2 rounded-md bg-[#F5FFF6] px-2 py-1.5 ${className}`} aria-label="Compact reputation summary">
      <ReputationStatusPill status={status} audience={audience} onClick={() => navigate(audience === "seller" ? "/seller-statuses" : "/trust-reputation")} />
      <CompactBadgeStack badges={activeBadges} includeFoundingMember={includeFoundingMember} />
      <span className="min-w-0 truncate text-[10px] text-[#828282]">{values}</span>
    </div>
  );
}

export function TrustMetricSummary({ metrics = {}, audience = "buyer", memberSince, storeCreatedAt, compact = false }) {
  const values = audience === "seller"
    ? [
      ["Local Vendor Since", formatMemberSince(storeCreatedAt, memberSince)],
      ["Orders", metrics.completedOrderCount ?? metrics.completed_order_count ?? 0],
    ]
    : [
      ["Transactions", metrics.completedTransactionCount ?? metrics.completed_transaction_count ?? 0],
      ["Recommended", metrics.sellerRecommendationCount ?? metrics.seller_recommendation_count ?? 0],
    ];
  return (
    <div className={`grid grid-cols-2 gap-2 ${compact ? "text-[10px]" : "text-[11px]"}`}>
      {values.map(([label, value]) => (
        <div key={label} className="rounded-md bg-[#F5FFF6] px-2 py-1.5 text-center text-[#828282]">
          <div className="text-[15px] font-semibold text-[#498467]">{value}</div>
          {label}
        </div>
      ))}
    </div>
  );
}

export default function ReputationSummary({ snapshot, audience = "buyer", memberSince, storeCreatedAt, sellerId, foundingMember = false, compact = false, includeFoundingMember = true, runtimeDiagnostic = false, className = "" }) {
  const navigate = useNavigate();
  const status = audience === "seller" ? { ...(snapshot?.sellerStatus ?? {}), currentStatus: "established_seller" } : snapshot?.buyerStatus;
  const metrics = status?.metrics ?? {};
  const activeBadges = snapshot?.activeBadges ?? [];

  useEffect(() => {
  }, [activeBadges.length, metrics.averageRating, metrics.average_rating, snapshot, status?.currentStatus]);
  if (!snapshot || (!status && !activeBadges.length)) return null;

  return (
    <section className={`rounded-lg border border-[#E6E6E6] bg-white p-3 ${className}`} aria-label="Reputation summary">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.4px] text-[#498467]">Reputation</span>
      </div>
      <div className="mt-2 flex flex-nowrap items-center gap-1 whitespace-nowrap">
        {audience === "seller" && <FoundingMemberBadge sellerId={sellerId} foundingMember={foundingMember} runtimeDiagnostic={runtimeDiagnostic} />}
        <ReputationStatusPill status={status} audience={audience} onClick={() => navigate(audience === "seller" ? "/seller-statuses" : "/trust-reputation")} />
      </div>
      {audience !== "seller" && <div className="mt-2"><BadgeRow badges={activeBadges} compact={compact} includeFoundingMember={includeFoundingMember} /></div>}
      <div className="mt-2">
        <TrustMetricSummary metrics={metrics} audience={audience} memberSince={memberSince} storeCreatedAt={storeCreatedAt} compact={compact} />
      </div>
    </section>
  );
}
