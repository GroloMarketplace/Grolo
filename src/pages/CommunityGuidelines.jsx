import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";

export default function CommunityGuidelines() {
  const navigate = useNavigate();
  const location = useLocation();
  const goBack = () => location.key === "default" ? navigate("/support", { replace: true }) : navigate(-1);
  return (
    <MobileScreenLayout className="bg-[#F8FBF7]">
      <Header title="Community Guidelines" onBack={goBack} hideProfile />
      <main className="flex-1 overflow-y-auto px-5 py-6 text-[14px] leading-6 text-[#4F5B51]"><div className="mx-auto max-w-md"><p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#498467]">Grolo Marketplace</p><h1 className="mt-2 text-2xl font-semibold text-[#202A21]">Community Guidelines</h1><div className="mt-6 space-y-5"><section><h2 className="font-semibold text-[#202A21]">Be respectful</h2><p className="mt-1">Treat buyers, sellers, and community members with honesty and respect. Harassment, threats, discrimination, and abusive conduct are not permitted.</p></section><section><h2 className="font-semibold text-[#202A21]">Keep the marketplace safe</h2><p className="mt-1">Do not use Grolo for fraud, unsafe activity, prohibited goods, or transactions that violate applicable laws.</p></section><section><h2 className="font-semibold text-[#202A21]">Share accurate information</h2><p className="mt-1">Sellers should provide accurate listing details, pricing, availability, and fulfillment information. Buyers should communicate clearly and honor agreed arrangements.</p></section><section><h2 className="font-semibold text-[#202A21]">Report concerns</h2><p className="mt-1">If you encounter content or behavior that violates these guidelines, contact Grolo Support so we can review it.</p></section></div></div></main>
    </MobileScreenLayout>
  );
}
