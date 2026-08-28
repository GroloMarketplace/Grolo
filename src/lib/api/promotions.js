import { isSupabaseConfigured, supabase } from "../supabaseClient";

function requireSupabase() {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
}

function promotionFromRow(row) {
  let listingIds = row.listing_ids;
  if (typeof listingIds === "string") {
    try { listingIds = JSON.parse(listingIds); } catch { listingIds = []; }
  }
  const productIds = [...new Set([
    ...(Array.isArray(listingIds) ? listingIds : []),
    row.listing_id,
  ].filter(Boolean).map(String))];
  return {
    ...row,
    id: row.id,
    sellerId: row.seller_id,
    listingId: row.listing_id,
    productIds,
    title: row.title,
    description: row.description ?? "",
    type: row.promotion_type ?? row.discount_type,
    value: row.discount_value,
    startsAt: row.start_date,
    endsAt: row.end_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    image: row.image_url ?? row.image ?? "",
  };
}

function promotionPayload(promotion, sellerId) {
  const listingIds = promotion.productIds ?? (promotion.listingId ? [promotion.listingId] : []);
  return {
    seller_id: sellerId ?? promotion.sellerId,
    listing_id: promotion.listingId ?? listingIds[0] ?? null,
    listing_ids: listingIds,
    title: promotion.title ?? "",
    description: promotion.description ?? "",
    promotion_type: promotion.type ?? promotion.promotionType ?? promotion.discountType ?? "limited",
    discount_type: promotion.type ?? promotion.discountType ?? "limited",
    discount_value: promotion.value === "" ? null : (promotion.value ?? promotion.discountValue ?? null),
    start_date: promotion.startsAt ?? promotion.startDate ?? new Date().toISOString().slice(0, 10),
    end_date: promotion.endsAt || promotion.endDate || null,
    status: promotion.status ?? "active",
    image_url: promotion.image ?? promotion.imageUrl ?? null,
  };
}

export async function getPromotions() {
  requireSupabase();
  const { data, error } = await supabase.from("promotions").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  console.info("homepage promotion query result", {
    source: "promotions",
    rowCount: data?.length ?? 0,
    rows: (data ?? []).map((row) => ({ id: row.id, title: row.title, status: row.status, sellerId: row.seller_id, startDate: row.start_date, endDate: row.end_date })),
  });
  return (data ?? []).map(promotionFromRow);
}

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user?.id) throw new Error("You must be signed in to manage promotions.");
  return data.user.id;
}

export async function createPromotion(promotion) {
  requireSupabase();
  const sellerId = await currentUserId();
  const { data, error } = await supabase.from("promotions").insert(promotionPayload(promotion, sellerId)).select("*").single();
  if (error) throw error;
  return promotionFromRow(data);
}

export async function updatePromotion(promotionId, updates) {
  requireSupabase();
  const sellerId = await currentUserId();
  const { data, error } = await supabase
    .from("promotions")
    .update({ ...promotionPayload(updates, sellerId), seller_id: sellerId, updated_at: new Date().toISOString() })
    .eq("id", promotionId)
    .eq("seller_id", sellerId)
    .select("*")
    .single();
  if (error) throw error;
  return promotionFromRow(data);
}

export async function deletePromotion(promotionId) {
  requireSupabase();
  const sellerId = await currentUserId();
  const { error } = await supabase.from("promotions").delete().eq("id", promotionId).eq("seller_id", sellerId);
  if (error) throw error;
  return true;
}

export { promotionFromRow };
