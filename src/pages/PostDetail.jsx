import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import FoundingMemberBadge from "../components/FoundingMemberBadge";
import ShareSheet from "../components/ShareSheet";
import { communityPosts, sellers } from "../data/mockData";
import { useRegrow } from "../context/RegrowContext";

export default function PostDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { state } = useLocation();
  const post = communityPosts.find((item) => String(item.id) === id);
  const { isRegrown, toggleRegrow } = useRegrow();
  const [likes, setLikes] = useState(post?.likes ?? 0);
  const [liked, setLiked] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showRegrowConfirm, setShowRegrowConfirm] = useState(false);
  const seller = post ? sellers[post.sellerId] ?? Object.values(sellers).find((item) => item.name === post.name) : null;
  const regrown = post ? isRegrown(`post:${post.id}`) : false;

  if (!post) {
    return <MobileScreenLayout><Header title="Post" onBack={() => navigate(-1)} /><div className="p-6 text-center text-[14px] text-[#828282]">Post not found</div></MobileScreenLayout>;
  }

  return (
    <MobileScreenLayout>
      <Header title="Post Detail" onBack={() => navigate(-1)} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-5">
        <div className="flex items-center gap-3">
          <img src={post.avatar ?? seller?.avatar} alt={post.name} className="h-10 w-10 rounded-full object-cover" />
          <div className="min-w-0 flex-1"><div className="flex items-center gap-1"><span className="truncate text-[16px] font-semibold text-[#498467]">{post.name}</span><FoundingMemberBadge sellerId={post.sellerId} iconOnly /></div><div className="text-[12px] text-[#828282]">{post.location ?? seller?.location ?? "Local community"} · {post.time}</div></div>
        </div>
        {post.image && <img src={post.image} alt="" className="mt-5 aspect-square w-full rounded-lg object-cover" />}
        <p className="mt-5 whitespace-pre-wrap text-[16px] leading-7">{post.body}</p>
        <div className="mt-6 flex items-center justify-between border-y border-[#E6E6E6] py-3"><EngagementButton label={likes} active={liked} ariaLabel="Like post" onClick={() => { setLiked((value) => !value); setLikes((value) => value + (liked ? -1 : 1)); }}><LikeIcon active={liked} /></EngagementButton><EngagementButton label={post.comments ?? 0} ariaLabel="View comments" onClick={() => navigate("/comments", { state: { content: { type: "post", post } } })}><CommentIcon /></EngagementButton><EngagementButton label={post.sends ?? post.shares ?? 0} ariaLabel="Share post" onClick={() => setShowShareSheet(true)}><ShareIcon /></EngagementButton><EngagementButton label={(post.regrows ?? 0) + (regrown ? 1 : 0)} active={regrown} ariaLabel="Regrow post" onClick={() => setShowRegrowConfirm(true)}><RegrowIcon active={regrown} /></EngagementButton></div>
        <button type="button" onClick={() => navigate(`/seller/${post.sellerId}`, { state: { fromPost: true, feedOrigin: state?.feedOrigin } })} className="mt-5 w-full rounded-lg border border-[#498467] py-3 text-[14px] font-medium text-[#498467]">View Store</button>
      </div>
      {showShareSheet && <ShareSheet content={{ type: "post", title: post.body, name: post.name, sharePath: `/post/${post.id}` }} onClose={() => setShowShareSheet(false)} onSuccess={() => setShowShareSheet(false)} />}
      {showRegrowConfirm && <div className="absolute inset-0 z-50 flex items-end bg-black/30"><div className="w-full rounded-t-2xl bg-white p-5"><h2 className="text-[18px] font-semibold">Confirm Regrow</h2><p className="mt-2 text-[14px] text-[#4F4F4F]">Share this post to the community feed?</p><div className="mt-5 flex gap-3"><button type="button" onClick={() => setShowRegrowConfirm(false)} className="flex-1 rounded-lg border border-[#498467] py-3 text-[14px] font-medium text-[#498467]">Cancel</button><button type="button" onClick={() => { toggleRegrow(`post:${post.id}`, regrown ? "Regrow removed" : "Post regrown"); setShowRegrowConfirm(false); }} className="flex-1 rounded-lg bg-[#498467] py-3 text-[14px] font-medium text-white">Regrow Post</button></div></div></div>}
    </MobileScreenLayout>
  );
}

function EngagementButton({ children, label, onClick, ariaLabel, active }) {
  return <button type="button" onClick={onClick} aria-label={ariaLabel} aria-pressed={active} className="flex items-center gap-2 text-[14px] font-medium text-[#1E1E1E]">{children}<span>{label}</span></button>;
}
function LikeIcon({ active }) { return <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M17.37 3.84a4.13 4.13 0 0 0-6.49-.5L10 4.22l-.88-.88a4.13 4.13 0 0 0-6.13 5.5l.63.88L10 17.19l6.48-6.48.63-.88a4.13 4.13 0 0 0 .26-6.49Z" stroke={active ? "#498467" : "#1E1E1E"} fill={active ? "#498467" : "none"} strokeWidth="2" /></svg>; }
function CommentIcon() { return <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M17.5 12.5a1.67 1.67 0 0 1-1.67 1.67H5.83L2.5 17.5V4.17A1.67 1.67 0 0 1 4.17 2.5h11.66a1.67 1.67 0 0 1 1.67 1.67v8.33Z" stroke="#1E1E1E" strokeWidth="2" /></svg>; }
function ShareIcon() { return <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M18.33 1.67 9.17 10.83M9.17 10.83 1.67 7.5l16.66-5.83-5.83 16.66-3.33-7.5Z" stroke="#1E1E1E" strokeWidth="2" /></svg>; }
function RegrowIcon({ active }) { return <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5.83 7.5 2.5 4.17 5.83.83M2.5 4.17h11.67a3.33 3.33 0 0 1 3.33 3.33v1.67M14.17 12.5l3.33 3.33-3.33 3.34M17.5 15.83H5.83A3.33 3.33 0 0 1 2.5 12.5v-1.66" stroke={active ? "#498467" : "#1E1E1E"} strokeWidth="2" /></svg>; }
