import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { useTrustSafety } from "../context/TrustSafetyContext";

export default function BlockedUsers() {
  const navigate = useNavigate();
  const { blockedUserIds, unblock } = useTrustSafety();
  const blockedUsers = [...blockedUserIds];

  return (
    <MobileScreenLayout>
      <Header title="Blocked Users" onBack={() => navigate(-1)} hideProfile />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <p className="mb-4 text-[14px] leading-6 text-[#687368]">Blocked users cannot view or interact with your profile, listings, posts, reviews, or messages.</p>
        {blockedUsers.length === 0 ? <div className="rounded-xl border border-[#E0E0E0] bg-white p-5 text-center text-[14px] text-[#777]">You have not blocked anyone.</div> : <div className="flex flex-col gap-3">{blockedUsers.map((userId) => <div key={userId} className="flex items-center justify-between gap-3 rounded-xl border border-[#E0E0E0] bg-white p-4"><div className="min-w-0"><p className="text-[14px] font-medium text-[#202A21]">Blocked user</p><p className="truncate text-[12px] text-[#777]">{userId}</p><button type="button" onClick={() => navigate(`/profile/${encodeURIComponent(userId)}`)} className="mt-2 text-[12px] font-medium text-[#498467] underline underline-offset-2">View profile</button></div><button type="button" onClick={() => unblock(userId)} className="shrink-0 rounded-lg border border-[#498467] px-3 py-2 text-[13px] font-medium text-[#498467]">Unblock</button></div>)}</div>}
      </div>
    </MobileScreenLayout>
  );
}
