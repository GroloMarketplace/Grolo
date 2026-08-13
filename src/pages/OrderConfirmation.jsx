import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import Header from "../components/Header";
import { useCart } from "../context/CartContext";
import { usePaymentMethods } from "../context/PaymentMethodsContext";
import { useOrders } from "../context/OrderContext";

function PaymentInstructions({ paymentSettings, total, orderNumber }) {
  const { methods, eTransferEmail } = paymentSettings;
  return (
    <div className="mt-3 border-t border-black/10 pt-3">
      <div className="text-[12px] font-medium text-[#498467]">Payment Instructions</div>
      {methods.includes("etransfer") && <div className="mt-1 text-[13px] text-black/70"><span className="font-medium">E-Transfer Email:</span> {eTransferEmail}</div>}
      {methods.includes("cash") && <div className="mt-1 text-[13px] text-black/70">Cash · Pay at pickup</div>}
      <div className="mt-1 text-[13px] text-black/70"><span className="font-medium">Order Total:</span> ${total.toFixed(2)}</div>
      <div className="mt-1 text-[13px] text-black/70"><span className="font-medium">Order Number:</span> {orderNumber}</div>
      <div className="mt-1 text-[12px] text-[#828282]">Credit/Debit (Coming Soon)</div>
    </div>
  );
}

export default function OrderConfirmation() {
  const navigate = useNavigate();
  const [isAnimated, setIsAnimated] = useState(false);
  const { state } = useLocation();
  const { items, removeItems } = useCart();
  const cartItemsRemoved = useRef(false);
  const orderCreationStarted = useRef(false);
  const [orderError, setOrderError] = useState("");
  const { getPaymentMethods, fulfillmentMethod } = usePaymentMethods();
  const { createOrders } = useOrders();
  const orderItemsRef = useRef(null);
  const orderNumberRef = useRef(null);
  const orderItems = orderItemsRef.current ?? (orderItemsRef.current = (state?.sellerId
    ? items.filter((item) => (item.sellerId ?? "current-user") === state.sellerId)
    : items).filter((item) => Number(item.quantity) > 0));
  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const paymentSettings = getPaymentMethods(state?.sellerId ?? orderItems[0]?.sellerId ?? "current-user");
  const requestedFulfillment = state?.fulfillmentMethod ?? fulfillmentMethod;
  const selectedFulfillment = paymentSettings.fulfillmentMethods.includes(requestedFulfillment) ? requestedFulfillment : paymentSettings.fulfillmentMethods[0] ?? "pickup";
  const deliveryFee = selectedFulfillment === "delivery" ? paymentSettings.deliveryFee : 0;
  const total = subtotal + deliveryFee;
  if (!orderNumberRef.current) orderNumberRef.current = `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const orderNumber = orderNumberRef.current;
  
  // Calculate estimated delivery date (3-4 days from now)
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 4);
  const formattedDeliveryDate = deliveryDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  useEffect(() => {
    // Trigger animation after component mounts
    setIsAnimated(true);
    if (orderItems.length === 0 || orderCreationStarted.current) return;

    orderCreationStarted.current = true;
    createOrders(orderItems, {
      orderId: orderNumber,
      sellerId: state?.sellerId ?? orderItems[0]?.sellerId,
      fulfillmentMethod: selectedFulfillment,
      deliveryFee,
    })
      .then(() => {
        if (!cartItemsRemoved.current) {
          removeItems(orderItems);
          cartItemsRemoved.current = true;
        }
      })
      .catch((error) => {
        orderCreationStarted.current = false;
        console.error("Unable to create Supabase order", error);
        setOrderError(error?.message ?? "Unable to create your order. Your cart was not changed.");
      });
  }, [orderItems, removeItems, createOrders, orderNumber, selectedFulfillment, deliveryFee, state?.sellerId]);

  return (
    <div className="flex h-full flex-col">
      <Header onBack={() => navigate(-1)} />
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto no-scrollbar px-6 pb-12 pt-20">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <div 
            className="w-20 h-20 rounded-full bg-[#498467] flex items-center justify-center transition-transform duration-500 ease-out"
            style={{
              transform: isAnimated ? 'scale(1)' : 'scale(0)',
              transformOrigin: 'center'
            }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 6L9 17l-5-5"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-[24px] font-semibold text-center mb-3">
          Order Confirmed!
        </h1>

        {orderError ? (
          <p role="alert" className="mb-8 rounded-lg border border-[#F3B8B4] bg-[#FFF1F0] p-4 text-center text-[14px] text-[#B42318]">
            {orderError}
          </p>
        ) : (
          <p className="text-[14px] text-center text-black/70 mb-8">
            Thank you for supporting local businesses. Your order has been placed successfully.
          </p>
        )}

        <div className="bg-[#F5F5F5] rounded-lg p-4 mb-8">
          <div className="flex justify-between mb-3">
            <span className="text-[14px] text-black/70">Order Number</span>
            <span className="text-[14px] font-medium">{orderNumber}</span>
          </div>
          <div className="flex justify-between mb-3">
            <span className="text-[14px] text-black/70">{selectedFulfillment === "delivery" ? "Estimated Delivery" : "Available for Pickup"}</span>
            <span className="text-[14px] font-medium">{formattedDeliveryDate}</span>
          </div>
          <div className="flex justify-between mb-3">
            <span className="text-[14px] text-black/70">Fulfillment Method</span>
            <span className="text-[14px] font-medium">{selectedFulfillment === "delivery" ? "Delivery" : "Pickup"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[14px] text-black/70">Total Owed</span>
            <span className="text-[14px] font-medium">${total.toFixed(2)}</span>
          </div>
          <PaymentInstructions paymentSettings={paymentSettings} total={total} orderNumber={orderNumber} />
        </div>

        <Link
          to={`/orders/${orderNumber}`}
          state={{
            // `orderNumber` is only ever assigned to orderItems[0]'s own order
            // record (see createOrders), so this fallback must describe that
            // single line item — never the combined quantity of a multi-item
            // cart — or cancelling it would restore the wrong product's stock.
            order: {
              id: orderNumber,
              sellerId: state?.sellerId ?? orderItems[0]?.sellerId ?? "current-user",
              productId: orderItems[0]?.productId ?? orderItems[0]?.id,
              quantity: orderItems[0]?.quantity ?? 0,
              status: "Seller Notified",
              total,
              fulfillmentMethod: selectedFulfillment,
            },
          }}
          className="w-full rounded-lg bg-[#498467] text-white text-[16px] font-medium py-3.5 shadow-sm mb-3 block text-center"
        >
          Track Order
        </Link>

        <Link to="/search" className="w-full rounded-lg border border-black text-black text-[16px] font-medium py-3.5 block text-center">
          Continue Shopping
        </Link>
      </div>
      </div>
    </div>
  );
}
