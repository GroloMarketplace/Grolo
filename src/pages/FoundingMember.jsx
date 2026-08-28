import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { useAuth } from "../context/AuthContext";
import GroloStatusIcon from "../components/GroloStatusIcon";
import { useResolvedStoreProfile } from "../hooks/useEntityResolution";

function formatMemberSince(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function FoundingMember() {
  const navigate = useNavigate();
  const { memberId } = useParams();
  const { user, profile } = useAuth();
  const resolvedStoreId = memberId === "current-user" || memberId === "current-buyer" ? user?.id : memberId;
  const storeProfile = useResolvedStoreProfile(resolvedStoreId);
  const storeName = storeProfile?.name ?? storeProfile?.shop_name ?? profile?.shop_name ?? null;
  const memberSince = formatMemberSince(storeProfile?.store_opened_at ?? storeProfile?.storeOpenedAt ?? profile?.store_opened_at) ?? "Recently Joined";
  const benefits = [
    "Founding Member Badge|Display a permanent Founding Member • 2026 badge across Grolo.",
    "Founder Feedback Surveys|Help shape the future of Grolo through exclusive founder surveys and platform feedback opportunities.",
    "Early Access Features|Receive access to selected beta features before public release.",
    "Exclusive Founding Member Memorabilia|Eligible for future Founding Member digital and physical memorabilia, including limited-edition Grolo collectibles and launch-year keepsakes.",
    "Founder Community Updates|Receive special updates about Grolo's growth, milestones, and future plans.",
    "Founding Member Giveaways|Access future founder-only giveaways, contests, and community rewards.",
    "Permanent Recognition|Your Founding Member status is permanent and will always recognize that you helped build Grolo during its founding year.",
  ].map((benefit) => {
    const [title, description] = benefit.split("|");
    return { title, description };
  });

  return (
    <MobileScreenLayout>
      <Header title="Founding Member • 2026" onBack={() => navigate(-1)} />
      <div className="flex-1 overflow-y-auto no-scrollbar p-4">
        <div className="flex flex-col gap-5">
          <section className="rounded-lg border border-[#E7C66A] bg-[#FFF9E6] p-6 text-center">
            <div className="flex justify-center"><GroloStatusIcon name="trophy" className="h-10 w-10" /></div>
            <h1 className="mt-3 text-[24px] font-semibold text-[#4F4F4F]">Founding Member • 2026</h1>
            <p className="mt-2 text-[15px] leading-[140%] text-[#6F5B1A]">Thank you for helping build Grolo from the beginning.</p>
            <p className="mt-2 text-[14px] leading-[140%] text-[#6F5B1A]">This status is permanently reserved for stores that joined Grolo during its founding year.</p>
          </section>
          <section className="rounded-lg border border-[#E6E6E6] bg-white p-4">
            <h2 className="text-[18px] font-semibold text-[#1F2D27]">Founding Member Benefits</h2>
            <div className="mt-4 flex flex-col gap-4">
              {benefits.map((benefit) => <div key={benefit.title} className="flex gap-3"><span className="mt-0.5 text-[17px] text-[#498467]">✓</span><div><h3 className="text-[14px] font-semibold text-[#1F2D27]">{benefit.title}</h3><p className="mt-1 text-[13px] leading-[140%] text-[#666]">{benefit.description}</p></div></div>)}
            </div>
          </section>
          <section className="rounded-lg border border-[#E6E6E6] p-4 text-center">
            {storeName && <div><div className="text-[11px] font-medium uppercase tracking-[0.4px] text-[#828282]">Store</div><div className="mt-1 text-[16px] font-semibold text-[#498467]">{storeName}</div></div>}
            <div className="mt-4"><div className="text-[11px] font-medium uppercase tracking-[0.4px] text-[#828282]">Founding Member Since</div><div className="mt-1 text-[16px] font-semibold text-[#498467]">{memberSince}</div></div>
          </section>
        </div>
      </div>
    </MobileScreenLayout>
  );
}
