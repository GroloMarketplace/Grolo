export const VALIDATION_LIMITS = {
  username: 30,
  displayName: 80,
  bio: 500,
  location: 120,
  storeName: 80,
  storeDescription: 1000,
  socialHandle: 50,
  title: 120,
  description: 2000,
  listingLocation: 120,
  quantity: 1000000,
  deliveryRadius: 500,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+\d()\s.-]{7,20}$/;


export function normalizeUsername(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(String(value ?? "").trim());
}

export function normalizeWebsite(value) {
  const website = String(value ?? "").trim();
  if (!website) return "";
  const candidate = /^https?:\/\//i.test(website) ? website : `https://${website}`;
  try {
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) && url.hostname ? url.toString() : website;
  } catch {
    return website;
  }
}

export function isValidWebsite(value) {
  if (!String(value ?? "").trim()) return true;
  try {
    const url = new URL(normalizeWebsite(value));
    return ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname) && url.hostname.includes(".");
  } catch {
    return false;
  }
}

export function isValidPhone(value) {
  return !String(value ?? "").trim() || PHONE_PATTERN.test(String(value).trim());
}

export function validateBuyerProfile(form) {
  const username = normalizeUsername(form.username);
  if (!form.displayName?.trim() || form.displayName.trim().length > VALIDATION_LIMITS.displayName) return `Display name is required and must be ${VALIDATION_LIMITS.displayName} characters or fewer.`;
  if (!/^[a-z0-9_]{3,30}$/.test(username)) return "Username must be 3–30 characters using lowercase letters, numbers, or underscores.";
  if (!form.bio?.trim()) return "Tell your community a little about yourself in your bio.";
  if (form.bio.trim().length > VALIDATION_LIMITS.bio) return `Bio must be ${VALIDATION_LIMITS.bio} characters or fewer.`;
  if (form.location?.trim().length > VALIDATION_LIMITS.location) return `Location must be ${VALIDATION_LIMITS.location} characters or fewer.`;
  if (!isValidEmail(form.email)) return "Please enter a valid email address.";
  return null;
}

export function validateSellerProfile(form) {
  if (!form.name?.trim()) return "Store name is required.";
  if (form.name.trim().length > VALIDATION_LIMITS.storeName) return `Store name must be ${VALIDATION_LIMITS.storeName} characters or fewer.`;
  if (!form.description?.trim()) return "Store description is required.";
  if (form.description.trim().length > VALIDATION_LIMITS.storeDescription) return `Store description must be ${VALIDATION_LIMITS.storeDescription} characters or fewer.`;
  if (!form.location?.trim() || form.location.trim().length > VALIDATION_LIMITS.location) return "Enter a valid store location.";
  if (form.email?.trim() && !isValidEmail(form.email)) return "Enter a valid business email address or leave it blank.";
  if (!isValidWebsite(form.website)) return "Enter a valid website URL, such as www.example.com.";
  if (!isValidPhone(form.phone)) return "Enter a valid phone number or leave it blank.";
  if ([form.instagram, form.facebook, form.x].some((value) => String(value ?? "").trim().length > VALIDATION_LIMITS.socialHandle)) return `Social handles must be ${VALIDATION_LIMITS.socialHandle} characters or fewer.`;
  return null;
}

export function validateListing(form, isService = false) {
  if (!form.title?.trim() || form.title.trim().length > VALIDATION_LIMITS.title) return `Listing title is required and must be ${VALIDATION_LIMITS.title} characters or fewer.`;
  if (!form.description?.trim() || form.description.trim().length > VALIDATION_LIMITS.description) return `Description is required and must be ${VALIDATION_LIMITS.description} characters or fewer.`;
  const price = Number(form.price);
  if (!isService && (!Number.isFinite(price) || price <= 0)) return "Price must be greater than $0.00.";
  if (isService && !String(form.price ?? "").trim()) return "Add pricing details for this service.";
  if (!isService && (!Number.isInteger(Number(form.quantityAvailable)) || Number(form.quantityAvailable) < 0 || Number(form.quantityAvailable) > VALIDATION_LIMITS.quantity)) return `Quantity must be a whole number from 0 to ${VALIDATION_LIMITS.quantity.toLocaleString()}.`;
  const location = isService ? form.serviceArea : form.location;
  if (!location?.trim() || location.trim().length > VALIDATION_LIMITS.listingLocation) return "Enter a valid listing location.";
  if (form.availableForTrade && (!form.desiredTradeItems?.trim() || form.desiredTradeItems.trim().length > 500)) return "Describe what you are looking for in a trade (maximum 500 characters).";
  return null;
}

export function validateAddress(address) {
  if (!address?.fullName?.trim() || address.fullName.trim().length > 100) return "Enter your full name.";
  if (!address.streetAddress?.trim() || address.streetAddress.trim().length > 150) return "Enter a valid street address.";
  if (!address.city?.trim() || address.city.trim().length > 80) return "Enter a valid city.";
  if (!/^[A-Za-z]{2}$/.test(String(address.province ?? "").trim())) return "Province must be a two-letter code, such as AB.";
  if (!/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(String(address.postalCode ?? "").trim())) return "Enter a valid Canadian postal code.";
  if (address.unit?.trim().length > 30) return "Apartment or unit must be 30 characters or fewer.";
  if (address.notes?.trim().length > 300) return "Delivery notes must be 300 characters or fewer.";
  return null;
}

export function validateFulfillment(method, settings, address) {
  if (!["pickup", "delivery"].includes(method) || !settings?.fulfillmentMethods?.includes(method)) return "Choose an available fulfillment method.";
  if (method === "delivery" && Number(settings.deliveryRadius) <= 0) return "This store has not configured a delivery radius yet.";
  if (method === "delivery" && !address) return "Add a delivery address before choosing delivery.";
  return method === "delivery" ? validateAddress(address) : null;
}
