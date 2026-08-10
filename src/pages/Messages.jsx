import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import { sellers } from "../data/mockData";
import { useMessages } from "../context/MessageContext";
import { useOrders } from "../context/OrderContext";
import { useProfileMode } from "../context/ProfileModeContext";
import FoundingMemberBadge from "../components/FoundingMemberBadge";
import ProfileAvatar from "../components/ProfileAvatar";
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

export default function Messages() {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const savedMessagesState = readNavigationState("messages", { tab: "All", scrollTop: 0 });
  const [tab, setTab] = useState(savedMessagesState.tab);
  const tabRef = useRef(tab);
  const saveMessagesState = (nextTab = tabRef.current) => writeNavigationState("messages", { tab: nextTab, scrollTop: scrollRef.current?.scrollTop ?? 0 });
  const { messages } = useMessages();
  const safeMessages = Array.isArray(messages) ? messages.filter(Boolean) : [];
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

  const filteredMessages = tab === "All"
    ? safeMessages
    : tab === "Trading"
      ? safeMessages.filter(isTradeConversation)
      : safeMessages.filter((m) => !isTradeConversation(m) && m.category === tab);
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
          filteredMessages.map((m) => {
            const latestMessage = m.messages?.[m.messages.length - 1];
            const messageSeller = Object.values(sellers).find((seller) => seller.name === m.name);
            const conversationProfile = getConversationProfile(m, getSellerProfile, buyerProfile);
            const isOrderConversation = m.conversationType === "order" || Boolean(m.orderId || m.orderContext?.orderId);
            const liveOrder = isOrderConversation ? orders.find((order) => order.id === (m.orderId ?? m.orderContext?.orderId)) : null;
            const orderNumber = liveOrder?.id ?? m.orderContext?.orderNumber ?? m.orderId;
            const orderStatus = liveOrder?.status ?? m.orderContext?.status;
            return (
              <div
                key={m.id}
                className="flex gap-3 px-4 py-3 border-b border-black/5 relative"
              >
              <button
                onClick={() => navigate(`/messages/${m.id}`)}
                className="flex-1 min-w-0 flex gap-3 text-left"
              >
                <ProfileAvatar profile={conversationProfile} size="w-8 h-8" className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex min-w-0 items-center gap-1 overflow-hidden whitespace-nowrap text-[14px]">
                    <Link
                      to={`/seller/${Object.values(sellers).find((s) => s.name === m.name)?.id || 'sarahs-backyard'}`}
                      onClick={(e) => e.stopPropagation()}
                      className={`min-w-0 truncate ${m.unread ? "font-bold" : "font-semibold"} text-[#498467] hover:underline`}
                    >
                      {m.name}
                    </Link>
                    <FoundingMemberBadge sellerId={messageSeller?.id} iconOnly />
                    <span className="flex shrink-0 items-center gap-1 text-[#B56576]"><OutlineIcon name="location" size={13} />{m.location}</span>
                  </div>
                  {isOrderConversation && <div className={`mt-1 flex min-w-0 items-center gap-1 text-[12px] ${getOrderStatusClass(orderStatus)}`}><span className="truncate">{orderStatus ? getOrderStatusLabel(orderStatus) : "Order"}</span><span aria-hidden="true">•</span><span className="shrink-0">Order #{String(orderNumber ?? "").replace(/^#/, "")}</span></div>}
                  <p className="mt-1 line-clamp-1 text-[14px]">{latestMessage?.text ?? ""}</p>
                </div>
              </button>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[12px] text-[#828282]">{latestMessage?.timestamp ?? ""}</span>
                {m.unread && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#498467] shrink-0" />
                )}
              </div>
              </div>
            );
          })
        )}
        </div>
      </div>
    </div>
  );
}
