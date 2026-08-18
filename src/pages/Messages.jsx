import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import { sortConversations, useMessages } from "../context/MessageContext";
import { useOrders } from "../context/OrderContext";
import { useListings } from "../context/ListingContext";
import { useProfileMode } from "../context/ProfileModeContext";
import ProfileAvatar from "../components/ProfileAvatar";
import FoundingMemberBadge from "../components/FoundingMemberBadge";
import OutlineIcon from "../components/OutlineIcon";
import { getConversationProfile } from "../utils/conversationProfile";
import { useSellerSettings } from "../context/SellerSettingsContext";
import { useBuyerSettings } from "../context/BuyerSettingsContext";
import { getOrderStatusClass, getOrderStatusLabel } from "../utils/orderStatus";
import { readNavigationState, writeNavigationState } from "../hooks/navigationState";

const TAB_NAMES = ["All", "Selling", "Buying", "Trading", "Orders"];

function isTradeConversation(conversation) {
  return conversation.conversationType === "trading"
    || conversation.tradeThread === true
    || conversation.category === "Trading";
}

function latestMessageForConversation(conversation) {
  return (conversation.messages ?? []).reduce((latest, candidate) => {
    if (!latest) return candidate;
    const latestTime = new Date(latest.createdAt ?? latest.created_at ?? latest.timestamp).getTime();
    const candidateTime = new Date(candidate.createdAt ?? candidate.created_at ?? candidate.timestamp).getTime();
    return candidateTime > latestTime ? candidate : latest;
  }, null);
}

export default function Messages() {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const savedMessagesState = readNavigationState("messages", { tab: "All", scrollTop: 0 });
  const [tab, setTab] = useState(savedMessagesState.tab);
  const tabRef = useRef(tab);
  const saveMessagesState = (nextTab = tabRef.current) => writeNavigationState("messages", { tab: nextTab, scrollTop: scrollRef.current?.scrollTop ?? 0 });
  const { messages } = useMessages();
  const safeMessages = Array.isArray(messages) ? messages.filter(Boolean) : [];
  const { listings } = useListings();
  const { orders } = useOrders();
  const { profileMode } = useProfileMode();
  const { getSellerProfile } = useSellerSettings();
  const { settings: buyerProfile } = useBuyerSettings();
  const tabNames = profileMode === "buyer" ? TAB_NAMES.filter((tabName) => tabName !== "Selling") : TAB_NAMES;

  useEffect(() => {
    if (profileMode === "buyer" && tab === "Selling") {
      tabRef.current = "All";
      setTab("All");
      saveMessagesState("All");
    }
  }, [profileMode, tab]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = savedMessagesState.scrollTop;
    const scrollElement = scrollRef.current;
    const saveState = () => saveMessagesState();
    scrollElement?.addEventListener("scroll", saveState, { passive: true });
    return () => {
      saveState();
      scrollElement?.removeEventListener("scroll", saveState);
    };
  }, []);

  const sortedMessages = sortConversations(safeMessages);
  const filteredMessages = tab === "All"
    ? sortedMessages
    : tab === "Trading"
      ? sortedMessages.filter(isTradeConversation)
      : sortedMessages.filter((m) => !isTradeConversation(m) && m.category === tab);

  useEffect(() => {
    console.info("Messages list ordering diagnostics", {
      totalConversationsLoaded: safeMessages.length,
      conversationsAfterSorting: sortedMessages.length,
      conversationsAfterTabFiltering: filteredMessages.length,
      filteredOutConversations: sortedMessages.length - filteredMessages.length,
      conversationsMissingLatestActivityAt: sortedMessages.filter((conversation) => !conversation.latestActivityAt).length,
      conversationsMissingMessageArray: sortedMessages.filter((conversation) => !Array.isArray(conversation.messages)).length,
      activeTab: tab,
    });
  }, [filteredMessages, safeMessages, sortedMessages, tab]);
  const unreadCountFor = (tabName) => {
    const tabMessages = tabName === "All"
      ? safeMessages
      : tabName === "Trading"
        ? safeMessages.filter(isTradeConversation)
        : safeMessages.filter((m) => !isTradeConversation(m) && m.category === tabName);
    return tabMessages.filter((message) => message.unread).length;
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 py-3">
        <SearchBar />
      </div>
      <div className="shrink-0 flex gap-2 px-4 pb-3">
        {tabNames.map((tabName) => (
          <button
            key={tabName}
            onClick={() => { tabRef.current = tabName; setTab(tabName); saveMessagesState(tabName); }}
            className={`px-3 py-1.5 rounded-md text-[14px] font-medium border relative ${
              tab === tabName
                ? "bg-[#498467] text-white border-[#498467]"
                : "bg-white text-black/90 border-[#E6E6E6]"
            }`}
          >
            {tabName}
            {unreadCountFor(tabName) > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#498467] text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                {unreadCountFor(tabName)}
              </span>
            )}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-0 pb-24 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex flex-col">
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <h2 className="text-[18px] font-semibold">Messages</h2>
            <p className="mt-2 text-[14px] text-[#828282]">No conversations yet.</p>
            <p className="mt-1 text-[13px] text-[#828282]">Connect with local buyers and sellers to start chatting.</p>
            <button type="button" onClick={() => navigate("/")} className="mt-4 rounded-lg bg-[#498467] px-4 py-2.5 text-[13px] font-medium text-white">Explore Community</button>
          </div>
        ) : (
          filteredMessages.map((m) => (
            <MessageRow
              key={m.id}
              message={m}
              orders={orders}
              navigate={navigate}
              getSellerProfile={getSellerProfile}
              buyerProfile={buyerProfile}
              listings={listings}
            />
          ))
        )}
        </div>
      </div>
    </div>
  );
}

function formatRelativeTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "";
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 172800) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function MessageRow({ message, orders, navigate, getSellerProfile, buyerProfile, listings }) {
  const latestMessage = latestMessageForConversation(message);
  const fallbackProfile = getConversationProfile(message, getSellerProfile, buyerProfile);
  const participantProfile = message.participantProfile ?? fallbackProfile ?? {};
  const participantId = message.participantId ?? participantProfile.id;
  const participantName = message.participantName ?? participantProfile.name ?? message.name ?? "User";
  const listing = listings.find((item) => item.id === message.listingId || item.databaseId === message.listingId);
  const listingTitle = listing?.name ?? message.subjectTitle ?? message.serviceContext?.title ?? "Marketplace conversation";
  const conversationProfile = { ...participantProfile, id: participantId, name: participantName, avatar: participantProfile.avatar ?? participantProfile.avatar_url ?? "" };
  const isOrderConversation = message.conversationType === "order" || Boolean(message.orderId || message.orderContext?.orderId);
  const liveOrder = isOrderConversation ? orders.find((order) => order.id === (message.orderId ?? message.orderContext?.orderId)) : null;
  const orderNumber = liveOrder?.id ?? message.orderContext?.orderNumber ?? message.orderId;
  const orderStatus = liveOrder?.status ?? message.orderContext?.status;

  return (
    <div className={`flex gap-3 border-b border-black/5 px-4 py-3 ${message.unread ? "bg-[#F7FCF8]" : "bg-white"}`}>
      <button onClick={() => navigate(`/messages/${message.id}`)} className="flex min-w-0 flex-1 gap-3 text-left">
        <ProfileAvatar profile={conversationProfile} size="h-11 w-11" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1">
            <div className={`truncate text-[15px] ${message.unread ? "font-bold" : "font-semibold"} text-[#262626]`}>{participantName}</div>
            {participantId === message.sellerId && <FoundingMemberBadge sellerId={message.sellerId} compact iconOnly />}
          </div>
          {(participantProfile.location || message.location) && <div className="mt-0.5 flex items-center gap-1 truncate text-[12px] text-[#828282]"><OutlineIcon name="location" size={12} />{participantProfile.location || message.location}</div>}
          <div className="mt-0.5 truncate text-[13px] font-medium text-[#498467]">{listingTitle}</div>
          <p className="mt-1 line-clamp-1 text-[13px] text-[#666]">{latestMessage?.text || "No messages yet"}</p>
          {isOrderConversation && <div className={`mt-1 flex min-w-0 items-center gap-1 text-[12px] ${getOrderStatusClass(orderStatus)}`}><span className="truncate">{orderStatus ? getOrderStatusLabel(orderStatus) : "Order"}</span><span aria-hidden="true">•</span><span className="shrink-0">Order #{String(orderNumber ?? "").replace(/^#/, "")}</span></div>}
          {isTradeConversation(message) && <div className="mt-1 flex items-center gap-1 text-[12px] font-medium text-[#498467]"><OutlineIcon name="trade" size={12} />Trade Proposal</div>}
        </div>
      </button>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className="text-[11px] text-[#828282]">{formatRelativeTimestamp(latestMessage?.createdAt ?? latestMessage?.timestamp ?? message.timestamp)}</span>
        {message.unread && <span aria-label="Unread messages" className="flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#C85A3F] px-1.5 text-[10px] font-bold leading-5 text-white">{message.messages?.filter((item) => item.unread).length || 1}</span>}
      </div>
    </div>
  );
}
