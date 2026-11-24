const DEFAULT_APP_URL = "https://grolomarketplace.ca";
const LOCAL_ORIGIN_PATTERN = /^[a-z][a-z0-9+.-]*:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

function normalizeOrigin(value) {
  const trimmed = typeof value === "string" ? value.trim().replace(/\/+$/, "") : "";
  return trimmed && !LOCAL_ORIGIN_PATTERN.test(trimmed) ? trimmed : null;
}

export const APP_URL = normalizeOrigin(import.meta.env.VITE_APP_URL) ?? DEFAULT_APP_URL;

export function absoluteAppUrl(path = "/") {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${APP_URL}${suffix}`;
}
