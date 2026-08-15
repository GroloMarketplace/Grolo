import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import {
  currentUser,
  products,
  sellers,
} from "../data/mockData";
import { cancelOrderWithInventory as cancelOrderWithInventoryInApi, createOrderWithItems, getBuyerOrders, getSellerOrders, legacyOrdersFromRows, updateOrderStatus as updateOrderStatusInApi } from "../lib/api/orders";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { refreshUserReputation } from "../lib/api/reputation";
import { createPayment, getPaymentsForUser } from "../lib/api/payments";

const OrderContext = createContext(null);

const PICKUP_NEXT_STATUS = {
  New: ["Preparing"],
  "Order Placed": ["Preparing"],
  "Seller Notified": ["In Progress"],
  Preparing: ["Ready for Pickup"],
  "In Progress": ["Ready for Pickup"],
  "Ready for Pickup": ["Completed"],
};

const DELIVERY_NEXT_STATUS = {
  New: ["Preparing"],
  "Order Placed": ["Preparing"],
  "Seller Notified": ["Preparing"],
  Preparing: ["Out for Delivery"],
  "In Progress": ["Out for Delivery"],
  "Out for Delivery": ["Delivered"],
  Delivered: ["Completed"],
};

export function OrderProvider({ children }) {
  const { user, isSuspended } = useAuth();
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    let active = true;

    if (!user?.id) {
      setOrders([]);
      setPayments([]);
      return () => {
        active = false;
      };
    }

    Promise.allSettled([
      getBuyerOrders(user.id),
      getSellerOrders(user.id),
      getPaymentsForUser(user.id),
    ])
      .then(([buyerResult, sellerResult, paymentResult]) => {
        const buyerRows = buyerResult.status === "fulfilled" ? buyerResult.value : [];
        const sellerRows = sellerResult.status === "fulfilled" ? sellerResult.value : [];
        const paymentRows = paymentResult.status === "fulfilled" ? paymentResult.value : [];
        const rowsById = new Map();
        [...buyerRows, ...sellerRows].forEach((row) => {
          if (row?.id) rowsById.set(row.id, row);
        });
        if (!active) return;
        setOrders(legacyOrdersFromRows([...rowsById.values()]));
        setPayments(paymentRows);
        console.info("order source: supabase");
        console.info("payment source: supabase", { count: paymentRows.length });
        if (paymentResult.status === "rejected") console.error("Unable to load payments from Supabase", paymentResult.reason);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  const [lastCreatedOrder, setLastCreatedOrder] = useState(null);
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

  const createOrders = useCallback(async (orderItems, orderDetails = {}) => {
    if (isSuspended) throw new Error("Your account is suspended and cannot place orders.");
    if (!isSupabaseConfigured || !user?.id) {
      throw new Error("Supabase authentication is required to create an order.");
    }
    if (!orderItems?.length) return [];

    const sellerId = orderDetails.sellerId
      ?? orderItems[0].sellerId
      ?? products.find((product) => product.id === orderItems[0].productId)?.sellerId;
    if (!sellerId) throw new Error("Unable to determine the seller for this order.");

    const response = await createOrderWithItems(sellerId, orderItems, {
      orderId: orderDetails.orderId,
      fulfillmentMethod: orderDetails.fulfillmentMethod ?? "pickup",
      deliveryFee: orderDetails.deliveryFee,
      metadata: {
        legacy_source: "OrderContext",
        buyer: user?.user_metadata?.username ?? currentUser.username,
        buyerAvatar: currentUser.avatar,
      },
    });
    const databaseOrder = {
      ...(response?.order ?? {}),
      items: response?.items ?? [],
    };
    let payment = null;
    try {
      payment = await createPayment({
        orderId: databaseOrder.id,
        buyerId: user.id,
        sellerId,
        amount: databaseOrder.total,
      });
      setPayments((current) => [payment, ...current.filter((item) => item.orderId !== payment.orderId)]);
    } catch (error) {
      console.error("Unable to persist payment record", error);
    }
    const nextOrders = legacyOrdersFromRows([{ ...databaseOrder, payment: payment ?? null }]);
    if (!nextOrders.length) throw new Error("Supabase created an order without order items.");

    setOrders((current) => [
      ...current.filter((order) => order.databaseId !== nextOrders[0].databaseId),
      ...nextOrders,
    ]);
    setLastCreatedOrder(nextOrders[0]);
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
  }, [isSuspended, user?.id, user?.user_metadata?.username]);

  const updateOrderStatus = useCallback(async (orderId, status) => {
    const order = orders.find((item) => item.id === orderId || item.databaseId === orderId);
    const databaseOrderId = order?.databaseId ?? order?.orderId ?? orderId;
    const previousStatus = order?.status ?? null;

    console.info("status update requested", {
      databaseOrderId,
      previousStatus,
      newStatus: status,
    });

    if (!order) {
      console.error("status update failed", {
        databaseOrderId,
        previousStatus,
        newStatus: status,
        reason: "Order not found",
      });
      return false;
    }
    if (order.status === "Cancelled") {
      console.error("status update failed", {
        databaseOrderId,
        previousStatus,
        newStatus: status,
        reason: "Order is cancelled",
      });
      return false;
    }

    const workflow = order.fulfillmentMethod === "delivery" ? DELIVERY_NEXT_STATUS : PICKUP_NEXT_STATUS;
    if (!workflow[order.status]?.includes(status)) {
      console.error("status update failed", {
        databaseOrderId,
        previousStatus,
        newStatus: status,
        reason: "Invalid workflow transition",
      });
      return false;
    }

    try {
      const updatedRow = await updateOrderStatusInApi(databaseOrderId, status, previousStatus);
      const mappedOrders = legacyOrdersFromRows([updatedRow]);
      const updatedOrders = mappedOrders.length ? mappedOrders : [{ ...order, status }];
      setOrders((current) => [
        ...current.filter((item) => item.databaseId !== databaseOrderId),
        ...updatedOrders,
      ]);

      const updatedOrder = updatedOrders[0];
      const product = products.find((p) => p.id === updatedOrder.productId);
      if (product) {
        const seller = sellers[product.sellerId];
        setOrderNotifications((prev) => [
          {
            id: `order-${updatedOrder.id}-${status}-${Date.now()}`,
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
                      : `${updatedOrder.id} • ${product.name} is now ${status}`,
            thumb: product.image,
            type: "order",
            orderId: updatedOrder.id,
            sellerId: updatedOrder.sellerId ?? product.sellerId,
            productId: product.id,
          },
          ...prev,
        ]);
      }
      if (status === "Completed") {
        const completedSellerId = updatedOrder.sellerId ?? products.find((item) => item.id === updatedOrder.productId)?.sellerId;
        const completedBuyerId = updatedOrder.buyerId ?? user?.id;
        const eventKey = `completed-order:${databaseOrderId}`;
        void refreshUserReputation(completedBuyerId, { eventKey: `${eventKey}:buyer` });
        void refreshUserReputation(completedSellerId, { eventKey: `${eventKey}:seller` });
      }
      console.info("status update succeeded", {
        databaseOrderId,
        previousStatus,
        newStatus: status,
      });
      return true;
    } catch (error) {
      console.error("status update failed", {
        databaseOrderId,
        previousStatus,
        newStatus: status,
        error: error?.message ?? error,
      });
      return false;
    }
  }, [orders, user?.id]);

  // Buyer cancellation is transaction-backed through Supabase.
  const cancelOrder = useCallback(async (orderId, fallbackOrder, status = "Cancelled", cancelledBy = "buyer") => {
    const matchesOrderId = (item) => String(item.id) === String(orderId)
      || String(item.databaseId) === String(orderId)
      || String(item.id).replace(/^ORD-/, "") === String(orderId).replace(/^ORD-/, "");
    const order = orders.find(matchesOrderId) ?? fallbackOrder;
    const databaseOrderId = order?.databaseId ?? order?.orderId ?? orderId;
    const previousStatus = order?.status ?? null;
    const requestedStatus = status === "Cancelled" ? status : "Cancelled";

    console.info("cancellation requested", {
      databaseOrderId,
      previousStatus,
      newStatus: requestedStatus,
    });

    if (!order) {
      console.error("cancellation failed", {
        databaseOrderId,
        previousStatus,
        newStatus: requestedStatus,
        reason: "Order not found",
      });
      return false;
    }

    try {
      const response = await cancelOrderWithInventoryInApi(databaseOrderId, previousStatus);
      const databaseOrder = {
        ...(response?.order ?? {}),
        items: response?.items ?? [],
      };
      const mappedOrders = legacyOrdersFromRows([databaseOrder]);
      const updatedOrders = mappedOrders.length
        ? mappedOrders
        : [{ ...order, status: requestedStatus, inventoryRestored: true }];
      setOrders((current) => [
        ...current.filter((item) => item.databaseId !== databaseOrderId),
        ...updatedOrders,
      ]);

      const alreadyRestored = Boolean(response?.inventory_already_restored);
      if (alreadyRestored) {
        console.info("inventory already restored", {
          databaseOrderId,
          previousStatus,
          newStatus: requestedStatus,
        });
      } else {
        console.info("inventory restored", {
          databaseOrderId,
          previousStatus,
          newStatus: requestedStatus,
        });
      }

      if (!alreadyRestored) {
        const updatedOrder = updatedOrders[0];
        const product = products.find((item) => item.id === updatedOrder.productId);
        const sellerId = updatedOrder.sellerId ?? product?.sellerId ?? "current-user";
        const seller = sellers[sellerId] ?? sellers["current-user"];
        setOrderNotifications((prev) => [
          {
            id: `order-${updatedOrder.id}-cancelled-${Date.now()}`,
            name: seller?.name ?? product?.shop ?? "Store",
            avatar: seller?.avatar,
            time: "now",
            action: `${updatedOrder.id} • Your order was cancelled`,
            thumb: product?.image,
            type: "order",
            orderId: updatedOrder.id,
          },
          ...prev,
        ]);
        setSellerOrderNotifications((prev) => [
          {
            id: `seller-order-${updatedOrder.id}-cancelled-${Date.now()}`,
            sellerId,
            orderId: updatedOrder.id,
            time: "now",
            action: `${updatedOrder.id.replace(/^ORD-/, "#")} was cancelled by the ${cancelledBy}.`,
            type: "order",
          },
          ...prev,
        ]);
      }

      console.info("cancellation succeeded", {
        databaseOrderId,
        previousStatus,
        newStatus: requestedStatus,
      });
      return true;
    } catch (error) {
      console.error("cancellation failed", {
        databaseOrderId,
        previousStatus,
        newStatus: requestedStatus,
        error: error?.message ?? error,
      });
      return false;
    }
  }, [orders]);

  const value = {
    orders,
    payments,
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
