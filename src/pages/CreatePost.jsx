import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { POST_CLASSIFICATIONS } from "../data/postClassifications";
import { usePosts } from "../context/PostContext";
import { useBuyerSettings } from "../context/BuyerSettingsContext";
import { useAuth } from "../context/AuthContext";
import { useListings } from "../context/ListingContext";
import { useSellerSettings } from "../context/SellerSettingsContext";
import { formatListingPrice } from "../utils/listingDisplay";
import AttachListingModal from "../components/AttachListingModal";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTOS = 5;

export default function CreatePost() {
  const navigate = useNavigate();
  const { addPost } = usePosts();
  const { settings: buyerProfile } = useBuyerSettings();
  const { user } = useAuth();
  const { listings } = useListings();
  const { getSellerProfile } = useSellerSettings();
  const sellerId = user?.id ?? "current-user";
  const fileInputRef = useRef(null);
  const [content, setContent] = useState("");
  const [classification, setClassification] = useState("");
  const [images, setImages] = useState([]);
  const [imageError, setImageError] = useState("");
  const [attachedListingId, setAttachedListingId] = useState(null);
  const [showListingPicker, setShowListingPicker] = useState(false);

  const sellerListings = listings.filter((listing) => listing.sellerId === sellerId);
  const attachedListing = attachedListingId ? sellerListings.find((listing) => listing.id === attachedListingId) : null;

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

  const removeImage = (index) => {
    setImages((current) => current.filter((_, i) => i !== index));
  };

  const handleAttachListing = (listing) => {
    setAttachedListingId(listing.id);
    setShowListingPicker(false);
  };

  const removeAttachedListing = () => setAttachedListingId(null);

  const handlePublish = () => {
    // Handle post publishing logic
    const post = addPost({
      name: buyerProfile.displayName || user?.user_metadata?.name || "",
      sellerId,
      authorId: buyerProfile.displayName,
      productId: attachedListingId,
      location: buyerProfile.location || buyerProfile.city || "",
      latitude: buyerProfile.latitude ?? null,
      longitude: buyerProfile.longitude ?? null,
      group: "Your Community",
      classification,
      time: "Just now",
      avatar: buyerProfile.avatar,
      image: images[0] ?? "",
      images,
      body: content,
      likes: 0,
      comments: 0,
      shares: 0,
      sends: 0,
    });
    console.log("Post Created:", post.id);
    navigate("/", { state: { tab: "Your Community", communityFilter: "Posts" } });
  };

  return (
    <MobileScreenLayout>
      <Header title="Create Post" onBack={() => navigate("/my-shop")} />
      <div className="overflow-y-auto flex-1 no-scrollbar p-4">
        {/* Post Content */}
        <div className="mb-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full h-32 p-3 border border-[#E6E6E6] rounded-lg text-[14px] outline-none resize-none"
          />
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-[14px] font-semibold">Post Classification</label>
          <select required value={classification} onChange={(e) => setClassification(e.target.value)} className="w-full rounded-lg border border-[#E6E6E6] px-3 py-3 text-[14px] outline-none focus:border-[#498467]">
            <option value="">Select classification</option>
            {POST_CLASSIFICATIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>

        {/* Photos */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[14px] font-semibold">Photos</p>
            <span className="text-[12px] text-[#828282]">{images.length}/{MAX_PHOTOS}</span>
          </div>
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
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              className="text-[#828282]"
            >
              <path
                d="M12 4.5v15m7.5-7.5h-15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-[14px] text-[#828282]">{images.length >= MAX_PHOTOS ? `Photo limit reached (${MAX_PHOTOS})` : "Add photos"}</p>
          </button>
          {imageError && <p className="mt-2 text-[13px] font-medium text-red-600">{imageError}</p>}
          {images.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
              {images.map((image, index) => (
                <div key={index} className="relative shrink-0">
                  <img src={image} alt={`Post photo ${index + 1}`} className="h-20 w-20 rounded-lg object-cover" />
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

        {/* Product Attachment Section */}
        <div className="mb-4">
          <p className="text-[14px] font-semibold mb-2">Attach a listing (optional)</p>
          {attachedListing ? (
            <div className="border border-[#E6E6E6] rounded-lg p-3">
              <p className="mb-2 text-[12px] font-medium text-[#828282]">Attached Listing</p>
              <div className="flex items-center gap-3">
                <img src={attachedListing.image} alt={attachedListing.name} className="h-12 w-12 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[14px] font-semibold">{attachedListing.name}</p>
                  <p className="text-[13px] text-[#498467]">{formatListingPrice(attachedListing)}</p>
                  <p className="text-[12px] text-[#828282]">Seller: {getSellerProfile(sellerId).name || "You"}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setShowListingPicker(true)} className="flex-1 rounded-lg border border-[#498467] py-2 text-[13px] font-medium text-[#498467]">Change</button>
                <button type="button" onClick={removeAttachedListing} className="flex-1 rounded-lg border border-red-500 py-2 text-[13px] font-medium text-red-500">Remove</button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowListingPicker(true)}
              className="w-full border border-[#E6E6E6] rounded-lg p-3 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#F5F5F5] rounded-lg flex items-center justify-center">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-[#828282]"
                  >
                    <path
                      d="M12 5v14M5 12h14"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-[14px] text-[#828282]">Select a listing to attach</p>
                </div>
              </div>
            </button>
          )}
        </div>

        {/* Publish Button */}
        <button
          onClick={handlePublish}
          className="w-full bg-[#498467] text-white py-3 rounded-lg text-[16px] font-medium"
        >
          Publish Post
        </button>
      </div>

      {showListingPicker && (
        <AttachListingModal
          listings={sellerListings}
          selectedListingId={attachedListingId}
          onSelect={handleAttachListing}
          onClose={() => setShowListingPicker(false)}
        />
      )}
    </MobileScreenLayout>
  );
}
