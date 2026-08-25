import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import GroloStatusIcon from "../components/GroloStatusIcon";
import { useAuth } from "../context/AuthContext";
import { useReputationSnapshot } from "../hooks/useReputationRead";
import { useProfileMode } from "../context/ProfileModeContext";

const SELLER_STATUSES = [
  {
    code: "new_seller",
    name: "New Seller",
    icon: "sprout",
    description: "A seller who has completed the essentials for serving customers locally.",
    requirements: ["Store profile completed", "At least 1 active listing", "Account in good standing"],
  },
  {
    code: "established_seller",
    name: "Established Seller",
    icon: "tree",
    description: "A seller with a proven record of serving the local marketplace.",
    requirements: ["Minimum 10 completed orders", "Active store for 30+ days", "Minimum 5 active listings", "No trust & safety violations", "At least 1 completed buyer review"],
  },
  {
    code: "trusted_seller",
    name: "Trusted Seller",
    icon: "star",
    description: "A seller recognized for consistently reliable, high-quality service.",
    requirements: ["Minimum 50 completed orders", "Average rating ≥ 4.7", "Minimum 15 buyer reviews", "Active store for 90+ days", "No unresolved disputes", "Response rate ≥ 90%"],
    future: true,
  },
  {
    code: "community_champion",
    name: "Community Champion",
    icon: "trophy",
    description: "A seller who goes above and beyond for the local community.",
    requirements: ["Minimum 100 completed orders", "Average rating ≥ 4.8", "Minimum 25 buyer reviews", "Active store for 180+ days", "Hosted at least 2 community events or made a significant community contribution", "No trust & safety violations"],
    future: true,
  },
];

function sellerMetrics(snapshot, storeActive) {
  const metrics = snapshot?.sellerStatus?.metrics ?? {};
  return {
    profileCompleted: Number(metrics.profileCompleted ?? metrics.profile_completed ?? storeActive),
    activeListings: Number(metrics.activeListings ?? metrics.activeListingCount ?? metrics.active_listing_count ?? 0),
    accountInGoodStanding: Number(metrics.accountInGoodStanding ?? metrics.account_in_good_standing ?? storeActive),
    completedOrders: Number(metrics.completedOrders ?? metrics.completedOrderCount ?? metrics.completed_order_count ?? 0),
    activeStoreDays: Number(metrics.activeStoreDays ?? metrics.activeDays ?? metrics.active_days ?? 0),
    buyerReviews: Number(metrics.buyerReviews ?? metrics.buyerReviewCount ?? metrics.buyer_review_count ?? metrics.reviewCount ?? 0),
    averageRating: Number(metrics.averageRating ?? metrics.average_rating ?? 0),
    noTrustSafetyViolations: Number(metrics.noTrustSafetyViolations ?? metrics.no_trust_safety_violations ?? 0),
    noUnresolvedDisputes: Number(metrics.noUnresolvedDisputes ?? metrics.no_unresolved_disputes ?? 0),
    responseRate: Number(metrics.responseRate ?? metrics.response_rate ?? 0),
    communityContribution: Number(metrics.communityContribution ?? 0),
  };
}

function requirementsMet(status, metrics) {
  return status.requirements.every((requirement) => {
    const target = requirement.includes("4.8") ? 4.8 : requirement.includes("Average rating") ? 4.7 : null;
    if (target != null) return metrics.averageRating >= target;
    if (requirement.includes("Store profile")) return metrics.profileCompleted >= 1;
    if (requirement.includes("active listing")) return metrics.activeListings >= (requirement.includes("5") ? 5 : 1);
    if (requirement.includes("good standing")) return metrics.accountInGoodStanding >= 1;
    if (requirement.includes("10 completed")) return metrics.completedOrders >= 10;
    if (requirement.includes("50 completed")) return metrics.completedOrders >= 50;
    if (requirement.includes("100 completed")) return metrics.completedOrders >= 100;
    if (requirement.includes("30+")) return metrics.activeStoreDays >= 30;
    if (requirement.includes("90+")) return metrics.activeStoreDays >= 90;
    if (requirement.includes("180+")) return metrics.activeStoreDays >= 180;
    if (requirement.includes("1 completed buyer")) return metrics.buyerReviews >= 1;
    if (requirement.includes("15 buyer")) return metrics.buyerReviews >= 15;
    if (requirement.includes("25 buyer")) return metrics.buyerReviews >= 25;
    if (requirement.includes("trust")) return metrics.noTrustSafetyViolations >= 1;
    if (requirement.includes("disputes")) return metrics.noUnresolvedDisputes >= 1;
    if (requirement.includes("Response")) return metrics.responseRate >= 90;
    if (requirement.includes("community")) return metrics.communityContribution >= 1;
    return false;
  });
}

export default function SellerStatuses() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { storeActive } = useProfileMode();
  const snapshot = useReputationSnapshot(user?.id ?? "current-user");
  const metrics = sellerMetrics(snapshot, storeActive);
  const earnedCodes = new Set(SELLER_STATUSES.filter((status) => !status.future && requirementsMet(status, metrics)).map((status) => status.code));
  const currentCode = [...SELLER_STATUSES].reverse().find((status) => earnedCodes.has(status.code))?.code ?? "new_seller";

  return (
    <MobileScreenLayout>
      <Header title="Seller Statuses" onBack={() => navigate(-1)} />
      <div className="flex-1 overflow-y-auto no-scrollbar p-4">
        <div className="rounded-lg bg-[#F5FFF6] p-4">
          <h1 className="text-[22px] font-semibold">Your seller progression</h1>
          <p className="mt-2 text-[14px] leading-[140%] text-[#4F4F4F]">Seller statuses help customers understand your experience and reliability in the local marketplace.</p>
        </div>
        <div className="mt-5 flex flex-col gap-3">
          {SELLER_STATUSES.map((status) => {
            const earned = earnedCodes.has(status.code);
            const current = status.code === currentCode;
            return (
              <section key={status.code} className={`rounded-lg border p-4 ${current ? "border-[#498467] bg-[#F5FFF6]" : "border-[#E6E6E6] bg-white"}`}>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white"><GroloStatusIcon name={status.icon} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h2 className="text-[16px] font-semibold">{status.name}</h2>{current && <span className="rounded-full bg-[#498467] px-2 py-0.5 text-[10px] font-semibold text-white">Current status</span>}{earned && !current && <span className="rounded-full bg-[#E8F5EA] px-2 py-0.5 text-[10px] font-semibold text-[#498467]">Earned</span>}{status.future && <span className="rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[10px] font-semibold text-[#828282]">Coming soon</span>}</div>
                    <p className="mt-2 text-[14px] leading-[140%] text-[#4F4F4F]">{status.description}</p>
                    <div className="mt-3"><h3 className="text-[12px] font-semibold uppercase tracking-[0.3px] text-[#498467]">Qualification requirements</h3><ul className="mt-1 list-disc pl-4 text-[13px] leading-[150%] text-[#4F4F4F]">{status.requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul></div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </MobileScreenLayout>
  );
}
