export function readNavigationState(key, fallback = {}) {
  try {
    return { ...fallback, ...(JSON.parse(sessionStorage.getItem(`grolo-navigation-${key}`)) ?? {}) };
  } catch {
    return fallback;
  }
}

export function writeNavigationState(key, state) {
  sessionStorage.setItem(`grolo-navigation-${key}`, JSON.stringify(state));
}
