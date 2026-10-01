import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useBuyerSettings } from "../context/BuyerSettingsContext";
import { useFollow } from "../context/FollowContext";
import { useMessages } from "../context/MessageContext";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { isWithinDiscoveryRadius, resolveUserLocation } from "../utils/locationRadius";

export default function ShareSheet({ content, onClose, onSuccess }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { followedSellers } = useFollow();
  const { messages } = useMessages();
  const { settings: buyerSettings } = useBuyerSettings();
  const [view, setView] = useState("menu");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const startY = useRef(null);

  useEffect(() => {
    let cancelled = false;
    if (!isSupabaseConfigured || !supabase || !user?.id) return () => { cancelled = true; };
    supabase
      .from("profiles")
      .select("id, display_name, username, shop_name, store_description, avatar_url, city, location, latitude, longitude, store_onboarding_status")
      .neq("id", user.id)
      .then(({ data, error }) => {
        if (!cancelled && !error) setProfiles(data ?? []);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  const link = content ? `${window.location.origin}${content.sharePath ?? "/"}` : "";
  const location = resolveUserLocation(buyerSettings);
  const radius = buyerSettings?.locationRadius ?? 25;
  const recentRecipients = useMemo(() => {
    const result = new Map();
    (messages ?? []).forEach((conversation) => {
      const participantId = conversation.participantId
        ?? (String(conversation.sellerId) === String(user?.id) ? conversation.buyerId : conversation.sellerId)
        ?? conversation.participantProfile?.id;
      if (!participantId || String(participantId) === String(user?.id)) return;
      const activityAt = new Date(conversation.latestActivityAt ?? conversation.updated_at ?? conversation.createdAt ?? 0).getTime();
      const current = result.get(String(participantId)) ?? 0;
      result.set(String(participantId), Math.max(current, Number.isFinite(activityAt) ? activityAt : 0));
    });
    return result;
  }, [messages, user?.id]);

  const recipients = useMemo(() => {
    const following = new Set((followedSellers ?? []).map((id) => String(id).toLowerCase()));
    return profiles
      .map((profile) => {
        const id = String(profile.id);
        const isStore = Boolean(profile.shop_name || profile.store_onboarding_status);
        const recentAt = recentRecipients.get(id) ?? 0;
        const followed = following.has(id.toLowerCase());
        const nearby = isWithinDiscoveryRadius(profile, location, radius);
        return {
          id,
          name: profile.shop_name || profile.display_name || profile.username || "Account",
          username: profile.username || "",
          image: profile.avatar_url || "",
          kind: isStore ? "store" : "user",
          summary: profile.store_description || profile.location || profile.city || "",
          followed,
          recentAt,
          nearby,
        };
      })
      .sort((left, right) => (
        Number(right.followed) - Number(left.followed)
        || Number(Boolean(right.recentAt)) - Number(Boolean(left.recentAt))
        || Number(right.nearby) - Number(left.nearby)
        || right.recentAt - left.recentAt
        || left.name.localeCompare(right.name)
      ));
  }, [followedSellers, location, profiles, radius, recentRecipients]);

  const filteredRecipients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return recipients;
    return recipients.filter((recipient) => `${recipient.name} ${recipient.username} ${recipient.summary}`.toLowerCase().includes(normalizedQuery));
  }, [query, recipients]);

  if (!content) return null;

  const complete = (message) => {
    onSuccess(message);
    onClose();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard?.writeText(link);
    } catch {
    }
    complete("✅ Link copied");
  };

  const sendTo = (target) => {
    if (!target) return;
    navigate(`/messages/${encodeURIComponent(target.id)}`, {
      state: {
        pendingConversation: {
          id: target.id,
          participantId: target.id,
          sellerId: target.kind === "store" ? target.id : null,
          name: target.name,
          avatar: target.image,
          messages: [],
        },
      },
    });
    complete("✅ Shared successfully");
  };

  const toggleRecipient = (recipient) => {
    setSelected((current) => current.includes(recipient.id) ? current.filter((id) => id !== recipient.id) : [...current, recipient.id]);
  };

  const pointerUp = (event) => {
    if (startY.current !== null && event.clientY - startY.current > 50) onClose();
    startY.current = null;
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end overflow-hidden bg-black/30">
      <button type="button" aria-label="Close share menu" onClick={onClose} className="absolute inset-0 h-full w-full" />
      <section
        className="relative flex max-h-[calc(100dvh-env(safe-area-inset-top))] min-h-0 w-full flex-col rounded-t-2xl bg-white px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => { startY.current = event.clientY; }}
        onPointerUp={pointerUp}
        onPointerCancel={() => { startY.current = null; }}
      >
        <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-[#D9D9D9]" />
        {view === "menu" && <ShareMenu onRecipients={() => setView("recipients")} onCopy={copyLink} />}
        {view === "recipients" && <RecipientView items={filteredRecipients} query={query} setQuery={setQuery} selected={selected} onToggle={toggleRecipient} onSend={() => sendTo(recipients.find((recipient) => recipient.id === selected[0]))} onBack={() => setView("menu")} />}
      </section>
    </div>,
    document.body,
  );
}

function ShareMenu({ onRecipients, onCopy }) {
  return (
    <div className="flex flex-col">
      <h2 className="mb-2 text-[18px] font-semibold">Share</h2>
      <ShareAction label="Send to people and stores" onClick={onRecipients} />
      <ShareAction label="Copy Link" onClick={onCopy} />
    </div>
  );
}

function RecipientView({ items, query, setQuery, selected, onToggle, onSend, onBack }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <button type="button" onClick={onBack} className="mb-3 shrink-0 text-left text-[14px] font-medium text-[#498467]">Back</button>
      <h2 className="shrink-0 text-[18px] font-semibold">Send to people and stores</h2>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people and stores..." className="mt-3 shrink-0 rounded-lg border border-[#E6E6E6] px-3 py-2.5 text-[14px] outline-none focus:border-[#498467]" />
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="flex flex-col gap-2 pb-2">
          {items.length === 0 && <p className="py-8 text-center text-[14px] text-[#828282]">No people or stores found.</p>}
          {items.map((item) => {
            const isSelected = selected.includes(item.id);
            return (
              <button key={item.id} type="button" onClick={() => onToggle(item)} className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-left text-[14px] ${isSelected ? "border-[#498467] bg-[#F5FFF6] text-[#498467]" : "border-[#E6E6E6]"}`}>
                {item.image ? <img src={item.image} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DCEBE0] text-[11px] font-semibold text-[#498467]">{item.name.slice(0, 1).toUpperCase()}</span>}
                <span className="min-w-0 flex-1"><span className="block truncate font-medium">{item.name}</span>{item.summary && <span className="block truncate text-[12px] text-[#828282]">{item.summary}</span>}</span>
                {item.kind === "store" && <span className="text-[11px] text-[#828282]">Store</span>}
              </button>
            );
          })}
        </div>
      </div>
      <button type="button" disabled={selected.length !== 1} onClick={onSend} className="mt-3 shrink-0 rounded-lg bg-[#498467] py-3 text-[14px] font-medium text-white disabled:opacity-50">Send</button>
    </div>
  );
}

function ShareAction({ label, onClick }) {
  return <button type="button" onClick={onClick} className="rounded-lg px-3 py-3 text-left text-[15px] hover:bg-[#F5FFF6]">{label}</button>;
}
