import { isSupabaseConfigured, supabase } from "../supabaseClient";

function requireSupabase() {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
}

function paymentFromRow(row) {
  return {
    ...row,
    paymentId: row.payment_id,
    orderId: row.order_id,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    amount: row.amount,
    paymentStatus: row.payment_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createPayment({ orderId, buyerId, sellerId, amount, paymentStatus = "pending" }) {
  requireSupabase();
  const { data, error } = await supabase.from("payments").insert({
    order_id: orderId,
    buyer_id: buyerId,
    seller_id: sellerId,
    amount: Number(amount) || 0,
    payment_status: paymentStatus,
  }).select("*").single();
  if (error) throw error;
  return paymentFromRow(data);
}

export async function getPaymentsForUser(userId) {
  requireSupabase();
  const { data, error } = await supabase.from("payments").select("*").or(`buyer_id.eq.${userId},seller_id.eq.${userId}`).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(paymentFromRow);
}

export async function updatePaymentStatus(paymentId, paymentStatus) {
  requireSupabase();
  const { data, error } = await supabase.from("payments").update({ payment_status: paymentStatus, updated_at: new Date().toISOString() }).eq("payment_id", paymentId).select("*").single();
  if (error) throw error;
  return paymentFromRow(data);
}

export { paymentFromRow };
