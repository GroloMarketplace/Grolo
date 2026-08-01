import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { cartItems } from "../data/mockData";

export default function OrderConfirmation() {
  const [isAnimated, setIsAnimated] = useState(false);
  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const tax = 2;
  const total = subtotal + tax;
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
          <div className="flex justify-between">
            <span className="text-[14px] text-black/70">Total Paid</span>
            <span className="text-[14px] font-medium">${total.toFixed(2)}</span>
          </div>
        </div>

        <button className="w-full rounded-lg bg-[#498467] text-white text-[16px] font-medium py-3.5 shadow-sm mb-3">
          Track Order
        </button>

        <Link to="/shop" className="w-full rounded-lg border border-black text-black text-[16px] font-medium py-3.5 block text-center">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
