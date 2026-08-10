import { createContext, useCallback, useContext, useState } from "react";
import {
  currentUser,
  orders as mockOrders,
  products,
  sellers,
} from "../data/mockData";

const OrderContext = createContext(null);
const ORDER_STORAGE_KEY = "grolo-orders";
const INVENTORY_STORAGE_KEY = "grolo-inventory";
const INVENTORY_EVENT = "grolo-inventory-updated";

function restorePersistedInventory(items) {
  try {
    const savedInventory = window.localStorage.getItem(INVENTORY_STORAGE_KEY);
    const inventory = savedInventory ? JSON.parse(savedInventory) : {};
    items.forEach((item) => {
      const productId = item.productId ?? item.id;
      inventory[productId] = (inventory[productId] ?? 0) + (Number(item.quantity) || 0);
    });
    window.localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(inventory));
    window.dispatchEvent(new CustomEvent(INVENTORY_EVENT, { detail: inventory }));
  } catch {
  }
}

function loadOrders() {
  try {
    const savedOrders = window.localStorage.getItem(ORDER_STORAGE_KEY);
    return savedOrders ? JSON.parse(savedOrders) : mockOrders;
  } catch {
    return mockOrders;
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
  const [orders, setOrders] = useState(loadOrders);
  const [lastCreatedOrder, setLastCreatedOrder] = useState(null);

  const saveOrders = (nextOrders) => {
    try {
      window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(nextOrders));
    } catch {
    }
  };
  const [orderNotifications, setOrderNotifications] = useState([]);
  const [sellerOrderNotifications, setSellerOrderNotifications] = useState([]);

  const buyerOrders = useCallback(
    () => orders.filter((o) => o.buyer === currentUser.username),
    [orders],
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
      buyer: currentUser.username,
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

  const cancelOrder = useCallback((orderId, fallbackOrder) => {
    const matchesOrderId = (item) => String(item.id) === String(orderId)
      || String(item.id).replace(/^ORD-/, "") === String(orderId).replace(/^ORD-/, "");
    const orderIndex = orders.findIndex(matchesOrderId);
    const order = orderIndex >= 0 ? orders[orderIndex] : fallbackOrder;
    const resolvedOrderId = order?.id ?? orderId;
    const product = products.find((item) => item.id === order?.productId);
    const sellerId = order?.sellerId ?? product?.sellerId ?? "sarahs-backyard";
    if (!order || order.status === "Cancelled") return false;

    const seller = sellers[sellerId] ?? sellers["sarahs-backyard"];
    console.info("Order cancellation", {
      orderId: resolvedOrderId,
      previousStatus: order.status,
      newStatus: "Cancelled",
    });
    const cancelledOrder = { ...order, buyer: order.buyer ?? currentUser.username, status: "Cancelled", inventoryRestored: true };
    if (!order.inventoryRestored) restorePersistedInventory([order]);
    const nextOrders = orderIndex >= 0
      ? orders.map((item, index) => index === orderIndex ? cancelledOrder : item)
      : [...orders, cancelledOrder];
    setOrders(nextOrders);
    saveOrders(nextOrders);
    setOrderNotifications((prev) => [
      {
        id: `order-${resolvedOrderId}-cancelled-${Date.now()}`,
        name: seller?.name ?? product?.shop ?? "Store",
        avatar: seller?.avatar,
        time: "now",
        action: `${order.id} • Your order was cancelled`,
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
        action: `${order.id.replace(/^ORD-/, "#")} was cancelled by the buyer.`,
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
