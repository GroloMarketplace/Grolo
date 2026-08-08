import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import Sidebar from "../components/Sidebar";
import ProfileSwitcher from "../components/ProfileSwitcher";
import { useSidebar } from "../hooks/useSidebar";
import { communityPosts, followingPosts, sellers } from "../data/mockData";
import { useListings } from "../context/ListingContext";
import SellerListingCard from "../components/SellerListingCard";
import PromotionsBanner from "../components/PromotionsBanner";
import { useOrders } from "../context/OrderContext";
import { formatEventDate, formatEventTime, useEvents } from "../context/EventContext";
import { usePromotions } from "../context/PromotionContext";
import { useRegrow } from "../context/RegrowContext";
import { useFollow } from "../context/FollowContext";
import { usePaymentMethods } from "../context/PaymentMethodsContext";
import { getSellerStatus } from "../data/communityStatus";
import OutlineIcon from "../components/OutlineIcon";
import InteractiveStatusBadge from "../components/InteractiveStatusBadge";
import FoundingMemberBadge from "../components/FoundingMemberBadge";
import { useSellerSettings } from "../context/SellerSettingsContext";
import { useInventory } from "../context/InventoryContext";
import SellerProfileShareModal from "../components/SellerProfileShareModal";

export default function ShopHome() {
  const { isSidebarOpen, openSidebar, closeSidebar } = useSidebar();
  const routeLocation = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (routeLocation.state?.openSellerMenu) {
      openSidebar();
      navigate(routeLocation.pathname, { replace: true, state: null });
    }
  }, [routeLocation, openSidebar, navigate]);
  const seller = sellers["sarahs-backyard"];
  const { getSellerProfile, updateSellerProfile } = useSellerSettings();
  const sellerProfile = getSellerProfile(seller.id);
  const { listings, removeListing } = useListings();
  const [isEditing, setIsEditing] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [storeName, setStoreName] = useState(sellerProfile.name);
  const [location, setLocation] = useState(sellerProfile.location);
  const [description, setDescription] = useState(sellerProfile.description);
  
  const { getPaymentMethods, updatePaymentMethods, updateFulfillment } = usePaymentMethods();
  const [paymentMethods, setPaymentMethods] = useState(() => getPaymentMethods(seller.id).methods);
  const [fulfillmentMethods, setFulfillmentMethods] = useState(() => getPaymentMethods(seller.id).fulfillmentMethods);
  const [deliveryFee, setDeliveryFee] = useState(() => getPaymentMethods(seller.id).deliveryFee);
  const [deliveryRadius, setDeliveryRadius] = useState(() => getPaymentMethods(seller.id).deliveryRadius);
  const [pickupLocation, setPickupLocation] = useState(() => getPaymentMethods(seller.id).pickupLocation);
  const [pickupNotes, setPickupNotes] = useState(() => getPaymentMethods(seller.id).pickupNotes);
  const { sellerOrders } = useOrders();
  const { upcomingEvents } = useEvents();
  const { promotionsForSeller } = usePromotions();
  const { isRegrown } = useRegrow();
  const { getFollowerCount } = useFollow();
  const { getAvailable } = useInventory();
  const storeOrders = sellerOrders("sarahs-backyard");
  const orderCounts = [
    { label: "New", count: storeOrders.filter((o) => ["Seller Notified", "Order Placed"].includes(o.status)).length },
    { label: "Preparing", count: storeOrders.filter((o) => ["In Progress", "Preparing"].includes(o.status)).length },
    { label: "Ready", count: storeOrders.filter((o) => o.status === "Ready for Pickup").length },
  ];
  const sellerProducts = listings.filter((p) => p.sellerId === "sarahs-backyard" || p.shop === storeName);
  const activeSellerProducts = sellerProducts.filter((product) => getAvailable(product.id) > 0);
  const outOfStockSellerProducts = sellerProducts.filter((product) => getAvailable(product.id) <= 0);
  const sellerPosts = [...followingPosts, ...communityPosts].filter(
    (post, index, posts) =>
      post.sellerId === seller.id && posts.findIndex((item) => item.id === post.id) === index,
  );
  const [managedPosts, setManagedPosts] = useState(sellerPosts);
  const [managedEvents, setManagedEvents] = useState(() => upcomingEvents("sarahs-backyard"));
  const [activeTab, setActiveTab] = useState(0);
  const contentRef = useRef(null);

  useEffect(() => {
    if (routeLocation.state?.activeTab === "Listings") setActiveTab(0);
  }, [routeLocation.state?.activeTab]);
  const tabs = ["Listings", "Posts", "Events", "Regrows"];
  const sellerPromotions = promotionsForSeller(seller.id);
  const sellerStatus = getSellerStatus({
    ordersFulfilled: storeOrders.filter((order) => order.status === "Completed").length,
    productsSold: storeOrders.reduce((total, order) => total + order.quantity, 0),
    reviewsReceived: seller.reviewCount,
    eventsHosted: managedEvents.length,
    followersGained: getFollowerCount(seller.id),
    tradesCompleted: 3,
  });

  const handleDeleteListing = (productId) => {
    removeListing(productId);
  };

  const handleEditStore = () => {
    setIsEditing(true);
  };

  const handleSaveStore = () => {
    updateSellerProfile(seller.id, { name: storeName, location, description });
    updatePaymentMethods(seller.id, paymentMethods);
    updateFulfillment(seller.id, fulfillmentMethods, deliveryFee, deliveryRadius, pickupLocation, pickupNotes);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    const settings = getPaymentMethods(seller.id);
    setPaymentMethods(settings.methods);
    setFulfillmentMethods(settings.fulfillmentMethods);
    setDeliveryFee(settings.deliveryFee);
    setDeliveryRadius(settings.deliveryRadius);
    setPickupLocation(settings.pickupLocation);
    setPickupNotes(settings.pickupNotes);
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

  return (
    <>
      <MobileScreenLayout>
        <div className="flex flex-col min-h-full">
          <Header
            titleContent={<ProfileSwitcher />}
            onMenu={openSidebar}
          />
          <div className="overflow-y-auto flex-1 no-scrollbar">
            {/* Banner */}
            <div className="h-[136px] relative">
              <img
                src={sellerProfile.banner}
                alt={`${storeName} banner`}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Profile Info */}
            <div className="px-4 -mt-8 relative z-10">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <img
                    src={sellerProfile.avatar}
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
                    <InteractiveStatusBadge status={sellerStatus} className="mt-1" />
                    <FoundingMemberBadge sellerId={seller.id} />
                    {isEditing ? (
                      <input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="text-[14px] text-[#828282] w-full outline-none border-b border-[#E6E6E6] pb-1"
                      />
                    ) : (
                      <p className="flex items-center gap-1 text-[13px] text-[#828282]"><OutlineIcon name="location" size={14} />{location}</p>
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

                {isEditing && (
                  <div className="mt-4 rounded-lg border border-[#E6E6E6] p-3">
                    <div className="mb-2 text-[14px] font-medium">Accepted Payment Methods</div>
                    {[{ id: "cash", label: "Cash" }, { id: "etransfer", label: "E-Transfer" }].map((method) => (
                      <label key={method.id} className="flex items-center gap-3 py-1.5 text-[14px]">
                        <input
                          type="checkbox"
                          checked={paymentMethods.includes(method.id)}
                          onChange={() => setPaymentMethods((current) => current.includes(method.id) ? current.filter((item) => item !== method.id) : [...current, method.id])}
                          className="h-4 w-4 accent-[#498467]"
                        />
                        {method.label}
                      </label>
                    ))}
                    <div className="flex items-center gap-3 py-1.5 text-[14px] text-[#828282]">
                      <input type="checkbox" checked readOnly disabled className="h-4 w-4 accent-[#498467]" />
                      Credit/Debit <span className="text-[12px]">(Coming Soon)</span>
                    </div>
                    <div className="mt-3 border-t border-[#E6E6E6] pt-3">
                      <div className="mb-2 text-[14px] font-medium">Fulfillment Preferences</div>
                      {[{ id: "pickup", label: "Pickup" }, { id: "delivery", label: "Delivery" }].map((method) => (
                        <label key={method.id} className="flex items-center gap-3 py-1.5 text-[14px]">
                          <input
                            type="checkbox"
                            checked={fulfillmentMethods.includes(method.id)}
                            onChange={() => setFulfillmentMethods((current) => current.includes(method.id) ? (current.length === 1 ? current : current.filter((item) => item !== method.id)) : [...current, method.id])}
                            className="h-4 w-4 accent-[#498467]"
                          />
                          {method.label}
                        </label>
                      ))}
                      {fulfillmentMethods.includes("delivery") && (
                        <div className="mt-2 flex gap-2">
                          <label className="flex-1 text-[12px] text-[#828282]">Delivery fee<input type="number" min="0" step="0.01" value={deliveryFee} onChange={(event) => setDeliveryFee(event.target.value)} className="mt-1 w-full rounded-lg border border-[#E6E6E6] px-2 py-2 text-[14px] text-black outline-none focus:border-[#498467]" /></label>
                          <label className="flex-1 text-[12px] text-[#828282]">Radius (km)<input type="number" min="0" value={deliveryRadius} onChange={(event) => setDeliveryRadius(event.target.value)} className="mt-1 w-full rounded-lg border border-[#E6E6E6] px-2 py-2 text-[14px] text-black outline-none focus:border-[#498467]" /></label>
                        </div>
                      )}
                      {fulfillmentMethods.includes("pickup") && (
                        <div className="mt-2 flex flex-col gap-2">
                          <label className="text-[12px] text-[#828282]">Pickup Location<input value={pickupLocation} onChange={(event) => setPickupLocation(event.target.value)} className="mt-1 w-full rounded-lg border border-[#E6E6E6] px-2 py-2 text-[14px] text-black outline-none focus:border-[#498467]" /></label>
                          <label className="text-[12px] text-[#828282]">Pickup Notes<input value={pickupNotes} onChange={(event) => setPickupNotes(event.target.value)} placeholder="Optional pickup instructions" className="mt-1 w-full rounded-lg border border-[#E6E6E6] px-2 py-2 text-[14px] text-black outline-none focus:border-[#498467]" /></label>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!isEditing && <PaymentMethodsList methods={getPaymentMethods(seller.id).methods} />}

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
                  <span className="text-[14px] text-[#828282]">{getFollowerCount(seller.id)} followers</span>
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
                      type="button"
                      onClick={() => setIsShareModalOpen(true)}
                      className="flex-1 rounded-lg border border-[#498467] py-2.5 text-[14px] font-medium text-[#498467]"
                    >
                      Share Profile
                    </button>
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

              <div className="w-full max-w-full overflow-hidden">
                <div
                  ref={contentRef}
                  onScroll={handleContentScroll}
                  className="flex w-full max-w-full snap-x snap-mandatory overflow-x-auto no-scrollbar"
                >
                <ShopListingsTab products={activeSellerProducts} outOfStockProducts={outOfStockSellerProducts} promotions={sellerPromotions} navigate={navigate} onDelete={handleDeleteListing} onOpenPromotions={() => navigate(`/promotions/${seller.id}`)} />
                <ShopPostsTab posts={managedPosts} onEdit={handleEditPost} onDelete={handleDeletePost} onCreate={handleCreatePost} />
                <ShopEventsTab events={managedEvents} navigate={navigate} onEdit={handleEditEvent} onDelete={handleDeleteEvent} />
                  <ShopRegrowsTab products={sellerProducts} posts={managedPosts} events={managedEvents} promotions={sellerPromotions} isRegrown={isRegrown} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </MobileScreenLayout>
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      {isShareModalOpen && <SellerProfileShareModal seller={seller} profile={{ ...sellerProfile, name: storeName, description }} onClose={() => setIsShareModalOpen(false)} />}
    </>
  );
}

function PaymentMethodsList({ methods }) {
  return (
    <div className="mt-4 rounded-lg bg-[#F5FFF6] p-3">
      <div className="text-[12px] font-medium text-[#498467]">Accepted Payment Methods</div>
      <div className="mt-1 text-[13px] text-[#4F4F4F]">{methods.includes("cash") && "Cash · Pay at pickup"}{methods.includes("cash") && methods.includes("etransfer") && " · "}{methods.includes("etransfer") && "E-Transfer"}</div>
      <div className="mt-1 text-[12px] text-[#828282]">Credit/Debit (Coming Soon)</div>
    </div>
  );
}

function ShopTabPanel({ children }) {
  return <div className="box-border w-full min-w-full max-w-full shrink-0 snap-start px-4 py-4">{children}</div>;
}

function ShopEmptyTab({ children }) {
  return <div className="py-10 text-center text-[14px] text-[#828282]">{children}</div>;
}

function ShopListingsTab({ products, outOfStockProducts, promotions, navigate, onDelete, onOpenPromotions }) {
  return (
    <ShopTabPanel>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[18px] font-semibold">Listings</h2>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate("/create-promotion")} className="text-[14px] font-medium text-[#498467]">+ Promotion</button>
          <button type="button" onClick={() => navigate("/create-listing")} className="text-[14px] font-medium text-[#498467]">+ New Listing</button>
        </div>
      </div>
      {promotions.length > 0 && <PromotionsBanner count={promotions.length} onClick={onOpenPromotions} />}
      {products.length === 0 ? <ShopEmptyTab>No active listings</ShopEmptyTab> : <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">{products.map((product) => <SellerListingCard key={product.id} product={product} onDelete={onDelete} />)}</div>}
      {outOfStockProducts.length > 0 && <section className="mt-6 border-t border-black/5 pt-4"><h2 className="mb-3 text-[18px] font-semibold">Out of Stock</h2><div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">{outOfStockProducts.map((product) => <SellerListingCard key={product.id} product={product} onDelete={onDelete} />)}</div></section>}
    </ShopTabPanel>
  );
}

function ShopPostsTab({ posts, onEdit, onDelete, onCreate }) {
  return (
    <ShopTabPanel>
      <div className="mb-3 flex items-center justify-between"><h2 className="text-[18px] font-semibold">Posts</h2><button type="button" onClick={onCreate} className="text-[14px] font-medium text-[#498467]">+ New Post</button></div>
      {posts.length === 0 ? <ShopEmptyTab>No posts yet</ShopEmptyTab> : <div className="flex w-full min-w-0 flex-col gap-4">{posts.map((post) => <div key={post.id} className="w-full rounded-lg border border-[#E6E6E6] p-3"><div className="flex items-center gap-2"><img src={post.avatar} alt={post.name} className="h-8 w-8 rounded-full object-cover" /><div><p className="text-[14px] font-semibold">{post.name}</p><p className="text-[12px] text-[#828282]">{post.time}</p></div></div>{post.image && <img src={post.image} alt="" className="mt-3 aspect-square w-full rounded-lg object-cover" />}<p className="mt-3 text-[14px] leading-[140%]">{post.body}</p><div className="mt-3 flex gap-2"><button type="button" onClick={() => onEdit(post)} className="flex-1 rounded border border-[#498467] py-1 text-[12px] font-medium text-[#498467]">Edit</button><button type="button" onClick={() => onDelete(post.id)} className="flex-1 rounded border border-red-500 py-1 text-[12px] font-medium text-red-500">Delete</button></div></div>)}</div>}
    </ShopTabPanel>
  );
}

function ShopEventsTab({ events, navigate, onEdit, onDelete }) {
  return (
    <ShopTabPanel>
      <div className="mb-3 flex items-center justify-between"><h2 className="text-[18px] font-semibold">Events</h2><button type="button" onClick={() => navigate("/create-event")} className="text-[14px] font-medium text-[#498467]">+ New Event</button></div>
      {events.length === 0 ? <ShopEmptyTab>No events yet</ShopEmptyTab> : <div className="flex w-full min-w-0 flex-col gap-4">{events.map((event) => <div key={event.id} className="rounded-lg border border-[#E6E6E6] p-3"><div className="flex gap-3"><img src={event.image} alt={event.title} className="h-16 w-16 shrink-0 rounded-lg object-cover" /><div className="min-w-0 flex-1"><p className="text-[14px] font-semibold">{event.title}</p><p className="text-[12px] text-[#498467]">{event.type}</p><p className="text-[12px] text-[#828282]">{formatEventDate(event.date)} · {formatEventTime(event.startTime)} – {formatEventTime(event.endTime)}</p><p className="text-[12px] text-[#828282]">{event.location}</p></div></div><div className="mt-3 flex gap-2"><button type="button" onClick={() => onEdit(event)} className="flex-1 rounded border border-[#498467] py-1 text-[12px] font-medium text-[#498467]">Edit</button><button type="button" onClick={() => onDelete(event.id)} className="flex-1 rounded border border-red-500 py-1 text-[12px] font-medium text-red-500">Delete</button></div></div>)}</div>}
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
      {items.length === 0 ? <ShopEmptyTab>No regrown content yet</ShopEmptyTab> : <div className="grid w-full min-w-0 grid-cols-2 gap-3">{items.map((item) => <div key={item.id} className="rounded-lg border border-[#E6E6E6] p-2">{item.image ? <img src={item.image} alt="" className="aspect-square w-full rounded object-cover" /> : <div className="flex aspect-square items-center justify-center rounded bg-[#F5FFF6] text-[#498467]">Promotion</div>}<span className="mt-2 block text-[12px] font-medium text-[#498467]">{item.type}</span><p className="mt-1 line-clamp-2 text-[14px]">{item.title}</p></div>)}</div>}
    </ShopTabPanel>
  );
}
