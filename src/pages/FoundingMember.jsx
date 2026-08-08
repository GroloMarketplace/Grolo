import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { useAuth } from "../context/AuthContext";
import { useFoundingMember } from "../context/FoundingMemberContext";
import GroloStatusIcon from "../components/GroloStatusIcon";

function formatMemberSince(value) {
  if (!value) return "Member since unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Member since unavailable";
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function FoundingMember() {
  const navigate = useNavigate();
  const { memberId } = useParams();
  const { user } = useAuth();
  const { getFoundingMember } = useFoundingMember();
  const member = getFoundingMember(memberId);
  const memberSince = memberId === "current-buyer" ? user?.created_at ?? member?.memberSince : member?.createdAt ?? member?.memberSince;

  return (
    <MobileScreenLayout>
      <Header title="Founding Member" onBack={() => navigate(-1)} />
      <div className="flex-1 overflow-y-auto no-scrollbar p-4">
        {!member ? (
          <div className="rounded-lg border border-[#E6E6E6] p-5 text-center text-[14px] text-[#828282]">Founding member details unavailable.</div>
        ) : (
          <div className="flex flex-col gap-5">
            <section className="rounded-lg bg-[#FFF9E6] p-5 text-center">
              <div className="flex justify-center"><GroloStatusIcon name="trophy" className="h-9 w-9" /></div>
              <h1 className="mt-2 text-[24px] font-semibold">Founding Member</h1>
              <p className="mt-2 text-[18px] font-medium text-[#6F5B1A]">Founding Member #{member.registrationNumber} of 100</p>
            </section>
            <section className="rounded-lg border border-[#E6E6E6] p-4">
              <h2 className="text-[16px] font-semibold">Member Since</h2>
              <p className="mt-1 text-[16px] text-[#4F4F4F]">{formatMemberSince(memberSince)}</p>
              <p className="mt-4 text-[14px] leading-[140%] text-[#4F4F4F]">One of the first 100 members who helped build the Grolo community.</p>
            </section>
            <section className="rounded-lg border border-[#E6E6E6] p-4">
              <h2 className="text-[16px] font-semibold">A permanent place in Grolo history</h2>
              <p className="mt-2 text-[14px] leading-[140%] text-[#4F4F4F]">Founding Member numbers are assigned in registration order and never change. Thank you for helping Grolo grow from the beginning.</p>
            </section>
          </div>
        )}
      </div>
    </MobileScreenLayout>
  );
}
