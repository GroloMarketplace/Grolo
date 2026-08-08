import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";

const statuses = [
  {
    icon: "🌱",
    name: "Community Seeding",
    description: "New members beginning their Grolo journey.",
    benefit: "Start building your local reputation and discover ways to participate.",
  },
  {
    icon: "🌿",
    name: "Community Growing",
    description: "Actively supporting local businesses and engaging with the community.",
    benefit: "Show your consistent support and unlock more community recognition.",
  },
  {
    icon: "🌳",
    name: "Community Flourishing",
    description: "Highly engaged community members making a significant local impact.",
    benefit: "Celebrate your meaningful contribution to the local economy.",
  },
  {
    icon: "💚",
    name: "Grolo Partner",
    description: "Verified local businesses, creators, and community builders contributing to their local economy.",
    benefit: "Build trust with the people and businesses you connect with on Grolo.",
  },
  {
    icon: "🏆",
    name: "Founding Member",
    description: "One of Grolo's first 100 members who helped build the community from the beginning.",
    benefit: "Keep a permanent place in Grolo's founding community.",
  },
];

export default function GroloStatuses() {
  const navigate = useNavigate();

  return (
    <MobileScreenLayout>
      <Header title="Grolo Statuses" onBack={() => navigate(-1)} />
      <div className="flex-1 overflow-y-auto no-scrollbar p-4">
        <div className="rounded-lg bg-[#F5FFF6] p-4">
          <h1 className="text-[22px] font-semibold">Grow your local impact</h1>
          <p className="mt-2 text-[14px] leading-[140%] text-[#4F4F4F]">
            Grolo statuses recognize how members support local businesses, participate in the community, and help the local economy flourish.
          </p>
        </div>

        <section className="mt-5">
          <h2 className="text-[18px] font-semibold">Status levels</h2>
          <div className="mt-3 flex flex-col gap-3">
            {statuses.map((status) => (
              <button
                key={status.name}
                type="button"
                onClick={() => status.name === "Founding Member" && navigate("/founding-member/current-buyer")}
                className="w-full rounded-lg border border-[#E6E6E6] p-4 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[20px]" aria-hidden="true">{status.icon}</span>
                  <h3 className="text-[16px] font-semibold">{status.name}</h3>
                </div>
                <p className="mt-2 text-[14px] leading-[140%] text-[#4F4F4F]">{status.description}</p>
                <p className="mt-2 text-[13px] leading-[140%] text-[#498467]"><span className="font-medium">Benefit:</span> {status.benefit}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-lg border border-[#E6E6E6] p-4">
          <h2 className="text-[18px] font-semibold">How statuses are earned</h2>
          <p className="mt-2 text-[14px] leading-[140%] text-[#4F4F4F]">
            Complete meaningful community actions such as shopping locally, writing reviews, attending events, supporting sellers, and contributing to conversations.
          </p>
          <p className="mt-2 text-[14px] leading-[140%] text-[#4F4F4F]">
            Keep participating to level up. Your status reflects sustained community impact rather than a single action.
          </p>
        </section>
      </div>
    </MobileScreenLayout>
  );
}
