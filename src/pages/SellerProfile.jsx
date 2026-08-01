import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import CarouselRow from "../components/CarouselRow";
import { products, sellers, messages } from "../data/mockData";
import { useFollow } from "../context/FollowContext";

export default function SellerProfile() {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const { isFollowing, toggleFollow } = useFollow();
  const seller = sellers[sellerId] || sellers["sarahs-backyard"];
  const sellerProducts = products.filter((p) => p.sellerId === sellerId || p.shop === seller.name);

  const handleMessageClick = () => {
    // Check if conversation already exists with this seller
    const existingConversation = messages.find((m) => m.sellerId === sellerId);
    
    if (existingConversation) {
      // Open existing conversation
      navigate(`/messages/${existingConversation.id}`);
    } else {
      // Create new conversation and navigate to it
      // For mock data, use sellerId as the conversation ID
      navigate(`/messages/${sellerId}`);
    }
  };

  return (
    <MobileScreenLayout>
      <Header onBack={() => navigate(-1)} />
      <div className="overflow-y-auto flex-1 no-scrollbar">
        {/* Banner */}
        <div className="h-[136px] relative">
          <img
            src={seller.banner}
            alt={`${seller.name} banner`}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Profile Info */}
        <div className="px-4 -mt-8 relative z-10">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <img
                src={seller.avatar}
                alt={seller.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-white shadow"
              />
              <div className="flex-1">
                <h1 className="text-[20px] font-semibold">{seller.name}</h1>
                <p className="text-[14px] text-[#828282]">{seller.location}</p>
              </div>
            </div>

            <p className="text-[14px] mt-3 leading-[140%]">{seller.description}</p>

            {/* Rating */}
            <div className="flex items-center gap-2 mt-3">
              <div className="flex items-center gap-1">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M10 1.67 12.58 6.88l5.75.84-4.16 4.06.98 5.73L10 14.81l-5.15 2.71.98-5.73L1.67 7.73l5.75-.84L10 1.67Z"
                    fill="#FFC107"
                    stroke="#FFC107"
                    strokeWidth="1"
                  />
                </svg>
                <span className="text-[14px] font-semibold">{seller.rating}</span>
              </div>
              <span className="text-[14px] text-[#828282]">({seller.reviewCount} reviews)</span>
              <span className="text-[14px] text-[#828282]">•</span>
              <span className="text-[14px] text-[#828282]">{seller.followers} followers</span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => toggleFollow(sellerId)}
                className={`flex-1 py-2.5 rounded-lg text-[14px] font-medium ${
                  isFollowing(sellerId)
                    ? "bg-[#498467] text-white"
                    : "bg-[#498467] text-white"
                }`}
              >
                {isFollowing(sellerId) ? "Following" : "Follow Store"}
              </button>
              <button 
                onClick={handleMessageClick}
                className="flex-1 border border-[#498467] text-[#498467] py-2.5 rounded-lg text-[14px] font-medium"
              >
                Message
              </button>
            </div>
          </div>
        </div>

        {/* Active Listings */}
        <div className="mt-4 px-4">
          <h2 className="text-[18px] font-semibold mb-3">Active Listings</h2>
          {sellerProducts.length > 0 ? (
            <CarouselRow title="" products={sellerProducts} />
          ) : (
            <div className="text-center py-8 text-[14px] text-[#828282]">
              No active listings
            </div>
          )}
        </div>
      </div>
    </MobileScreenLayout>
  );
}
