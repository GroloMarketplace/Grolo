import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Header from "../components/Header";
import { useCart } from "../context/CartContext";
import { usePaymentMethods } from "../context/PaymentMethodsContext";
import { useOrders } from "../context/OrderContext";
import { trackAnalyticsEvent } from "../lib/api/analytics";

const CHECKOUT_ATTEMPT_KEY = "grolo-checkout-attempt";

function readCheckoutAttempt() {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(CHECKOUT_ATTEMPT_KEY) ?? "null");
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function persistCheckoutAttempt(attempt) {
  try {
    window.sessionStorage.setItem(CHECKOUT_ATTEMPT_KEY, JSON.stringify(attempt));
  } catch {
  }
}

function createAttemptId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `attempt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createOrderId() {
  return `ORD-${Math.random().toString(36).slice(2, 11).toUpperCase()}`;
}

function initialAttempt(state, items) {
  const stored = readCheckoutAttempt();
  if (stored?.attemptId && (!state?.checkoutAttempt?.attemptId || stored.attemptId === state.checkoutAttempt.attemptId)) return stored;
  if (state?.checkoutAttempt?.attemptId) {
    persistCheckoutAttempt(state.checkoutAttempt);
    return state.checkoutAttempt;
  }
  const orderItems = (state?.sellerId
    ? items.filter((item) => (item.sellerId ?? "current-user") === state.sellerId)
    : items).filter((item) => Number(item.quantity) > 0);
  const attempt = {
    attemptId: createAttemptId(),
    orderId: createOrderId(),
    sellerId: state?.sellerId ?? orderItems[0]?.sellerId,
    fulfillmentMethod: state?.fulfillmentMethod,
    deliveryFee: state?.deliveryFee,
    items: orderItems,
    status: "creating",
  };
  persistCheckoutAttempt(attempt);
  return attempt;
}

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
  const { state } = useLocation();
  const { items, getItemPricing, removeItems } = useCart();
  const { getPaymentMethods, fulfillmentMethod } = usePaymentMethods();
  const { createOrders } = useOrders();
  const attemptRef = useRef(null);
  if (!attemptRef.current) attemptRef.current = initialAttempt(state, items);
  const requestInFlightRef = useRef(false);
  const [isAnimated, setIsAnimated] = useState(false);
  const [phase, setPhase] = useState(() => attemptRef.current.status === "confirmed" ? "confirmed" : attemptRef.current.status === "failed" ? "failed" : "creating");
  const [receipt, setReceipt] = useState(() => attemptRef.current.receipt ?? null);
  const [orderError, setOrderError] = useState(() => attemptRef.current.error ?? "");
  const attempt = attemptRef.current;
  const orderItems = useMemo(() => (Array.isArray(attempt.items) ? attempt.items.filter((item) => Number(item.quantity) > 0) : []), [attempt.items]);
  const sellerId = attempt.sellerId ?? orderItems[0]?.sellerId;
  const paymentSettings = getPaymentMethods(sellerId ?? "current-user");
  const requestedFulfillment = attempt.fulfillmentMethod ?? fulfillmentMethod;
  const selectedFulfillment = paymentSettings.fulfillmentMethods.includes(requestedFulfillment) ? requestedFulfillment : paymentSettings.fulfillmentMethods[0] ?? "pickup";
  const deliveryFee = Number(attempt.deliveryFee ?? (selectedFulfillment === "delivery" ? paymentSettings.deliveryFee : 0)) || 0;
  const subtotal = orderItems.reduce((sum, item) => sum + getItemPricing(item).discountedPrice * item.quantity, 0);
  const total = subtotal + deliveryFee;
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 4);
  const formattedDeliveryDate = deliveryDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const createOrderAttempt = useCallback(async () => {
    if (requestInFlightRef.current || attemptRef.current.status === "confirmed") return;
    requestInFlightRef.current = true;
    setPhase("creating");
    setOrderError("");
    attemptRef.current = { ...attemptRef.current, status: "creating", error: "" };
    persistCheckoutAttempt(attemptRef.current);

    try {
      if (!orderItems.length) throw new Error("Your cart is empty. Return to your cart and try again.");
      const pricedOrderItems = orderItems.map((item) => {
        const pricing = getItemPricing(item);
        return {
          ...item,
          price: pricing.discountedPrice,
          unitPrice: pricing.discountedPrice,
          originalPrice: pricing.originalPrice,
          discountedPrice: pricing.discountedPrice,
          promotionId: pricing.promotion?.id ?? null,
          promotionTitle: pricing.promotion?.title ?? null,
        };
      });
      const createdOrders = await createOrders(pricedOrderItems, {
        orderId: attemptRef.current.orderId,
        sellerId: attemptRef.current.sellerId ?? orderItems[0]?.sellerId,
        fulfillmentMethod: selectedFulfillment,
        deliveryFee,
        deliveryAddress: attemptRef.current.deliveryAddress,
      });
      const persistedOrder = createdOrders?.[0];
      const persistedOrderId = persistedOrder?.databaseId ?? persistedOrder?.orderId;
      if (!persistedOrderId) throw new Error("The order was not returned by the database. Your cart was not changed.");

      const completedItems = persistedOrder?.orderItems ?? persistedOrder?.items ?? pricedOrderItems;
      void Promise.all(completedItems.map((item) => trackAnalyticsEvent("order_completed", {
        sellerId: persistedOrder.sellerId ?? sellerId,
        listingId: item.listingId ?? item.databaseId ?? null,
        promotionId: item.promotionId ?? null,
        eventKey: `order-completed:${persistedOrderId}:${item.listingId ?? item.databaseId ?? "order"}`,
        metadata: { order_id: persistedOrderId },
      })));

      const nextReceipt = {
        databaseOrderId: persistedOrderId,
        legacyOrderId: persistedOrder.id ?? null,
        order: persistedOrder,
      };
      attemptRef.current = { ...attemptRef.current, status: "confirmed", receipt: nextReceipt, error: "" };
      persistCheckoutAttempt(attemptRef.current);
      setReceipt(nextReceipt);
      setPhase("confirmed");
      removeItems(orderItems);
    } catch (error) {
      const message = error?.message ?? "Unable to place your order. Your cart was not changed.";
      attemptRef.current = { ...attemptRef.current, status: "failed", error: message };
      persistCheckoutAttempt(attemptRef.current);
      setOrderError(message);
      setPhase("failed");
    } finally {
      requestInFlightRef.current = false;
    }
  }, [createOrders, deliveryFee, getItemPricing, orderItems, removeItems, selectedFulfillment, sellerId]);

  useEffect(() => {
    setIsAnimated(true);
    if (attemptRef.current.status === "confirmed" || attemptRef.current.status === "failed") return;
    void createOrderAttempt();
  }, [createOrderAttempt]);

  useEffect(() => {
    if (phase === "confirmed" && orderItems.length) removeItems(orderItems);
  }, [phase, orderItems, removeItems]);

  const orderId = receipt?.databaseOrderId;
  const orderNumber = receipt?.legacyOrderId ?? orderId;

  return (
    <div className="flex h-full flex-col">
      <Header onBack={() => navigate("/cart")} />
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto no-scrollbar px-6 pb-12 pt-20">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-6">
            <div className={`flex h-20 w-20 items-center justify-center rounded-full ${phase === "confirmed" ? "bg-[#498467]" : phase === "failed" ? "bg-[#B42318]" : "bg-[#E6E6E6]"} transition-transform duration-500 ease-out`} style={{ transform: isAnimated ? "scale(1)" : "scale(0)", transformOrigin: "center" }}>
              {phase === "confirmed" && <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              {phase === "failed" && <span className="text-3xl font-semibold text-white">!</span>}
              {phase === "creating" && <span className="h-7 w-7 animate-spin rounded-full border-4 border-[#B8D9C1] border-t-[#498467]" />}
            </div>
          </div>

          <h1 className="mb-3 text-center text-[24px] font-semibold">
            {phase === "confirmed" ? "Order Confirmed" : phase === "failed" ? "Order Failed" : "Creating Order"}
          </h1>

          {phase === "creating" && <p className="mb-8 text-center text-[14px] text-black/70">Placing your order…</p>}
          {phase === "failed" && <div role="alert" className="mb-8 rounded-lg border border-[#F3B8B4] bg-[#FFF1F0] p-4 text-center text-[14px] text-[#B42318]"><p>{orderError}</p><p className="mt-2 text-[12px]">Your cart was not changed.</p></div>}
          {phase === "confirmed" && <p className="mb-8 text-center text-[14px] text-black/70">Thank you for supporting local businesses. Your order has been placed successfully.</p>}

          <div className="mb-8 rounded-lg bg-[#F5F5F5] p-4">
            {phase === "confirmed" && <div className="mb-3 flex justify-between"><span className="text-[14px] text-black/70">Order ID</span><span className="text-right text-[12px] font-medium">{orderId}</span></div>}
            <div className="mb-3 flex justify-between"><span className="text-[14px] text-black/70">{selectedFulfillment === "delivery" ? "Estimated Delivery" : "Available for Pickup"}</span><span className="text-[14px] font-medium">{formattedDeliveryDate}</span></div>
            <div className="mb-3 flex justify-between"><span className="text-[14px] text-black/70">Fulfillment Method</span><span className="text-[14px] font-medium">{selectedFulfillment === "delivery" ? "Delivery" : "Pickup"}</span></div>
            <div className="flex justify-between"><span className="text-[14px] text-black/70">Total Owed</span><span className="text-[14px] font-medium">${total.toFixed(2)}</span></div>
            {phase === "confirmed" && <PaymentInstructions paymentSettings={paymentSettings} total={total} orderNumber={orderNumber} />}
          </div>

          {phase === "confirmed" && <Link to={`/orders/${orderId}`} state={{ order: { ...receipt.order, id: orderId, databaseId: orderId } }} className="mb-3 block w-full rounded-lg bg-[#498467] py-3.5 text-center text-[16px] font-medium text-white shadow-sm">Track Order</Link>}
          {phase === "failed" && <button type="button" onClick={() => void createOrderAttempt()} className="mb-3 w-full rounded-lg bg-[#498467] py-3.5 text-[16px] font-medium text-white">Retry Order</button>}
          <button type="button" onClick={() => navigate("/cart")} className="block w-full rounded-lg border border-black py-3.5 text-center text-[16px] font-medium text-black">{phase === "confirmed" ? "Continue Shopping" : "Return to Cart"}</button>
        </div>
      </div>
    </div>
  );
}
