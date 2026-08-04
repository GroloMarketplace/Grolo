import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { products } from "../data/mockData";
import { useOrders } from "../context/OrderContext";
import { getBuyerStatus } from "../data/communityStatus";
import OutlineIcon from "../components/OutlineIcon";
import { useEffect, useRef, useState } from "react";
import { readNavigationState, writeNavigationState } from "../hooks/navigationState";
import { useBuyerTrust } from "../context/BuyerTrustContext";

const STORE_ID = "sarahs-backyard";

const SECTIONS = [
  { title: "New Orders", statuses: ["Order Placed"] },
  { title: "Preparing", statuses: ["Preparing"] },
  { title: "Ready for Pickup", statuses: ["Ready for Pickup"] },
  { title: "Completed Orders", statuses: ["Completed"] },
  { title: "Cancelled Orders", statuses: ["Cancelled"] },
];

export default function ShopOrders() {
  const navigate = useNavigate();
  const { sellerOrders, nextStatuses, updateOrderStatus } = useOrders();
  const { hasReviewedOrder, getBuyerTrust } = useBuyerTrust();
  const [reviewOrder, setReviewOrder] = useState(null);
  const scrollRef = useRef(null);
  const savedOrderState = readNavigationState("store-orders", { scrollTop: 0 });
  const storeOrders = sellerOrders(STORE_ID);

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
            section.statuses.includes(o.status),
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
                    const product = products.find((p) => p.id === order.productId);
                    if (!product) return null;

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
                              order.status === "Completed"
                                ? "bg-[#CFF7D3] text-[#02542D]"
                                : "bg-[#F5F5F5] text-[#828282]"
                            }`}
                          >
                            {order.status}
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
                            <div className="text-[12px] text-[#828282]">
                              Qty {order.quantity} • {order.date}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <img
                                src={order.buyerAvatar}
                                alt={order.buyer}
                                className="w-5 h-5 rounded-full object-cover"
                              />
                              <span className="text-[12px] text-[#828282]">
                                {order.buyer}
                              </span>
                              {order.buyer !== "you" && <span className="text-[#498467]"><OutlineIcon name={getBuyerStatus().icon} size={13} /></span>}
                              {getBuyerTrust(order.buyer).reliable && <span className="ml-1 rounded-full bg-[#F5FFF6] px-1.5 py-0.5 text-[10px] font-medium text-[#498467]">Reliable Buyer</span>}
                            </div>
                          </div>
                          <div className="text-[14px] font-semibold">
                            ${order.total.toFixed(2)}
                          </div>
                        </div>

                        {order.status === "Completed" && !hasReviewedOrder(order.id) && <button type="button" onClick={() => setReviewOrder(order)} className="mt-3 w-full rounded-lg border border-[#498467] py-2.5 text-[14px] font-medium text-[#498467]">Review Buyer</button>}

                        {nextStatuses(order.status).length > 0 && (
                          <div className="flex flex-col gap-2 mt-3">
                            {nextStatuses(order.status).map((status) => (
                              <button
                                key={status}
                                onClick={() => updateOrderStatus(order.id, status)}
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
      {reviewOrder && <BuyerReviewForm order={reviewOrder} onClose={() => setReviewOrder(null)} />}
    </MobileScreenLayout>
  );
}

function BuyerReviewForm({ order, onClose }) {
  const { addReview } = useBuyerTrust();
  const [criteria, setCriteria] = useState([]);
  const [notes, setNotes] = useState("");
  const options = ["Arrived for Pickup", "Communicated Well", "Polite and Respectful", "Would Transact Again"];
  const submit = () => {
    addReview({ buyer: order.buyer, orderId: order.id, sellerId: order.sellerId ?? "sarahs-backyard", criteria, notes });
    onClose();
  };
  return <div className="absolute inset-0 z-50 flex items-end bg-black/30"><div className="w-full rounded-t-2xl bg-white p-5"><div className="flex items-center justify-between"><h2 className="text-[18px] font-semibold">Review Buyer</h2><button type="button" onClick={onClose} className="text-[14px] text-[#828282]">Close</button></div><p className="mt-1 text-[13px] text-[#828282]">Share positive feedback about {order.buyer}.</p><div className="mt-4 flex flex-col gap-3">{options.map((option) => <Checkbox key={option} label={option} checked={criteria.includes(option)} onChange={() => setCriteria((current) => current.includes(option) ? current.filter((item) => item !== option) : [...current, option])} />)}</div><label className="mt-4 flex flex-col gap-2 text-[14px] font-medium">Additional Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="resize-none rounded-lg border border-[#E0E0E0] px-3 py-2 text-[14px] font-normal outline-none focus:border-[#498467]" /></label><button type="button" onClick={submit} className="mt-4 w-full rounded-lg bg-[#498467] py-3 text-[14px] font-medium text-white">Save Review</button></div></div>;
}

function Checkbox({ label, checked, onChange }) {
  return <label className="flex items-center gap-3 text-[14px]"><input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-[#498467]" />{label}</label>;
}
