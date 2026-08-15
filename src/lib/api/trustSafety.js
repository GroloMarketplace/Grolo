import { isSupabaseConfigured, supabase } from "../supabaseClient";

function requireSupabase() {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
}

export const REPORT_REASONS = [
  ["spam", "Spam"],
  ["fraud", "Fraud"],
  ["inappropriate_content", "Inappropriate content"],
  ["harassment", "Harassment"],
  ["misleading_listing", "Misleading listing"],
];

export async function createReport({ reporterId, targetType, targetId, reason, details = "" }) {
  requireSupabase();
  const { data, error } = await supabase.from("reports").insert({
    reporter_id: reporterId,
    target_type: targetType,
    target_id: String(targetId),
    reason,
    details,
  }).select("*").single();
  if (error) throw error;
  return data;
}

export async function getMyReports(reporterId) {
  requireSupabase();
  const { data, error } = await supabase.from("reports").select("*").eq("reporter_id", reporterId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getBlockedUsers(userId) {
  requireSupabase();
  const { data, error } = await supabase.from("user_blocks").select("blocked_id, created_at").eq("blocker_id", userId);
  if (error) throw error;
  return data ?? [];
}

export async function blockUser(blockerId, blockedId) {
  requireSupabase();
  const { error } = await supabase.from("user_blocks").insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error && error.code !== "23505") throw error;
}

export async function unblockUser(blockerId, blockedId) {
  requireSupabase();
  const { error } = await supabase.from("user_blocks").delete().eq("blocker_id", blockerId).eq("blocked_id", blockedId);
  if (error) throw error;
}

export async function isUserBlocked(firstUserId, secondUserId) {
  requireSupabase();
  const { data, error } = await supabase.rpc("is_user_blocked", { p_first_user_id: firstUserId, p_second_user_id: secondUserId });
  if (error) throw error;
  return Boolean(data);
}

export async function getAdminReports({ status, limit = 30, offset = 0 } = {}) {
  requireSupabase();
  let query = supabase
    .from("reports")
    .select("id,reporter_id,target_type,target_id,reason,details,status,created_at,updated_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (status && status !== "All") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function setReportStatus(reportId, status) {
  requireSupabase();
  const { data, error } = await supabase.rpc("admin_set_report_status", { p_report_id: reportId, p_status: status });
  if (error) throw error;
  return data;
}

export async function suspendTarget(targetType, targetId, suspended) {
  requireSupabase();
  const { error } = await supabase.rpc("admin_suspend_target", { p_target_type: targetType, p_target_id: String(targetId), p_suspended: suspended });
  if (error) throw error;
}
