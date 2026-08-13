import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import SearchBar from "../components/SearchBar";
import { useListings } from "../context/ListingContext";
import { useMessages } from "../context/MessageContext";
import DistanceLabel from "../components/DistanceLabel";
import { CompactReputationHeader } from "../components/ReputationSummary";
import { useReputationSnapshot } from "../hooks/useReputationRead";
import { useResolvedSeller } from "../hooks/useEntityResolution";

const TRADE_DIRECTIONS = ["Available For", "Looking For"];
const TRADE_TYPES = ["Products", "Services"];

export default function Trading() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [tradeDirection, setTradeDirection] = useState("Available For");
  const [tradeType, setTradeType] = useState("Products");
  const { listings } = useListings();
  const tradeListings = listings
    .filter((product) => product.availableForTrade)
    .filter((product) => {
      const searchableText = tradeDirection === "Available For"
        ? `${product.name} ${product.tradeAvailableFor ?? ""} ${product.description ?? ""}`
        : `${product.desiredTradeItems ?? ""} ${product.description ?? ""}`;
      return searchableText.toLowerCase().includes(query.trim().toLowerCase());
    })
    .filter((product) => (product.tradeType ?? "Products") === tradeType);

  return (
    <MobileScreenLayout>
      <Header title="Trading Marketplace" onBack={() => navigate(-1)} />
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
        <div className="px-4 py-4">
          <SearchBar
            placeholder="Search trades..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="mt-4 flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar">
            {TRADE_DIRECTIONS.map((direction) => (
              <button
                key={direction}
                type="button"
                onClick={() => setTradeDirection(direction)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium ${tradeDirection === direction ? "bg-[#498467] text-white" : "bg-[#F5F5F5] text-[#828282]"}`}
              >
                {direction}
              </button>
            ))}
            <span aria-hidden="true" className="text-[#D9D9D9]">|</span>
            {TRADE_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setTradeType(type)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium ${tradeType === type ? "bg-[#498467] text-white" : "bg-[#F5F5F5] text-[#828282]"}`}
              >
                {type}
              </button>
            ))}
          </div>
          <div className="mb-5 mt-4 rounded-lg bg-[#F5FFF6] p-4">
            <h2 className="text-[18px] font-semibold">Trade with your local community</h2>
            <p className="mt-1 text-[14px] leading-[140%] text-[#4F4F4F]">Discover local listings and propose a trade that works for both sides.</p>
          </div>
          <div className="mb-3 mt-5 flex items-center justify-between">
            <h2 className="text-[18px] font-semibold">Available for Trade</h2>
            <span className="text-[12px] text-[#828282]">{tradeListings.length} listings</span>
          </div>
          {tradeListings.length === 0 ? (
            <div className="rounded-lg border border-[#E6E6E6] px-4 py-8 text-center text-[14px] text-[#828282]">No listings are available for trade yet.</div>
          ) : (
            <div className="flex flex-col gap-4">
              {tradeListings.map((product) => <TradeListingCard key={product.id} product={product} navigate={navigate} />)}
            </div>
          )}
        </div>
      </div>
    </MobileScreenLayout>
  );
}

function TradeListingCard({ product, navigate }) {
  const resolvedSeller = useResolvedSeller(product.sellerId);
  const seller = resolvedSeller ?? { id: product.sellerId, name: product.shop, location: product.location };
  const { createTradeConversation } = useMessages();
  const reputationSnapshot = useReputationSnapshot(seller?.id ?? product.sellerId);

  const handleProposeTrade = () => {
    if (!resolvedSeller) return;
    const { id, draft, conversation } = createTradeConversation({ listing: product, seller: resolvedSeller });
    navigate(`/messages/${id}`, {
      state: {
        draft,
        listingId: product.id,
        tradeThread: true,
        pendingConversation: conversation,
      },
    });
  };
  return (
    <article className="overflow-hidden rounded-lg border border-[#E6E6E6]">
      <button type="button" onClick={() => navigate(`/product/${product.id}`)} className="block w-full text-left">
        <img src={product.image} alt={product.name} className="h-[180px] w-full object-cover" />
        <div className="flex flex-col gap-1 p-3">
          <h3 className="text-[18px] font-semibold">{product.name}</h3>
          <p className="text-[14px] text-[#498467]">{seller?.name ?? product.shop}</p>
          <CompactReputationHeader snapshot={reputationSnapshot} audience="seller" className="mt-1 max-w-full" />
          <DistanceLabel content={product} />
          <div className="mt-2 rounded-lg bg-[#F5FFF6] p-3">
            <p className="text-[12px] font-medium text-[#498467]">Looking For</p>
            <p className="mt-1 text-[14px]">{product.desiredTradeItems}</p>
          </div>
        </div>
      </button>
      <div className="px-3 pb-3">
        <button type="button" onClick={handleProposeTrade} className="w-full rounded-lg bg-[#498467] py-2.5 text-[14px] font-medium text-white">Propose Trade</button>
      </div>
    </article>
  );
}
