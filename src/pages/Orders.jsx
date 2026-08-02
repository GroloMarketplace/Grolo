import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { products } from "../data/mockData";
import { useReviews } from "../context/ReviewContext";
import { useOrders } from "../context/OrderContext";

export default function Orders() {
  const navigate = useNavigate();
  const { hasReviewedProduct } = useReviews();
  const { buyerOrders } = useOrders();

  return (
    <MobileScreenLayout>
      <Header title="My Orders" onBack={() => navigate(-1)} />
      <div className="overflow-y-auto flex-1 no-scrollbar">
        {buyerOrders().map((order) => {
          const product = products.find((p) => p.id === order.productId);
          if (!product) return null;
          const completed = order.status === "Completed";
          const reviewed = hasReviewedProduct(order.productId);

          return (
            <div key={order.id} className="p-4 border-b border-[#E6E6E6]">
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

              <button
                onClick={() => navigate(`/product/${product.id}`)}
                className="flex items-center gap-3 w-full text-left"
              >
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
              </button>

              {completed && !reviewed && (
                <button
                  onClick={() => navigate(`/leave-review/${product.id}`)}
                  className="w-full mt-3 bg-[#498467] text-white py-2.5 rounded-lg text-[14px] font-medium"
                >
                  Leave Review
                </button>
              )}
              {completed && reviewed && (
                <button
                  onClick={() => navigate(`/product/${product.id}/reviews`)}
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
