import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import Sidebar from "../components/Sidebar";
import { useSidebar } from "../hooks/useSidebar";
import { products, sellers } from "../data/mockData";
import SellerListingCard from "../components/SellerListingCard";
import { useOrders } from "../context/OrderContext";

export default function ShopHome() {
  const { isSidebarOpen, openSidebar, closeSidebar } = useSidebar();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [storeName, setStoreName] = useState("Sarah's Backyard");
  const [location, setLocation] = useState("Kensington, Calgary");
  const [description, setDescription] = useState("I've grown lots of fruits and vegetables in my backyard and would love to share them with the community! All produce is grown with 100% organic soil and seeds.");
  
  const seller = sellers["sarahs-backyard"];
  const { sellerOrders } = useOrders();
  const storeOrders = sellerOrders("sarahs-backyard");
  const orderCounts = [
    { label: "New", count: storeOrders.filter((o) => o.status === "Order Placed").length },
    { label: "Preparing", count: storeOrders.filter((o) => o.status === "Preparing").length },
    { label: "Ready", count: storeOrders.filter((o) => o.status === "Ready for Pickup").length },
  ];
  const [sellerProducts, setSellerProducts] = useState(
    products.filter((p) => p.sellerId === "sarahs-backyard" || p.shop === storeName)
  );

  const handleDeleteListing = (productId) => {
    setSellerProducts(sellerProducts.filter((p) => p.id !== productId));
  };

  const handleEditStore = () => {
    setIsEditing(true);
  };

  const handleSaveStore = () => {
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleManageListings = () => {
    // Navigate to listings management page (to be implemented)
    console.log("Navigate to Manage Listings");
  };

  const handleCreatePost = () => {
    navigate("/create-post");
  };

  const postButton = (
    <button
      onClick={handleCreatePost}
      className="bg-[#498467] text-white text-[12px] font-medium px-3 py-1.5 rounded-full"
    >
      + Post
    </button>
  );

  return (
    <>
      <MobileScreenLayout>
        <div className="flex flex-col min-h-full">
          <Header
            title="My Shop"
            onMenu={openSidebar}
            postButton={postButton}
          />
          <div className="overflow-y-auto flex-1 no-scrollbar">
            {/* Banner */}
            <div className="h-[136px] relative">
              <img
                src={seller.banner}
                alt={`${storeName} banner`}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Profile Info */}
            <div className="px-4 -mt-8 relative z-10">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <img
                    src={seller.avatar}
                    alt={storeName}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow"
                  />
                  <div className="flex-1">
                    {isEditing ? (
                      <input
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        className="text-[20px] font-semibold w-full outline-none border-b border-[#E6E6E6] pb-1"
                      />
                    ) : (
                      <h1 className="text-[20px] font-semibold">{storeName}</h1>
                    )}
                    {isEditing ? (
                      <input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="text-[14px] text-[#828282] w-full outline-none border-b border-[#E6E6E6] pb-1"
                      />
                    ) : (
                      <p className="text-[14px] text-[#828282]">{location}</p>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="text-[14px] mt-3 leading-[140%] w-full outline-none border border-[#E6E6E6] rounded-lg p-2 resize-none"
                    rows={3}
                  />
                ) : (
                  <p className="text-[14px] mt-3 leading-[140%]">{description}</p>
                )}

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
                  <button
                    onClick={() => navigate("/my-shop/reviews")}
                    className="text-[14px] text-[#828282] hover:text-[#498467]"
                  >
                    ({seller.reviewCount} reviews)
                  </button>
                  <span className="text-[14px] text-[#828282]">•</span>
                  <span className="text-[14px] text-[#828282]">{seller.followers} followers</span>
                </div>

                {/* Action Buttons */}
                {isEditing ? (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={handleSaveStore}
                      className="flex-1 bg-[#498467] text-white py-2.5 rounded-lg text-[14px] font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 border border-[#B2B2B2] text-black py-2.5 rounded-lg text-[14px] font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={handleEditStore}
                      className="flex-1 bg-[#498467] text-white py-2.5 rounded-lg text-[14px] font-medium"
                    >
                      Edit Store
                    </button>
                    <button
                      onClick={handleManageListings}
                      className="flex-1 border border-[#498467] text-[#498467] py-2.5 rounded-lg text-[14px] font-medium"
                    >
                      Manage Listings
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Incoming Orders */}
            <div className="mt-4 px-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[18px] font-semibold">Incoming Orders</h2>
                <button
                  onClick={() => navigate("/my-shop/orders")}
                  className="text-[14px] text-[#498467] font-medium"
                >
                  Manage Orders
                </button>
              </div>
              <div className="flex gap-2">
                {orderCounts.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => navigate("/my-shop/orders")}
                    className="flex-1 rounded-lg border border-[#E6E6E6] py-3 flex flex-col items-center gap-1"
                  >
                    <span className="text-[20px] font-semibold text-[#498467]">
                      {item.count}
                    </span>
                    <span className="text-[12px] text-[#828282]">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Active Listings */}
            <div className="mt-4 px-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[18px] font-semibold">Active Listings</h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate("/create-promotion")}
                    className="text-[14px] text-[#498467] font-medium"
                  >
                    + Promotion
                  </button>
                  <button
                    onClick={() => navigate("/create-listing")}
                    className="text-[14px] text-[#498467] font-medium"
                  >
                    + New Listing
                  </button>
                </div>
              </div>
              {sellerProducts.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                  {sellerProducts.map((product) => (
                    <SellerListingCard
                      key={product.id}
                      product={product}
                      onDelete={handleDeleteListing}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-[14px] text-[#828282]">
                  No active listings
                </div>
              )}
            </div>
          </div>
        </div>
      </MobileScreenLayout>
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
    </>
  );
}
