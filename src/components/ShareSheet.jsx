import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const USERS = [
  { name: "Mia Fields", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80" },
  { name: "Alex Chen", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80" },
  { name: "Jordan Lee", image: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=100&q=80" },
  { name: "Sam Rivera", image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&q=80" },
];
const STORES = [
  { name: "Sarah's Backyard", image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&q=80" },
  { name: "Pennie's Produce", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80" },
  { name: "Dustin's Donut Store", image: "https://images.unsplash.com/photo-1541823709867-1b206113eafd?w=100&q=80" },
  { name: "Brandy's Crafts", image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80" },
];

export default function ShareSheet({ content, onClose, onSuccess }) {
  const navigate = useNavigate();
  const [view, setView] = useState("menu");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState([]);
  const startY = useRef(null);
  const filteredUsers = useMemo(() => USERS.filter((user) => user.name.toLowerCase().includes(query.toLowerCase())), [query]);
  const filteredStores = useMemo(() => STORES.filter((store) => store.name.toLowerCase().includes(query.toLowerCase())), [query]);
  if (!content) return null;

  const link = `${window.location.origin}${content.sharePath ?? "/"}`;

  const complete = (message) => {
    onSuccess(message);
    onClose();
  };

  const copyLink = async () => {
    await navigator.clipboard?.writeText(link).catch(() => {});
    complete("✅ Shared successfully");
  };

  const externalShare = (label) => {
    if (label === "More..." && navigator.share) navigator.share({ title: content.title ?? content.name, url: link }).catch(() => {});
    complete(content.type === "event" ? "📤 Event shared successfully" : content.type === "listing" ? "📤 Listing shared successfully" : "✅ Shared successfully");
  };

  const sendTo = (target) => {
    void target;
    navigate("/messages");
    complete("✅ Shared successfully");
  };

  const toggleRecipient = (recipient) => {
    setSelected((current) => current.includes(recipient) ? current.filter((item) => item !== recipient) : [...current, recipient]);
  };

  const pointerUp = (event) => {
    if (startY.current !== null && event.clientY - startY.current > 50) onClose();
    startY.current = null;
  };

  return (
    <div className="absolute inset-0 z-[90]">
      <button type="button" aria-label="Close share menu" onClick={onClose} className="absolute inset-0 h-full w-full bg-black/30" />
      <div className="absolute bottom-0 left-0 right-0 max-h-[82%] overflow-y-auto rounded-t-2xl bg-white px-4 pb-6 pt-3 shadow-2xl" onClick={(event) => event.stopPropagation()} onPointerDown={(event) => { startY.current = event.clientY; }} onPointerUp={pointerUp} onPointerCancel={() => { startY.current = null; }}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#D9D9D9]" />
        {view === "menu" && <ShareMenu setView={setView} onCopy={copyLink} onExternal={externalShare} />}
        {view === "users" && <RecipientView title="Send to User" items={filteredUsers} query={query} setQuery={setQuery} selected={selected} multi onToggle={toggleRecipient} onSend={() => sendTo(selected)} onBack={() => setView("menu")} />}
        {view === "stores" && <RecipientView title="Send to Store" items={filteredStores} query={query} setQuery={setQuery} selected={selected} onToggle={(store) => setSelected([store])} onSend={() => sendTo(selected[0])} onBack={() => setView("menu")} />}
      </div>
    </div>
  );
}

function ShareMenu({ setView, onCopy, onExternal }) {
  return (
    <div className="flex flex-col">
      <h2 className="mb-2 text-[18px] font-semibold">Share</h2>
      <ShareAction label="Send to User" onClick={() => setView("users")} />
      <ShareAction label="Send to Store" onClick={() => setView("stores")} />
      <ShareAction label="Copy Link" onClick={onCopy} />
      <div className="mt-3 border-t border-[#E6E6E6] pt-3"><p className="mb-1 text-[12px] font-medium text-[#828282]">External Sharing</p><ShareAction label="Messages" onClick={() => onExternal("Messages")} /><ShareAction label="Email" onClick={() => onExternal("Email")} /><ShareAction label="Facebook" onClick={() => onExternal("Facebook")} /><ShareAction label="Instagram" onClick={() => onExternal("Instagram")} /><ShareAction label="More..." onClick={() => onExternal("More...")} /></div>
    </div>
  );
}

function RecipientView({ title, items, query, setQuery, selected, multi, onToggle, onSend, onBack }) {
  return (
    <div>
      <button type="button" onClick={onBack} className="mb-3 text-[14px] font-medium text-[#498467]">Back</button>
      <h2 className="text-[18px] font-semibold">{title}</h2>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="mt-3 w-full rounded-lg border border-[#E6E6E6] px-3 py-2.5 text-[14px] outline-none focus:border-[#498467]" />
      <div className="mt-3 flex flex-col gap-2">
        {items.map((item) => {
          const isSelected = selected.includes(item.name);
          return (
            <button key={item.name} type="button" onClick={() => onToggle(item.name)} className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-left text-[14px] ${isSelected ? "border-[#498467] bg-[#F5FFF6] text-[#498467]" : "border-[#E6E6E6]"}`}>
              <img src={item.image} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
              <span className="font-medium">{item.name}</span>
            </button>
          );
        })}
      </div>
      <button type="button" disabled={!selected.length} onClick={onSend} className="mt-4 w-full rounded-lg bg-[#498467] py-3 text-[14px] font-medium text-white disabled:opacity-50">{multi ? "Send to selected users" : "Send"}</button>
    </div>
  );
}

function ShareAction({ label, onClick }) {
  return <button type="button" onClick={onClick} className="rounded-lg px-3 py-3 text-left text-[15px] hover:bg-[#F5FFF6]">{label}</button>;
}
