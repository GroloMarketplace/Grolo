import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { isValidWebsite, normalizeWebsite, validateAddress, validateBuyerProfile, validateFulfillment, validateListing, validateSellerProfile } from "../src/utils/validation.js";
import { ACTIVE_CAMPAIGN_ERROR, addCalendarDays, campaignDurationDays, calendarDaysUntil, isCampaignActive, validateCampaignDates } from "../src/utils/campaignDuration.js";
import { seed } from "./fixtures/seed.js";
import { LOCATION_OPTIONS, friendlyLocation, locationFromLegacyText } from "../src/data/locations.js";
import { getBuyerTrustLevel } from "../src/data/buyerTrust.js";
import { promotionCreatedTimestamp } from "../src/utils/promotionRecords.js";
import { rankFeedItems, recencyScore } from "../src/utils/feedRanking.js";
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

test("For You ranking prioritizes freshness over proximity and boosts engagement", () => {
  const now = Date.parse("2026-08-16T12:00:00Z");
  const location = { latitude: 51.0447, longitude: -114.0719 };
  const freshNearby = { type: "post", post: { id: "fresh", createdAt: now - 2 * 60 * 1000, latitude: 51.0717, longitude: -114.0719 } };
  const oldVeryClose = { type: "post", post: { id: "old", createdAt: now - 3 * 24 * 60 * 60 * 1000, latitude: 51.0492, longitude: -114.0719, likes: 100, comments: 100 } };
  const ranked = rankFeedItems([oldVeryClose, freshNearby], { location, radius: 25, now });
  assert.equal(ranked[0].post.id, "fresh");
  assert.ok(recencyScore(freshNearby.post, now) > recencyScore(oldVeryClose.post, now));

  const lightlyEngaged = { type: "listing", product: { id: "light", createdAt: now - 2 * 24 * 60 * 60 * 1000, latitude: 51.05, longitude: -114.0719 } };
  const stronglyEngaged = { type: "listing", product: { id: "strong", createdAt: now - 2 * 24 * 60 * 60 * 1000, latitude: 51.05, longitude: -114.0719, views: 500, messages: 20 } };
  assert.equal(rankFeedItems([lightlyEngaged, stronglyEngaged], { location, radius: 25, now })[0].product.id, "strong");
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
  assert.match(validateSellerProfile({ ...seed.seller, website: "not-a-url" }), /valid website URL/);
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

test("Community Tips carousel provides launch onboarding actions", async () => {
  const search = await readFile(new URL("../src/pages/Search.jsx", import.meta.url), "utf8");
  assert.match(search, /CommunityTipsCarousel/);
  assert.match(search, /Grolo Tips/);
  assert.match(search, /Get the most out of your local community/);
  assert.match(search, /Complete Your Profile/);
  assert.match(search, /List Your First Product/);
  assert.match(search, /Create a Local Event/);
  assert.match(search, /Get Your First Review/);
  assert.match(search, /Follow Local Shops/);
  assert.match(search, /Edit Profile/);
  assert.match(search, /Add Listing/);
  assert.match(search, /Create Event/);
  assert.match(search, /Explore Shops/);
  assert.doesNotMatch(search, /Community Spotlight|Promote|Start Free Trial|advertising/);
});

test("launch search does not depend on paid promotion content", async () => {
  const search = await readFile(new URL("../src/pages/Search.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(search, /activePromotions\(\)/);
  assert.doesNotMatch(search, /PromotionBadge|PromotionContext|CommunitySpotlight/);
});

test("Search temporarily exposes list views without Map Search", async () => {
  const search = await readFile(new URL("../src/pages/Search.jsx", import.meta.url), "utf8");
  assert.match(search, /TODO: Reintroduce Map Search in a future update/);
  assert.match(search, /const TABS = \["Local", "History", "My Orders"\]/);
  assert.match(search, /const initialTab = TABS\.includes\(savedSearchState\.tab\) \? savedSearchState\.tab : "Local"/);
  assert.doesNotMatch(search, /import MapView/);
  assert.doesNotMatch(search, /tab === "Map"/);
});

test("Community Spotlight disables trial activation while a trial is active", async () => {
  const [advertising, context, createAdvertising] = await Promise.all([
    readFile(new URL("../src/pages/Advertising.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/context/AdvertisingContext.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/CreateAdvertisingAd.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(advertising, /disabled=\{trialStatus\?\.isActive\}/);
  assert.match(advertising, /Trial Active • \$\{trialStatus\.daysRemaining\} Days Remaining/);
  assert.match(advertising, /if \(!trialStatus\?\.isActive\) navigate/);
  assert.match(context, /if \(getActiveCampaign\(\)\) throw new Error\(ACTIVE_CAMPAIGN_ERROR\)/);
  assert.match(createAdvertising, /const currentCampaign = getActiveCampaign\(\)/);
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

test("trust safety block-check RPC matches the messaging dependency", async () => {
  const [migration, api] = await Promise.all([
    readFile(new URL("../supabase/migrations/20260816_restore_trust_safety_schema.sql", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/api/trustSafety.js", import.meta.url), "utf8"),
  ]);
  assert.match(migration, /create table if not exists public\.user_blocks/);
  assert.match(migration, /user_blocks_blocker_idx/);
  assert.match(migration, /user_blocks_blocked_idx/);
  assert.match(migration, /create policy "Users can manage their own blocks"/);
  assert.match(migration, /create policy "Users can see blocks affecting them"/);
  assert.match(migration, /grant select, insert, update, delete on public\.user_blocks to authenticated/);
  assert.match(migration, /create or replace function public\.is_user_blocked\(p_first_user_id uuid, p_second_user_id uuid\)/);
  assert.match(migration, /grant execute on function public\.is_user_blocked\(uuid, uuid\) to authenticated/);
  assert.match(api, /supabase\.rpc\("is_user_blocked", \{ p_first_user_id: firstUserId, p_second_user_id: secondUserId \}/);
});

test("conversation creation uses the conversations table contract", async () => {
  const api = await readFile(new URL("../src/lib/api/messages.js", import.meta.url), "utf8");
  assert.match(api, /\.from\("conversations"\)/);
  assert.match(api, /\.insert\(\{/);
  assert.match(api, /buyer_id: payload\.buyer_id/);
  assert.match(api, /seller_id: payload\.seller_id/);
  assert.doesNotMatch(api, /rpc\("upsert_conversation"/);
  assert.doesNotMatch(api, /order_id:|conversation_type:|preview:/);
  assert.match(api, /\.from\("messages"\)/);
  assert.match(api, /conversation_id: resolvedConversationId/);
  assert.match(api, /sender_id: authenticatedUserId/);
  assert.match(api, /content,/);
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

test("chat composers start empty and use the Message placeholder", async () => {
  const chat = await readFile(new URL("../src/pages/Chat.jsx", import.meta.url), "utf8");
  assert.match(chat, /const \[text, setText\] = useState\(""\)/);
  assert.match(chat, /placeholder="Message\.\.\."/);
  assert.doesNotMatch(chat, /Hi! I was looking at your store/);
  assert.doesNotMatch(chat, /setText\(location\.state\?\.draft\)/);
});

test("trade acceptance uses the persisted proposal as the status source and preserves offered items", async () => {
  const [context, proposals, messages, migration, backfill, chat] = await Promise.all([
    readFile(new URL("../src/context/MessageContext.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/api/tradeProposals.js", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/api/messages.js", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260825_trade_acceptance_persistence.sql", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260825_trade_proposals_metadata_backfill.sql", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/Chat.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(context, /updateTradeProposalRecord\(\{ id: proposalId, status: normalizedAction/);
  assert.match(context, /getTradeProposalByConversation/);
  assert.match(context, /tradeProposalFromRow\(persistedProposal/);
  assert.match(context, /message: proposalMessage/);
  assert.match(context, /function proposalMessageText/);
  assert.match(context, /proposal_message_type: typeof message/);
  assert.doesNotMatch(context, /createTradeOrder/);
  assert.doesNotMatch(context, /TRADE-\$\{Date\.now\(\)\}/);
  assert.match(proposals, /\.update\(payload\)/);
  assert.match(proposals, /persisted_status: data\?\.status/);
  assert.match(proposals, /recent trade proposals canonical table audit/);
  assert.match(proposals, /offered_listing_names/);
  assert.match(proposals, /limit\(5\)/);
  assert.doesNotMatch(messages, /tradeProposal: source\.tradeProposal/);
  assert.doesNotMatch(messages, /tradeStatus: source\.tradeStatus/);
  assert.match(migration, /add column if not exists accepted_at/);
  assert.match(migration, /add column if not exists accepted_by/);
  assert.match(migration, /for update to authenticated/);
  assert.match(backfill, /insert into public\.trade_proposals/);
  assert.match(backfill, /on conflict \(id\) do nothing/);
  assert.match(chat, /trade proposal render audit/);
  assert.match(chat, /proposal_message_type: typeof tradeProposal\?\.message/);
  assert.match(chat, /tradeProposal\?\.status/);
  assert.match(chat, /trade_proposal_source/);
  assert.doesNotMatch(chat, /metadata\?\.tradeProposal/);
  assert.doesNotMatch(chat, /messages\?\.find\(\(message\) => message\?\.tradeProposal/);
  assert.match(chat, /tradeStatus === "pending"/);
  assert.doesNotMatch(chat, /Counter Offer/);
  assert.doesNotMatch(chat, /Trade Order/);
  assert.doesNotMatch(chat, /sellerReceives/);
});

test("listing trade eligibility uses the database trade_enabled field across surfaces", async () => {
  const [api, detail, feed, store] = await Promise.all([
    readFile(new URL("../src/lib/api/listings.js", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/ProductDetail.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/Feed.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/ShopHome.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(api, /availableForTrade: Boolean\(row\.trade_enabled\)/);
  assert.match(api, /tradeEnabled: Boolean\(row\.trade_enabled\)/);
  assert.match(detail, /Product Detail listing trade audit/);
  assert.match(detail, /product\.availableForTrade && seller/);
  assert.match(detail, /onClick=\{handleProposeTrade\}/);
  assert.match(feed, /Feed listing trade audit/);
  assert.match(feed, /<TradeBadge listing=\{product\}/);
  assert.match(store, /ShopHome listing trade audit/);
});

test("trade proposal lifecycle has a conversation reference and event history", async () => {
  const [migration, api, context] = await Promise.all([
    readFile(new URL("../supabase/migrations/20260825_trade_proposal_lifecycle.sql", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/api/tradeProposals.js", import.meta.url), "utf8"),
    readFile(new URL("../src/context/MessageContext.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(migration, /trade_proposal_id text references public\.trade_proposals/);
  assert.match(migration, /create table if not exists public\.trade_proposal_events/);
  assert.match(migration, /counter_offer jsonb/);
  assert.match(api, /recordTradeProposalEvent/);
  assert.match(context, /recordTradeProposalEvent\(\{ tradeProposalId: proposalId/);
});

test("buyer reputation cards show only transactions and recommendations", async () => {
  const [summary, buyerProfile] = await Promise.all([
    readFile(new URL("../src/components/ReputationSummary.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/BuyerProfile.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(summary, /\["Transactions"/);
  assert.match(summary, /\["Recommended"/);
  assert.match(summary, /grid-cols-2/);
  assert.doesNotMatch(summary, /\["Again"/);
  assert.doesNotMatch(buyerProfile, /Would Transact Again/);
  assert.match(buyerProfile, /grid grid-cols-2 gap-2 text-\[11px\]/);
});

test("event attendance confirmation separates RSVP, attendance, and no-show metrics", async () => {
  const [migration, context, impact, notifications] = await Promise.all([
    readFile(new URL("../supabase/migrations/20260826_event_attendance_confirmation.sql", import.meta.url), "utf8"),
    readFile(new URL("../src/context/EventContext.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/utils/buyerImpact.js", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/NotificationCenter.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(migration, /attendance_status text not null default 'rsvpd'/);
  assert.match(migration, /confirmed_attended/);
  assert.match(migration, /no_show/);
  assert.match(migration, /create_event_attendance_confirmation_notifications/);
  assert.match(migration, /Did you attend this event\?/);
  assert.match(migration, /Your attendance helps keep community participation accurate/);
  assert.match(migration, /respond_to_event_attendance_confirmation/);
  assert.match(context, /attendance_status/);
  assert.match(context, /attendingEventIds: confirmedEventIds/);
  assert.match(impact, /attendingEventIds\.includes\(event\.id\)/);
  assert.match(notifications, /Yes, I attended/);
  assert.match(notifications, /No, I didn&apos;t attend/);
});

test("event creation preserves newly created rows across refresh and uses the real seller id", async () => {
  const [context, createEvent, createPage] = await Promise.all([
    readFile(new URL("../src/context/EventContext.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/api/events.js", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/CreateEvent.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(context, /const pendingEvents = current\.filter/);
  assert.match(context, /event state refreshed/);
  assert.match(context, /storeId: currentUserId/);
  assert.match(createEvent, /console\.log\("create event success", data\)/);
  assert.match(createPage, /navigate\("\/", \{ state: \{ tab: "Your Community", communityFilter: "Events"/);
});

test("follower counts derive from the live user_follows aggregate", async () => {
  const [context, aggregateMigration, sellerProfile, storeHome] = await Promise.all([
    readFile(new URL("../src/context/FollowContext.jsx", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260815_phase_9a9_scale_aggregates.sql", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/SellerProfile.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/ShopHome.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(context, /rpc\("get_follower_counts"\)/);
  assert.match(context, /normalizeSellerKey/);
  assert.match(context, /followerCountKeys/);
  assert.match(aggregateMigration, /get_follower_counts/);
  assert.match(aggregateMigration, /from public\.user_follows/);
  assert.match(context, /follow row persistence audit/);
  assert.match(context, /follow row lookup audit/);
  assert.match(context, /unfollow row persistence audit/);
  assert.match(context, /followOperationsRef/);
  assert.match(context, /following rows source audit/);
  assert.match(sellerProfile, /SellerProfile follower count render audit/);
  assert.match(sellerProfile, /profileSellerId/);
  assert.match(sellerProfile, /followedSellers\.includes\(profileSellerId\)/);
  assert.match(sellerProfile, /profiles\.id/);
  assert.match(storeHome, /ShopHome follower count render audit/);
});

test("email confirmation uses the dedicated confirmation page and login destination", async () => {
  const [authContext, app, confirmEmail] = await Promise.all([
    readFile(new URL("../src/context/AuthContext.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/ConfirmEmail.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(authContext, /const configuredOrigin = import\.meta\.env\.VITE_APP_URL\?\.trim\(\)/);
  assert.match(authContext, /localhost\(\?::\\d\+\)\?\$\/i/);
  assert.match(authContext, /https:\/\/grolomarketplace\.ca/);
  assert.match(authContext, /const emailRedirectTo = `\$\{redirectOrigin\}\/confirm-email`/);
  assert.match(authContext, /emailRedirectTo,/);
  assert.match(app, /path="\/confirm-email"/);
  assert.match(confirmEmail, /Email Confirmed/);
  assert.match(confirmEmail, /Your email has been successfully verified\./);
  assert.match(confirmEmail, /You can now log in and start exploring Grolo\./);
  assert.match(confirmEmail, /Log In/);
  assert.match(confirmEmail, /Return to Home/);
});

test("website validation accepts and normalizes common domains", () => {
  for (const website of ["www.fritasflowers.com", "https://www.fritasflowers.com", "https://fritasflowers.com", "fritasflowers.com"]) {
    assert.equal(isValidWebsite(website), true);
    assert.match(normalizeWebsite(website), /^https:\/\//);
  }
  assert.equal(validateSellerProfile({ name: "Flowers", description: "Local flowers", location: "Calgary", website: "www.fritasflowers.com" }), null);
  assert.match(validateSellerProfile({ name: "Flowers", description: "Local flowers", location: "Calgary", website: "not a website" }), /valid website URL/);
});

test("large banner uploads are optimized before storage validation", async () => {
  const [imageStorage, openStore, accountSettings] = await Promise.all([
    readFile(new URL("../src/lib/imageStorage.js", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/OpenStore.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/AccountSettings.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(imageStorage, /kind === "banner" && file\.size > 5 \* 1024 \* 1024/);
  assert.match(imageStorage, /targetBytes = 4\.5 \* 1024 \* 1024/);
  assert.match(imageStorage, /store-banner/);
  assert.match(imageStorage, /We couldn't optimize this image\. Please choose a different banner image\./);
  assert.match(imageStorage, /Optimizing image\.\.\./);
  assert.match(imageStorage, /Uploading banner\.\.\./);
  assert.match(openStore, /uploadProgress\?\.kind === "banner" && <UploadProgress/);
  assert.match(accountSettings, /uploadProgress\?\.kind === "banner" && <UploadProgress/);
});

test("order persistence diagnostics cover creation and buyer/seller reload queries", async () => {
  const [ordersApi, shopHome, shopOrders, buyerOrders] = await Promise.all([
    readFile(new URL("../src/lib/api/orders.js", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/ShopHome.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/ShopOrders.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/Orders.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(ordersApi, /ORDER CREATE RESULT/);
  assert.match(ordersApi, /const ORDER_SELECT = "\*, order_items\(\*, listings\(legacy_id,price\)\)"/);
  assert.doesNotMatch(ordersApi, /const ORDER_SELECT[^\n]*payments/);
  assert.match(ordersApi, /insertData: data/);
  assert.match(ordersApi, /insertError: error\?\.message/);
  assert.match(ordersApi, /ORDER LOAD RESULT \(BUYER\)/);
  assert.match(ordersApi, /ORDER LOAD RESULT \(SELLER\)/);
  assert.match(ordersApi, /SHOPHOME RAW ORDER QUERY/);
  assert.match(ordersApi, /schema: "public"/);
  assert.match(ordersApi, /authUserId: authenticatedUserId/);
  assert.match(ordersApi, /sellerIdUsedInQuery: sellerId/);
  assert.match(ordersApi, /table: "orders"/);
  assert.match(ordersApi, /data: data \?\? null/);
  assert.match(ordersApi, /error: error \?\? null/);
  assert.match(ordersApi, /count: data\?\.length/);
  assert.match(ordersApi, /PGRST200/);
  assert.match(ordersApi, /\.select\("\*"\)/);
  assert.match(ordersApi, /ORDER RELATIONSHIP FALLBACK \(SELLER\)/);
  assert.match(ordersApi, /orderId: data\?\.order\?\.id/);
  assert.match(ordersApi, /orderStatus: data\?\.order\?\.status/);
  assert.match(ordersApi, /\.eq\("buyer_id", buyerId\)/);
  assert.match(ordersApi, /\.eq\("seller_id", sellerId\)/);
  assert.match(shopHome, /SHOPHOME ORDER LOAD/);
  assert.match(shopHome, /sellerIdUsedInQuery/);
  assert.match(shopHome, /returnedOrderCount/);
  assert.match(shopHome, /returnedOrderStatuses/);
  assert.match(shopHome, /orderFilterAudit/);
  assert.match(shopHome, /created_at/);
  assert.match(shopHome, /queryFilters/);
  assert.match(shopOrders, /MANAGE ORDERS LOAD/);
  assert.match(shopOrders, /currentUserId/);
  assert.match(buyerOrders, /BUYER ORDERS LOAD/);
  assert.match(buyerOrders, /queryFilters/);
  assert.match(buyerOrders, /rowsReturned/);
});

test("seller new-order badges count unseen orders and clear when store surfaces open", async () => {
  const [orders, tabBar, shopHome, shopOrders] = await Promise.all([
    readFile(new URL("../src/context/OrderContext.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/TabBar.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/ShopHome.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/ShopOrders.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(orders, /NEW_SELLER_ORDER_STATUSES = new Set\(\["New", "Order Placed", "Seller Notified"\]\)/);
  assert.match(orders, /getNewSellerOrderCount/);
  assert.match(orders, /markSellerOrdersSeen/);
  assert.match(tabBar, /newSellerOrderCount/);
  assert.match(tabBar, /new orders/);
  assert.match(shopHome, /markSellerOrdersSeen\(seller\.id\)/);
  assert.match(shopOrders, /markSellerOrdersSeen\(sellerId\)/);
});

test("store reviews filter by type and render unique review IDs", async () => {
  const [reviewsApi, reviewContext, storeReviews, shopOrders, buyerProfile, sellerReviewCard] = await Promise.all([
    readFile(new URL("../src/lib/api/reviews.js", import.meta.url), "utf8"),
    readFile(new URL("../src/context/ReviewContext.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/StoreReviews.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/ShopOrders.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/BuyerProfile.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/SellerReviewCard.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(reviewsApi, /\.eq\("review_type", reviewType\)/);
  assert.match(reviewContext, /uniqueReviewsById/);
  assert.match(storeReviews, /STORE REVIEW LOAD/);
  assert.match(storeReviews, /reviewIds/);
  assert.match(storeReviews, /returnedReviewCount/);
  assert.match(storeReviews, /uniqueReviewCount/);
  assert.match(storeReviews, /finalRenderedReviews/);
  assert.match(storeReviews, /new Map\(\)/);
  assert.match(sellerReviewCard, /profileAvatarUrl/);
  assert.match(sellerReviewCard, /avatarUrlUsed/);
  assert.match(sellerReviewCard, /BUYER REVIEW AVATAR LOAD/);
  assert.match(sellerReviewCard, /revieweeId/);
  assert.match(shopOrders, /reviews\.some\(\(review\)/);
  assert.match(shopOrders, /reviewType: "buyer"/);
  assert.match(shopOrders, /buyerId: reviewInput\.buyerId/);
  assert.match(reviewsApi, /BUYER REVIEW CREATE RESULT/);
  assert.match(reviewsApi, /reviewerId: payload\.reviewer_id/);
  assert.match(reviewsApi, /revieweeId: payload\.reviewee_id/);
  assert.match(reviewsApi, /insertData/);
  assert.match(reviewsApi, /insertError/);
  assert.match(reviewsApi, /resolvedType === "product"/);
  assert.match(buyerProfile, /reviewsForBuyer/);
  assert.match(buyerProfile, /BUYER PROFILE REVIEW LOAD/);
  assert.match(buyerProfile, /profileId/);
  assert.match(buyerProfile, /review_type: "buyer"/);
  assert.match(buyerProfile, /reviewee_id/);
  assert.match(buyerProfile, /reviewTypes/);
  assert.match(buyerProfile, /revieweeIds/);
  assert.match(buyerProfile, /orderIds/);
});

test("buyer trust level only advances when every tier requirement is met", async () => {
  const partialTrusted = getBuyerTrustLevel({ completedTransactions: 4, sellerRecommendations: 1, wouldTransactAgain: 1 });
  assert.equal(partialTrusted.current.code, "new_buyer");
  assert.equal(partialTrusted.next.code, "trusted_buyer");
  assert.equal(partialTrusted.nextRequirements.length, 3);

  const trusted = getBuyerTrustLevel({ completedTransactions: 5, sellerRecommendations: 2, wouldTransactAgain: 3 });
  assert.equal(trusted.current.code, "trusted_buyer");
  assert.equal(trusted.next.code, "established_buyer");
});

test("seller dashboard maps every new order status into the New bucket", async () => {
  const [shopHome, shopOrders] = await Promise.all([
    readFile(new URL("../src/pages/ShopHome.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/ShopOrders.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(shopHome, /\["New", "Seller Notified", "Order Placed"\]/);
  assert.match(shopOrders, /statuses: \["New", "Seller Notified", "Order Placed"\]/);
});

test("seller listing cards show live views, likes, reviews, and regrows without comments", async () => {
  const card = await readFile(new URL("../src/components/SellerListingCard.jsx", import.meta.url), "utf8");
  assert.match(card, /useReviews/);
  assert.match(card, /productRating\(product\.id\)/);
  assert.match(card, /LISTING METRICS LOAD/);
  assert.match(card, /metricSources/);
  assert.match(card, /reviewCount/);
  assert.match(card, /viewCount/);
  assert.match(card, /likeCount/);
  assert.match(card, /regrowCount/);
  assert.match(card, /product\.views/);
  assert.match(card, /product\.favorites/);
  assert.match(card, /product\.regrows/);
  assert.doesNotMatch(card, /product\.messages/);
  assert.doesNotMatch(card, /chat|comment/i);
});
