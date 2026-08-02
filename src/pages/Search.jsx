import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import CarouselRow from "../components/CarouselRow";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { categories, products } from "../data/mockData";
import { useReviews } from "../context/ReviewContext";
import { useOrders } from "../context/OrderContext";
import MapView from "../components/MapView";

const TABS = ["Local", "Map", "History", "My Orders"];

const ORDER_SECTIONS = [
  { title: "Active Orders", statuses: ["Order Placed", "Preparing"] },
  { title: "Ready for Pickup", statuses: ["Ready for Pickup"] },
  { title: "Completed Orders", statuses: ["Completed", "Cancelled"] },
];

export default function Search() {
  const [tab, setTab] = useState("Local");

  return (
    <MobileScreenLayout>
      <div className="sticky top-0 bg-white z-10 flex items-center justify-center gap-8 px-4 py-2.5 border-b border-black/5 relative">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-[14px] font-semibold tracking-[-0.28px] relative ${
              tab === t ? "text-[#498467]" : "text-black/40"
            }`}
          >
            {t}
            {tab === t && <div className="absolute -bottom-2.5 left-0 right-0 h-0.5 bg-[#498467]" />}
          </button>
        ))}
      </div>

      <div className="overflow-y-auto flex-1 no-scrollbar">
        <div className="bg-white py-3 border-b border-black/5">
          <SearchBar />
        </div>

        {tab === "Local" && (
          <>
            <div className="px-4">
              <div className="rounded-lg overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80"
                  alt="Calgary Farmers Market"
                  className="w-full h-[136px] object-cover"
                />
              </div>
            </div>
            <CategoryRow />
            <CarouselRow title="Featured" products={products} />
          </>
        )}

        {tab === "Map" && <MapView />}

        {tab === "History" && (
          <>
            <CategoryRow />
            <CarouselRow title="Today" products={products} />
          </>
        )}

        {tab === "My Orders" && <MyOrders />}
      </div>
    </MobileScreenLayout>
  );
}

function CategoryRow() {
  return (
    <div className="py-2">
      <div className="flex items-center gap-2 px-4 py-2">
        <span className="text-[16px] font-semibold tracking-[-0.32px]">
          Category
        </span>
      </div>
      <div className="flex gap-6 px-4 overflow-x-auto no-scrollbar">
        {categories.map((c) => (
          <div key={c.name} className="flex flex-col items-center gap-2 shrink-0">
            <img
              src={c.image}
              alt={c.name}
              className="w-[76px] h-[76px] rounded-full object-cover"
            />
            <span className="text-[14px] font-medium">{c.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MyOrders() {
  const navigate = useNavigate();
  const { hasReviewedProduct } = useReviews();
  const { buyerOrders } = useOrders();

  return (
    <div className="py-2">
      {ORDER_SECTIONS.map((section) => {
        const sectionOrders = buyerOrders().filter((o) =>
          section.statuses.includes(o.status),
        );

        return (
          <div key={section.title} className="py-2">
            <div className="flex items-center gap-2 px-4 py-2">
              <span className="text-[16px] font-semibold tracking-[-0.32px]">
                {section.title}
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
                  const completed = order.status === "Completed";
                  const reviewed = hasReviewedProduct(order.productId);

                  return (
                    <div
                      key={order.id}
                      className="rounded-lg border border-[#E6E6E6] p-3"
                    >
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
                          <div className="text-[14px] font-medium">
                            {product.name}
                          </div>
                          <div className="text-[12px] text-[#828282]">
                            {product.shop}
                          </div>
                          <div className="text-[12px] text-[#828282]">
                            {order.date}
                          </div>
                        </div>
                        <span
                          className={`text-[12px] font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                            completed
                              ? "bg-[#CFF7D3] text-[#02542D]"
                              : "bg-[#F5F5F5] text-[#828282]"
                          }`}
                        >
                          {order.status}
                        </span>
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
                          onClick={() =>
                            navigate(`/product/${product.id}/reviews`)
                          }
                          className="w-full mt-3 border border-[#498467] text-[#498467] py-2.5 rounded-lg text-[14px] font-medium"
                        >
                          View Your Review
                        </button>
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
  );
}
