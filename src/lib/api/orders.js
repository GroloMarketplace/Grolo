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
