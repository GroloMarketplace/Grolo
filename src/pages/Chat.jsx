import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { sellers } from "../data/mockData";
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
  const { listings } = useListings();
  const { messages, appendMessage, ensureConversation, markConversationRead } = useMessages();
  const { user } = useAuth();
  const { orders } = useOrders();
  const { getSellerProfile } = useSellerSettings();
  const { settings: buyerProfile } = useBuyerSettings();
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

  useEffect(() => {
    let active = true;
    const routeChanged = conversationRouteRef.current !== id;
    if (routeChanged && conversationUUIDRef.current) {
      console.info("Conversation UUID cleared", {
        conversationId: conversationUUIDRef.current,
        reason: "conversation route changed",
      });
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
      console.info("Conversation initialization already established; preserving active UUID", {
        conversationId: conversationUUIDRef.current,
      });
    }
    ensureConversation({
      conversationId: id,
      pendingConversation,
      participantId: pendingConversation?.participantId ?? pendingConversation?.sellerId ?? routeParticipantId,
      listingId: databaseListingId,
      conversationType: pendingConversation?.conversationType ?? (serviceContext ? "service" : "standard"),
    }).then((resolvedConversationId) => {
      if (!active) return;
      console.info("Conversation initialized", {
        conversationId: resolvedConversationId,
        routeConversationId: id,
      });
      conversationUUIDRef.current = resolvedConversationId;
      conversationReadyRef.current = true;
      console.info("Conversation UUID assigned", {
        conversationId: resolvedConversationId,
      });
      setConversationUUID(resolvedConversationId);
      setConversationReady(true);
      void markConversationRead(resolvedConversationId);
      if (id !== resolvedConversationId) void markConversationRead(id);
      console.info("Chat conversation UUID ready", {
        conversationId: resolvedConversationId,
        senderId: user?.id ?? null,
        recipientId: pendingConversation?.participantId ?? pendingConversation?.sellerId ?? routeParticipantId,
      });
    }).catch((error) => {
      if (!active) return;
      setConversationReady(false);
      setSendError(error?.message || "Unable to initialize this conversation. Please try again.");
      console.warn("Chat conversation initialization failed", {
        routeConversationId: id,
        senderId: user?.id ?? null,
        recipientId: pendingConversation?.participantId ?? pendingConversation?.sellerId ?? routeParticipantId,
        error: error?.message ?? String(error),
      });
    });
    return () => {
      active = false;
    };
  }, [conversationAttempt, databaseListingId, ensureConversation, id, listingId, markConversationRead, pendingConversation, routeParticipantId, serviceContext, user?.id]);

  const seller = Object.values(sellers).find((s) => s.id === (conversation?.sellerId ?? listing?.sellerId ?? id)) || { id: conversation?.sellerId ?? listing?.sellerId ?? id, name: "this store" };
  const conversationProfile = getConversationProfile({ ...conversation, sellerId: conversation?.sellerId ?? seller.id, name: conversation?.name ?? seller.name }, getSellerProfile, buyerProfile);
  const isOrderThread = location.state?.orderConversation === true || conversation?.conversationType === "order";
  const isTradeThread = location.state?.tradeThread === true
    || conversation?.conversationType === "trading"
    || conversation?.tradeThread === true;
  const tradeOptions = listing?.desiredTradeItems
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean) ?? [];

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
        console.info("Conversation UUID assigned", {
          conversationId: resolvedConversationId,
          source: "send-retry",
        });
        setConversationUUID(resolvedConversationId);
        setConversationReady(true);
      }
      if (!resolvedConversationId) throw new Error("A conversation could not be initialized. Please try again.");
      await appendMessage(resolvedConversationId, message, conversation);
      console.info("Chat message confirmed", { conversationId: resolvedConversationId, messageId: message.id, senderId: user.id });
      setText("");
      setSelectedTradeItem(null);
    } catch (error) {
      console.warn("Chat message could not be sent; preserving input", {
        conversationId: id,
        messageId: message.id,
        error: error?.message ?? String(error),
      });
      setSendError(error?.message || "Unable to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  // Check if this is a new conversation (created from Seller Profile)
  const isNewConversation = !conversation;
  const hasPersistedMessage = Boolean(conversation?.messages?.some((message) => message.databaseId));

  // Pre-fill a draft for new or existing conversations.
  useEffect(() => {
    if (location.state?.draft) {
      setText(location.state.draft);
    } else if (isNewConversation) {
      setText("Hi! I was looking at your store and had a question about your listings.");
    }
  }, [isNewConversation, location.state?.draft]);

  useEffect(() => {
    if (isTradeThread) {
      console.info("Messages loaded when thread opens", {
        conversationId: id,
        messageIds: conversation?.messages?.map((message) => message.id) ?? [],
        messageCount: conversation?.messages?.length ?? 0,
      });
    }
  }, [conversation?.messages, id, isTradeThread]);

  return (
    <div className="flex flex-col h-full">
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
          <div className="text-[16px] font-semibold">{seller.name}</div>
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
        <TrustSafetyActions targetType="message" targetId={conversation?.databaseId ?? conversation?.id ?? id} blockUserId={seller.id} compact />
      </div>
      <div className="min-h-0 flex-1 flex flex-col gap-3 p-4 overflow-y-auto no-scrollbar">
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
        ) : isTradeThread && conversation?.tradeProposal ? (
          <div className="flex flex-col gap-3 p-3 rounded-lg border border-[#A7DDB5] bg-[#F5FFF6]">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#356B4A]">
              <OutlineIcon name="trade" size={14} />
              Trade Proposal
            </div>
            <p className="text-[12px] text-[#828282]">From {conversation.tradeProposal.buyerName}</p>
            <button
              onClick={() => navigate(`/product/${conversation.tradeProposal.requestedListing.id}`)}
              className="flex gap-3 text-left"
            >
              <img
                src={conversation.tradeProposal.requestedListing.image}
                alt={conversation.tradeProposal.requestedListing.name}
                className="w-16 h-16 rounded-lg object-cover shrink-0"
              />
              <div className="flex-1 flex flex-col justify-center min-w-0">
                <p className="text-[12px] text-[#828282]">Requesting</p>
                <h4 className="text-[14px] font-semibold truncate">{conversation.tradeProposal.requestedListing.name}</h4>
              </div>
            </button>
            {conversation.tradeProposal.offeredListing && (
              <div className="flex gap-3">
                <img
                  src={conversation.tradeProposal.offeredListing.image}
                  alt={conversation.tradeProposal.offeredListing.name}
                  className="w-16 h-16 rounded-lg object-cover shrink-0"
                />
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <p className="text-[12px] text-[#828282]">Offered</p>
                  <h4 className="text-[14px] font-semibold truncate">{conversation.tradeProposal.offeredListing.name}</h4>
                </div>
              </div>
            )}
            {conversation.tradeProposal.message && (
              <div className="text-[13px] text-[#4F4F4F]">
                <span className="font-medium text-[#356B4A]">Message: </span>
                {conversation.tradeProposal.message}
              </div>
            )}
            {conversation.tradeProposal.photos?.length > 0 && (
              <div className="flex gap-2 overflow-x-auto">
                {conversation.tradeProposal.photos.map((photo, index) => (
                  <img key={index} src={photo} alt={`Trade photo ${index + 1}`} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                ))}
              </div>
            )}
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
              <p className="text-[16px] font-semibold text-[#498467]">{serviceContext ? formatListingPrice(listing) : `$${Number(listing.price).toFixed(2)}`}</p>
              {serviceContext ? <span className="text-[12px] text-[#498467]">View Service Listing</span> : <div className="flex flex-wrap gap-x-2 text-[12px] text-[#498467]"><span>View Listing</span>{listing.quantityAvailable != null && <span>Available: {listing.quantityAvailable}</span>}{listing.availableForTrade && <span>Open to Trade</span>}</div>}
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
              <p className="flex items-center gap-1 text-[13px] text-[#828282]"><OutlineIcon name="location" size={14} />{seller.location}</p>
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
              <span className="text-[11px] text-[#828282] mt-1">{message.timestamp}</span>
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
        <div className="flex items-center gap-4 px-4 py-2 rounded-lg border border-[#E0E0E0]">
          <input
            ref={inputRef}
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
            className="flex-1 text-[14px] text-[#828282] outline-none"
          />
          <button type="button" onClick={handleSend} disabled={!user || !conversationUUID || !conversationReady || sending} aria-label="Send message" className="text-[#498467] disabled:opacity-50">
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
