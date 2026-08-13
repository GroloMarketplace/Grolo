import { supabase, isSupabaseConfigured } from "../supabaseClient";

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. See .env.example.");
  }
}

const ORDER_SELECT = "*, order_items(*)";

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
    orderId: row.order_id,
    listingId: row.listing_id,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    lineTotal: row.line_total,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
  const items = Array.isArray(row.order_items) ? row.order_items : [];
  const item = itemRow ?? items[itemIndex] ?? items[0] ?? {};
  const itemId = item.id ?? item.listing_id ?? item.listingId ?? "item";
  const createdAt = legacyCreatedAt(row.created_at);

  return {
    id: itemIndex === 0 ? row.id : `${row.id}:${itemId}`,
    databaseId: row.id,
    orderId: row.id,
    productId: item.listing_id ?? item.listingId,
    quantity: Number(item.quantity) || 0,
    total: Number(row.total) || 0,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    status: row.status,
    fulfillmentMethod: row.fulfillment_method,
    createdAt,
    date: legacyDate(row.created_at),
    inventoryRestored: Boolean(row.inventory_restored),
    lineTotal: Number(item.line_total ?? item.lineTotal) || 0,
    unitPrice: Number(item.unit_price ?? item.unitPrice) || 0,
    orderItems: items.map(orderItemFromRow),
  };
}

// Flattens database orders into the item-oriented collection expected by the
// current OrderContext. This is intentionally not used by reads yet.
export function legacyOrdersFromRows(rows) {
  return (rows ?? []).flatMap((row) => {
    const items = Array.isArray(row?.order_items) ? row.order_items : [];
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

export async function updateOrderStatus(orderId, status) {
  requireSupabase();
  const { data, error } = await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .select(ORDER_SELECT)
    .single();
  if (error) {
    logApiError("updateOrderStatus", error, { orderId, status });
    throw error;
  }
  console.info("Supabase updateOrderStatus response", {
    orderId,
    status: data.status,
    updated_at: data.updated_at,
  });
  return orderFromRow(data);
}

export async function cancelOrder(orderId) {
  return updateOrderStatus(orderId, "Cancelled");
}
