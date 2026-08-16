export function readLocalDraft(key) {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function saveLocalDraft(key, draft) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // Draft persistence is best effort; the form remains usable in memory.
  }
}

export function clearLocalDraft(key) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    return;
  }
}

export function hasDraftContent(values) {
  if (Array.isArray(values)) return values.length > 0;
  if (values && typeof values === "object") return Object.values(values).some(hasDraftContent);
  if (typeof values === "boolean") return values;
  return values !== null && values !== undefined && String(values).trim() !== "";
}
