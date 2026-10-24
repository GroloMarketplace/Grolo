import { isSupabaseConfigured, supabase } from "../supabaseClient";

function requireSupabase() {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value ?? ""));
}

export const REPORT_REASONS = [
  ["spam", "Spam"],
  ["harassment_bullying", "Harassment/Bullying"],
  ["hate_speech", "Hate Speech"],
  ["fraud_scam", "Fraud/Scam"],
  ["explicit_inappropriate", "Explicit/Inappropriate Content"],
  ["illegal_goods_services", "Illegal Goods or Services"],
  ["other", "Other"],
];

export async function createReport({ reporterUserId, reportedUserId = null, contentType, contentId, reason, optionalDescription = "" }) {
  requireSupabase();
  const { data, error } = await supabase.from("reports").insert({
    reporter_user_id: reporterUserId,
    reported_user_id: isUuid(reportedUserId) ? reportedUserId : null,
    content_type: contentType,
    content_id: String(contentId),
    reason,
    optional_description: optionalDescription,
    reporter_id: reporterUserId,
    target_type: contentType,
    target_id: String(contentId),
    details: optionalDescription,
  }).select("*").single();
  if (error) {
    if (error.code === "23505") throw new Error("You have already reported this content.");
    throw error;
  }
  return data;
}

export async function getMyReports(reporterId) {
  requireSupabase();
  const { data, error } = await supabase.from("reports").select("*").eq("reporter_user_id", reporterId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getBlockedUsers(userId) {
  requireSupabase();
  const { data, error } = await supabase
    .from("user_blocks")
    .select("blocker_id, blocked_id, created_at")
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    blocked_id: String(row.blocker_id) === String(userId) ? row.blocked_id : row.blocker_id,
  }));
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
    .select("id,reporter_user_id,reported_user_id,content_type,content_id,reason,optional_description,status,created_at,updated_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (status && status !== "All") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((report) => ({
    ...report,
    target_type: report.content_type,
    target_id: report.content_id,
    details: report.optional_description,
  }));
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
