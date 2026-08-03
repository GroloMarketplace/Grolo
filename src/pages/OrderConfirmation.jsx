import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { usePaymentMethods } from "../context/PaymentMethodsContext";

function PaymentMethodsList({ paymentSettings }) {
  const { methods, eTransferEmail } = paymentSettings;
  return (
    <div className="mt-3 border-t border-black/10 pt-3">
      <div className="text-[12px] font-medium text-[#498467]">Payment methods accepted</div>
      {methods.includes("cash") && <div className="mt-1 text-[13px] text-black/70">Cash · Pay at pickup</div>}
      {methods.includes("etransfer") && <div className="mt-1 text-[13px] text-black/70">E-Transfer · {eTransferEmail}</div>}
      <div className="mt-1 text-[12px] text-[#828282]">Credit/Debit (Coming Soon)</div>
    </div>
  );
}

export default function OrderConfirmation() {
  const [isAnimated, setIsAnimated] = useState(false);
  const { items, subtotal } = useCart();
  const { getPaymentMethods, fulfillmentMethod } = usePaymentMethods();
  const paymentSettings = getPaymentMethods(items[0]?.sellerId ?? "sarahs-backyard");
  const selectedFulfillment = paymentSettings.fulfillmentMethods.includes(fulfillmentMethod) ? fulfillmentMethod : paymentSettings.fulfillmentMethods[0] ?? "pickup";
  const deliveryFee = selectedFulfillment === "delivery" ? paymentSettings.deliveryFee : 0;
  const total = subtotal + deliveryFee;
  const orderNumber = `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  
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
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12">
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

        <p className="text-[14px] text-center text-black/70 mb-8">
          Thank you for supporting local businesses. Your order has been placed successfully.
        </p>

        <div className="bg-[#F5F5F5] rounded-lg p-4 mb-8">
          <div className="flex justify-between mb-3">
            <span className="text-[14px] text-black/70">Order Number</span>
            <span className="text-[14px] font-medium">{orderNumber}</span>
          </div>
          <div className="flex justify-between mb-3">
            <span className="text-[14px] text-black/70">Estimated Delivery</span>
            <span className="text-[14px] font-medium">{formattedDeliveryDate}</span>
          </div>
          <div className="flex justify-between mb-3">
            <span className="text-[14px] text-black/70">Fulfillment Method</span>
            <span className="text-[14px] font-medium">{selectedFulfillment === "delivery" ? "Delivery" : "Pickup"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[14px] text-black/70">Total Paid</span>
            <span className="text-[14px] font-medium">${total.toFixed(2)}</span>
          </div>
          <PaymentMethodsList paymentSettings={paymentSettings} />
        </div>

        <Link to="/orders" className="w-full rounded-lg bg-[#498467] text-white text-[16px] font-medium py-3.5 shadow-sm mb-3 block text-center">
          Track Order
        </Link>

        <Link to="/shop" className="w-full rounded-lg border border-black text-black text-[16px] font-medium py-3.5 block text-center">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
