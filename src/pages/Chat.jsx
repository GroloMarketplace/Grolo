import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { chatMessages, sellers, messages } from "../data/mockData";
import { useListings } from "../context/ListingContext";

export default function Chat() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [text, setText] = useState("");
  const [sentMessages, setSentMessages] = useState([]);
  const [selectedTradeItem, setSelectedTradeItem] = useState(null);
  const inputRef = useRef(null);
  const { listings } = useListings();
  const conversation = messages.find((message) => message.id === id);
  const listing = location.state?.listingId
    ? listings.find((item) => item.id === location.state.listingId)
    : null;
  const seller = Object.values(sellers).find((s) => s.id === (conversation?.sellerId ?? listing?.sellerId ?? id)) || sellers["pennies-produce"];
  const isTradeThread = location.state?.tradeThread === true;
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

  const handleSend = () => {
    const messageText = text.trim();
    if (!messageText) return;
    setSentMessages((current) => [...current, {
      id: `${id}-${Date.now()}`,
      from: "me",
      text: messageText,
      timestamp: "Just now",
    }]);
    setText("");
    setSelectedTradeItem(null);
  };

  // Check if this is a new conversation (created from Seller Profile)
  const isNewConversation = !conversation;

  // Pre-fill a draft for new or existing conversations.
  useEffect(() => {
    if (location.state?.draft) {
      setText(location.state.draft);
    } else if (isNewConversation) {
      setText("Hi! I was looking at your store and had a question about your listings.");
    }
  }, [isNewConversation, location.state?.draft]);

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
        <img
          src={seller.avatar}
          alt={seller.name}
          className="w-8 h-8 rounded-full object-cover"
        />
        <div className="flex-1">
          <div className="text-[16px] font-semibold">{seller.name}</div>
          <div className="text-[12px] text-black/50">Active 11m ago</div>
        </div>
      </div>

      <div className="min-h-0 flex-1 flex flex-col gap-3 p-4 overflow-y-auto no-scrollbar">
        {listing ? (
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
              <h4 className="text-[16px] font-semibold truncate">{listing.name}</h4>
              <p className="text-[14px] text-[#828282] truncate">{listing.shop}</p>
              <p className="text-[16px] font-semibold text-[#498467]">${Number(listing.price).toFixed(2)}</p>
              <div className="flex flex-wrap gap-x-2 text-[12px] text-[#498467]">
                {listing.quantityAvailable != null && <span>{listing.quantityAvailable} available</span>}
                {listing.availableForTrade && <span>Open to Trade</span>}
              </div>
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
              <p className="text-[14px] text-[#828282]">{seller.location}</p>
              <p className="text-[16px] font-semibold text-[#498467]">Active Listings</p>
            </div>
          </button>
        )}

        {!isNewConversation && !isTradeThread && chatMessages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}
          >
            <div className="flex flex-col items-end">
              <div
                className={`max-w-[70%] px-4 py-2 rounded-2xl text-[14px] font-medium ${
                  m.from === "me"
                    ? "bg-[#498467] text-white rounded-br-md"
                    : "bg-[#E9E9EB] text-black rounded-bl-md"
                }`}
              >
                {m.text}
              </div>
              <span className="text-[11px] text-[#828282] mt-1">{m.timestamp}</span>
            </div>
          </div>
        ))}

        {sentMessages.map((message) => (
          <div key={message.id} className="flex justify-end">
            <div className="flex flex-col items-end">
              <div className="max-w-[70%] rounded-2xl rounded-br-md bg-[#498467] px-4 py-2 text-[14px] font-medium text-white">
                {message.text}
              </div>
              <span className="mt-1 text-[11px] text-[#828282]">{message.timestamp}</span>
            </div>
          </div>
        ))}

        {!isNewConversation && !isTradeThread && (
          <div className="text-center text-[12px] text-[#828282]">
            Delivered
          </div>
        )}
      </div>

      <div className="shrink-0 p-2 border-t border-[#E6E6E6]">
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
            onChange={(e) => setText(e.target.value)}
            placeholder="Message..."
            className="flex-1 text-[14px] text-[#828282] outline-none"
          />
          <button type="button" onClick={isTradeThread ? handleSend : undefined} aria-label="Send message" className="text-[#498467]">
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
