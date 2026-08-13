import { useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import OutlineIcon from "../components/OutlineIcon";
import { useListings } from "../context/ListingContext";
import { useReviews } from "../context/ReviewContext";
import { useOrders } from "../context/OrderContext";
import { readNavigationState, writeNavigationState } from "../hooks/navigationState";
import { CompactReputationHeader } from "../components/ReputationSummary";
import { useReputationSnapshot } from "../hooks/useReputationRead";

const ORDER_SECTIONS = [
  { title: "Active Orders", statuses: ["Order Placed", "Preparing", "In Progress", "Seller Notified"] },
  { title: "Ready for Pickup", statuses: ["Ready for Pickup"], fulfillmentMethod: "pickup" },
  { title: "Out for Delivery", statuses: ["Out for Delivery"], fulfillmentMethod: "delivery" },
  { title: "Delivered Orders", statuses: ["Delivered"], fulfillmentMethod: "delivery" },
  { title: "Completed Pickup Orders", statuses: ["Completed"], fulfillmentMethod: "pickup" },
  { title: "Cancelled Orders", statuses: ["Cancelled"] },
];

export default function Orders() {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const savedOrdersState = readNavigationState("orders", { scrollTop: 0 });
  const { hasReviewedProduct } = useReviews();
  const { buyerOrders } = useOrders();
  const { listings } = useListings();
  const orders = buyerOrders();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = savedOrdersState.scrollTop;
    const scrollElement = scrollRef.current;
    const saveState = () => writeNavigationState("orders", { scrollTop: scrollElement?.scrollTop ?? 0 });
    scrollElement?.addEventListener("scroll", saveState, { passive: true });
    return () => {
      saveState();
      scrollElement?.removeEventListener("scroll", saveState);
    };
  }, []);

  return (
    <MobileScreenLayout>
      <Header title="My Orders" onBack={() => navigate(-1)} />
      <div ref={scrollRef} className="overflow-y-auto flex-1 no-scrollbar">
        {ORDER_SECTIONS.map((section) => {
          const sectionOrders = orders.filter((order) => (
            section.statuses.includes(order.status)
            && (!section.fulfillmentMethod || (order.fulfillmentMethod ?? "pickup") === section.fulfillmentMethod)
          ));
          return (
            <section key={section.title} className="py-2">
              <div className="flex items-center justify-between px-4 py-2">
                <h2 className="text-[16px] font-semibold tracking-[-0.32px]">{section.title}</h2>
                <span className="text-[12px] text-[#828282]">{sectionOrders.length}</span>
              </div>
              {sectionOrders.length === 0 ? (
                <div className="px-4 py-3 text-[14px] text-[#828282]">No orders here yet</div>
              ) : (
                <div className="flex flex-col gap-3 px-4">
                  {sectionOrders.map((order) => {
                    // Listings are created dynamically per seller (ListingContext), not
                    // the static mockData catalog, so look them up there. Fall back to a
                    // placeholder instead of hiding the order entirely if the listing was
                    // since removed — an order should never disappear from the buyer's list.
                    const product = listings.find((item) => item.id === order.productId)
                      ?? { id: order.productId, name: "Listing unavailable", shop: "", image: "" };
                    return <OrderRow key={order.id} order={order} product={product} reviewed={hasReviewedProduct(order.productId)} navigate={navigate} />;
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </MobileScreenLayout>
  );
}

function OrderRow({ order, product, reviewed, navigate }) {
  const isCompleted = order.status === "Completed";
  const isCancelled = order.status === "Cancelled";
  const reputationSnapshot = useReputationSnapshot(order.sellerId ?? product.sellerId);
  const openOrderDetails = () => {
    const route = `/orders/${order.id.replace(/^ORD-/, "")}`;
    console.info("Order card clicked", order.id);
    console.info("Order status", order.status);
    navigate(route);
  };

  return (
    <div onClick={openOrderDetails} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) openOrderDetails(); }} role="button" tabIndex={0} className="cursor-pointer border-b border-[#E6E6E6] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12px] text-[#828282]">{order.id}</span>
        <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[12px] font-medium ${isCancelled ? "bg-[#FFF1F0] text-[#B42318]" : isCompleted ? "bg-[#CFF7D3] text-[#02542D]" : "bg-[#F5F5F5] text-[#828282]"}`}>{isCancelled && <OutlineIcon name="cancel" size={12} />}{isCancelled ? "Cancelled" : order.status}</span>
      </div>
      <div className="flex w-full items-center gap-3 text-left">
        <img src={product.image} alt={product.name} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-medium">{product.name}</div>
          <div className="text-[12px] text-[#828282]">{product.shop}</div>
          <div className="text-[12px] text-[#828282]">Qty {order.quantity} • {order.date}</div>
          <CompactReputationHeader snapshot={reputationSnapshot} audience="seller" className="mt-1 max-w-full" />
        </div>
        <div className="text-[14px] font-semibold">${order.total.toFixed(2)}</div>
      </div>
      {isCompleted && !reviewed && <button onClick={(event) => { event.stopPropagation(); navigate(`/leave-review/${product.id}`); }} className="mt-3 w-full rounded-lg bg-[#498467] py-2.5 text-[14px] font-medium text-white">Leave Review</button>}
      {isCompleted && reviewed && <button onClick={(event) => { event.stopPropagation(); navigate(`/product/${product.id}/reviews`); }} className="mt-3 w-full rounded-lg border border-[#498467] py-2.5 text-[14px] font-medium text-[#498467]">View Your Review</button>}
    </div>
  );
}
