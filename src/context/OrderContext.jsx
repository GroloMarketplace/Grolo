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

const NEXT_STATUS = {
  "Order Placed": ["Preparing"],
  Preparing: ["Ready for Pickup"],
  "Ready for Pickup": ["Completed"],
};

export function OrderProvider({ children }) {
  const [orders, setOrders] = useState(loadOrders);

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
        return product?.sellerId === sellerId;
      }),
    [orders],
  );

  const nextStatuses = useCallback(
    (status) => NEXT_STATUS[status] ?? [],
    [],
  );

  const updateOrderStatus = useCallback((orderId, status) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order || order.status === "Cancelled" || !NEXT_STATUS[order.status]?.includes(status)) return false;
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
        action: `${order.id} • ${product.name} is now ${status}`,
        thumb: product.image,
        type: "order",
        orderId,
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
