const CALGARY_CENTER = { lat: 51.0447, lon: -114.0719 };

const KNOWN_LOCATIONS = {
  calgary: CALGARY_CENTER,
  "marda loop": { lat: 51.0326, lon: -114.1008 },
  kensington: { lat: 51.0522, lon: -114.0867 },
  beltline: { lat: 51.0398, lon: -114.0738 },
  mission: { lat: 51.0316, lon: -114.0635 },
  inglewood: { lat: 51.0391, lon: -114.0391 },
  "royal oak": { lat: 51.1378, lon: -114.2155 },
  balzak: { lat: 51.2064, lon: -113.9776 },
  airdrie: { lat: 51.2917, lon: -114.0144 },
  cochrane: { lat: 51.1899, lon: -114.4676 },
  okotoks: { lat: 50.7256, lon: -113.9747 },
  chestermere: { lat: 51.0388, lon: -113.8219 },
};

export const LOCATION_RADIUS_OPTIONS = [5, 10, 25, 50, 100, 250, Infinity];

function coordinatesFor(value, fallback = null) {
  const normalized = String(value ?? "").toLowerCase();
  const match = Object.keys(KNOWN_LOCATIONS).find((name) => normalized.includes(name));
  return match ? KNOWN_LOCATIONS[match] : fallback;
}

function distanceInKm(first, second) {
  if (!first || !second || !Number.isFinite(first.lat) || !Number.isFinite(first.lon) || !Number.isFinite(second.lat) || !Number.isFinite(second.lon)) return null;
  const earthRadius = 6371;
  const latDelta = ((second.lat - first.lat) * Math.PI) / 180;
  const lonDelta = ((second.lon - first.lon) * Math.PI) / 180;
  const a = Math.sin(latDelta / 2) ** 2
    + Math.cos((first.lat * Math.PI) / 180) * Math.cos((second.lat * Math.PI) / 180) * Math.sin(lonDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function distanceInKmBetween(content, userLocation) {
  if (!userLocation) return null;
  const hasCoordinates = typeof userLocation === "object"
    && Number.isFinite(Number(userLocation.latitude))
    && Number.isFinite(Number(userLocation.longitude));
  const userCoordinates = hasCoordinates
    ? { lat: Number(userLocation.latitude), lon: Number(userLocation.longitude) }
    : coordinatesFor(userLocation);
  const contentCoordinates = content?.latitude && content?.longitude
    ? { lat: Number(content.latitude), lon: Number(content.longitude) }
    : coordinatesFor(content?.location ?? content?.address);
  if (!userCoordinates || !contentCoordinates) return null;
  return distanceInKm(userCoordinates, contentCoordinates);
}

export function distanceInfo(content, userLocation) {
  const distance = distanceInKmBetween(content, userLocation);
  if (distance === null) {
    const fallbackLocation = content?.location ?? content?.address;
    return fallbackLocation
      ? { label: fallbackLocation, hasDistance: false }
      : { label: "Location unavailable", hasDistance: false };
  }
  const label = distance < 1 ? "Less than 1 km away" : `${distance < 100 ? distance.toFixed(1) : Math.round(distance)} km away`;
  return { label, hasDistance: true };
}

export function distanceLabel(content, userLocation) {
  return distanceInfo(content, userLocation).label;
}

export function isWithinDiscoveryRadius(content, userLocation, radius) {
  if (radius === Infinity || Number(radius) === Infinity || !userLocation) return true;
  const hasCoordinates = typeof userLocation === "object"
    && Number.isFinite(Number(userLocation.latitude))
    && Number.isFinite(Number(userLocation.longitude));
  const userCoordinates = hasCoordinates
    ? { lat: Number(userLocation.latitude), lon: Number(userLocation.longitude) }
    : coordinatesFor(userLocation, CALGARY_CENTER);
  const contentCoordinates = content?.latitude && content?.longitude
    ? { lat: Number(content.latitude), lon: Number(content.longitude) }
    : coordinatesFor(content?.location ?? content?.address);
  if (!contentCoordinates) return true;
  return distanceInKm(userCoordinates, contentCoordinates) <= Number(radius);
}

export function discoveryRadiusLabel(radius) {
  return radius === Infinity || Number(radius) === Infinity ? "Anywhere" : `${radius} km`;
}

// Sorts items nearest-first. Distance for each item is computed exactly once
// (not recomputed on every comparison) to keep sorting efficient. Items with
// unknown distance are never dropped — they simply sort after known ones,
// falling back to `tiebreaker` (or original order) when distances match.
export function sortByDistance(items, userLocation, getContent = (item) => item, tiebreaker) {
  return items
    .map((item, index) => ({ item, index, distance: distanceInKmBetween(getContent(item) ?? {}, userLocation) }))
    .sort((a, b) => {
      if (a.distance === b.distance) return tiebreaker ? tiebreaker(a.item, b.item) : a.index - b.index;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    })
    .map(({ item }) => item);
}

// Resolves the value to pass as `userLocation` to the functions above:
// precise coordinates when available, otherwise the saved/onboarding
// location text, otherwise an empty string (treated as "unknown").
export function resolveUserLocation(settings = {}) {
  if (Number.isFinite(Number(settings.latitude)) && Number.isFinite(Number(settings.longitude))) return settings;
  return settings.location?.trim() || settings.city?.trim() || "";
}

export function hasKnownLocation(settings = {}) {
  return Boolean(resolveUserLocation(settings));
}
