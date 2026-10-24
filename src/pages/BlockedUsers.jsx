import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import ProfileAvatar from "../components/ProfileAvatar";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { useTrustSafety } from "../context/TrustSafetyContext";

export default function BlockedUsers() {
  const navigate = useNavigate();
  const { blockedUsers, unblock, refreshBlockedUsers } = useTrustSafety();
  useEffect(() => { refreshBlockedUsers().catch(() => {}); }, [refreshBlockedUsers]);

  return (
    <MobileScreenLayout>
      <Header title="Blocked Users" onBack={() => navigate(-1)} hideProfile />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <p className="mb-4 text-[14px] leading-6 text-[#687368]">Blocked users cannot view or interact with your profile, listings, posts, reviews, or messages.</p>
        {blockedUsers.length === 0 ? <div className="rounded-xl border border-[#E0E0E0] bg-white p-5 text-center text-[14px] text-[#777]">You have not blocked anyone.</div> : <div className="flex flex-col gap-3">{blockedUsers.map((entry) => { const userId = entry.blocked_id; const profile = entry.profile ?? { id: userId, avatar: null, name: "User", username: null }; return <div key={userId} onClick={() => navigate(`/profile/${encodeURIComponent(userId)}`)} className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#E0E0E0] bg-white p-4"><ProfileAvatar profile={profile} size="h-12 w-12" /><div className="min-w-0 flex-1"><p className="truncate text-[14px] font-medium text-[#202A21]">{profile.name}</p>{profile.username && <p className="truncate text-[12px] text-[#777]">@{profile.username}</p>}<button type="button" onClick={(event) => { event.stopPropagation(); navigate(`/profile/${encodeURIComponent(userId)}`); }} className="mt-1 text-[12px] font-medium text-[#498467] underline underline-offset-2">View profile</button></div><button type="button" onClick={(event) => { event.stopPropagation(); void unblock(userId); }} className="shrink-0 rounded-lg border border-[#498467] px-3 py-2 text-[13px] font-medium text-[#498467]">Unblock</button></div>; })}</div>}
      </div>
    </MobileScreenLayout>
  );
}
