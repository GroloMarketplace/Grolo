import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { sellers } from "../data/mockData";
import { useOrders } from "../context/OrderContext";
import { useListings } from "../context/ListingContext";
import { usePaymentMethods } from "../context/PaymentMethodsContext";
import { useMessages } from "../context/MessageContext";
import MapOptionsSheet from "../components/MapOptionsSheet";
import OutlineIcon from "../components/OutlineIcon";

const PICKUP_STEPS = [
  ["Order Submitted", "Your order has been created."],
  ["Seller Notified", "The seller has received your order."],
  ["In Progress", "The seller is preparing your order."],
  ["Ready for Pickup", "Your order is ready to be collected."],
  ["Completed", "Order successfully picked up."],
];

const DELIVERY_STEPS = [
  ["Order Submitted", "Your order has been created."],
  ["Seller Notified", "The seller has received your order."],
  ["In Progress", "The seller is preparing your order."],
  ["Out for Delivery", "Your order is on its way."],
  ["Delivered", "Your order has been delivered."],
];

const STATUS_INDEX = {
  "Order Placed": 1,
  "Seller Notified": 1,
  Preparing: 2,
  "In Progress": 2,
  "Ready for Pickup": 3,
  Completed: 4,
  "Out for Delivery": 3,
  Delivered: 4,
};

export default function OrderTracking() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { state } = useLocation();
  const { orders, cancelOrder } = useOrders();
  const { listings } = useListings();
  const { getPaymentMethods } = usePaymentMethods();
  const { createOrderConversation } = useMessages();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showMapSheet, setShowMapSheet] = useState(false);
  const [cancellationSuccess, setCancellationSuccess] = useState(false);
  const matchesRouteId = (item) => String(item.id) === id
    || String(item.databaseId) === id
    || String(item.orderId) === id
    || String(item.id).replace(/^ORD-/, "") === id;
  const contextOrder = orders.find(matchesRouteId) ?? state?.order;
  const order = contextOrder;
  // Listings live in ListingContext (created per seller), not the static
  // mockData catalog.
  const product = listings.find((item) => item.id === order?.productId);
  const sellerId = order?.sellerId ?? product?.sellerId ?? "current-user";
  const seller = sellers[sellerId] ?? { id: sellerId, name: "Seller" };
  const settings = getPaymentMethods(seller.id);
  const fulfillmentMethod = order?.fulfillmentMethod ?? "pickup";
  const isDelivery = fulfillmentMethod === "delivery";
  const steps = isDelivery ? DELIVERY_STEPS : PICKUP_STEPS;
  const currentStatus = order?.status;
  const isCancelled = currentStatus === "Cancelled";
  const canCancel = ["Order Placed", "Seller Notified"].includes(currentStatus);
  const currentIndex = isCancelled ? -1 : Math.min(STATUS_INDEX[currentStatus] ?? 0, steps.length - 1);
  const isReadyForPickup = !isCancelled && !isDelivery && currentIndex >= 3;
  const needsChangeSection = !isCancelled && !canCancel && !isReadyForPickup;

  useEffect(() => {
  }, [id]);

  useEffect(() => {
  }, [currentStatus, id, order?.id]);

  const confirmCancellation = async () => {
    const currentOrderId = order?.id ?? id;
    const previousStatus = currentStatus;
    const cancelled = await cancelOrder(currentOrderId, order);
    if (cancelled) setCancellationSuccess(true);
    setShowCancelModal(false);
  };

  const handleMessageSeller = () => {
    const { id: conversationId, draft, conversation } = createOrderConversation({
      order,
      product,
      seller,
      fulfillmentMethod: isDelivery ? "delivery" : "pickup",
    });
    navigate(`/messages/${conversationId}`, {
      state: {
        draft,
        orderConversation: true,
        orderId: order.id,
        pendingConversation: conversation,
      },
    });
  };

  return (
    <MobileScreenLayout>
      <Header title="Order Details" onBack={() => navigate(-1)} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-5">
        <div className={`mb-4 rounded-lg p-3 text-[14px] font-medium ${isCancelled ? "bg-[#FFF1F0] text-[#B42318]" : "bg-[#F5F5F5] text-[#4F4F4F]"}`}>
          Current Status: {currentStatus}
        </div>
        <section className="rounded-lg border border-[#E6E6E6] p-4">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-[18px] font-semibold">Order Summary</h1>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[12px] text-[#828282]">{order?.id ?? id}</span>
              <span className="text-[12px] font-medium text-[#4F4F4F]">Current Status: {currentStatus}</span>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 text-[14px]">
            <SummaryRow label="Store Name" value={seller.name} />
            <SummaryRow label="Fulfillment Method" value={isDelivery ? "Delivery" : "Pickup"} />
            <SummaryRow label="Amount Due" value={`$${Number(order?.total ?? 0).toFixed(2)}`} />
            {!isDelivery && <SummaryRow label="Pickup Location" value={settings.pickupLocation} />}
          </div>
        </section>

        <PaymentInstructions settings={settings} order={order} />

        {!isCancelled && <section className="mt-6">
          <h2 className="text-[18px] font-semibold">Order Progress</h2>
          <div className="mt-4">
            {steps.map(([label, description], index) => {
              const completed = index < currentIndex;
              const current = index === currentIndex;
              return (
                <div key={label} className="flex gap-3">
                  <div className="flex w-6 shrink-0 flex-col items-center">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full border ${completed || current ? "border-[#498467]" : "border-[#D9D9D9]"} ${completed ? "bg-[#498467] text-white" : current ? "bg-[#498467]" : "bg-white"}`}>
                      {completed ? "✓" : current ? <span className="h-2.5 w-2.5 rounded-full bg-white" /> : null}
                    </div>
                    {index < steps.length - 1 && <div className={`h-12 w-0.5 ${index < currentIndex ? "bg-[#498467]" : "bg-[#D9D9D9]"}`} />}
                  </div>
                  <div className="pb-5">
                    <div className={`text-[14px] font-semibold ${completed || current ? "text-[#498467]" : "text-black/50"}`}>{label}</div>
                    <p className="mt-0.5 text-[13px] text-[#828282]">{description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>}

        {needsChangeSection && (
          <section className="mt-1 border-t border-[#E6E6E6] pt-4">
            <h2 className="text-[16px] font-semibold">Need to make a change?</h2>
            <p className="mt-1 text-[13px] text-[#828282]">Please contact the seller directly to discuss modifications to your order.</p>
          </section>
        )}

        {cancellationSuccess && <div className="rounded-lg bg-[#F5FFF6] p-3 text-[14px] font-medium text-[#02542D]">✅ Order cancelled successfully</div>}

        {isCancelled && (
          <section className="mt-1 border-t border-[#E6E6E6] pt-4">
            <div className="text-[16px] font-semibold text-[#B42318]">❌ Cancelled</div>
            <p className="mt-1 text-[13px] text-[#828282]">This order has been cancelled.</p>
          </section>
        )}

        {isReadyForPickup && (
          <section className="mt-2 rounded-lg bg-[#F5FFF6] p-4">
            <h2 className="text-[18px] font-semibold">Pickup Information</h2>
            <div className="mt-3 text-[14px]"><div className="font-medium">Pickup Location</div><div className="mt-1 flex items-center gap-1 text-[#4F4F4F]"><OutlineIcon name="home" size={15} className="text-[#498467]" /> {settings.pickupLocation}</div></div>
            <div className="mt-3 text-[14px]"><div className="font-medium">Pickup Notes</div><div className="mt-1 text-[#4F4F4F]">{settings.pickupNotes || "Text when arriving"}</div></div>
            <button type="button" onClick={() => setShowMapSheet(true)} className="mt-3 text-[14px] font-medium text-[#498467]">View on Map <span aria-hidden="true">›</span></button>
          </section>
        )}

        <div className="mt-6 flex flex-col items-center gap-4 pb-4">
          <div className="flex w-full gap-3">
            {isCancelled ? (
              <>
                <button type="button" onClick={() => navigate(`/seller/${seller.id}`)} className="flex-1 rounded-lg border border-[#498467] py-3 text-[14px] font-medium text-[#498467]">View Store <span aria-hidden="true">›</span></button>
                <button type="button" onClick={() => navigate("/")} className="flex-1 rounded-lg bg-[#498467] py-3 text-[14px] font-medium text-white">Continue Shopping</button>
              </>
            ) : (
              <>
                <button type="button" onClick={handleMessageSeller} className="flex-1 rounded-lg border border-[#498467] py-3 text-[14px] font-medium text-[#498467]">Message Seller</button>
                <button type="button" onClick={() => navigate(`/seller/${seller.id}`)} className="flex-1 rounded-lg bg-[#498467] py-3 text-[14px] font-medium text-white">View Store <span aria-hidden="true">›</span></button>
              </>
            )}
          </div>
          {!isCancelled && canCancel && (
            <span
              role="button"
              tabIndex={0}
              onClick={() => setShowCancelModal(true)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") setShowCancelModal(true);
              }}
              className="cursor-pointer text-[14px] font-medium text-[#B42318]"
            >
              Cancel Order
            </span>
          )}
        </div>
      </div>
      {showMapSheet && <MapOptionsSheet address={settings.pickupLocation} onClose={() => setShowMapSheet(false)} />}
      {showCancelModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 px-6">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-[18px] font-semibold">Cancel Order?</h2>
            <p className="mt-2 text-[14px] text-[#4F4F4F]">Are you sure you want to cancel this order?</p>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setShowCancelModal(false)} className="flex-1 rounded-lg border border-[#E6E6E6] py-2.5 text-[14px] font-medium">Keep Order</button>
              <button type="button" onClick={confirmCancellation} className="flex-1 rounded-lg bg-[#B42318] py-2.5 text-[14px] font-medium text-white">Cancel Order</button>
            </div>
          </div>
        </div>
      )}
    </MobileScreenLayout>
  );
}

function PaymentInstructions({ settings, order }) {
  return (
    <section className="mt-4 rounded-lg bg-[#F5FFF6] p-4">
      <h2 className="text-[18px] font-semibold">Payment Instructions</h2>
      <div className="mt-3 flex flex-col gap-1 text-[14px] text-[#4F4F4F]">
        {settings.methods.includes("etransfer") && <div><span className="font-medium">E-Transfer Email:</span> {settings.eTransferEmail}</div>}
        {settings.methods.includes("cash") && <div>Cash · Pay at pickup</div>}
        <div><span className="font-medium">Order Total:</span> ${Number(order?.total ?? 0).toFixed(2)}</div>
        <div><span className="font-medium">Order Number:</span> {order?.id}</div>
      </div>
    </section>
  );
}

function SummaryRow({ label, value }) {
  return <div className="flex items-start justify-between gap-4"><span className="text-black/60">{label}</span><span className="text-right font-medium">{value}</span></div>;
}
