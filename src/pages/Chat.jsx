import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { sellers } from "../data/mockData";
import { formatLocation } from "../data/locations";
import { useListings } from "../context/ListingContext";
import { useMessages } from "../context/MessageContext";
import { useAuth } from "../context/AuthContext";
import { useOrders } from "../context/OrderContext";
import ProfileAvatar from "../components/ProfileAvatar";
import OutlineIcon from "../components/OutlineIcon";
import { getConversationProfile } from "../utils/conversationProfile";
import { useSellerSettings } from "../context/SellerSettingsContext";
import { useBuyerSettings } from "../context/BuyerSettingsContext";
import { getOrderStatusClass, getOrderStatusLabel } from "../utils/orderStatus";
import { formatListingPrice } from "../utils/listingDisplay";
import TrustSafetyActions from "../components/TrustSafetyActions";
import { useBlockedAccount } from "../hooks/useBlockedAccount";
import { useTrustSafety } from "../context/TrustSafetyContext";
import { formatMessageTimestamp } from "../utils/messageTimestamp";

export default function Chat() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [text, setText] = useState("");
  const [selectedTradeItem, setSelectedTradeItem] = useState(null);
  const [sendError, setSendError] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationUUID, setConversationUUID] = useState(null);
  const [conversationReady, setConversationReady] = useState(false);
  const conversationUUIDRef = useRef(null);
  const conversationReadyRef = useRef(false);
  const conversationRouteRef = useRef(null);
  const [conversationAttempt, setConversationAttempt] = useState(0);
  const inputRef = useRef(null);
  const messageListRef = useRef(null);
  const { listings } = useListings();
  const { messages, appendMessage, ensureConversation, markConversationRead, respondToTradeProposal } = useMessages();
  const { user } = useAuth();
  const { orders } = useOrders();
  const { getSellerProfile } = useSellerSettings();
  const { settings: buyerProfile } = useBuyerSettings();
  const { unblock } = useTrustSafety();
  const pendingConversation = location.state?.pendingConversation;
  const conversation = messages.find((message) => message.id === id || message.databaseId === conversationUUID || message.id === conversationUUID) ?? pendingConversation;
  const orderContext = conversation?.orderContext;
  const liveOrder = conversation?.conversationType === "order" || conversation?.orderId
    ? orders.find((order) => order.id === (conversation?.orderId ?? orderContext?.orderId))
    : null;
  const currentOrderContext = liveOrder ? { ...orderContext, orderId: liveOrder.id, orderNumber: liveOrder.id.replace(/^ORD-/, "#"), status: liveOrder.status, productId: liveOrder.productId, quantity: liveOrder.quantity } : orderContext;
  const serviceContext = location.state?.serviceContext ?? conversation?.serviceContext;
  const listingId = location.state?.listingId ?? conversation?.listingId ?? serviceContext?.listingId ?? currentOrderContext?.productId;
  const listing = listingId
    ? listings.find((item) => item.id === listingId || item.databaseId === listingId)
    : null;
  const databaseListingId = listing?.databaseId ?? (listingId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(listingId) ? listingId : null);
  const routeParticipantId = (() => {
    try {
      return decodeURIComponent(id ?? "");
    } catch {
      return id ?? "";
    }
  })();
  const otherParticipantId = conversation?.participantId ?? (String(user?.id) === String(conversation?.sellerId) ? conversation?.buyerId : conversation?.sellerId ?? routeParticipantId);
  const blocked = useBlockedAccount(otherParticipantId);

  useLayoutEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const nextHeight = Math.min(textarea.scrollHeight, 120);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > nextHeight ? "auto" : "hidden";
  }, [text]);

  useEffect(() => {
    const messageList = messageListRef.current;
    if (messageList) messageList.scrollTop = messageList.scrollHeight;
  }, [conversation?.messages?.length]);

  useEffect(() => {
    let active = true;
    if (!user?.id) {
      return () => {
        active = false;
      };
    }
    const routeChanged = conversationRouteRef.current !== id;
    if (routeChanged && conversationUUIDRef.current) {
      conversationUUIDRef.current = null;
      conversationReadyRef.current = false;
    }
    conversationRouteRef.current = id;
    if (!conversationUUIDRef.current) {
      setConversationUUID(null);
      setConversationReady(false);
      conversationReadyRef.current = false;
      setSendError("");
    } else {
    }
    ensureConversation({
      conversationId: id,
      pendingConversation,
      participantId: pendingConversation?.participantId ?? pendingConversation?.sellerId ?? routeParticipantId,
      listingId: databaseListingId,
      conversationType: pendingConversation?.conversationType ?? (serviceContext ? "service" : "standard"),
    }).then(async (resolvedConversationId) => {
      if (!active) return;
      conversationUUIDRef.current = resolvedConversationId;
      conversationReadyRef.current = true;
      setConversationUUID(resolvedConversationId);
      setConversationReady(true);
      const activeConversation = messages.find((item) => item.databaseId === resolvedConversationId || item.id === resolvedConversationId || item.id === id) ?? conversation;
      const incomingUnreadBefore = activeConversation?.messages?.filter((message) => message.unread === true) ?? [];
      const readAudit = await markConversationRead(resolvedConversationId);
      if (id !== resolvedConversationId) await markConversationRead(id);
    }).catch((error) => {
      if (!active) return;
      setConversationReady(false);
      setSendError(error?.message || "Unable to initialize this conversation. Please try again.");
    });
    return () => {
      active = false;
    };
  }, [conversationAttempt, databaseListingId, ensureConversation, id, listingId, markConversationRead, pendingConversation, routeParticipantId, serviceContext, user?.id]);

  const sellerId = conversation?.sellerId ?? listing?.sellerId ?? id;
  const liveSeller = getSellerProfile(sellerId);
  const legacySeller = Object.values(sellers).find((s) => s.id === sellerId);
  const seller = liveSeller?.name || liveSeller?.avatar ? liveSeller : legacySeller ?? { id: sellerId, name: listing?.shop ?? conversation?.storeName ?? "Seller" };
  const conversationProfile = getConversationProfile({ ...conversation, sellerId, participantId: conversation?.participantId ?? (String(user?.id) === String(sellerId) ? conversation?.buyerId : sellerId), name: conversation?.name ?? seller.name }, getSellerProfile, buyerProfile, user?.id);
  const isOrderThread = location.state?.orderConversation === true || conversation?.conversationType === "order";
  const tradeProposal = conversation?.tradeProposal;
  const tradeStatus = tradeProposal?.status ?? "pending";
  const isTradeThread = location.state?.tradeThread === true
    || conversation?.conversationType === "trading"
    || conversation?.conversationType === "trade_proposal"
    || conversation?.metadata?.conversationType === "trading"
    || conversation?.metadata?.conversationType === "trade_proposal"
    || conversation?.tradeThread === true
    || conversation?.metadata?.tradeThread === true
    || Boolean(tradeProposal);
  useEffect(() => {
    if (!isTradeThread || !conversation) return;
  }, [conversation, isTradeThread, tradeProposal]);
  const tradeOptions = listing?.desiredTradeItems
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean) ?? [];
  const tradeOfferings = tradeProposal?.offeredListings
    ?? (tradeProposal?.offeredListing ? [tradeProposal.offeredListing] : []);
  const isTradeSeller = isTradeThread && String(user?.id) === String(conversation?.sellerId);
  const handleTradeResponse = (action) => {
    void respondToTradeProposal({ conversationId: conversation.id, action });
  };

  const updateTradeDraft = (tradeItem) => {
    const nextText = `Hi ${seller.name}! I'd like to make a trade for ${tradeItem}.`;
    setSelectedTradeItem(tradeItem);
    setText(nextText);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(nextText.length, nextText.length);
    });
  };

  const handleSend = async () => {
    const messageText = text.trim();
    if (!messageText) {
      setSendError("Enter a message before sending.");
      return;
    }
    if (!conversation) {
      setSendError("Conversation is not ready yet. Please wait or retry initialization.");
      return;
    }
    if (sending) return;
    const message = {
      id: `${id}-${Date.now()}`,
      from: "me",
      text: messageText,
      timestamp: "Just now",
    };
    setSendError("");
    setSending(true);
    try {
      let resolvedConversationId = conversationUUID;
      if (!user?.id) throw new Error("Please sign in before sending a message.");
      if (!resolvedConversationId) {
        resolvedConversationId = await ensureConversation({
          conversationId: id,
          pendingConversation: conversation,
          participantId: conversation.participantId ?? conversation.sellerId ?? routeParticipantId,
          listingId: databaseListingId,
          conversationType: conversation.conversationType ?? (serviceContext ? "service" : "standard"),
        });
        conversationUUIDRef.current = resolvedConversationId;
        conversationReadyRef.current = true;
        setConversationUUID(resolvedConversationId);
        setConversationReady(true);
      }
      if (!resolvedConversationId) throw new Error("A conversation could not be initialized. Please try again.");
      await appendMessage(resolvedConversationId, message, conversation);
      setText("");
      setSelectedTradeItem(null);
    } catch (error) {
      setSendError(error?.message || "Unable to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const hasPersistedMessage = Boolean(conversation?.messages?.some((message) => message.databaseId));

  useEffect(() => {
    if (isTradeThread) {
    }
  }, [conversation?.messages, id, isTradeThread]);

  return (
    <div className="flex min-h-0 flex-col h-full">
      <div className="flex shrink-0 items-center gap-3 h-14 px-4 border-b border-[#E6E6E6]">
        <button onClick={() => navigate(-1)} aria-label="Back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M9.27 12 16.28 5a.5.5 0 0 0 0-.7l-.57-.57a.5.5 0 0 0-.7 0l-7.93 7.93a.5.5 0 0 0 0 .7l7.93 7.93a.5.5 0 0 0 .7 0l.57-.57a.5.5 0 0 0 0-.7L9.27 12Z"
              fill="black"
            />
          </svg>
        </button>
        <ProfileAvatar profile={conversationProfile} size="w-8 h-8" />
        <div className="flex-1">
          <div className="text-[16px] font-semibold">{conversationProfile.name}</div>
          {isOrderThread && currentOrderContext ? (
            <div className={`text-[12px] ${getOrderStatusClass(currentOrderContext.status)}`}>{getOrderStatusLabel(currentOrderContext.status)} · Order {currentOrderContext.orderNumber}</div>
          ) : isTradeThread ? (
            <div className="flex items-center gap-1 text-[12px] font-medium text-[#498467]">
              <OutlineIcon name="trade" size={12} />
              Trade Proposal
            </div>
          ) : (
            <div className="text-[12px] text-black/50">Active 11m ago</div>
          )}
        </div>
        <TrustSafetyActions targetType="message" targetId={conversation?.databaseId ?? conversation?.id ?? id} blockUserId={conversationProfile.id} compact />
      </div>
      <div ref={messageListRef} className="min-h-0 flex-1 flex flex-col gap-3 p-4 overflow-y-auto no-scrollbar">
        {isOrderThread && currentOrderContext ? (
          <button
            onClick={() => navigate(`/product/${currentOrderContext.productId}`)}
            className="flex gap-3 p-3 rounded-lg border border-[#E6E6E6] bg-white hover:bg-[#F5F5F5] transition-colors cursor-pointer text-left"
          >
            <img
              src={currentOrderContext.productImage}
              alt={currentOrderContext.productName}
              className="w-20 h-20 rounded-lg object-cover shrink-0"
            />
            <div className="flex-1 flex flex-col justify-center min-w-0 gap-0.5">
              <h4 className="text-[16px] font-semibold truncate">{currentOrderContext.productName}</h4>
              <p className="text-[14px] text-[#828282] truncate">{currentOrderContext.storeName}</p>
              <p className="text-[13px] text-[#4F4F4F]">Order {currentOrderContext.orderNumber}</p>
              <p className="text-[13px] text-[#4F4F4F]">Qty: {currentOrderContext.quantity}</p>
              <div className="flex flex-wrap gap-x-2 text-[12px] text-[#498467]"><span>{currentOrderContext.fulfillmentMethod === "delivery" ? "Delivery" : "Pickup"}</span><span className={getOrderStatusClass(currentOrderContext.status)}>{getOrderStatusLabel(currentOrderContext.status)}</span></div>
            </div>
          </button>
        ) : isTradeThread && tradeProposal ? (
          <div className="flex flex-col gap-3 p-3 rounded-lg border border-[#A7DDB5] bg-[#F5FFF6]">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#356B4A]">
              <OutlineIcon name="trade" size={14} />
              Trade Proposal
            </div>
            <p className="text-[12px] text-[#828282]">From {tradeProposal.buyerName}</p>
            <button
              onClick={() => navigate(`/product/${tradeProposal.requestedListing.id}`)}
              className="flex gap-3 text-left"
            >
              <img
                src={tradeProposal.requestedListing.image}
                alt={tradeProposal.requestedListing.name}
                className="w-16 h-16 rounded-lg object-cover shrink-0"
              />
              <div className="flex-1 flex flex-col justify-center min-w-0">
                <p className="text-[12px] text-[#828282]">Requesting</p>
                <h4 className="text-[14px] font-semibold truncate">{tradeProposal.requestedListing.name}</h4>
              </div>
            </button>
            {tradeOfferings.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[12px] text-[#828282]">Buyer offers</p>
                {tradeOfferings.map((offeredListing) => <div key={offeredListing.id} className="flex gap-3"><img src={offeredListing.image} alt={offeredListing.name} className="w-16 h-16 rounded-lg object-cover shrink-0" /><div className="flex flex-col justify-center min-w-0"><h4 className="text-[14px] font-semibold truncate">{offeredListing.name}</h4></div></div>)}
              </div>
            )}
            {tradeProposal.message && (
              <div className="text-[13px] text-[#4F4F4F]">
                <span className="font-medium text-[#356B4A]">Message: </span>
                {tradeProposal.message}
              </div>
            )}
            {tradeProposal.photos?.length > 0 && (
              <div className="flex gap-2 overflow-x-auto">
                {tradeProposal.photos.map((photo, index) => (
                  <img key={index} src={photo} alt={`Trade photo ${index + 1}`} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                ))}
              </div>
            )}
            {tradeStatus === "accepted" && <p className="text-[13px] font-medium text-[#356B4A]">Trade Accepted</p>}
            {tradeStatus === "declined" && <p className="text-[13px] font-medium text-[#B42318]">Trade Declined</p>}
            {isTradeSeller && tradeStatus === "pending" && <div className="flex gap-2"><button type="button" onClick={() => handleTradeResponse("accept")} className="flex-1 rounded-lg bg-[#498467] py-2 text-[13px] font-medium text-white">Accept</button><button type="button" onClick={() => handleTradeResponse("decline")} className="flex-1 rounded-lg border border-red-400 py-2 text-[13px] font-medium text-red-500">Decline</button></div>}
          </div>
        ) : listing ? (
          <button
            onClick={() => navigate(`/product/${listing.id}`)}
            className="flex gap-3 p-3 rounded-lg border border-[#E6E6E6] bg-white hover:bg-[#F5F5F5] transition-colors cursor-pointer text-left"
          >
            <img
              src={listing.images?.[0] ?? listing.image}
              alt={listing.name}
              className="w-20 h-20 rounded-lg object-cover shrink-0"
            />
            <div className="flex-1 flex flex-col justify-center min-w-0">
              {serviceContext && <span className="text-[12px] font-medium text-[#B56576]">In Services</span>}
              <h4 className="text-[16px] font-semibold truncate">{listing.name}</h4>
              <p className="text-[14px] text-[#828282] truncate">{seller.name}</p>
              <p className="text-[16px] font-semibold text-[#498467]">{formatListingPrice(listing)}</p>
              {serviceContext ? <span className="text-[12px] text-[#498467]">View Service Listing</span> : <div className="flex flex-wrap gap-x-2 text-[12px] text-[#498467]"><span>View Listing</span>{(!Array.isArray(listing.variants) || listing.variants.length === 0) && listing.quantityAvailable != null && <span>Available: {listing.quantityAvailable}</span>}{listing.availableForTrade && <span>Open to Trade</span>}</div>}
            </div>
          </button>
        ) : (
          <button
            onClick={() => navigate(`/seller/${seller.id}`)}
            className="flex gap-3 p-3 rounded-lg border border-[#E6E6E6] bg-white hover:bg-[#F5F5F5] transition-colors cursor-pointer text-left"
          >
            <img
              src={seller.banner}
              alt={seller.name}
              className="w-20 h-20 rounded-lg object-cover shrink-0"
            />
            <div className="flex-1 flex flex-col justify-center">
              <h4 className="text-[16px] font-semibold">{seller.name}</h4>
              <p className="flex items-center gap-1 text-[13px] text-[#828282]"><OutlineIcon name="location" size={14} />{formatLocation(seller)}</p>
              <p className="text-[16px] font-semibold text-[#498467]">Active Listings</p>
            </div>
          </button>
        )}

        {(conversation?.messages ?? []).map((message) => (
          <div
            key={message.id}
            className={`flex ${message.from === "me" ? "justify-end" : "justify-start"}`}
          >
            <div className={`flex w-full flex-col ${message.from === "me" ? "items-end" : "items-start"}`}>
              <div
                className={`w-fit max-w-[75%] whitespace-normal break-words px-4 py-2 rounded-2xl text-[14px] font-medium leading-5 ${
                  message.from === "me"
                    ? "bg-[#498467] text-white rounded-br-md"
                    : "bg-[#E9E9EB] text-black rounded-bl-md"
                }`}
              >
                {message.text}
              </div>
              <span className="text-[11px] text-[#828282] mt-1">{formatMessageTimestamp(message.createdAt ?? message.timestamp)}</span>
            </div>
          </div>
        ))}

        {hasPersistedMessage && !isTradeThread && (
          <div className="text-center text-[12px] text-[#828282]">
            Delivered
          </div>
        )}
      </div>

      <div className="shrink-0 p-2 border-t border-[#E6E6E6]">
        {blocked && <div className="mb-2 flex items-center justify-between gap-3 rounded-lg bg-[#FFF7F5] px-3 py-2 text-[12px] text-[#B42318]"><span>You have blocked this account.</span><button type="button" onClick={() => unblock(otherParticipantId).catch((error) => setSendError(error.message))} className="shrink-0 font-semibold underline">Unblock</button></div>}
        {sendError && (
          <div role="alert" className="mb-2 flex items-center justify-between gap-3 px-2 text-[12px] text-red-600">
            <p>{sendError}</p>
            {!conversationUUID && <button type="button" onClick={() => setConversationAttempt((attempt) => attempt + 1)} className="shrink-0 font-medium underline">Retry</button>}
          </div>
        )}
        {isTradeThread && tradeOptions.length > 0 && (
          <div className="mb-2 flex flex-wrap items-center gap-2 px-2">
            <span className="text-[12px] font-medium text-[#4F4F4F]">I have:</span>
            {tradeOptions.map((tradeItem) => (
              <button
                key={tradeItem}
                type="button"
                onClick={() => updateTradeDraft(tradeItem)}
                className={`rounded-full border px-3 py-1 text-[12px] transition-colors ${
                  selectedTradeItem === tradeItem
                    ? "border-[#498467] bg-[#498467] text-white"
                    : "border-[#D9D9D9] bg-[#F5F5F5] text-[#4F4F4F]"
                }`}
              >
                {tradeItem}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-4 rounded-lg border border-[#E0E0E0] px-4 py-2">
          <textarea
            ref={inputRef}
            rows={1}
            disabled={blocked}
            value={text}
            onChange={(e) => {
              const nextText = e.target.value;
              setText(nextText);
              setSendError("");
              setMessageDebug((current) => ({
                ...(current ?? {}),
                authUserId: user?.id ?? null,
                conversationUuid: conversationUUID,
                senderId: user?.id ?? null,
                messageContent: nextText,
                messageInsertPayload: {
                  conversation_id: conversationUUID,
                  sender_id: user?.id ?? null,
                  content: nextText.trim(),
                },
                messageInsertResponse: null,
                messageInsertError: null,
                fullSupabaseError: null,
              }));
            }}
            placeholder="Message..."
            className="min-h-6 max-h-[120px] flex-1 resize-none overflow-y-hidden break-words text-[16px] leading-5 text-[#828282] outline-none"
          />
          <button type="button" onClick={handleSend} disabled={blocked || !user || !conversationUUID || !conversationReady || sending} aria-label="Send message" className="mb-1 shrink-0 text-[#498467] disabled:opacity-50">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 20V4l19 8-19 8Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
