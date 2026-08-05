import { useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { products } from "../data/mockData";
import { useReviews } from "../context/ReviewContext";
import { useOrders } from "../context/OrderContext";
import { readNavigationState, writeNavigationState } from "../hooks/navigationState";

export default function Orders() {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const savedOrdersState = readNavigationState("orders", { scrollTop: 0 });
  const { hasReviewedProduct } = useReviews();
  const { buyerOrders } = useOrders();

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
        {buyerOrders().map((order) => {
          const product = products.find((p) => p.id === order.productId);
          if (!product) return null;
          const completed = order.status === "Completed";
          const reviewed = hasReviewedProduct(order.productId);

          const orderRouteId = order.id.replace(/^ORD-/, "");
          const openOrderDetails = () => {
            const route = `/orders/${orderRouteId}`;
            console.info("Order card clicked", order.id);
            console.info("Order ID", order.id);
            console.info("Navigating to", route);
            navigate(route);
          };

          return (
            <div
              key={order.id}
              onClick={openOrderDetails}
              onKeyDown={(event) => {
                if (
                  event.target === event.currentTarget &&
                  (event.key === "Enter" || event.key === " ")
                ) {
                  openOrderDetails();
                }
              }}
              role="button"
              tabIndex={0}
              className="p-4 border-b border-[#E6E6E6] cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] text-[#828282]">{order.id}</span>
                <span
                  className={`text-[12px] font-medium px-2 py-1 rounded-full ${
                    completed
                      ? "bg-[#CFF7D3] text-[#02542D]"
                      : "bg-[#F5F5F5] text-[#828282]"
                  }`}
                >
                  {order.status}
                </span>
              </div>

              <div className="flex items-center gap-3 w-full text-left">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-16 h-16 rounded-lg object-cover shrink-0"
                />
                <div className="flex-1">
                  <div className="text-[14px] font-medium">{product.name}</div>
                  <div className="text-[12px] text-[#828282]">{product.shop}</div>
                  <div className="text-[12px] text-[#828282]">
                    Qty {order.quantity} • {order.date}
                  </div>
                </div>
                <div className="text-[14px] font-semibold">
                  ${order.total.toFixed(2)}
                </div>
              </div>

              {completed && !reviewed && (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(`/leave-review/${product.id}`);
                  }}
                  className="w-full mt-3 bg-[#498467] text-white py-2.5 rounded-lg text-[14px] font-medium"
                >
                  Leave Review
                </button>
              )}
              {completed && reviewed && (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(`/product/${product.id}/reviews`);
                  }}
                  className="w-full mt-3 border border-[#498467] text-[#498467] py-2.5 rounded-lg text-[14px] font-medium"
                >
                  View Your Review
                </button>
              )}
            </div>
          );
        })}
      </div>
    </MobileScreenLayout>
  );
}
