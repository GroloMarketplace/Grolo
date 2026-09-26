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

const REGION_ABBREVIATIONS = {
  Alberta: "AB", "British Columbia": "BC", Manitoba: "MB", "New Brunswick": "NB", "Newfoundland and Labrador": "NL", "Northwest Territories": "NT", "Nova Scotia": "NS", Nunavut: "NU", Ontario: "ON", "Prince Edward Island": "PE", Quebec: "QC", Saskatchewan: "SK", Yukon: "YT",
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA", Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD", Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS", Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT", Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY",
};

function normalizedCountry(location) {
  return String(location?.countryCode ?? location?.country_code ?? location?.country ?? "").trim().toLowerCase();
}

function regionLabel(region, country) {
  if (!region) return "";
  const normalized = String(country).toLowerCase();
  return normalized === "canada" || normalized === "ca" || normalized === "united states" || normalized === "united states of america" || normalized === "usa" || normalized === "us"
    ? REGION_ABBREVIATIONS[region] || region
    : region;
}

export function friendlyLocation(location) {
  return location?.streetAddress || location?.addressLine || location?.neighborhood || location?.city || location?.location || "";
}

function cleanLocationText(value) {
  return String(value ?? "").trim().replace(/\s*\([^)]*\)\s*$/, "");
}

export function formatLocation(location) {
  if (!location) return "";
  if (typeof location === "string") return cleanLocationText(location);
  const city = String(location.city ?? "").trim();
  const country = String(location.country ?? "").trim();
  const region = regionLabel(String(location.province ?? location.state ?? "").trim(), normalizedCountry(location) || country);
  const rawLocation = cleanLocationText(location.location);
  const street = cleanLocationText(location.streetAddress ?? location.addressLine ?? "");
  const unit = cleanLocationText(location.unit ?? location.suite ?? "");
  const streetLine = [street, unit].filter(Boolean).join(", ");
  const hasFullRawAddress = rawLocation && /\d+\s+\S/.test(rawLocation) && rawLocation.toLowerCase() !== city.toLowerCase();
  if (streetLine) return [streetLine, city, [region, location.postalCode].filter(Boolean).join(" "), country].filter(Boolean).join(", ");
  if (hasFullRawAddress) return rawLocation;
  if (city && region) return `${city}, ${region}`;
  if (city && country) return `${city}, ${country}`;
  return city || rawLocation || cleanLocationText(location.neighborhood);
}

export function locationSummary(location) {
  return formatLocation(location);
}

export function locationFromLegacyText(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return LOCATION_OPTIONS.find((option) => [option.neighborhood, option.city, option.postalCode].filter(Boolean).some((part) => normalized.includes(part.toLowerCase()))) ?? null;
}
