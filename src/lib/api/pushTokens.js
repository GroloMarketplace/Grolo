import { isSupabaseConfigured, supabase, supabaseProjectReference } from "../supabaseClient";

export async function savePushToken({ userId, token, platform }) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured; the push token was not saved.");
  }
  if (!userId || !token || !platform) {
    throw new Error("Push token save requires an authenticated user, token, and platform.");
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user?.id) {
    throw new Error("No authenticated Supabase user was available while saving the push token.");
  }
  if (authData.user.id !== userId) {
    throw new Error(`Push token user mismatch: session ${authData.user.id} did not match ${userId}.`);
  }

  const { error } = await supabase.from("push_tokens").upsert({
    user_id: authData.user.id,
    token,
    platform,
    updated_at: new Date().toISOString(),
  }, { onConflict: "token" });
  if (error) {
    throw new Error(`Push token upsert failed for project ${supabaseProjectReference ?? "unknown"}: ${error.message}`);
  }

  return {
    saved: true,
    userId: authData.user.id,
    platform,
    projectReference: supabaseProjectReference,
  };
}
