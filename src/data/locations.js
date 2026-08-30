export const LOCATION_OPTIONS = [
  { id: "marda-loop", neighborhood: "Marda Loop", city: "Calgary", province: "Alberta", country: "Canada", postalCode: "T2T", latitude: 51.0326, longitude: -114.1008 },
  { id: "beltline", neighborhood: "Beltline", city: "Calgary", province: "Alberta", country: "Canada", postalCode: "T2R", latitude: 51.0398, longitude: -114.0738 },
  { id: "kensington", neighborhood: "Kensington", city: "Calgary", province: "Alberta", country: "Canada", postalCode: "T2N", latitude: 51.0522, longitude: -114.0867 },
  { id: "mission", neighborhood: "Mission", city: "Calgary", province: "Alberta", country: "Canada", postalCode: "T2S", latitude: 51.0316, longitude: -114.0635 },
  { id: "inglewood", neighborhood: "Inglewood", city: "Calgary", province: "Alberta", country: "Canada", postalCode: "T2G", latitude: 51.0391, longitude: -114.0391 },
  { id: "royal-oak", neighborhood: "Royal Oak", city: "Calgary", province: "Alberta", country: "Canada", postalCode: "T3G", latitude: 51.1378, longitude: -114.2155 },
  { id: "calgary", scope: "city", city: "Calgary", province: "Alberta", country: "Canada", postalCode: "T2", latitude: 51.0447, longitude: -114.0719 },
  { id: "airdrie", scope: "city", city: "Airdrie", province: "Alberta", country: "Canada", postalCode: "T4B", latitude: 51.2917, longitude: -114.0144 },
  { id: "cochrane", scope: "city", city: "Cochrane", province: "Alberta", country: "Canada", postalCode: "T4C", latitude: 51.1899, longitude: -114.4676 },
  { id: "okotoks", scope: "city", city: "Okotoks", province: "Alberta", country: "Canada", postalCode: "T1S", latitude: 50.7256, longitude: -113.9747 },
  { id: "chestermere", city: "Chestermere", province: "Alberta", country: "Canada", postalCode: "T1X", latitude: 51.0388, longitude: -113.8219 },
];

export function friendlyLocation(location) {
  return location?.neighborhood || location?.city || location?.location || "";
}

export function locationSummary(location) {
  const primary = friendlyLocation(location);
  const secondary = [location?.city && location.city !== primary ? location.city : "", location?.province, location?.country].filter(Boolean).join(", ");
  return secondary ? `${primary} · ${secondary}` : primary;
}

export function locationFromLegacyText(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return LOCATION_OPTIONS.find((option) => [option.neighborhood, option.city, option.postalCode].filter(Boolean).some((part) => normalized.includes(part.toLowerCase()))) ?? null;
}
