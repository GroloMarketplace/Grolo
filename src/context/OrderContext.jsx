import { createContext, useCallback, useContext, useState } from "react";
import {
  currentUser,
  orders as mockOrders,
  products,
  sellers,
} from "../data/mockData";

const OrderContext = createContext(null);

const NEXT_STATUS = {
  "Order Placed": ["Preparing"],
  Preparing: ["Ready for Pickup"],
  "Ready for Pickup": ["Completed"],
};

export function OrderProvider({ children }) {
  const [orders, setOrders] = useState(mockOrders);
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
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o)),
    );

    const order = orders.find((o) => o.id === orderId);
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
    const order = orders.find((item) => item.id === orderId) ?? fallbackOrder;
    const product = products.find((item) => item.id === order?.productId);
    const sellerId = order?.sellerId ?? product?.sellerId;
    if (!order || !product || !sellerId || !["Order Placed", "Seller Notified"].includes(order.status)) return false;

    const seller = sellers[sellerId];
    setOrders((prev) => prev.some((item) => item.id === orderId)
      ? prev.map((item) => (item.id === orderId ? { ...item, status: "Cancelled" } : item))
      : [...prev, { ...order, status: "Cancelled" }]);
    setOrderNotifications((prev) => [
      {
        id: `order-${orderId}-cancelled-${Date.now()}`,
        name: seller?.name ?? product.shop,
        avatar: seller?.avatar,
        time: "now",
        action: `${order.id} • Your order was cancelled`,
        thumb: product.image,
        type: "order",
        orderId,
      },
      ...prev,
    ]);
    setSellerOrderNotifications((prev) => [
      {
        id: `seller-order-${orderId}-cancelled-${Date.now()}`,
        sellerId,
        orderId,
        time: "now",
        action: `${order.id} was cancelled by the buyer`,
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
