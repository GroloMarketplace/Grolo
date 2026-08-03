import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFollow } from "../context/FollowContext";
import { useSavedItems } from "../context/SavedContext";

const REPORT_OPTIONS = ["Spam", "Misleading Information", "Inappropriate Content", "Harassment", "Other"];

export default function ContentActionSheet({ content, onClose, onHide, onToast }) {
  const navigate = useNavigate();
  const { isFollowing, toggleFollow } = useFollow();
  const { toggleSaved } = useSavedItems();
  const [view, setView] = useState("menu");
  const sheetStart = useRef(null);
  if (!content) return null;

  const following = content.sellerId ? isFollowing(content.sellerId) : false;
  const saveItems = content.savedItems ?? [content.savedItem ?? content];

  const handleShare = () => {
    const url = `${window.location.origin}${content.sharePath ?? "/"}`;
    if (navigator.share) navigator.share({ title: content.title ?? content.name, url }).catch(() => {});
    else navigator.clipboard?.writeText(url).catch(() => {});
    onClose();
  };

  const handleHide = () => {
    onHide(content.id);
    onToast("Content hidden");
    onClose();
  };

  const handleFollow = () => {
    if (content.sellerId) toggleFollow(content.sellerId);
    onClose();
  };

  const handleReport = (reason) => {
    void reason;
    onClose();
    onToast("✅ Report submitted");
  };

  const handlePointerUp = (event) => {
    if (sheetStart.current !== null && event.clientY - sheetStart.current > 50) onClose();
    sheetStart.current = null;
  };

  return (
    <div className="absolute inset-0 z-[80]">
      <button type="button" aria-label="Close menu" onClick={onClose} className="absolute inset-0 h-full w-full bg-black/30" />
      <div
        className="absolute bottom-0 left-0 right-0 max-h-[82%] overflow-y-auto rounded-t-2xl bg-white px-4 pb-6 pt-3 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => { sheetStart.current = event.clientY; }}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { sheetStart.current = null; }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#D9D9D9]" />
        {view === "menu" ? (
          <MenuView
            content={content}
            following={following}
            onSave={() => { toggleSaved(saveItems); onClose(); }}
            onShare={handleShare}
            onHide={handleHide}
            onWhy={() => setView("why")}
            onFollow={handleFollow}
            onViewStore={() => { navigate(`/seller/${content.sellerId}`); onClose(); }}
            onViewEvent={() => { navigate(`/event/${content.eventId}`); onClose(); }}
            onViewListing={() => { navigate(`/product/${content.productId}`); onClose(); }}
            onComments={() => { navigate("/comments", { state: { content: content.commentContent } }); onClose(); }}
            onCalendar={() => { onToast("Added to calendar"); onClose(); }}
            onReport={() => setView("report")}
          />
        ) : view === "why" ? (
          <InfoView title="Why am I seeing this?" onBack={() => setView("menu")}>
            <p className="text-[14px] leading-[140%] text-[#828282]">You follow similar stores, this content is happening near you, or you have interacted with similar content.</p>
            <p className="mt-3 text-[14px] leading-[140%] text-[#828282]">This store may also be trending in your area.</p>
          </InfoView>
        ) : (
          <InfoView title="Report Content" onBack={() => setView("menu")}>
            <div className="flex flex-col gap-2">{REPORT_OPTIONS.map((option) => <button key={option} type="button" onClick={() => handleReport(option)} className="rounded-lg border border-[#E6E6E6] px-3 py-3 text-left text-[14px] hover:bg-[#F5FFF6]">{option}</button>)}</div>
          </InfoView>
        )}
      </div>
    </div>
  );
}

function MenuView({ content, following, onSave, onShare, onHide, onWhy, onFollow, onViewStore, onViewEvent, onViewListing, onComments, onCalendar, onReport }) {
  return (
    <div className="flex flex-col">
      <Action label="Save Item" onClick={onSave} />
      <Action label="Share" onClick={onShare} />
      <Action label="Hide Content" onClick={onHide} />
      <Action label="Why am I seeing this?" onClick={onWhy} />
      {content.sellerId && <Action label="View Store Profile" onClick={onViewStore} />}
      {content.sellerId && <Action label={following ? "Unfollow Store" : "Follow Store"} onClick={onFollow} />}
      {content.type === "event" && <Action label="Add to Calendar" onClick={onCalendar} />}
      {content.type === "event" && <Action label="View Event" onClick={onViewEvent} />}
      {(content.type === "listing" || content.type === "promotion") && <Action label="View Listing" onClick={onViewListing} />}
      {content.type === "post" && <Action label="View Comments" onClick={onComments} />}
      <div className="mt-2 border-t border-[#E6E6E6] pt-2"><Action label="Report Content" onClick={onReport} danger icon={<FlagIcon />} /></div>
    </div>
  );
}

function Action({ label, onClick, danger, icon }) {
  return <button type="button" onClick={onClick} className={`flex items-center gap-2 rounded-lg px-3 py-3 text-left text-[15px] hover:bg-[#F5FFF6] ${danger ? "text-red-600" : "text-black"}`}>{icon}{label}</button>;
}

function InfoView({ title, onBack, children }) {
  return <div><button type="button" onClick={onBack} className="mb-4 text-[14px] font-medium text-[#498467]">Back</button><h2 className="text-[18px] font-semibold">{title}</h2><div className="mt-3">{children}</div></div>;
}

function FlagIcon() {
  return <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M4 17V3m0 0h9l-1 3 1 3H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
