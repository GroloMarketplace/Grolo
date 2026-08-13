import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { sellers } from "../data/mockData";
import { useListings } from "../context/ListingContext";
import { useMessages } from "../context/MessageContext";
import { useAuth } from "../context/AuthContext";
import { useBuyerSettings } from "../context/BuyerSettingsContext";
import { formatListingPrice } from "../utils/listingDisplay";
import AttachListingModal from "../components/AttachListingModal";
import { CompactBadgeStack, ReputationStatusPill, TrustMetricSummary } from "../components/ReputationSummary";
import FoundingMemberBadge from "../components/FoundingMemberBadge";
import { useReputationSnapshot } from "../hooks/useReputationRead";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTOS = 5;

export default function ProposeTrade() {
  const navigate = useNavigate();
  const { listingId } = useParams();
  const { listings } = useListings();
  const { createTradeProposal } = useMessages();
  const { user } = useAuth();
  const { settings: buyerProfile } = useBuyerSettings();
  const fileInputRef = useRef(null);

  const listing = listings.find((item) => item.id === listingId);
  const seller = listing ? sellers[listing.sellerId] ?? Object.values(sellers).find((s) => s.name === listing.shop) ?? { id: listing.sellerId, name: listing.shop } : null;

  const buyerId = user?.id ?? "current-user";
  const myListings = listings.filter((item) => item.sellerId === buyerId && item.id !== listing?.id);

  const [message, setMessage] = useState("");
  const [images, setImages] = useState([]);
  const [imageError, setImageError] = useState("");
  const [offeredListingId, setOfferedListingId] = useState(null);
  const [showListingPicker, setShowListingPicker] = useState(false);

  const offeredListing = offeredListingId ? myListings.find((item) => item.id === offeredListingId) : null;

  const openImagePicker = () => fileInputRef.current?.click();

  const handleImageChange = (event) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    setImageError("");
    const room = MAX_PHOTOS - images.length;
    files.slice(0, room).forEach((file) => {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setImageError("Unable to upload photo. Please try again.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => setImages((current) => [...current, reader.result]);
      reader.onerror = () => setImageError("Unable to upload photo. Please try again.");
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => setImages((current) => current.filter((_, i) => i !== index));

  const handleAttachListing = (item) => {
    setOfferedListingId(item.id);
    setShowListingPicker(false);
  };

  const removeOfferedListing = () => setOfferedListingId(null);

  const handleSend = () => {
    if (!listing || !seller) return;
    const { id, conversation } = createTradeProposal({
      listing,
      seller,
      buyerName: buyerProfile.displayName || user?.user_metadata?.name || "A buyer",
      message: message.trim(),
      offeredListing,
      photos: images,
    });
    navigate(`/messages/${id}`, {
      state: {
        tradeThread: true,
        listingId: listing.id,
        pendingConversation: conversation,
      },
    });
  };

  if (!listing || !seller) {
    return (
      <MobileScreenLayout>
        <Header title="Propose a Trade" onBack={() => navigate(-1)} />
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="text-[16px] font-semibold">Listing not found</p>
          <p className="text-[14px] text-[#828282]">This listing may have been removed.</p>
        </div>
      </MobileScreenLayout>
    );
  }

  return (
    <MobileScreenLayout>
      <Header title="Propose a Trade" onBack={() => navigate(-1)} />
      <div className="overflow-y-auto flex-1 no-scrollbar p-4">
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-[#E6E6E6] p-3">
          {listing.image && <img src={listing.image} alt={listing.name} className="h-12 w-12 rounded-lg object-cover" />}
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-[#828282]">Requesting from {seller.name}</p>
            <p className="truncate text-[14px] font-semibold">{listing.name}</p>
            <p className="text-[13px] text-[#498467]">{formatListingPrice(listing)}</p>
            <TradeParticipantReputation userId={seller.id} audience="seller" />
          </div>
        </div>
        <TradeParticipantReputation userId={buyerId} audience="buyer" label="Your reputation" />

        <div className="mb-4">
          <label className="mb-2 block text-[14px] font-semibold">Trade Message</label>
          <p className="mb-2 text-[13px] text-[#828282]">Describe what you would like to offer in exchange.</p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe what you would like to offer in exchange..."
            className="w-full h-32 p-3 border border-[#E6E6E6] rounded-lg text-[14px] outline-none resize-none"
          />
        </div>

        <div className="mb-4">
          <p className="mb-1 text-[14px] font-semibold">Optional Listing</p>
          <p className="mb-2 text-[13px] text-[#828282]">Attach one of your listings to the proposal.</p>
          {offeredListing ? (
            <div className="border border-[#E6E6E6] rounded-lg p-3">
              <p className="mb-2 text-[12px] font-medium text-[#828282]">Offered Listing</p>
              <div className="flex items-center gap-3">
                <img src={offeredListing.image} alt={offeredListing.name} className="h-12 w-12 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold">{offeredListing.name}</p>
                  <p className="text-[13px] text-[#498467]">{formatListingPrice(offeredListing)}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setShowListingPicker(true)} className="flex-1 rounded-lg border border-[#498467] py-2 text-[13px] font-medium text-[#498467]">Change</button>
                <button type="button" onClick={removeOfferedListing} className="flex-1 rounded-lg border border-red-500 py-2 text-[13px] font-medium text-red-500">Remove</button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowListingPicker(true)}
              className="w-full border border-[#E6E6E6] rounded-lg p-3 text-left text-[14px] text-[#828282]"
            >
              Select Listing
            </button>
          )}
        </div>

        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[14px] font-semibold">Optional Photos</p>
            <span className="text-[12px] text-[#828282]">{images.length}/{MAX_PHOTOS}</span>
          </div>
          <p className="mb-2 text-[13px] text-[#828282]">Add photos of the item(s) you would like to trade.</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleImageChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={openImagePicker}
            disabled={images.length >= MAX_PHOTOS}
            className="w-full px-4 py-6 rounded-lg border-2 border-dashed border-[#E6E6E6] flex flex-col items-center justify-center gap-2 bg-[#F5F5F5] disabled:opacity-50"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-[#828282]">
              <path d="M12 4.5v15m7.5-7.5h-15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-[14px] text-[#828282]">{images.length >= MAX_PHOTOS ? `Photo limit reached (${MAX_PHOTOS})` : "Add Photos"}</p>
          </button>
          {imageError && <p className="mt-2 text-[13px] font-medium text-red-600">{imageError}</p>}
          {images.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
              {images.map((image, index) => (
                <div key={index} className="relative shrink-0">
                  <img src={image} alt={`Trade photo ${index + 1}`} className="h-20 w-20 rounded-lg object-cover" />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => removeImage(index)}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white"
                  >
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="white" strokeWidth="1.6" strokeLinecap="round" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)} className="flex-1 rounded-lg border border-[#E6E6E6] py-3 text-[16px] font-medium">Cancel</button>
          <button type="button" onClick={handleSend} className="flex-1 rounded-lg bg-[#498467] py-3 text-[16px] font-medium text-white">Send Trade Proposal</button>
        </div>
      </div>

      {showListingPicker && (
        <AttachListingModal
          listings={myListings}
          selectedListingId={offeredListingId}
          onSelect={handleAttachListing}
          onClose={() => setShowListingPicker(false)}
        />
      )}
    </MobileScreenLayout>
  );
}

function TradeParticipantReputation({ userId, audience, label }) {
  const reputationSnapshot = useReputationSnapshot(userId);
  const status = audience === "seller" ? reputationSnapshot?.sellerStatus : reputationSnapshot?.buyerStatus;
  const activeBadges = reputationSnapshot?.activeBadges ?? [];
  if (!reputationSnapshot || (!status && !activeBadges.length)) return null;

  return (
    <div className="mt-2 rounded-md bg-[#F5FFF6] p-2" aria-label={`${label ?? (audience === "seller" ? "Seller" : "Buyer")} reputation`}>
      <div className="flex min-w-0 items-center gap-1.5">
        {label && <span className="mr-auto truncate text-[10px] font-medium text-[#498467]">{label}</span>}
        <ReputationStatusPill status={status} audience={audience} />
        <CompactBadgeStack badges={activeBadges} />
        {audience === "seller" && <FoundingMemberBadge sellerId={userId} iconOnly />}
      </div>
      <TrustMetricSummary metrics={status?.metrics} audience={audience} compact />
    </div>
  );
}
