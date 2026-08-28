import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function projectReferenceFromUrl(url) {
  try {
    return new URL(url).hostname.split(".")[0] || null;
  } catch {
    return null;
  }
}

export const supabaseProjectUrl = supabaseUrl ?? null;
export const supabaseProjectReference = projectReferenceFromUrl(supabaseUrl);
export const supabaseEnvironmentDiagnostics = {
  mode: import.meta.env.MODE ?? null,
  projectUrl: supabaseProjectUrl,
  projectReference: supabaseProjectReference,
  anonKeyConfigured: Boolean(supabaseAnonKey),
};

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);


if (!isSupabaseConfigured) {
}

async function fetchWithSupabaseDiagnostics(input, init) {
  const response = await globalThis.fetch(input, init);
  const requestUrl = typeof input === "string" ? input : input?.url ?? "";
  if (requestUrl.includes("/rest/v1/rpc/create_review")) {
    const responseBody = await response.clone().text();
  }
  return response;
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, { global: { fetch: fetchWithSupabaseDiagnostics } })
  : null;
