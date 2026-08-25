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
  const memberSince = formatMemberSince(storeProfile?.store_opened_at ?? storeProfile?.storeOpenedAt ?? profile?.store_opened_at ?? profile?.created_at ?? user?.created_at);

  return (
    <MobileScreenLayout>
      <Header title="Founding Member" onBack={() => navigate(-1)} />
      <div className="flex-1 overflow-y-auto no-scrollbar p-4">
        <div className="flex flex-col gap-5">
          <section className="rounded-lg border border-[#E7C66A] bg-[#FFF9E6] p-6 text-center">
            <div className="flex justify-center"><GroloStatusIcon name="trophy" className="h-10 w-10" /></div>
            <h1 className="mt-3 text-[24px] font-semibold text-[#4F4F4F]">Founding Member</h1>
            <p className="mt-2 text-[15px] leading-[140%] text-[#6F5B1A]">Recognized as an early supporter of the Grolo community.</p>
          </section>
          <section className="rounded-lg border border-[#E6E6E6] p-4 text-center">
            <p className="text-[15px] leading-[140%] text-[#4F4F4F]">Thank you for helping build a stronger local marketplace.</p>
            {storeName && <div className="mt-4"><div className="text-[11px] font-medium uppercase tracking-[0.4px] text-[#828282]">Store</div><div className="mt-1 text-[16px] font-semibold text-[#498467]">{storeName}</div></div>}
            {memberSince && <div className="mt-4"><div className="text-[11px] font-medium uppercase tracking-[0.4px] text-[#828282]">Member Since</div><div className="mt-1 text-[16px] font-semibold text-[#498467]">{memberSince}</div></div>}
          </section>
        </div>
      </div>
    </MobileScreenLayout>
  );
}
