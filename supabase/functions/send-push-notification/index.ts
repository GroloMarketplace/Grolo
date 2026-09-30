import { createClient } from "npm:@supabase/supabase-js@2.111.0";
import { importPKCS8, SignJWT } from "npm:jose@5.10.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const webhookSecret = Deno.env.get("PUSH_WEBHOOK_SECRET");
const apnsKeyId = Deno.env.get("APNS_KEY_ID");
const apnsTeamId = Deno.env.get("APNS_TEAM_ID");
const rawApnsPrivateKey = Deno.env.get("APNS_PRIVATE_KEY");
const apnsBundleId = Deno.env.get("APNS_BUNDLE_ID") ?? "ca.grolomarketplace.app";
const apnsEnvironment = Deno.env.get("APNS_ENVIRONMENT") === "production" ? "production" : "sandbox";

const supabase = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;
const apnsHost = apnsEnvironment === "production" ? "https://api.push.apple.com" : "https://api.sandbox.push.apple.com";

const preferenceKeyForType = (type: string) => {
  if (type === "new_message" || type === "message_received") return "newMessages";
  if (type === "new_follower") return "newFollowers";
  if (type === "review_received") return "reviewsReceived";
  if (type === "regrow") return "regrows";
  if (type === "trade_proposal") return "tradeRequests";
  if (type === "event_attendance" || type === "event_rsvp" || type.includes("event")) return "eventReminders";
  if (type === "order_received" || type === "order_created") return "newOrders";
  if (type === "order_completed") return "orderCompleted";
  if (type === "order_accepted") return "orderAccepted";
  if (type.startsWith("order_")) return "orderUpdates";
  if (type === "new_listing" || type === "promotion_created") return "productUpdates";
  return "communityActivity";
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function normalizeApnsPrivateKey(value: string | undefined) {
  if (!value) throw new Error("APNS_PRIVATE_KEY is missing");

  let key = value.trim();
  if (key.startsWith("\"") && key.endsWith("\"")) {
    try {
      const parsed = JSON.parse(key);
      key = typeof parsed === "string" ? parsed : key.slice(1, -1);
    } catch {
      key = key.slice(1, -1);
    }
  }

  key = key
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\r\n/g, "\n")
    .trim();

  const match = key.match(/-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/);
  if (!match) throw new Error("APNS_PRIVATE_KEY must be PEM-encoded PKCS#8 with BEGIN/END PRIVATE KEY markers");

  const body = match[1].replace(/\s/g, "");
  if (!body || body.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(body)) {
    throw new Error("APNS_PRIVATE_KEY contains invalid base64 between the PKCS#8 PEM markers");
  }

  return `-----BEGIN PRIVATE KEY-----\n${body.match(/.{1,64}/g).join("\n")}\n-----END PRIVATE KEY-----`;
}

function assertConfiguration() {
  const missing = [
    ["SUPABASE_URL", supabaseUrl],
    ["SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey],
    ["PUSH_WEBHOOK_SECRET", webhookSecret],
    ["APNS_KEY_ID", apnsKeyId],
    ["APNS_TEAM_ID", apnsTeamId],
    ["APNS_PRIVATE_KEY", rawApnsPrivateKey],
  ].filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) throw new Error(`Missing Edge Function secrets: ${missing.join(", ")}`);
  if (!supabase) throw new Error("Supabase service client could not be initialized.");
}

async function providerToken() {
  const key = await importPKCS8(normalizeApnsPrivateKey(rawApnsPrivateKey), "ES256");
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: apnsKeyId!, typ: "JWT" })
    .setIssuer(apnsTeamId!)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendToApns(token: string, payload: Record<string, unknown>, jwt: string) {
  let lastResponse: Response | null = null;
  let lastBody = "";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`${apnsHost}/3/device/${encodeURIComponent(token)}`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          authorization: `bearer ${jwt}`,
          "apns-topic": apnsBundleId,
          "apns-push-type": "alert",
          "apns-priority": "10",
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      lastResponse = response;
      lastBody = await response.text();
      if (response.ok || ![429, 500, 502, 503, 504].includes(response.status) || attempt === 3) {
        return { status: response.status, body: lastBody, attempts: attempt };
      }
    } catch (error) {
      lastBody = error instanceof Error ? error.message : String(error);
      if (attempt === 3) return { status: 0, body: lastBody, attempts: attempt };
    } finally {
      clearTimeout(timeout);
    }
    await wait(250 * 2 ** (attempt - 1));
  }
  return { status: lastResponse?.status ?? 0, body: lastBody, attempts: 3 };
}

Deno.serve(async (request) => {
  try {
    assertConfiguration();
    if (request.headers.get("x-push-webhook-secret") !== webhookSecret) {
      return jsonResponse({ error: "Unauthorized webhook" }, 401);
    }
    if (request.method !== "POST") return jsonResponse({ error: "POST required" }, 405);

    const webhook = await request.json();
    const notification = webhook?.record;
    if (webhook?.type !== "INSERT" || webhook?.table !== "notifications" || !notification?.id || !notification?.user_id) {
      return jsonResponse({ ignored: true, reason: "Not a notification INSERT" });
    }

    const { data: tokens, error: tokenError } = await supabase!
      .from("push_tokens")
      .select("token,platform")
      .eq("user_id", notification.user_id);
    if (tokenError) throw tokenError;

    const { data: profile, error: profileError } = await supabase!
      .from("profiles")
      .select("seller_status,store_onboarding_status,buyer_notifications,seller_notifications")
      .eq("id", notification.user_id)
      .maybeSingle();
    if (profileError) throw profileError;

    const preferenceKey = preferenceKeyForType(notification.type);
    const preferences = profile?.store_onboarding_status || profile?.seller_status === "active"
      ? (profile?.seller_notifications ?? {})
      : (profile?.buyer_notifications ?? {});
    if (preferences[preferenceKey] === false) {
      console.info("[PushWorker] filtered by preference", { notificationId: notification.id, preferenceKey });
      return jsonResponse({ delivered: 0, filtered: true, preferenceKey });
    }

    const { count: unreadCount, error: unreadError } = await supabase!
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", notification.user_id)
      .eq("read", false);
    if (unreadError) throw unreadError;

    const jwt = await providerToken();
    const payload = {
      aps: {
        alert: { title: notification.title, body: notification.message },
        sound: "default",
        badge: unreadCount ?? 1,
      },
      notification_id: notification.id,
      type: notification.type,
      related_id: notification.related_id,
    };

    let delivered = 0;
    let retryableFailures = 0;
    for (const tokenRow of tokens ?? []) {
      if (tokenRow.platform !== "ios") continue;
      const result = await sendToApns(tokenRow.token, payload, jwt);
      const reason = result.body ? (() => { try { return JSON.parse(result.body)?.reason ?? result.body; } catch { return result.body; } })() : "";
      console.info("[PushWorker] APNs result", {
        notificationId: notification.id,
        userId: notification.user_id,
        status: result.status,
        reason,
        attempts: result.attempts,
      });
      if (result.status >= 200 && result.status < 300) delivered += 1;
      if (result.status === 0 || [429, 500, 502, 503, 504].includes(result.status)) retryableFailures += 1;
      if ([400, 410].includes(result.status)) {
        await supabase!.from("push_tokens").delete().eq("token", tokenRow.token);
      }
    }

    if (retryableFailures) throw new Error(`${retryableFailures} APNs deliveries remained retryable`);
    return jsonResponse({ notificationId: notification.id, delivered, tokenCount: tokens?.length ?? 0 });
  } catch (error) {
    console.error("[PushWorker] delivery failed", error);
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
