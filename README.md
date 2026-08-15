# My Shop App

A mobile-first local marketplace app (feed, search, shop pages, cart, messaging,
notifications, and a seller earnings dashboard) built with React, React Router,
and Tailwind CSS.

## Getting started

```bash
npm install
npm run dev
```

## Supabase backend

The app starts without seeded marketplace content. New accounts receive empty
buyer and seller collections, while real marketplace content is loaded from the
connected backend as those screens are enabled. To connect Supabase:

1. Create a project at [supabase.com](https://supabase.com).
2. Follow the complete **Authoritative Supabase bootstrap** procedure below,
   including every migration and `verify_bootstrap.sql`.
3. Copy `.env.example` to `.env` and fill in your project URL and anon key:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
4. Restart the dev server. Once configured:
   - `/signin` sends a magic-link email (or Google/Apple OAuth) via
     `src/context/AuthContext.jsx`.
   - `/messages`, `/messages/:id`, and `/profit` require an authenticated
     session (see `src/components/ProtectedRoute.jsx`).
   - The heart/save button on the product page persists favorites to
     Supabase for signed-in users, or to `localStorage` otherwise
     (`src/hooks/useFavorites.js`).
   - `src/lib/api/*.js` contains query helpers for listings, profiles, favorites,
     messages, and notifications. These should be used by screens as backend
     connectivity is enabled; do not add seed or demo records to account flows.

If OAuth providers (Google/Apple) aren't configured in your Supabase project,
disable those buttons or configure them under Authentication → Providers.

## Authoritative Supabase bootstrap

Use the following procedure for every new Supabase project. Do not run the SQL
files in an arbitrary order and do not use an older copy of an individual
migration as a substitute.

1. Open the Supabase SQL Editor for the empty project.
2. Run `supabase/schema.sql` in its entirety.
3. Run the migrations in this exact order:

   1. `supabase/migrations/20260813_listing_archival.sql`
   2. `supabase/migrations/20260813_create_promotions.sql`
   3. `supabase/migrations/20260813_apply_promotions_to_order_items.sql`
   4. `supabase/migrations/20260813_phase_8g_engagement.sql`
   5. `supabase/migrations/20260813_phase_8h_notifications.sql`
   6. `supabase/migrations/20260813_phase_8i_vendor_analytics.sql`
   7. `supabase/migrations/20260813_phase_8j_vendor_operations.sql`
   8. `supabase/migrations/20260813_phase_9a4_order_status_validation.sql`
   9. `supabase/migrations/20260813_phase_9a5_promotion_validation.sql`
   10. `supabase/migrations/20260813_phase_8k_trust_safety.sql`
   11. `supabase/migrations/20260813_phase_9a6_suspended_user_enforcement.sql`

4. Run `supabase/verify_bootstrap.sql` in the same project. The script must
   finish with `Grolo Supabase bootstrap verification passed` and must not
   report any failed checks.
5. Only after verification passes, configure `.env` from `.env.example` and
   start the application.

`schema.sql` is the base schema and owns the core marketplace, messaging,
orders, payments, reviews, and reputation objects. The numbered migrations
add archival, promotions, engagement, durable notifications, analytics, seller
operations, server-side order status validation, promotion validation,
reporting, blocking, and moderation. The Phase 8H migration owns
the canonical notification contract (`user_id`, `type`, `title`, `message`,
`related_id`, `read`, `created_at`); the base schema intentionally does not
create the historical `recipient_id`/`action` contract. On an existing legacy
database, Phase 8H migrates `recipient_id` into `user_id` and makes both
`recipient_id` and `action` nullable so canonical inserts cannot fail. Those
legacy fields, plus legacy presentation fields such as `actor_name`,
`actor_avatar_url`, `quote`, `thumbnail_url`, `post_id`, `comment_id`,
`reply_id`, and `notification_type`, are not written by current database
triggers or client persistence code.

The application-owned follow key is `user_follows.seller_id`; `vendor_id`,
when present after the engagement migration, is nullable legacy compatibility
data and is not required by the application. The migration also enforces the
`(follower_id, seller_id)` uniqueness contract for clean and upgraded databases.

### Bootstrap object inventory

The authoritative path provisions these tables:

- Core identity/discovery: `profiles`, `categories`, `listings`, `events`,
  `event_attendees`, `user_follows`, `favorites`.
- Communication/content: `conversations`, `messages`, `comments`,
  `comment_likes`, `notifications`.
- Commerce: `promotions`, `orders`, `order_items`, `payments`, `reviews`.
- Reputation: `reputation_events`, `badge_definitions`, `user_badges`,
  `user_reputation_status`.
- Operations and safety: `vendor_analytics_events`, `reports`, `user_blocks`.

The required RPC surface is `create_order_with_items`,
`cancel_order_with_inventory`, `update_order_status`, `create_review`,
`upsert_conversation`, `get_vendor_analytics`, `create_activity_notification`,
`is_user_blocked`, `admin_set_report_status`, and `admin_suspend_target`. Order
status changes are seller-owned and must go through `update_order_status`;
pickup orders follow New/Order Placed → Preparing → Ready for Pickup →
Completed, with the legacy Seller Notified → In Progress → Ready for Pickup
path also supported. Delivery orders follow New/Order Placed/Seller Notified →
Preparing → Out for Delivery → Delivered → Completed. Buyer cancellation remains isolated to
`cancel_order_with_inventory` and is allowed only before preparation begins.
The base schema and
migrations also provision the immutable-field, timestamp, inventory, message,
notification, review, and moderation triggers. `verify_bootstrap.sql` checks
these RPCs, constraints, triggers, indexes, RLS enablement, and all named
application RLS policies.

Promotion creation accepts only `percentage` and `fixed_amount` pricing
promotions. Server-side validation requires active seller-owned listings,
positive discount values, percentage values up to 100, fixed discounts below
selected listing prices when available, and valid date ranges.

Suspension enforcement is provisioned by Phase 9A.6. `profiles.suspended_at`
blocks normal protected routes and transactional/community writes while leaving
admin-only moderation access governed by `AdminRoute`. The profile moderation
trigger prevents a suspended user from clearing `suspended_at` or changing
`is_admin` directly.

`community_posts` and `map_locations` are optional discovery sources. The app
falls back to local/derived discovery data when those optional tables are not
present; they are not part of the authoritative transactional bootstrap.

For an existing database, take a backup and apply the same files in order only
after reviewing any legacy data. `verify_bootstrap.sql` intentionally rejects a
fresh deployment that still has the conflicting legacy notification column.
