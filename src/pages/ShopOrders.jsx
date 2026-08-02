import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { products } from "../data/mockData";
import { useOrders } from "../context/OrderContext";

const STORE_ID = "sarahs-backyard";

const SECTIONS = [
  { title: "New Orders", statuses: ["Order Placed"] },
  { title: "Preparing", statuses: ["Preparing"] },
  { title: "Ready for Pickup", statuses: ["Ready for Pickup"] },
  { title: "Completed Orders", statuses: ["Completed", "Cancelled"] },
];

export default function ShopOrders() {
  const navigate = useNavigate();
  const { sellerOrders, nextStatuses, updateOrderStatus } = useOrders();
  const storeOrders = sellerOrders(STORE_ID);

  return (
    <MobileScreenLayout>
      <Header title="Store Orders" onBack={() => navigate("/shop")} />
      <div className="overflow-y-auto flex-1 no-scrollbar">
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
                            </div>
                          </div>
                          <div className="text-[14px] font-semibold">
                            ${order.total.toFixed(2)}
                          </div>
                        </div>

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
    </MobileScreenLayout>
  );
}
