import { supabase, isSupabaseConfigured } from "../supabaseClient";

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. See .env.example.");
  }
}

const ORDER_SELECT = "*, order_items(*, listings(legacy_id)), payments(*)";

function logApiError(operation, error, context = {}) {
  console.error(`Supabase ${operation} error`, {
    code: error?.code ?? null,
    message: error?.message ?? null,
    details: error?.details ?? null,
    hint: error?.hint ?? null,
    ...context,
  });
}

function orderItemFromRow(row) {
  return {
    ...row,
    id: row.id,
    databaseId: row.id,
    orderId: row.order_id ?? row.orderId,
    listingId: row.listing_id ?? row.listingId,
    productId: row.product_id ?? row.listings?.legacy_id ?? row.listing_id ?? row.listingId,
    quantity: row.quantity,
    unitPrice: row.unit_price ?? row.unitPrice,
    lineTotal: row.line_total ?? row.lineTotal,
    originalPrice: row.original_price ?? row.originalPrice,
    discountedPrice: row.discounted_price ?? row.discountedPrice,
    promotionId: row.promotion_id ?? row.promotionId,
    promotionTitle: row.promotion_title ?? row.promotionTitle,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  };
}

export function orderFromRow(row) {
  if (!row) return null;
  const items = Array.isArray(row.order_items) ? row.order_items.map(orderItemFromRow) : [];
  return {
    ...row,
    id: row.id,
    databaseId: row.id,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    fulfillmentMethod: row.fulfillment_method,
    status: row.status,
    subtotal: row.subtotal,
    deliveryFee: row.delivery_fee,
    total: row.total,
    inventoryRestored: Boolean(row.inventory_restored),
    metadata: row.metadata ?? {},
    items,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    payment: row.payments?.[0] ?? null,
    paymentId: row.payments?.[0]?.payment_id ?? null,
    paymentStatus: row.payments?.[0]?.payment_status ?? null,
  };
}

function legacyCreatedAt(timestamp) {
  if (!timestamp) return undefined;
  const value = new Date(timestamp).getTime();
  return Number.isNaN(value) ? undefined : value;
}

function legacyDate(timestamp) {
  const value = legacyCreatedAt(timestamp);
  return value === undefined
    ? undefined
    : new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
}

// Compatibility mapper for the existing OrderContext order shape. A database
// order can contain several order_items, so each item becomes one legacy order
// entry while retaining the database order ID in databaseId/orderId.
export function legacyOrderFromRow(row, itemRow, itemIndex = 0) {
  if (!row) return null;
  const items = Array.isArray(row.order_items)
    ? row.order_items
    : Array.isArray(row.items)
      ? row.items
      : [];
  const item = itemRow ?? items[itemIndex] ?? items[0] ?? {};
  const itemId = item.id ?? item.listing_id ?? item.listingId ?? "item";
  const legacyId = row.metadata?.legacy_order_id ?? row.metadata?.legacyOrderId;
  const orderId = row.id ?? row.databaseId;
  const createdAt = legacyCreatedAt(row.created_at ?? row.createdAt);

  return {
    id: itemIndex === 0 ? legacyId ?? orderId : `${legacyId ?? orderId}:${itemId}`,
    databaseId: row.id ?? row.databaseId,
    orderId: row.id ?? row.databaseId,
    productId: item.product_id ?? item.productId ?? item.listings?.legacy_id ?? item.listing_id ?? item.listingId,
    quantity: Number(item.quantity) || 0,
    total: Number(row.total) || 0,
    buyer: row.buyer ?? row.metadata?.buyer ?? row.buyer_id ?? row.buyerId ?? "Buyer",
    buyerAvatar: row.buyerAvatar ?? row.metadata?.buyerAvatar,
    buyerId: row.buyer_id ?? row.buyerId,
    sellerId: row.seller_id ?? row.sellerId,
    status: row.status,
    fulfillmentMethod: row.fulfillment_method ?? row.fulfillmentMethod,
    createdAt,
    date: legacyDate(row.created_at ?? row.createdAt),
    inventoryRestored: Boolean(row.inventory_restored ?? row.inventoryRestored),
    payment: row.payments?.[0] ?? row.payment ?? null,
    paymentId: row.payments?.[0]?.payment_id ?? row.paymentId ?? null,
    paymentStatus: row.payments?.[0]?.payment_status ?? row.paymentStatus ?? null,
    lineTotal: Number(item.line_total ?? item.lineTotal) || 0,
    unitPrice: Number(item.unit_price ?? item.unitPrice) || 0,
    originalPrice: Number(item.original_price ?? item.originalPrice ?? item.unit_price ?? item.unitPrice) || 0,
    discountedPrice: Number(item.discounted_price ?? item.discountedPrice ?? item.unit_price ?? item.unitPrice) || 0,
    promotionId: item.promotion_id ?? item.promotionId ?? null,
    promotionTitle: item.promotion_title ?? item.promotionTitle ?? null,
    orderItems: items.map(orderItemFromRow),
  };
}

// Flattens database orders into the item-oriented collection expected by the
// current OrderContext compatibility reads.
export function legacyOrdersFromRows(rows) {
  return (rows ?? []).flatMap((row) => {
    const items = Array.isArray(row?.order_items)
      ? row.order_items
      : Array.isArray(row?.items)
        ? row.items
        : [];
    return items.length
      ? items.map((item, index) => legacyOrderFromRow(row, item, index))
      : [legacyOrderFromRow(row)];
  }).filter(Boolean);
}

function rowForOrder(order, buyerId) {
  return {
    buyer_id: buyerId ?? order.buyerId,
    seller_id: order.sellerId,
    fulfillment_method: order.fulfillmentMethod ?? "pickup",
    status: order.status ?? "Seller Notified",
    subtotal: Number(order.subtotal) || 0,
    delivery_fee: Number(order.deliveryFee) || 0,
    total: Number(order.total) || 0,
    inventory_restored: Boolean(order.inventoryRestored),
    metadata: order.metadata ?? {},
  };
}

function rowForOrderItem(item, orderId) {
  const quantity = Number(item.quantity) || 0;
  const unitPrice = Number(item.unitPrice ?? item.price) || 0;
  return {
    order_id: orderId,
    listing_id: item.listingId ?? item.productId,
    quantity,
    unit_price: unitPrice,
    line_total: Number(item.lineTotal ?? unitPrice * quantity) || 0,
    original_price: item.originalPrice ?? item.price ?? unitPrice,
    discounted_price: item.discountedPrice ?? unitPrice,
    promotion_id: item.promotionId ?? null,
    promotion_title: item.promotionTitle ?? null,
  };
}

export async function createOrder(order, buyerId) {
  requireSupabase();
  const payload = rowForOrder(order, buyerId);
  console.info("Supabase createOrder payload", {
    ...payload,
    buyer_id: buyerId ?? order.buyerId,
  });
  const { data, error } = await supabase
    .from("orders")
    .insert(payload)
    .select(ORDER_SELECT)
    .single();
  if (error) {
    logApiError("createOrder", error, {
      buyer_id: buyerId ?? order.buyerId ?? null,
      seller_id: order.sellerId ?? null,
    });
    throw error;
  }
  console.info("Supabase createOrder response", data);
  return orderFromRow(data);
}

export async function createOrderItems(orderId, items) {
  requireSupabase();
  const payload = (Array.isArray(items) ? items : []).map((item) => rowForOrderItem(item, orderId));
  if (!payload.length) return [];
  console.info("Supabase createOrderItems payload", { orderId, count: payload.length });
  const { data, error } = await supabase
    .from("order_items")
    .insert(payload)
    .select("*");
  if (error) {
    logApiError("createOrderItems", error, { orderId, count: payload.length });
    throw error;
  }
  console.info("Supabase createOrderItems response", { orderId, count: data?.length ?? 0 });
  return (data ?? []).map(orderItemFromRow);
}

export async function createOrderWithItems(sellerId, items, { fulfillmentMethod = "pickup", deliveryFee = 0, orderId, metadata = {} } = {}) {
  requireSupabase();
  const payloadItems = (Array.isArray(items) ? items : []).map((item) => ({
    listing_id: item.databaseId ?? item.listingId ?? item.productId ?? item.id,
    quantity: Number(item.quantity) || 0,
    original_price: item.originalPrice,
    discounted_price: item.discountedPrice,
    promotion_id: item.promotionId,
    promotion_title: item.promotionTitle,
  }));
  const payloadMetadata = {
    ...metadata,
    ...(orderId ? { legacy_order_id: orderId } : {}),
  };
  const { data, error } = await supabase.rpc("create_order_with_items", {
    p_seller_id: sellerId,
    p_fulfillment_method: fulfillmentMethod,
    p_delivery_fee: Number(deliveryFee) || 0,
    p_metadata: payloadMetadata,
    p_items: payloadItems,
  });
  if (error) {
    logApiError("createOrderWithItems", error, { sellerId, itemCount: payloadItems.length });
    throw error;
  }
  console.info("Supabase create_order_with_items response", data);
  console.info("Supabase order created", {
    databaseOrderId: data?.order?.id ?? null,
    createdItemCount: data?.items?.length ?? 0,
  });
  return data;
}

export async function getBuyerOrders(buyerId) {
  requireSupabase();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });
  if (error) {
    logApiError("getBuyerOrders", error, { buyer_id: buyerId });
    throw error;
  }
  return (data ?? []).map(orderFromRow);
}

export async function getSellerOrders(sellerId) {
  requireSupabase();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });
  if (error) {
    logApiError("getSellerOrders", error, { seller_id: sellerId });
    throw error;
  }
  return (data ?? []).map(orderFromRow);
}

export async function getOrderById(orderId) {
  requireSupabase();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", orderId)
    .maybeSingle();
  if (error) {
    logApiError("getOrderById", error, { orderId });
    throw error;
  }
  return orderFromRow(data);
}

export async function updateOrderStatus(orderId, status, previousStatus) {
  requireSupabase();
  console.info("status update requested", {
    databaseOrderId: orderId,
    previousStatus: previousStatus ?? null,
    newStatus: status,
  });

  const { data, error } = await supabase.rpc("update_order_status", {
    p_order_id: orderId,
    p_status: status,
  });
  if (error) {
    console.error("status update failed", {
      databaseOrderId: orderId,
      previousStatus: previousStatus ?? null,
      newStatus: status,
    });
    logApiError("updateOrderStatus", error, { orderId, status, previousStatus });
    throw error;
  }
  const updatedRow = data?.order
    ? { ...data.order, items: data.items ?? [] }
    : data;
  console.info("status update succeeded", {
    databaseOrderId: updatedRow?.id ?? orderId,
    previousStatus: previousStatus ?? null,
    newStatus: updatedRow?.status ?? status,
  });
  return updatedRow;
}

export async function cancelOrderWithInventory(orderId, previousStatus) {
  requireSupabase();
  console.info("cancellation requested", {
    databaseOrderId: orderId,
    previousStatus: previousStatus ?? null,
    newStatus: "Cancelled",
  });

  const { data, error } = await supabase.rpc("cancel_order_with_inventory", {
    p_order_id: orderId,
  });
  if (error) {
    console.error("cancellation failed", {
      databaseOrderId: orderId,
      previousStatus: previousStatus ?? null,
      newStatus: "Cancelled",
    });
    logApiError("cancelOrderWithInventory", error, { orderId, previousStatus });
    throw error;
  }

  if (data?.inventory_already_restored) {
    console.info("inventory already restored", {
      databaseOrderId: orderId,
      previousStatus: previousStatus ?? null,
      newStatus: "Cancelled",
    });
  } else {
    console.info("inventory restored", {
      databaseOrderId: orderId,
      previousStatus: previousStatus ?? null,
      newStatus: "Cancelled",
    });
  }
  console.info("cancellation succeeded", {
    databaseOrderId: data?.order?.id ?? orderId,
    previousStatus: previousStatus ?? null,
    newStatus: data?.order?.status ?? "Cancelled",
  });
  return data;
}

export async function cancelOrder(orderId, previousStatus) {
  return cancelOrderWithInventory(orderId, previousStatus);
}
