import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import Sidebar from "../components/Sidebar";
import ProfileSwitcher from "../components/ProfileSwitcher";
import { useSidebar } from "../hooks/useSidebar";
import { communityPosts, followingPosts, products, sellers } from "../data/mockData";
import SellerListingCard from "../components/SellerListingCard";
import PromotionBadge from "../components/PromotionBadge";
import { useOrders } from "../context/OrderContext";
import { formatEventDate, formatEventTime, useEvents } from "../context/EventContext";
import { usePromotions } from "../context/PromotionContext";
import { useRegrow } from "../context/RegrowContext";

export default function ShopHome() {
  const { isSidebarOpen, openSidebar, closeSidebar } = useSidebar();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [storeName, setStoreName] = useState("Sarah's Backyard");
  const [location, setLocation] = useState("Kensington, Calgary");
  const [description, setDescription] = useState("I've grown lots of fruits and vegetables in my backyard and would love to share them with the community! All produce is grown with 100% organic soil and seeds.");
  
  const seller = sellers["sarahs-backyard"];
  const { sellerOrders } = useOrders();
  const { upcomingEvents } = useEvents();
  const { promotionsForSeller } = usePromotions();
  const { isRegrown } = useRegrow();
  const storeOrders = sellerOrders("sarahs-backyard");
  const orderCounts = [
    { label: "New", count: storeOrders.filter((o) => o.status === "Order Placed").length },
    { label: "Preparing", count: storeOrders.filter((o) => o.status === "Preparing").length },
    { label: "Ready", count: storeOrders.filter((o) => o.status === "Ready for Pickup").length },
  ];
  const [sellerProducts, setSellerProducts] = useState(
    products.filter((p) => p.sellerId === "sarahs-backyard" || p.shop === storeName)
  );
  const sellerPosts = [...followingPosts, ...communityPosts].filter(
    (post, index, posts) =>
      post.sellerId === seller.id && posts.findIndex((item) => item.id === post.id) === index,
  );
  const [managedPosts, setManagedPosts] = useState(sellerPosts);
  const [managedEvents, setManagedEvents] = useState(() => upcomingEvents("sarahs-backyard"));
  const [activeTab, setActiveTab] = useState(0);
  const contentRef = useRef(null);
  const tabs = ["Listings", "Posts", "Events", "Regrows"];
  const sellerPromotions = promotionsForSeller(seller.id);

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

  const handleTabChange = (index) => {
    setActiveTab(index);
    contentRef.current?.scrollTo({
      left: index * contentRef.current.clientWidth,
      behavior: "smooth",
    });
  };

  const handleContentScroll = (event) => {
    const index = Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth);
    if (index !== activeTab) setActiveTab(index);
  };

  const handleEditPost = (post) => {
    const body = window.prompt("Edit post", post.body);
    if (body?.trim()) {
      setManagedPosts((current) => current.map((item) => item.id === post.id ? { ...item, body: body.trim() } : item));
    }
  };

  const handleDeletePost = (postId) => {
    if (window.confirm("Delete this post?")) {
      setManagedPosts((current) => current.filter((post) => post.id !== postId));
    }
  };

  const handleEditEvent = (event) => {
    const title = window.prompt("Edit event", event.title);
    if (title?.trim()) {
      setManagedEvents((current) => current.map((item) => item.id === event.id ? { ...item, title: title.trim() } : item));
    }
  };

  const handleDeleteEvent = (eventId) => {
    if (window.confirm("Delete this event?")) {
      setManagedEvents((current) => current.filter((event) => event.id !== eventId));
    }
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
            titleContent={<ProfileSwitcher />}
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

            <div className="mt-4">
              <div className="sticky top-0 z-20 border-y border-[#E6E6E6] bg-white">
                <div className="flex">
                  {tabs.map((tab, index) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => handleTabChange(index)}
                      className={`relative flex-1 py-3 text-[14px] font-semibold ${
                        activeTab === index ? "text-[#498467]" : "text-black/40"
                      }`}
                    >
                      {tab}
                      {activeTab === index && <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#498467]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div
                ref={contentRef}
                onScroll={handleContentScroll}
                className="flex snap-x snap-mandatory overflow-x-auto no-scrollbar"
              >
                <ShopListingsTab products={sellerProducts} promotions={sellerPromotions} navigate={navigate} onDelete={handleDeleteListing} />
                <ShopPostsTab posts={managedPosts} onEdit={handleEditPost} onDelete={handleDeletePost} />
                <ShopEventsTab events={managedEvents} navigate={navigate} onEdit={handleEditEvent} onDelete={handleDeleteEvent} />
                <ShopRegrowsTab products={sellerProducts} posts={managedPosts} events={managedEvents} promotions={sellerPromotions} isRegrown={isRegrown} />
              </div>
            </div>
          </div>
        </div>
      </MobileScreenLayout>
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
    </>
  );
}

function ShopTabPanel({ children }) {
  return <div className="min-w-full shrink-0 snap-start px-4 py-4">{children}</div>;
}

function ShopEmptyTab({ children }) {
  return <div className="py-10 text-center text-[14px] text-[#828282]">{children}</div>;
}

function ShopListingsTab({ products, promotions, navigate, onDelete }) {
  return (
    <ShopTabPanel>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[18px] font-semibold">Listings</h2>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate("/create-promotion")} className="text-[14px] font-medium text-[#498467]">+ Promotion</button>
          <button type="button" onClick={() => navigate("/create-listing")} className="text-[14px] font-medium text-[#498467]">+ New Listing</button>
        </div>
      </div>
      {products.length === 0 ? <ShopEmptyTab>No active listings</ShopEmptyTab> : <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">{products.map((product) => <SellerListingCard key={product.id} product={product} onDelete={onDelete} />)}</div>}
      {promotions.length > 0 && <div className="mt-4 flex flex-col gap-2">{promotions.map((promotion) => <div key={promotion.id} className="rounded-lg border border-[#CFF7D3] bg-[#F5FFF6] p-3"><PromotionBadge promotion={promotion} /><p className="mt-1 text-[14px] font-semibold">{promotion.title}</p></div>)}</div>}
    </ShopTabPanel>
  );
}

function ShopPostsTab({ posts, onEdit, onDelete }) {
  return (
    <ShopTabPanel>
      <h2 className="mb-3 text-[18px] font-semibold">Posts</h2>
      {posts.length === 0 ? <ShopEmptyTab>No posts yet</ShopEmptyTab> : <div className="flex flex-col gap-4">{posts.map((post) => <div key={post.id} className="rounded-lg border border-[#E6E6E6] p-3"><div className="flex items-center gap-2"><img src={post.avatar} alt={post.name} className="h-8 w-8 rounded-full object-cover" /><div><p className="text-[14px] font-semibold">{post.name}</p><p className="text-[12px] text-[#828282]">{post.time}</p></div></div>{post.image && <img src={post.image} alt="" className="mt-3 aspect-square w-full rounded-lg object-cover" />}<p className="mt-3 text-[14px] leading-[140%]">{post.body}</p><div className="mt-3 flex gap-2"><button type="button" onClick={() => onEdit(post)} className="flex-1 rounded border border-[#498467] py-1 text-[12px] font-medium text-[#498467]">Edit</button><button type="button" onClick={() => onDelete(post.id)} className="flex-1 rounded border border-red-500 py-1 text-[12px] font-medium text-red-500">Delete</button></div></div>)}</div>}
    </ShopTabPanel>
  );
}

function ShopEventsTab({ events, navigate, onEdit, onDelete }) {
  return (
    <ShopTabPanel>
      <div className="mb-3 flex items-center justify-between"><h2 className="text-[18px] font-semibold">Events</h2><button type="button" onClick={() => navigate("/create-event")} className="text-[14px] font-medium text-[#498467]">+ New Event</button></div>
      {events.length === 0 ? <ShopEmptyTab>No events yet</ShopEmptyTab> : <div className="flex flex-col gap-3">{events.map((event) => <div key={event.id} className="rounded-lg border border-[#E6E6E6] p-3"><div className="flex gap-3"><img src={event.image} alt={event.title} className="h-16 w-16 shrink-0 rounded-lg object-cover" /><div className="min-w-0 flex-1"><p className="text-[14px] font-semibold">{event.title}</p><p className="text-[12px] text-[#498467]">{event.type}</p><p className="text-[12px] text-[#828282]">{formatEventDate(event.date)} · {formatEventTime(event.startTime)} – {formatEventTime(event.endTime)}</p><p className="text-[12px] text-[#828282]">{event.location}</p></div></div><div className="mt-3 flex gap-2"><button type="button" onClick={() => onEdit(event)} className="flex-1 rounded border border-[#498467] py-1 text-[12px] font-medium text-[#498467]">Edit</button><button type="button" onClick={() => onDelete(event.id)} className="flex-1 rounded border border-red-500 py-1 text-[12px] font-medium text-red-500">Delete</button></div></div>)}</div>}
    </ShopTabPanel>
  );
}

function ShopRegrowsTab({ products, posts, events, promotions, isRegrown }) {
  const items = [
    ...posts.map((post) => ({ id: `post:${post.id}`, title: post.body, image: post.image, type: "Post" })),
    ...events.map((event) => ({ id: `event:${event.id}`, title: event.title, image: event.image, type: "Event" })),
    ...promotions.map((promotion) => ({ id: `promotion:${promotion.id}`, title: promotion.title, image: null, type: "Promotion" })),
    ...products.map((product) => ({ id: `listing:${product.id}`, title: product.name, image: product.image, type: "Listing" })),
  ].filter((item) => isRegrown(item.id));

  return (
    <ShopTabPanel>
      <h2 className="mb-3 text-[18px] font-semibold">Regrows</h2>
      {items.length === 0 ? <ShopEmptyTab>No regrown content yet</ShopEmptyTab> : <div className="grid grid-cols-2 gap-3">{items.map((item) => <div key={item.id} className="rounded-lg border border-[#E6E6E6] p-2">{item.image ? <img src={item.image} alt="" className="aspect-square w-full rounded object-cover" /> : <div className="flex aspect-square items-center justify-center rounded bg-[#F5FFF6] text-[#498467]">Promotion</div>}<span className="mt-2 block text-[12px] font-medium text-[#498467]">{item.type}</span><p className="mt-1 line-clamp-2 text-[14px]">{item.title}</p></div>)}</div>}
    </ShopTabPanel>
  );
}
