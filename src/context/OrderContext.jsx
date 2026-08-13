import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import {
  currentUser,
  products,
  sellers,
} from "../data/mockData";
import { restoreListingInventory } from "../lib/api/listings";

const OrderContext = createContext(null);
const ORDER_STORAGE_KEY = "grolo-orders";

// Order statuses that release any inventory reserved for the order back into
// stock. Only orders that never reach a successful, completed state should
// give up their reserved units.
const INVENTORY_RESTORING_STATUSES = ["Cancelled", "Rejected", "Failed Payment", "Expired"];
// Successfully fulfilled orders permanently consume their reserved inventory
// and must never trigger a restoration, even if re-processed.
const INVENTORY_FINAL_STATUSES = ["Delivered", "Completed", "Fulfilled", "Picked Up"];

function restoresInventory(status) {
  return INVENTORY_RESTORING_STATUSES.includes(status) && !INVENTORY_FINAL_STATUSES.includes(status);
}

function loadOrders(storageKey) {
  try {
    const savedOrders = window.localStorage.getItem(storageKey);
    return savedOrders ? JSON.parse(savedOrders) : [];
  } catch {
    return [];
  }
}

const PICKUP_NEXT_STATUS = {
  "Order Placed": ["Preparing"],
  "Seller Notified": ["In Progress"],
  Preparing: ["Ready for Pickup"],
  "In Progress": ["Ready for Pickup"],
  "Ready for Pickup": ["Completed"],
};

const DELIVERY_NEXT_STATUS = {
  "Order Placed": ["Preparing"],
  "Seller Notified": ["Preparing"],
  Preparing: ["Out for Delivery"],
  "In Progress": ["Out for Delivery"],
  "Out for Delivery": ["Delivered"],
};

export function OrderProvider({ children }) {
  const { user } = useAuth();
  const storageKey = `${ORDER_STORAGE_KEY}-${user?.id ?? "anonymous"}`;
  const [orders, setOrders] = useState(() => loadOrders(storageKey));

  useEffect(() => {
    setOrders(loadOrders(storageKey));
  }, [storageKey]);

  const [lastCreatedOrder, setLastCreatedOrder] = useState(null);

  const saveOrders = (nextOrders) => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(nextOrders));
    } catch {
    }
  };
  const [orderNotifications, setOrderNotifications] = useState([]);
  const [sellerOrderNotifications, setSellerOrderNotifications] = useState([]);

  const buyerOrders = useCallback(
    () => orders.filter((o) => o.buyerId === user?.id || (!o.buyerId && o.buyer === (user?.user_metadata?.username ?? currentUser.username))),
    [orders, user?.id, user?.user_metadata?.username],
  );

  const sellerOrders = useCallback(
    (sellerId) =>
      orders.filter((o) => {
        const product = products.find((p) => p.id === o.productId);
        return (o.sellerId ?? product?.sellerId) === sellerId;
      }),
    [orders],
  );

  const nextStatuses = useCallback(
    (status, fulfillmentMethod = "pickup") => {
      const workflow = fulfillmentMethod === "delivery" ? DELIVERY_NEXT_STATUS : PICKUP_NEXT_STATUS;
      return workflow[status] ?? [];
    },
    [],
  );

  const createOrders = useCallback((orderItems, orderDetails = {}) => {
    const nextOrders = orderItems.map((item, index) => ({
      id: index === 0 && orderDetails.orderId ? orderDetails.orderId : `ORD-${Math.random().toString(36).slice(2, 11).toUpperCase()}`,
      sellerId: item.sellerId ?? products.find((product) => product.id === item.productId)?.sellerId,
      productId: item.productId ?? item.id,
      quantity: item.quantity,
      total: item.price * item.quantity + (index === 0 ? Number(orderDetails.deliveryFee) || 0 : 0),
      status: "Seller Notified",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      buyer: user?.user_metadata?.username ?? currentUser.username,
      buyerId: user?.id,
      buyerAvatar: currentUser.avatar,
      fulfillmentMethod: orderDetails.fulfillmentMethod ?? "pickup",
      createdAt: Date.now(),
    }));
    setOrders((current) => {
      const mergedOrders = [...current, ...nextOrders];
      saveOrders(mergedOrders);
      return mergedOrders;
    });
    setLastCreatedOrder(nextOrders[0] ?? null);
    setOrderNotifications((previous) => [
      ...nextOrders.map((order) => {
        const product = products.find((item) => item.id === order.productId);
        const seller = sellers[order.sellerId ?? product?.sellerId];
        return {
          id: `order-${order.id}-accepted-${Date.now()}`,
          name: seller?.name ?? product?.shop ?? "Store",
          avatar: seller?.avatar,
          time: "now",
          action: `Your order from ${seller?.name ?? product?.shop ?? "the store"} has been accepted.`,
          thumb: product?.image,
          type: "order",
          orderId: order.id,
          sellerId: order.sellerId ?? product?.sellerId,
          productId: order.productId,
        };
      }),
      ...previous,
    ]);
    console.info("Seller orders created", nextOrders.map((order) => ({ orderId: order.id, status: order.status, sellerId: order.sellerId })));
    return nextOrders;
  }, []);

  const updateOrderStatus = useCallback((orderId, status) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order || order.status === "Cancelled") return false;
    const workflow = order.fulfillmentMethod === "delivery" ? DELIVERY_NEXT_STATUS : PICKUP_NEXT_STATUS;
    if (!workflow[order.status]?.includes(status)) return false;
    const nextOrders = orders.map((item) => item.id === orderId ? { ...item, status } : item);
    setOrders(nextOrders);
    saveOrders(nextOrders);

    const product = products.find((p) => p.id === order?.productId);
    if (!order || !product) return;

    const seller = sellers[product.sellerId];
    setOrderNotifications((prev) => [
      {
        id: `order-${orderId}-${status}-${Date.now()}`,
        name: seller?.name ?? product.shop,
        avatar: seller?.avatar,
        time: "now",
        action: status === "Seller Notified"
          ? `Your order from ${seller?.name ?? product.shop} has been accepted.`
          : status === "Preparing" || status === "In Progress"
            ? "Your order is now being prepared."
            : status === "Out for Delivery"
              ? `Your order from ${seller?.name ?? product.shop} is now out for delivery.`
              : status === "Delivered"
                ? `Your order from ${seller?.name ?? product.shop} has been delivered.`
                : status === "Ready for Pickup"
                  ? "Your order is ready for pickup."
                  : `${order.id} • ${product.name} is now ${status}`,
        thumb: product.image,
        type: "order",
        orderId,
        sellerId: order.sellerId ?? product.sellerId,
        productId: product.id,
      },
      ...prev,
    ]);
  }, [orders]);

  // Shared by every way an order can end without being fulfilled (buyer
  // cancellation, seller rejection, payment failure, expiry). Whichever of
  // INVENTORY_RESTORING_STATUSES is passed in, the reserved units are
  // returned to stock exactly once per order via the `inventoryRestored`
  // flag, regardless of who (buyer, seller, or admin) triggered it.
  const cancelOrder = useCallback((orderId, fallbackOrder, status = "Cancelled", cancelledBy = "buyer") => {
    const matchesOrderId = (item) => String(item.id) === String(orderId)
      || String(item.id).replace(/^ORD-/, "") === String(orderId).replace(/^ORD-/, "");
    const orderIndex = orders.findIndex(matchesOrderId);
    const order = orderIndex >= 0 ? orders[orderIndex] : fallbackOrder;
    const resolvedOrderId = order?.id ?? orderId;
    const product = products.find((item) => item.id === order?.productId);
    const sellerId = order?.sellerId ?? product?.sellerId ?? "current-user";
    if (!order || INVENTORY_RESTORING_STATUSES.includes(order.status)) return false;

    const seller = sellers[sellerId] ?? sellers["current-user"];
    console.info("Order cancellation", {
      orderId: resolvedOrderId,
      previousStatus: order.status,
      newStatus: status,
    });
    const cancelledOrder = { ...order, buyer: order.buyer ?? currentUser.username, status, inventoryRestored: true };
    if (!order.inventoryRestored && restoresInventory(status)) restoreListingInventory([order]).catch((error) => console.error("Unable to restore listing inventory", error));
    const nextOrders = orderIndex >= 0
      ? orders.map((item, index) => index === orderIndex ? cancelledOrder : item)
      : [...orders, cancelledOrder];
    setOrders(nextOrders);
    saveOrders(nextOrders);
    const actionLabel = status === "Cancelled" ? "cancelled" : status.toLowerCase();
    setOrderNotifications((prev) => [
      {
        id: `order-${resolvedOrderId}-cancelled-${Date.now()}`,
        name: seller?.name ?? product?.shop ?? "Store",
        avatar: seller?.avatar,
        time: "now",
        action: `${order.id} • Your order was ${actionLabel}`,
        thumb: product?.image,
        type: "order",
        orderId: resolvedOrderId,
      },
      ...prev,
    ]);
    setSellerOrderNotifications((prev) => [
      {
        id: `seller-order-${resolvedOrderId}-cancelled-${Date.now()}`,
        sellerId,
        orderId: resolvedOrderId,
        time: "now",
        action: `${order.id.replace(/^ORD-/, "#")} was ${actionLabel} by the ${cancelledBy}.`,
        type: "order",
      },
      ...prev,
    ]);
    return true;
  }, [orders]);

  const value = {
    orders,
    buyerOrders,
    sellerOrders,
    createOrders,
    lastCreatedOrder,
    nextStatuses,
    updateOrderStatus,
    cancelOrder,
    orderNotifications,
    sellerOrderNotifications,
  };

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrders() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error("useOrders must be used within an OrderProvider");
  return ctx;
}
