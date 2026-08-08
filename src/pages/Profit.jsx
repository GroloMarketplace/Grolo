import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { events, products, reviews } from "../data/mockData";
import { useOrders } from "../context/OrderContext";
import { getSellerStatus } from "../data/communityStatus";
import OutlineIcon from "../components/OutlineIcon";
import InteractiveStatusBadge from "../components/InteractiveStatusBadge";
import { useFollow } from "../context/FollowContext";

const TABS = ["Overview", "Orders", "Community", "Products"];
const SELLER_ID = "sarahs-backyard";

export default function Profit() {
  const [tab, setTab] = useState("Overview");
  const navigate = useNavigate();
  const { sellerOrders } = useOrders();
  const { getFollowerCount } = useFollow();
  const orders = sellerOrders(SELLER_ID);
  const followers = getFollowerCount(SELLER_ID);
  const sellerProducts = products.filter((product) => product.sellerId === SELLER_ID);
  const sellerEvents = events.filter((event) => event.sellerId === SELLER_ID);
  const sellerReviews = reviews.filter((review) =>
    sellerProducts.some((product) => product.id === review.productId),
  );
  const productsSold = orders.reduce((total, order) => total + order.quantity, 0);
  const completedOrders = orders.filter((order) => order.status === "Completed");
  const communityStatus = getSellerStatus({
    ordersFulfilled: completedOrders.length,
    productsSold,
    reviewsReceived: sellerReviews.length,
    eventsHosted: sellerEvents.length,
    followersGained: followers,
    tradesCompleted: 3,
  });
  const cancelledOrders = orders.filter((order) => order.status === "Cancelled");
  const topProduct = useMemo(() => getTopProduct(orders, sellerProducts), [orders, sellerProducts]);
  const averageFulfillmentTime = "2.4 days";

  return (
    <MobileScreenLayout>
      <Header title="Performance" onBack={() => navigate("/shop", { state: { openSellerMenu: true } })} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {TABS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[14px] font-medium ${
                tab === item ? "bg-[#498467] text-white" : "bg-[#F6F6F6] text-black"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {tab === "Overview" && (
          <OverviewTab
            orders={orders}
            productsSold={productsSold}
            followers={followers}
            communityStatus={communityStatus}
          />
        )}
        {tab === "Orders" && (
          <OrdersTab
            orders={orders}
            completedOrders={completedOrders}
            cancelledOrders={cancelledOrders}
            averageFulfillmentTime={averageFulfillmentTime}
          />
        )}
        {tab === "Community" && (
          <CommunityTab
            followers={followers}
            reviewsReceived={sellerReviews.length}
            eventsHosted={sellerEvents.length}
            communityStatus={communityStatus}
          />
        )}
        {tab === "Products" && <ProductsTab topProduct={topProduct} products={sellerProducts} />}
      </div>
    </MobileScreenLayout>
  );
}

function OverviewTab({ orders, productsSold, followers, communityStatus }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      <MetricCard label="Total Orders" value={orders.length} />
      <MetricCard label="Products Sold" value={productsSold} />
      <MetricCard label="Store Followers" value={followers} />
      <MetricCard
        label="Seller Status"
        value={(
          <InteractiveStatusBadge status={communityStatus} prominent className="mt-0 flex-col gap-1 text-center" />
        )}
        valueClassName="text-center"
      />
    </div>
  );
}

function OrdersTab({ orders, completedOrders, cancelledOrders, averageFulfillmentTime }) {
  return (
    <div className="mt-4">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Orders Received" value={orders.length} />
        <MetricCard label="Completed Orders" value={completedOrders.length} />
        <MetricCard label="Cancelled Orders" value={cancelledOrders.length} />
        <MetricCard label="Average Fulfillment Time" value={averageFulfillmentTime} />
      </div>
      <section className="mt-4 rounded-lg border border-[#E0E0E0] p-4">
        <h2 className="text-[14px] font-semibold">Orders This Month</h2>
        <OrdersChart />
        <div className="mt-2 flex justify-between text-[10px] text-[#828282]">
          {["Week 1", "Week 2", "Week 3", "Week 4"].map((label) => <span key={label}>{label}</span>)}
        </div>
      </section>
    </div>
  );
}

function CommunityTab({ followers, reviewsReceived, eventsHosted, communityStatus }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      <MetricCard label="New Followers" value={Math.max(Math.round(followers * 0.08), 1)} />
      <MetricCard label="Reviews Received" value={reviewsReceived} />
      <MetricCard label="Events Hosted" value={eventsHosted} />
      <MetricCard
        label="Community Status"
        value={<span className="flex items-center gap-1"><OutlineIcon name={communityStatus.icon} size={16} /> {communityStatus.name}</span>}
      />
    </div>
  );
}

function ProductsTab({ topProduct, products }) {
  const productName = topProduct?.name ?? products[0]?.name ?? "No products yet";
  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      <MetricCard label="Top Product" value={productName} />
      <MetricCard label="Most Viewed Product" value={productName} />
      <MetricCard label="Most Saved Product" value={products[1]?.name ?? productName} />
      <MetricCard label="Most Purchased Product" value={productName} />
    </div>
  );
}

function MetricCard({ label, value, valueClassName = "" }) {
  return (
    <div className="flex min-h-[112px] flex-col justify-between rounded-lg border border-[#E0E0E0] bg-white p-4">
      <div className="text-[13px] font-medium text-[#4F4F4F]">{label}</div>
      <div className={`break-words text-[22px] font-semibold leading-[120%] text-[#498467] ${valueClassName}`}>{value}</div>
    </div>
  );
}

function OrdersChart() {
  return (
    <svg viewBox="0 0 311 160" className="mt-3 h-40 w-full" role="img" aria-label="Orders this month chart">
      <polyline fill="none" stroke="#498467" strokeWidth="3" strokeLinecap="round" points="0,132 70,104 145,116 220,54 301,76" />
      <polygon fill="url(#ordersGradient)" points="0,132 70,104 145,116 220,54 301,76 301,160 0,160" />
      <defs>
        <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#498467" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#498467" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="301" cy="76" r="4" fill="#498467" />
    </svg>
  );
}

function getTopProduct(orders, sellerProducts) {
  const quantities = orders.reduce((counts, order) => ({
    ...counts,
    [order.productId]: (counts[order.productId] ?? 0) + order.quantity,
  }), {});
  return [...sellerProducts].sort((a, b) => (quantities[b.id] ?? 0) - (quantities[a.id] ?? 0))[0];
}
