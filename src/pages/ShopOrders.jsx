import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { useListings } from "../context/ListingContext";
import { useOrders } from "../context/OrderContext";
import { ReputationStatusPill } from "../components/ReputationSummary";
import { useReputationSnapshot } from "../hooks/useReputationRead";
import { useEffect, useMemo, useRef, useState } from "react";
import { readNavigationState, writeNavigationState } from "../hooks/navigationState";
import { useBuyerTrust } from "../context/BuyerTrustContext";
import { useProfileMode } from "../context/ProfileModeContext";
import { useAuth } from "../context/AuthContext";
import { useReviews } from "../context/ReviewContext";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { createPortal } from "react-dom";

const SECTIONS = [
  { title: "Pickup Orders · New", statuses: ["New", "Seller Notified", "Order Placed"], fulfillmentMethod: "pickup" },
  { title: "Pickup Orders · Preparing", statuses: ["In Progress", "Preparing"], fulfillmentMethod: "pickup" },
  { title: "Pickup Orders · Ready for Pickup", statuses: ["Ready for Pickup"], fulfillmentMethod: "pickup" },
  { title: "Pickup Orders · Completed", statuses: ["Completed"], fulfillmentMethod: "pickup" },
  { title: "Delivery Orders · New", statuses: ["New", "Seller Notified", "Order Placed"], fulfillmentMethod: "delivery" },
  { title: "Delivery Orders · Preparing", statuses: ["In Progress", "Preparing"], fulfillmentMethod: "delivery" },
  { title: "Delivery Orders · Out for Delivery", statuses: ["Out for Delivery"], fulfillmentMethod: "delivery" },
  { title: "Delivery Orders · Delivered", statuses: ["Delivered"], fulfillmentMethod: "delivery" },
  { title: "Cancelled Orders", statuses: ["Cancelled"] },
];

function BuyerOrderStatus({ buyerId }) {
  const reputationSnapshot = useReputationSnapshot(buyerId);
  return <ReputationStatusPill status={reputationSnapshot?.buyerStatus} />;
}

export default function ShopOrders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sellerOrders, nextStatuses, updateOrderStatus, markSellerOrdersSeen } = useOrders();
  const { listings } = useListings();
  const { hasReviewedOrder, getBuyerTrust } = useBuyerTrust();
  const { reviews } = useReviews();
  const { storeOpenedAt } = useProfileMode();
  const [reviewOrder, setReviewOrder] = useState(null);
  const [inProgressOrder, setInProgressOrder] = useState(null);
  const [statusToast, setStatusToast] = useState("");
  const [reviewedOrderKeys, setReviewedOrderKeys] = useState(() => new Set());
  const [buyerProfiles, setBuyerProfiles] = useState({});
  const scrollRef = useRef(null);
  const savedOrderState = readNavigationState("store-orders", { scrollTop: 0 });
  const sellerId = user?.id ?? "current-user";

  useEffect(() => {
    markSellerOrdersSeen(sellerId);
  }, [markSellerOrdersSeen, sellerId]);

  const storeOrders = useMemo(
    () => sellerOrders(sellerId).filter((order) => {
      const createdAt = typeof order.createdAt === "number" ? order.createdAt : Date.parse(order.createdAt);
      return !storeOpenedAt || (Number.isFinite(createdAt) && createdAt >= storeOpenedAt);
    }),
    [sellerId, sellerOrders, storeOpenedAt],
  );

  useEffect(() => {
    let cancelled = false;
    if (!isSupabaseConfigured || !supabase) return () => { cancelled = true; };
    const buyerIds = [...new Set(storeOrders.map((order) => order.buyerId).filter(Boolean))];
    Promise.all(buyerIds.map(async (buyerId) => {
      const { data: profile, error } = await supabase.from("profiles").select("id, display_name, username, avatar_url").eq("id", buyerId).maybeSingle();
      return [String(buyerId), profile];
    })).then((entries) => {
      if (!cancelled) setBuyerProfiles(Object.fromEntries(entries.filter(([, profile]) => profile)));
    });
    return () => { cancelled = true; };
  }, [storeOrders]);

  useEffect(() => {
  }, [sellerId, storeOpenedAt, storeOrders, user?.id]);

  const requestStatusChange = (order, status) => {
    if (status === "In Progress") {
      setInProgressOrder(order);
      return;
    }
    updateOrderStatus(order.id, status);
  };

  const confirmInProgress = async () => {
    if (!inProgressOrder) return;
    try {
      const succeeded = await updateOrderStatus(inProgressOrder.id, "In Progress");
      setStatusToast(succeeded
        ? "✅ Order marked as In Progress. The buyer can no longer cancel this order."
        : "Unable to update the order status. Please try again.");
    } catch (error) {
      console.error("Seller order status transition failed", {
        orderId: inProgressOrder.databaseId ?? inProgressOrder.id ?? null,
        currentStatus: inProgressOrder.status ?? null,
        requestedStatus: "In Progress",
        sellerId: inProgressOrder.sellerId ?? user?.id ?? null,
        error: error?.message ?? String(error),
        code: error?.code ?? null,
        details: error?.details ?? null,
        hint: error?.hint ?? null,
      });
      setStatusToast(error?.message || "Unable to update the order status. Please try again.");
    } finally {
      setInProgressOrder(null);
      window.setTimeout(() => setStatusToast(""), 4000);
    }
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = savedOrderState.scrollTop;
    const scrollElement = scrollRef.current;
    const saveState = () => writeNavigationState("store-orders", { scrollTop: scrollElement?.scrollTop ?? 0 });
    scrollElement?.addEventListener("scroll", saveState, { passive: true });
    return () => {
      saveState();
      scrollElement?.removeEventListener("scroll", saveState);
    };
  }, []);

  return (
    <MobileScreenLayout>
      <Header title="Store Orders" onBack={() => navigate("/shop", { state: { openSellerMenu: true } })} />
      <div ref={scrollRef} className="overflow-y-auto flex-1 no-scrollbar">
        {SECTIONS.map((section) => {
          const sectionOrders = storeOrders.filter((o) =>
            section.statuses.includes(o.status)
            && (!section.fulfillmentMethod || (o.fulfillmentMethod ?? "pickup") === section.fulfillmentMethod),
          );

          return (
            <div key={section.title} className="py-2">
              <div className="flex items-center justify-between px-4 py-2">
                <h2 className="text-[16px] font-semibold tracking-[-0.32px]">
                  {section.title}
                </h2>
                <span className="text-[12px] text-[#828282]">
                  {sectionOrders.length}
                </span>
              </div>

              {sectionOrders.length === 0 ? (
                <div className="px-4 py-3 text-[14px] text-[#828282]">
                  No orders here yet
                </div>
              ) : (
                <div className="flex flex-col gap-3 px-4">
                  {sectionOrders.map((order) => {
                    // Listings live in ListingContext (created per seller), not the
                    // static mockData catalog. Fall back to a placeholder rather than
                    // hiding the order if the listing was since deleted.
                    const product = listings.find((p) => p.id === order.productId)
                      ?? { id: order.productId, name: "Listing unavailable", image: "" };
                    const buyerProfile = buyerProfiles[String(order.buyerId)] ?? null;
                    const buyerName = getBuyerDisplayName(order, buyerProfile);
                    const orderReviewKey = String(order.databaseId ?? order.orderId ?? order.id);
                    const orderId = order.databaseId ?? order.orderId ?? order.id;
                    const buyerReviewSubmitted = reviewedOrderKeys.has(orderReviewKey)
                      || hasReviewedOrder(orderId, order.buyerId)
                      || reviews.some((review) => (
                        [review.orderId, review.order_id].filter(Boolean).some((value) => String(value) === String(orderId))
                        && String(review.reviewerId ?? review.reviewer_id) === String(order.buyerId)
                      ));

                    return (
                      <div
                        key={order.id}
                        className="rounded-lg border border-[#E6E6E6] p-3"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[12px] text-[#828282]">
                            {order.id}
                          </span>
                          <span
                            className={`text-[12px] font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                              order.status === "Cancelled"
                                ? "bg-[#FFF1F0] text-[#B42318]"
                                : order.status === "Completed"
                                  ? "bg-[#CFF7D3] text-[#02542D]"
                                  : "bg-[#F5F5F5] text-[#828282]"
                            }`}
                          >
                            {order.status === "Cancelled" ? "❌ Cancelled" : order.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-16 h-16 rounded-lg object-cover shrink-0"
                          />
                          <div className="flex-1">
                            <div className="text-[14px] font-medium">
                              {product.name}
                            </div>
                            {order.variantName && <div className="text-[13px] font-medium text-[#4F4F4F]">{order.variantName}</div>}
                            <div className="text-[12px] text-[#828282]">
                              Qty {order.quantity} • {order.date}
                            </div>
                            <div className="mt-1 text-[11px] font-medium text-[#828282]">Order from</div>
                            <div className="flex items-center gap-1.5">
                              <img
                                src={buyerProfile?.avatar_url ?? order.buyerAvatar}
                                alt={buyerName}
                                className="w-5 h-5 rounded-full object-cover"
                              />
                              <span className="text-[12px] text-[#828282]">
                                {buyerName}
                              </span>
                              <BuyerOrderStatus buyerId={order.buyerId} />
                              {getBuyerTrust(buyerName).reliable && <span className="ml-1 rounded-full bg-[#F5FFF6] px-1.5 py-0.5 text-[10px] font-medium text-[#498467]">Reliable Buyer</span>}
                            </div>
                          </div>
                          <div className="text-[14px] font-semibold">
                            ${Number(order.lineTotal ?? order.total ?? 0).toFixed(2)}
                          </div>
                        </div>

                        {order.status === "Completed" && (buyerReviewSubmitted ? <div className="mt-3 w-full rounded-lg bg-[#F5FFF6] py-2.5 text-center text-[14px] font-medium text-[#498467]">✅ Buyer Reviewed</div> : <button type="button" onClick={() => setReviewOrder(order)} className="mt-3 w-full rounded-lg border border-[#498467] py-2.5 text-[14px] font-medium text-[#498467]">Review Buyer</button>)}

                        {nextStatuses(order.status, order.fulfillmentMethod).length > 0 && (
                          <div className="flex flex-col gap-2 mt-3">
                            {nextStatuses(order.status, order.fulfillmentMethod).map((status) => (
                              <button
                                key={status}
                                onClick={() => requestStatusChange(order, status)}
                                className="w-full bg-[#498467] text-white py-2.5 rounded-lg text-[14px] font-medium"
                              >
                                Mark as {status}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {statusToast && <div className="absolute bottom-[76px] left-1/2 z-40 w-[calc(100%-2rem)] max-w-[343px] -translate-x-1/2 rounded-lg bg-[#02542D] p-3 text-center text-[14px] font-medium text-white shadow-lg" role="status">{statusToast}</div>}
      {inProgressOrder && <InProgressConfirmation onKeepNew={() => setInProgressOrder(null)} onConfirm={confirmInProgress} />}
      {reviewOrder && <BuyerReviewForm order={reviewOrder} onClose={() => setReviewOrder(null)} onSubmitted={() => { setReviewedOrderKeys((current) => new Set([...current, String(reviewOrder.databaseId ?? reviewOrder.orderId ?? reviewOrder.id)])); setReviewOrder(null); }} />}
    </MobileScreenLayout>
  );
}

function InProgressConfirmation({ onKeepNew, onConfirm }) {
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end overflow-hidden bg-black/30" role="dialog" aria-modal="true" aria-labelledby="in-progress-title">
      <section
        className="flex max-h-full min-h-0 w-full flex-col rounded-t-2xl bg-white shadow-2xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="min-h-0 overflow-y-auto overscroll-contain p-5 pb-2">
          <h2 id="in-progress-title" className="text-[18px] font-semibold">Start Preparing Order?</h2>
          <p className="mt-3 text-[14px] leading-6 text-[#4F4F4F]">Once this order is marked as In Progress:</p>
          <ul className="mt-2 list-disc pl-5 text-[14px] leading-6 text-[#4F4F4F]">
            <li>The buyer can no longer cancel the order.</li>
            <li>This confirms that preparation has begun.</li>
            <li>The order will move to Preparing Orders.</li>
          </ul>
        </div>
        <div className="flex shrink-0 gap-3 px-5 pb-5 pt-3">
          <button type="button" onClick={onKeepNew} className="flex-1 rounded-lg border border-[#498467] py-3 text-[14px] font-medium text-[#498467]">Keep as New Order</button>
          <button type="button" onClick={onConfirm} className="flex-1 rounded-lg bg-[#498467] py-3 text-[14px] font-medium text-white">Mark as In Progress</button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

function BuyerReviewForm({ order, onClose, onSubmitted }) {
  const { addReview } = useBuyerTrust();
  const { listings } = useListings();
  const [criteria, setCriteria] = useState([]);
  const [notes, setNotes] = useState("");
  const options = ["Arrived for Pickup", "Communicated Well", "Polite and Respectful", "Would Transact Again"];
  const submit = async () => {
    const product = listings.find((item) => item.id === order.productId);
    const rating = criteria.includes("Would Transact Again") ? 5 : 4;
    const buyerName = getBuyerDisplayName(order);
    const reviewInput = { buyer: buyerName, buyerId: order.buyerId, orderId: order.databaseId ?? order.orderId ?? order.id, sellerId: order.sellerId ?? product?.sellerId ?? STORE_ID, productId: order.productId, reviewType: "buyer", rating, criteria, notes };
    try {
      const createdReview = await addReview(reviewInput);
      if (createdReview) onSubmitted?.(createdReview);
      else onClose();
    } catch (error) {
      console.error("buyer review modal submit rejected", { orderId: reviewInput.orderId ?? null, error: error?.message ?? String(error) });
    }
  };
  return <div className="absolute inset-0 z-50 flex items-end bg-black/30"><div className="w-full rounded-t-2xl bg-white p-5"><div className="flex items-center justify-between"><h2 className="text-[18px] font-semibold">Review Buyer</h2><button type="button" onClick={onClose} className="text-[14px] text-[#828282]">Close</button></div><p className="mt-1 text-[13px] text-[#828282]">Share positive feedback about {getBuyerDisplayName(order)}.</p><div className="mt-4 flex flex-col gap-3">{options.map((option) => <Checkbox key={option} label={option} checked={criteria.includes(option)} onChange={() => setCriteria((current) => current.includes(option) ? current.filter((item) => item !== option) : [...current, option])} />)}</div><label className="mt-4 flex flex-col gap-2 text-[14px] font-medium">Additional Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="resize-none rounded-lg border border-[#E0E0E0] px-3 py-2 text-[14px] font-normal outline-none focus:border-[#498467]" /></label><button type="button" onClick={submit} className="mt-4 w-full rounded-lg bg-[#498467] py-3 text-[14px] font-medium text-white">Save Review</button></div></div>;
}

function Checkbox({ label, checked, onChange }) {
  return <label className="flex items-center gap-3 text-[14px]"><input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-[#498467]" />{label}</label>;
}

function isUuid(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getBuyerDisplayName(order, profile = null) {
  const candidate = profile?.display_name ?? profile?.username ?? (order?.buyer && order.buyer !== "you" ? order.buyer : order?.buyerDisplayName ?? order?.buyerUsername);
  return candidate && !isUuid(candidate) ? candidate : "Customer";
}
