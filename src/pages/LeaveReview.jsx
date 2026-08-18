import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import StarRating from "../components/StarRating";
import { products, sellers } from "../data/mockData";
import { useReviews } from "../context/ReviewContext";
import { useListings } from "../context/ListingContext";

export default function LeaveReview() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const fileInput = useRef(null);
  const { addReview, completedOrderForProduct, hasReviewedProduct } = useReviews();
  const { listings } = useListings();

  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  const product = products.find((item) => [item.id, item.databaseId, item.legacyId].filter(Boolean).map(String).includes(String(productId)))
    ?? listings.find((item) => [item.id, item.databaseId, item.legacyId].filter(Boolean).map(String).includes(String(productId)));
  const seller = product
    ? sellers[product.sellerId] ??
      Object.values(sellers).find((s) => s.name === product.shop)
    : null;
  const completedOrder = completedOrderForProduct(productId);
  const purchased = Boolean(completedOrder);
  const alreadyReviewed = hasReviewedProduct(productId);

  useEffect(() => {
    console.info("review page order loaded", {
      orderId: completedOrder?.databaseId ?? completedOrder?.orderId ?? completedOrder?.id ?? null,
      orderStatus: completedOrder?.status ?? null,
      fulfillmentType: completedOrder?.fulfillmentMethod ?? completedOrder?.fulfillment_method ?? null,
      productId,
      reviewEligible: purchased && !alreadyReviewed,
    });
  }, [alreadyReviewed, completedOrder, productId, purchased]);

  const handlePhotos = (event) => {
    const files = Array.from(event.target.files ?? []);
    setPhotos((prev) => [
      ...prev,
      ...files.map((file) => URL.createObjectURL(file)),
    ]);
    event.target.value = "";
  };

  const removePhoto = (url) => {
    URL.revokeObjectURL(url);
    setPhotos((prev) => prev.filter((p) => p !== url));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    addReview({
      productId: product.id,
      sellerId: seller?.id ?? product.sellerId,
      rating,
      text: text.trim(),
      photos,
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <MobileScreenLayout>
        <Header title="Leave a Review" />
        <div className="overflow-y-auto flex-1 no-scrollbar px-6 py-12 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-[#498467] flex items-center justify-center mb-6">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 6L9 17l-5-5"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-[24px] font-semibold mb-3">
            Thanks for supporting local!
          </h1>
          <p className="text-[14px] text-black/70 mb-8">
            Your review has been added to {product.name} and {product.shop}.
          </p>
          <button
            onClick={() => navigate(`/product/${product.id}`, { replace: true })}
            className="w-full bg-[#498467] text-white py-3 rounded-lg font-medium text-[16px]"
          >
            Return to Listing
          </button>
        </div>
      </MobileScreenLayout>
    );
  }

  if (!product || !purchased || alreadyReviewed) {
    return (
      <MobileScreenLayout>
        <Header title="Leave a Review" onBack={() => navigate(-1)} />
        <div className="overflow-y-auto flex-1 no-scrollbar px-4 py-8 text-center">
          <p className="text-[14px] text-[#828282]">
            {alreadyReviewed
              ? "You have already reviewed this product."
              : "You can only review products from completed purchases."}
          </p>
        </div>
      </MobileScreenLayout>
    );
  }

  return (
    <MobileScreenLayout>
      <Header title="Leave a Review" onBack={() => navigate(-1)} />
      <form
        onSubmit={handleSubmit}
        className="overflow-y-auto flex-1 no-scrollbar px-4 py-4 flex flex-col gap-6"
      >
        {/* Product Information */}
        <div className="flex items-center gap-3 p-3 bg-[#F5F5F5] rounded-lg">
          <img
            src={product.image}
            alt={product.name}
            className="w-16 h-16 rounded-lg object-cover shrink-0"
          />
          <div className="flex-1">
            <div className="text-[16px] font-medium">{product.name}</div>
            <div className="text-[14px] text-[#828282]">{product.shop}</div>
          </div>
        </div>

        {/* Star Rating */}
        <div>
          <label className="block text-[14px] font-medium mb-2">Your Rating</label>
          <StarRating rating={rating} size={32} onChange={setRating} />
        </div>

        {/* Written Review */}
        <div>
          <label className="block text-[14px] font-medium mb-2">Your Review</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows="5"
            placeholder="Tell others about your experience"
            className="w-full px-4 py-3 rounded-lg border border-[#E6E6E6] focus:outline-none focus:border-[#498467] resize-none text-[14px]"
            required
          />
        </div>

        {/* Photo Upload */}
        <div>
          <label className="block text-[14px] font-medium mb-2">
            Photos <span className="text-[#828282] font-normal">(optional)</span>
          </label>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotos}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="w-full px-4 py-8 rounded-lg border-2 border-dashed border-[#E6E6E6] flex flex-col items-center justify-center gap-2 bg-[#F5F5F5]"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#828282" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[14px] text-[#828282]">Upload photos</span>
          </button>

          {photos.length > 0 && (
            <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
              {photos.map((url) => (
                <div key={url} className="relative shrink-0">
                  <img
                    src={url}
                    alt="Review photo preview"
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => removePhoto(url)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#2C2C2C] text-white text-[12px] leading-none flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={rating === 0}
          className="w-full bg-[#498467] text-white py-3 rounded-lg font-medium text-[16px] disabled:opacity-50"
        >
          Submit Review
        </button>
      </form>
    </MobileScreenLayout>
  );
}
