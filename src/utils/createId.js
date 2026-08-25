export function createId(prefix = "id") {
  const randomUuid = globalThis.crypto?.randomUUID;
  if (typeof randomUuid === "function") return randomUuid.call(globalThis.crypto);
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
