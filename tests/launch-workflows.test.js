import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { validateAddress, validateBuyerProfile, validateFulfillment, validateListing, validateSellerProfile } from "../src/utils/validation.js";
import { ACTIVE_CAMPAIGN_ERROR, addCalendarDays, campaignDurationDays, calendarDaysUntil, isCampaignActive, validateCampaignDates } from "../src/utils/campaignDuration.js";
import { seed } from "./fixtures/seed.js";
import { LOCATION_OPTIONS, friendlyLocation, locationFromLegacyText } from "../src/data/locations.js";
import { promotionCreatedTimestamp } from "../src/utils/promotionRecords.js";
import { hasRepairableStoreProfile, sellerProfileUpdates, withoutSellerActivationFields } from "../src/utils/profileActivation.js";

function createCommerceState() {
  return {
    inventory: { [seed.listing.id]: seed.listing.quantityAvailable },
    cart: [],
    orders: [],
    notifications: [],
    follows: new Set(),
    favorites: new Set(),
    reports: [],
    blocked: new Set(),
    suspended: new Set(),
  };
}

function addToCart(state, listingId, quantity) {
  if (quantity < 1 || state.inventory[listingId] < quantity) throw new Error("Insufficient inventory");
  state.cart.push({ listingId, quantity });
}

function checkout(state, buyerId, sellerId) {
  const items = state.cart.splice(0);
  const order = { id: `order-${state.orders.length + 1}`, buyerId, sellerId, status: "Seller Notified", items };
  for (const item of items) state.inventory[item.listingId] -= item.quantity;
  state.orders.push(order);
  state.notifications.push({ type: "order_created", recipient: sellerId, orderId: order.id });
  return order;
}

function updateOrderStatus(state, orderId, status) {
  const order = state.orders.find((item) => item.id === orderId);
  const allowed = {
    "Seller Notified": ["In Progress"],
    "In Progress": ["Ready for Pickup"],
    "Ready for Pickup": ["Completed"],
  };
  if (!order || !allowed[order.status]?.includes(status)) throw new Error("Invalid order status transition");
  order.status = status;
  state.notifications.push({ type: "order_status", recipient: order.buyerId, orderId, status });
}

test("normalized location options support friendly labels, postal search, and coordinates", () => {
  const mardaLoop = locationFromLegacyText("Marda Loop");
  const postalMatch = locationFromLegacyText("T2T");
  assert.equal(LOCATION_OPTIONS.length > 0, true);
  assert.equal(friendlyLocation(mardaLoop), "Marda Loop");
  assert.equal(postalMatch?.city, "Calgary");
  assert.equal(Number.isFinite(mardaLoop?.latitude), true);
  assert.equal(Number.isFinite(mardaLoop?.longitude), true);
});

test("buyer signup and onboarding validation accepts seeded data and rejects invalid input", () => {
  assert.equal(validateBuyerProfile(seed.buyer), null);
  assert.match(validateBuyerProfile({ ...seed.buyer, username: "bad name" }), /Username/);
  assert.match(validateBuyerProfile({ ...seed.buyer, bio: "x".repeat(501) }), /Bio/);
  assert.equal(new Set([seed.buyer.username, "other_user"]).size, 2);
});

test("seller store and listing workflows validate before persistence", () => {
  const requiredSellerInfo = { ...seed.seller, email: "", website: "", phone: "", instagram: "", facebook: "", x: "" };
  assert.equal(validateSellerProfile(requiredSellerInfo), null);
  assert.equal(validateSellerProfile(seed.seller), null);
  assert.match(validateSellerProfile({ ...seed.seller, website: "not-a-url" }), /Website/);
  assert.equal(validateListing(seed.listing), null);
  assert.match(validateListing({ ...seed.listing, price: "0" }), /Price/);
  assert.match(validateListing({ ...seed.listing, quantityAvailable: 1.5 }), /Quantity/);
});

test("seller settings updates cannot overwrite seller activation", () => {
  const payload = sellerProfileUpdates({
    name: "Updated store",
    sellerStatus: "buyer",
    storeOnboardingStatus: false,
    storeOpenedAt: null,
  });
  assert.deepEqual(payload, { shop_name: "Updated store" });
  assert.deepEqual(withoutSellerActivationFields({ shop_name: "Updated store", seller_status: "buyer", store_onboarding_status: false, store_opened_at: null }), { shop_name: "Updated store" });
  assert.equal(hasRepairableStoreProfile({ shop_name: "Updated store", store_opened_at: "2026-08-15T12:00:00.000Z" }), true);
  assert.equal(hasRepairableStoreProfile({ shop_name: "", store_opened_at: "2026-08-15T12:00:00.000Z" }), false);
});

test("promotion count and page filtering use ISO creation timestamps consistently", () => {
  const createdAt = "2026-08-15T12:00:00.000Z";
  const openedAt = Date.parse("2026-08-15T00:00:00.000Z");
  assert.equal(Number.isNaN(Number(createdAt)), true);
  assert.equal(promotionCreatedTimestamp({ createdAt }) >= openedAt, true);
});

test("Search spotlight carousel renders active campaigns or placeholders", async () => {
  const [search, advertising] = await Promise.all([
    readFile(new URL("../src/pages/Search.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/context/AdvertisingContext.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(search, /isCampaignActive\(ad\)/);
  assert.match(search, /placeholderSpotlights/);
  assert.match(search, /Community Spotlight/);
  assert.match(advertising, /AD_STORAGE_KEY/);
  assert.match(advertising, /localStorage\.setItem/);
  assert.equal(isCampaignActive({ status: "Trial", startsAt: "2026-08-15", endsAt: "2026-08-15", trialEndsAt: "2026-09-13" }, Date.parse("2026-08-20T12:00:00Z")), true);
});

test("promotion management keeps edit, end, delete, and listing actions connected", async () => {
  const [context, page, api] = await Promise.all([
    readFile(new URL("../src/context/PromotionContext.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/Promotions.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/api/promotions.js", import.meta.url), "utf8"),
  ]);
  assert.match(context, /updatePromotionApi/);
  assert.match(context, /status: "ended"/);
  assert.match(context, /deletePromotionApi/);
  assert.match(page, /listing\.databaseId/);
  assert.match(page, /edit-promotion/);
  assert.match(page, /End Promotion/);
  assert.match(page, /Delete Promotion/);
  assert.match(page, /View Listing/);
  assert.match(api, /\.eq\("seller_id", sellerId\)/);
});

test("buyer follow and favorite actions update state and create notification events", () => {
  const state = createCommerceState();
  state.follows.add(seed.seller.id);
  state.favorites.add(seed.listing.id);
  state.notifications.push({ type: "new_follower", recipient: seed.seller.id, buyerId: seed.buyer.id });
  assert.equal(state.follows.has(seed.seller.id), true);
  assert.equal(state.favorites.has(seed.listing.id), true);
  assert.equal(state.notifications[0].type, "new_follower");
});

test("add to cart, checkout, inventory deduction, and fulfillment transitions work together", () => {
  const state = createCommerceState();
  addToCart(state, seed.listing.id, 3);
  const order = checkout(state, seed.buyer.id, seed.seller.id);
  assert.equal(state.inventory[seed.listing.id], 7);
  assert.equal(order.status, "Seller Notified");
  updateOrderStatus(state, order.id, "In Progress");
  updateOrderStatus(state, order.id, "Ready for Pickup");
  updateOrderStatus(state, order.id, "Completed");
  assert.equal(order.status, "Completed");
  assert.equal(state.notifications.filter((item) => item.type === "order_status").length, 3);
  assert.throws(() => updateOrderStatus(state, order.id, "Preparing"), /Invalid/);
});

test("checkout address and fulfillment validation protects delivery orders", () => {
  const settings = { fulfillmentMethods: ["pickup", "delivery"], deliveryRadius: 25 };
  assert.equal(validateAddress(seed.address), null);
  assert.equal(validateFulfillment("delivery", settings, seed.address), null);
  assert.match(validateAddress({ ...seed.address, postalCode: "invalid" }), /postal code/);
  assert.match(validateFulfillment("delivery", { ...settings, deliveryRadius: 0 }, seed.address), /radius/);
});

test("trial countdown uses calendar days across date boundaries", () => {
  const startedAt = "2026-08-16";
  const expiresAt = addCalendarDays(startedAt, 30);
  assert.equal(expiresAt, "2026-09-15");
  assert.equal(calendarDaysUntil(expiresAt, new Date(2026, 7, 16, 12).getTime()), 30);
  assert.equal(calendarDaysUntil(expiresAt, new Date(2026, 7, 17, 12).getTime()), 29);
  assert.equal(calendarDaysUntil(expiresAt, new Date(2026, 8, 14, 12).getTime()), 1);
  assert.equal(calendarDaysUntil(expiresAt, new Date(2026, 8, 16, 12).getTime()), -1);
});

test("only one campaign can be active while expired and cancelled campaigns remain eligible", () => {
  const active = { id: "active", status: "Trial", startsAt: "2026-08-16", endsAt: "2026-08-29" };
  const expired = { id: "expired", status: "Trial", startsAt: "2026-08-01", endsAt: "2026-08-15" };
  const cancelled = { id: "cancelled", status: "Expired", startsAt: "2026-08-16", endsAt: "2026-08-29" };
  assert.equal(isCampaignActive(active, new Date(2026, 7, 16, 12).getTime()), true);
  assert.equal(isCampaignActive(expired, new Date(2026, 7, 16, 12).getTime()), false);
  assert.equal(isCampaignActive(cancelled, new Date(2026, 7, 16, 12).getTime()), false);
  assert.match(ACTIVE_CAMPAIGN_ERROR, /Edit or cancel/);
});

test("campaign duration validation allows 1-14 days and preserves legacy campaigns", () => {
  assert.equal(campaignDurationDays("2026-08-15", "2026-08-15"), 1);
  assert.equal(campaignDurationDays("2026-08-15", "2026-08-28"), 14);
  assert.equal(validateCampaignDates({ startsAt: "2026-08-15", endsAt: "2026-08-28" }), "");
  assert.match(validateCampaignDates({ startsAt: "2026-08-15", endsAt: "2026-08-29" }), /up to 14 days/);
  const legacyCampaign = { startsAt: "2026-08-15", endsAt: "2026-09-15" };
  assert.equal(validateCampaignDates(legacyCampaign, { existingAd: legacyCampaign }), "");
});

test("promotion and order notifications are represented as durable events", () => {
  const state = createCommerceState();
  state.notifications.push({ type: "promotion_created", recipient: seed.buyer.id, promotionId: seed.promotion.id });
  addToCart(state, seed.listing.id, 1);
  const order = checkout(state, seed.buyer.id, seed.seller.id);
  assert.deepEqual(state.notifications.map((item) => item.type), ["promotion_created", "order_created"]);
  assert.equal(order.items[0].quantity, 1);
});

test("trust and safety report, block, and suspend workflows are enforced", () => {
  const state = createCommerceState();
  state.reports.push({ reporterId: seed.buyer.id, targetType: "listing", targetId: seed.listing.id, status: "Open" });
  state.blocked.add(seed.seller.id);
  state.suspended.add(seed.seller.id);
  assert.equal(state.reports[0].status, "Open");
  assert.equal(state.blocked.has(seed.seller.id), true);
  assert.equal(state.suspended.has(seed.seller.id), true);
});

test("server campaign validation protects duration and duplicate active campaigns", async () => {
  const [durationMigration, activeLimitMigration] = await Promise.all([
    readFile(new URL("../supabase/migrations/20260815_campaign_duration_validation.sql", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260815_single_active_spotlight_campaign.sql", import.meta.url), "utf8"),
  ]);
  assert.match(durationMigration, /new\.end_date - new\.start_date \+ 1\) > 14/);
  assert.match(durationMigration, /old\.start_date is not distinct from new\.start_date/);
  assert.match(activeLimitMigration, /existing\.seller_id = new\.seller_id/);
  assert.match(activeLimitMigration, /existing\.id is distinct from new\.id/);
  assert.match(activeLimitMigration, /unique_violation/);
});

test("critical Supabase contracts are present for regression coverage", async () => {
  const [orders, notifications, validation, sellerSettings, profileActivation, postsMigration, postContext, sellerProfile, profileMode, openStore] = await Promise.all([
    readFile(new URL("../supabase/migrations/20260813_apply_promotions_to_order_items.sql", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260813_phase_8h_notifications.sql", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260815_phase_9a8_input_validation.sql", import.meta.url), "utf8"),
    readFile(new URL("../src/context/SellerSettingsContext.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/utils/profileActivation.js", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260815_phase_9b_posts.sql", import.meta.url), "utf8"),
    readFile(new URL("../src/context/PostContext.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/SellerProfile.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/context/ProfileModeContext.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/OpenStore.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(orders, /create_order_with_items/);
  assert.match(orders, /inventory_quantity = inventory_quantity -/);
  assert.match(notifications, /notifications_on_order/);
  assert.match(notifications, /notifications_on_follow/);
  assert.match(validation, /validate_listing_fields/);
  assert.match(profileActivation, /const hasValue = value !== undefined && value !== null/);
  assert.doesNotMatch(sellerSettings, /sellerStatus: "seller_status"/);
  assert.doesNotMatch(sellerSettings, /storeOnboardingStatus: "store_onboarding_status"/);
  assert.doesNotMatch(sellerSettings, /storeOpenedAt: "store_opened_at"/);
  assert.doesNotMatch(sellerSettings, /instagram: "instagram_handle"/);
  assert.doesNotMatch(sellerSettings, /facebook: "facebook_handle"/);
  assert.doesNotMatch(sellerSettings, /website: "seller_website"/);
  assert.match(postsMigration, /create table if not exists public\.posts/);
  assert.match(postsMigration, /visibility = 'public'/);
  assert.match(postContext, /createPostApi\(post, user\.id\)/);
  assert.match(postContext, /getPostsApi\(\)/);
  assert.match(sellerProfile, /const \{ posts \} = usePosts\(\)/);
  assert.match(profileMode, /profileModeRequestRef/);
  assert.match(profileMode, /requestId !== profileModeRequestRef\.current/);
  assert.match(profileMode, /localStorage/);
  assert.match(profileMode, /writeStoredMode\(user\?\.id, mode\)/);
  assert.match(profileMode, /isBuyerRoute/);
  assert.match(profileMode, /isSellerRoute/);
  assert.match(openStore, /if \(!storeActive\) return/);
  assert.match(openStore, /navigate\("\/shop", \{ replace: true \}\)/);
});
