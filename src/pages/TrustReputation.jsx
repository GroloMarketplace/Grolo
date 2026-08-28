import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { useBuyerTrust } from "../context/BuyerTrustContext";
import { getBuyerTrustLevel, BUYER_TRUST_LEVELS } from "../data/buyerTrust";
import TrustLevelIcon from "../components/TrustLevelIcon";

const trustStats = [
  ["completedTransactions", "Completed Transactions"],
  ["sellerRecommendations", "Seller Recommended"],
  ["wouldTransactAgain", "Would Transact Again"],
];

function remainingRequirement(requirement, remaining) {
  const labels = {
    completedTransactions: `Complete ${remaining} more transaction${remaining === 1 ? "" : "s"}`,
    sellerRecommendations: `Be Seller Recommended by ${remaining} more seller${remaining === 1 ? "" : "s"}`, 
    wouldTransactAgain: `Receive ${remaining} more would-transact-again rating${remaining === 1 ? "" : "s"}`,
    eventsAttended: `Attend ${remaining} more community event${remaining === 1 ? "" : "s"}`,
    accountAgeDays: `Keep your account active for ${remaining} more day${remaining === 1 ? "" : "s"}`,
    accountAgeMonths: `Keep your account active for ${remaining} more month${remaining === 1 ? "" : "s"}`,
  };
  return labels[requirement.key] ?? requirement.label;
}

export default function TrustReputation() {
  const navigate = useNavigate();
  const { getBuyerTrust } = useBuyerTrust();
  const trust = getBuyerTrust("you") ?? {};
  const fallback = getBuyerTrustLevel(trust);
  const current = fallback.current;
  const { next, nextRequirements, progress } = fallback;

  return (
    <MobileScreenLayout>
      <Header title="Trust & Reputation" onBack={() => navigate(-1)} />
      <div className="flex-1 overflow-y-auto no-scrollbar p-4">
        <section className="rounded-lg bg-[#F5FFF6] p-5">
          <div className="text-[12px] font-medium uppercase tracking-[0.4px] text-[#498467]">Current Level</div>
          <h1 className="mt-2 text-[24px] font-semibold"><TrustLevelIcon name={current.icon} className="mr-1 inline-block h-7 w-7 align-[-0.25em]" /> {current.name}</h1>
          <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] leading-[130%] text-[#828282]">
            {trustStats.map(([key, label]) => (
              <div key={key}>
                <div className="text-[18px] font-semibold text-[#498467]">{trust[key] ?? 0}</div>
                {label}
              </div>
            ))}
          </div>
        </section>

        {next ? (
          <section className="mt-4 rounded-lg border border-[#CFF7D3] bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[16px] font-semibold">Progress to {next.name}</h2>
              <span className="text-[12px] font-medium text-[#498467]">{progress}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#DDEBDF]"><div className="h-full rounded-full bg-[#498467]" style={{ width: `${progress}%` }} /></div>
            <p className="mt-4 text-[13px] font-medium text-[#4F4F4F]">To reach {next.name}:</p>
            <div className="mt-2 flex flex-col gap-2">
              {nextRequirements.map((requirement) => {
                const value = Math.min(trust[requirement.key] ?? 0, requirement.target);
                const complete = value >= requirement.target;
                return <div key={requirement.key} className={`text-[13px] ${complete ? "text-[#498467]" : "text-[#4F4F4F]"}`}>{complete ? "✓" : "•"} {requirement.label} ({value} / {requirement.target})</div>;
              })}
            </div>
            <p className="mt-4 text-[13px] font-medium text-[#4F4F4F]">Remaining:</p>
            <div className="mt-2 flex flex-col gap-2">
              {nextRequirements.map((requirement) => {
                const remaining = Math.max(requirement.target - (trust[requirement.key] ?? 0), 0);
                if (!remaining) return null;
                return <div key={requirement.key} className="text-[13px] text-[#828282]">• {remainingRequirement(requirement, remaining)}</div>;
              })}
            </div>
          </section>
        ) : (
          <section className="mt-4 rounded-lg border border-[#CFF7D3] bg-white p-4 text-[14px] text-[#4F4F4F]">You have reached the highest trust level. Keep building positive marketplace experiences.</section>
        )}

        <section className="mt-5">
          <h2 className="text-[18px] font-semibold">Trust levels</h2>
          <div className="mt-3 flex flex-col gap-3">
            {BUYER_TRUST_LEVELS.map((level, index) => (
              <article key={level.name} className={`rounded-lg border p-4 ${level.name === current.name ? "border-[#498467] bg-[#F5FFF6]" : "border-[#E6E6E6]"}`}>
                <div className="flex items-center gap-2">
                  <span className="text-[20px]"><TrustLevelIcon name={level.icon} /></span>
                  <h3 className="text-[16px] font-semibold">{level.name}</h3>
                  {level.name === current.name && <span className="ml-auto text-[11px] font-medium text-[#498467]">Current</span>}
                </div>
                <p className="mt-2 text-[14px] leading-[140%] text-[#4F4F4F]">{level.description}</p>
                <p className="mt-3 text-[13px] leading-[140%] text-[#498467]"><span className="font-medium">How it is earned:</span> {index === 0 ? "Begin completing transactions and receiving positive seller feedback." : level.requirements.map((requirement) => requirement.label.toLowerCase()).join(", ") + "."}</p>
                <p className="mt-2 text-[13px] leading-[140%] text-[#4F4F4F]"><span className="font-medium">Benefit:</span> {level.benefits}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-lg border border-[#E6E6E6] p-4">
          <h2 className="text-[18px] font-semibold">How trust progresses</h2>
          <p className="mt-2 text-[14px] leading-[140%] text-[#4F4F4F]">Trust grows from completed transactions and positive seller experiences. Each level has clear requirements, and your current progress updates as your marketplace activity changes.</p>
        </section>
      </div>
    </MobileScreenLayout>
  );
}
