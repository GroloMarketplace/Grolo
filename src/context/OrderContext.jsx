import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import {
  currentUser,
  products,
  sellers,
} from "../data/mockData";
import { restoreListingInventory } from "../lib/api/listings";
import { cancelOrderWithInventory as cancelOrderWithInventoryInApi, createOrderWithItems, getBuyerOrders, getSellerOrders, importLocalOrders, legacyOrdersFromRows, updateOrderStatus as updateOrderStatusInApi } from "../lib/api/orders";
import { isSupabaseConfigured } from "../lib/supabaseClient";

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
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    let active = true;

    const loadLocalStorageFallback = (reason) => {
      const fallbackOrders = loadOrders(storageKey);
      if (!active) return;
      setOrders(fallbackOrders);
      console.info("order source: localStorage fallback", reason ?? "Supabase unavailable");
    };

    if (!user?.id || !isSupabaseConfigured) {
      loadLocalStorageFallback();
      return () => {
        active = false;
      };
    }

    const loadSupabaseOrders = () => Promise.all([
      getBuyerOrders(user.id),
      getSellerOrders(user.id),
    ]);

    importLocalOrders(user.id)
      .catch((error) => {
        console.warn("Unable to import local orders", error);
      })
      .then(loadSupabaseOrders)
      .then(([buyerRows, sellerRows]) => {
        const rowsById = new Map();
        [...buyerRows, ...sellerRows].forEach((row) => {
          if (row?.id) rowsById.set(row.id, row);
        });
        if (!active) return;
        setOrders(legacyOrdersFromRows([...rowsById.values()]));
        console.info("order source: supabase");
      })
      .catch((error) => {
        console.warn("Unable to load orders from Supabase", error);
        loadLocalStorageFallback(error?.message ?? "Supabase read failed");
      });

    return () => {
      active = false;
    };
  }, [storageKey, user?.id]);

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

  const createOrders = useCallback(async (orderItems, orderDetails = {}) => {
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
    const nextOrders = legacyOrdersFromRows([databaseOrder]);
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
  }, [user?.id, user?.user_metadata?.username]);

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
  }, [orders]);

  // Buyer cancellation is transaction-backed when Supabase is available.
  // The legacy localStorage path remains only for unconfigured environments.
  const cancelOrder = useCallback(async (orderId, fallbackOrder, status = "Cancelled", cancelledBy = "buyer") => {
    const matchesOrderId = (item) => String(item.id) === String(orderId)
      || String(item.databaseId) === String(orderId)
      || String(item.id).replace(/^ORD-/, "") === String(orderId).replace(/^ORD-/, "");
    const orderIndex = orders.findIndex(matchesOrderId);
    const order = orderIndex >= 0 ? orders[orderIndex] : fallbackOrder;
    const databaseOrderId = order?.databaseId ?? order?.orderId ?? orderId;
    const previousStatus = order?.status ?? null;
    const requestedStatus = "Cancelled";

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

    const applyLocalCancellation = () => {
      if (INVENTORY_RESTORING_STATUSES.includes(order.status)) return false;
      const product = products.find((item) => item.id === order.productId);
      const sellerId = order.sellerId ?? product?.sellerId ?? "current-user";
      const seller = sellers[sellerId] ?? sellers["current-user"];
      const resolvedOrderId = order.id ?? orderId;
      const cancelledOrder = {
        ...order,
        buyer: order.buyer ?? currentUser.username,
        status,
        inventoryRestored: true,
      };
      if (!order.inventoryRestored && restoresInventory(status)) {
        restoreListingInventory([order]).catch((error) => console.error("Unable to restore listing inventory", error));
      }
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
    };

    if (!isSupabaseConfigured) return applyLocalCancellation();

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
